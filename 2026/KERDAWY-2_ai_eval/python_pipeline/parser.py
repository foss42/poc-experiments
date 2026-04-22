"""
OpenAPI / Swagger Parser — Parses OpenAPI 3.x and Swagger 2.0 specs into structured JSON.

Part of the API Explorer PoC (GSoC 2026, API Dash).
Implements custom spec traversal (no third-party OpenAPI libraries).

Usage:
    CLI:    python parser.py <spec_url_or_path> [--output output.json]
    Module: from parser import parse_openapi_spec
"""

import json
import logging
import re
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import click
import requests
import yaml
from colorama import Fore, Style, init as colorama_init

from enricher import categorize_api, generate_tags, score_api_quality

colorama_init(autoreset=True)

logging.basicConfig(
    level=logging.INFO,
    format=f"{Fore.CYAN}%(levelname)s{Style.RESET_ALL} %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Spec loading
# ---------------------------------------------------------------------------


def load_spec(source: str) -> dict[str, Any]:
    """Load an OpenAPI/Swagger spec from a URL or local file path.

    Supports JSON and YAML formats. Raises click.ClickException on failure.
    """
    parsed = urlparse(source)
    raw: str

    if parsed.scheme in ("http", "https"):
        logger.info("Fetching spec from URL: %s", source)
        try:
            resp = requests.get(source, timeout=30)
            resp.raise_for_status()
            raw = resp.text
        except requests.RequestException as exc:
            raise click.ClickException(f"Failed to fetch spec: {exc}")
    else:
        path = Path(source)
        if not path.exists():
            raise click.ClickException(f"File not found: {source}")
        logger.info("Reading spec from file: %s", path)
        raw = path.read_text(encoding="utf-8")

    # Try JSON first, then YAML
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    try:
        return yaml.safe_load(raw)
    except yaml.YAMLError as exc:
        raise click.ClickException(f"Failed to parse spec as JSON or YAML: {exc}")


# ---------------------------------------------------------------------------
# Version detection
# ---------------------------------------------------------------------------


def detect_spec_version(spec: dict[str, Any]) -> tuple[str, str]:
    """Detect whether the spec is OpenAPI 3.x or Swagger 2.0.

    Returns ("openapi", "3.x.x") or ("swagger", "2.0").
    """
    if "openapi" in spec:
        return ("openapi", str(spec["openapi"]))
    if "swagger" in spec:
        return ("swagger", str(spec["swagger"]))
    raise click.ClickException(
        "Cannot detect spec version: missing 'openapi' or 'swagger' field."
    )


# ---------------------------------------------------------------------------
# $ref resolution
# ---------------------------------------------------------------------------


def resolve_ref(
    spec: dict[str, Any],
    ref: str,
    _depth: int = 0,
    _visited: set[str] | None = None,
) -> dict[str, Any]:
    """Resolve a JSON $ref pointer like '#/components/schemas/Pet'.

    Walks the spec dict. Handles nested $ref with a depth limit of 10.
    """
    if _visited is None:
        _visited = set()

    if _depth > 10 or ref in _visited:
        logger.warning("Circular or deep $ref detected: %s", ref)
        return {}

    _visited.add(ref)

    if not ref.startswith("#/"):
        logger.warning("External $ref not supported: %s", ref)
        return {}

    parts = ref.lstrip("#/").split("/")
    current: Any = spec
    for part in parts:
        # Handle JSON pointer escapes
        part = part.replace("~1", "/").replace("~0", "~")
        if isinstance(current, dict) and part in current:
            current = current[part]
        else:
            logger.warning("Cannot resolve $ref path: %s (missing '%s')", ref, part)
            return {}

    # If the resolved value itself has a $ref, follow it
    if isinstance(current, dict) and "$ref" in current:
        return resolve_ref(spec, current["$ref"], _depth + 1, _visited)

    return current if isinstance(current, dict) else {}


def maybe_resolve(spec: dict[str, Any], obj: Any) -> dict[str, Any]:
    """If obj is a dict with $ref, resolve it; otherwise return obj as-is."""
    if isinstance(obj, dict) and "$ref" in obj:
        return resolve_ref(spec, obj["$ref"])
    return obj if isinstance(obj, dict) else {}


# ---------------------------------------------------------------------------
# Auth extraction
# ---------------------------------------------------------------------------

AUTH_TYPE_MAP = {
    "apiKey": "api_key",
    "http": "bearer",  # default; refined below
    "oauth2": "oauth2",
    "openIdConnect": "oauth2",
}


def extract_auth(spec: dict[str, Any], version: str) -> tuple[str, dict[str, Any]]:
    """Extract auth type and details from the spec.

    Returns (auth_type, auth_details) where auth_type is one of:
    api_key, bearer, oauth2, basic, none.
    """
    schemes: dict[str, Any] = {}

    if version.startswith("3"):
        schemes = spec.get("components", {}).get("securitySchemes", {})
    else:
        schemes = spec.get("securityDefinitions", {})

    if not schemes:
        return "none", {}

    # Pick the first scheme as primary
    for name, scheme_raw in schemes.items():
        scheme = maybe_resolve(spec, scheme_raw)
        scheme_type = scheme.get("type", "")

        if scheme_type == "apiKey":
            return "api_key", {
                "in": scheme.get("in", "header"),
                "name": scheme.get("name", "X-API-Key"),
            }
        elif scheme_type == "http":
            http_scheme = scheme.get("scheme", "bearer").lower()
            if http_scheme == "basic":
                return "basic", {"scheme": "basic"}
            return "bearer", {"scheme": "bearer"}
        elif scheme_type == "oauth2":
            flows = scheme.get("flows", scheme.get("flow", {}))
            return "oauth2", {"flows": flows}
        elif scheme_type == "openIdConnect":
            return "oauth2", {"openIdConnectUrl": scheme.get("openIdConnectUrl", "")}

    return "none", {}


# ---------------------------------------------------------------------------
# Endpoint extraction
# ---------------------------------------------------------------------------

HTTP_METHODS = {"get", "post", "put", "patch", "delete", "head", "options", "trace"}


def _extract_params(
    spec: dict[str, Any], params_raw: list[Any]
) -> list[dict[str, Any]]:
    """Parse parameter objects, resolving $refs."""
    result = []
    for p in params_raw:
        param = maybe_resolve(spec, p)
        if not param:
            continue

        schema = maybe_resolve(spec, param.get("schema", {}))
        result.append({
            "name": param.get("name", ""),
            "in": param.get("in", ""),
            "required": param.get("required", False),
            "type": schema.get("type", param.get("type", "string")),
            "description": param.get("description", ""),
        })
    return result


def _extract_request_body_example(
    spec: dict[str, Any], body_raw: Any
) -> dict[str, Any]:
    """Extract a request body example from the spec."""
    body = maybe_resolve(spec, body_raw)
    if not body:
        return {}

    content = body.get("content", {})
    for media_type in ("application/json", "application/xml", "text/plain"):
        if media_type in content:
            media = maybe_resolve(spec, content[media_type])
            example = media.get("example")
            if example:
                return example
            schema = maybe_resolve(spec, media.get("schema", {}))
            if schema.get("example"):
                return schema["example"]
    return {}


def _extract_response_example(
    spec: dict[str, Any], responses: dict[str, Any]
) -> dict[str, Any]:
    """Extract a response example from the '200' or first success response."""
    for code in ("200", "201", "default"):
        if code not in responses:
            continue
        resp = maybe_resolve(spec, responses[code])
        content = resp.get("content", {})
        for media_type in ("application/json",):
            if media_type in content:
                media = maybe_resolve(spec, content[media_type])
                example = media.get("example")
                if example:
                    return example
                schema = maybe_resolve(spec, media.get("schema", {}))
                if schema.get("example"):
                    return schema["example"]
    return {}


def extract_endpoints(
    spec: dict[str, Any], version: str
) -> list[dict[str, Any]]:
    """Extract all endpoints from the paths object."""
    paths = spec.get("paths", {})
    endpoints = []

    for path, path_item_raw in paths.items():
        path_item = maybe_resolve(spec, path_item_raw)
        if not isinstance(path_item, dict):
            continue

        # Path-level parameters shared across all methods
        path_params = path_item.get("parameters", [])

        for method in HTTP_METHODS:
            if method not in path_item:
                continue

            operation = maybe_resolve(spec, path_item[method])
            if not isinstance(operation, dict):
                continue

            # Merge path-level + operation-level parameters
            op_params = operation.get("parameters", [])
            all_params = path_params + op_params

            # For Swagger 2.0, body params are in parameters with in=body
            request_body_example: dict[str, Any] = {}
            if version.startswith("3"):
                request_body_example = _extract_request_body_example(
                    spec, operation.get("requestBody")
                )
            else:
                for p in all_params:
                    param = maybe_resolve(spec, p)
                    if param.get("in") == "body":
                        schema = maybe_resolve(spec, param.get("schema", {}))
                        if schema.get("example"):
                            request_body_example = schema["example"]
                        break

            responses = operation.get("responses", {})
            response_example = _extract_response_example(spec, responses)

            # Determine content type
            if version.startswith("3"):
                rb = maybe_resolve(spec, operation.get("requestBody", {}))
                content_types = list(rb.get("content", {}).keys())
                content_type = content_types[0] if content_types else "application/json"
            else:
                consumes = operation.get("consumes", spec.get("consumes", []))
                content_type = consumes[0] if consumes else "application/json"

            # Filter out body params from the parameter list (Swagger 2.0)
            filtered_params = _extract_params(
                spec,
                [p for p in all_params if maybe_resolve(spec, p).get("in") != "body"],
            )

            endpoints.append({
                "method": method.upper(),
                "path": path,
                "summary": operation.get("summary", ""),
                "description": operation.get("description", ""),
                "parameters": filtered_params,
                "request_body_example": request_body_example,
                "response_example": response_example,
                "content_type": content_type,
            })

    return endpoints


# ---------------------------------------------------------------------------
# Server / base URL extraction
# ---------------------------------------------------------------------------


def extract_base_url(spec: dict[str, Any], version: str) -> str:
    """Extract the base URL from the spec."""
    if version.startswith("3"):
        servers = spec.get("servers", [])
        if servers and isinstance(servers[0], dict):
            return servers[0].get("url", "")
    else:
        host = spec.get("host", "")
        base_path = spec.get("basePath", "")
        schemes = spec.get("schemes", ["https"])
        scheme = schemes[0] if schemes else "https"
        if host:
            return f"{scheme}://{host}{base_path}"
    return ""


# ---------------------------------------------------------------------------
# Sample request builder
# ---------------------------------------------------------------------------


def build_sample_request(
    base_url: str,
    auth_type: str,
    auth_details: dict[str, Any],
    endpoint: dict[str, Any],
) -> dict[str, Any]:
    """Build a sample HTTP request for the given endpoint."""
    method = endpoint.get("method", "GET")
    path = endpoint.get("path", "/")

    # Fill path parameters with placeholders
    sample_path = re.sub(r"\{(\w+)\}", r"{\1}", path)
    for param in endpoint.get("parameters", []):
        if param.get("in") == "path":
            placeholder = f"<{param['name']}>"
            sample_path = sample_path.replace(
                "{" + param["name"] + "}", placeholder
            )

    url = f"{base_url.rstrip('/')}{sample_path}"

    headers: dict[str, str] = {}
    if auth_type == "api_key" and auth_details.get("in") == "header":
        headers[auth_details.get("name", "X-API-Key")] = "YOUR_API_KEY"
    elif auth_type == "bearer":
        headers["Authorization"] = "Bearer YOUR_TOKEN"
    elif auth_type == "basic":
        headers["Authorization"] = "Basic YOUR_BASE64_CREDENTIALS"

    if method in ("POST", "PUT", "PATCH"):
        headers["Content-Type"] = endpoint.get("content_type", "application/json")

    query_params: dict[str, str] = {}
    for param in endpoint.get("parameters", []):
        if param.get("in") == "query":
            query_params[param["name"]] = f"<{param['name']}>"

    return {
        "method": method,
        "url": url,
        "headers": headers,
        "query_params": query_params,
    }


# ---------------------------------------------------------------------------
# Main parse function
# ---------------------------------------------------------------------------


def parse_openapi_spec(source: str) -> dict[str, Any]:
    """Parse an OpenAPI 3.x or Swagger 2.0 spec and return structured JSON.

    Args:
        source: URL or file path to the spec.

    Returns:
        A dict matching the API Explorer template schema.
    """
    spec = load_spec(source)
    kind, version = detect_spec_version(spec)
    logger.info("Detected %s %s", kind, version)

    info = spec.get("info", {})
    auth_type, auth_details = extract_auth(spec, version)
    endpoints = extract_endpoints(spec, version)
    base_url = extract_base_url(spec, version)

    # Build slug-style id from title
    title = info.get("title", "unknown-api")
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")

    # Collect docs_url
    docs_url = (
        info.get("termsOfService", "")
        or info.get("contact", {}).get("url", "")
        or ""
    )

    # Build the structured result
    result: dict[str, Any] = {
        "id": slug,
        "name": title,
        "provider": info.get("contact", {}).get("name", ""),
        "version": info.get("version", ""),
        "base_url": base_url,
        "description": info.get("description", ""),
        "docs_url": docs_url,
        "auth_type": auth_type,
        "auth_details": auth_details,
        "category": "",
        "tags": [],
        "endpoints": endpoints,
        "total_endpoints": len(endpoints),
        "sample_request": {},
    }

    # Add extra metadata for enricher
    result["api_info"] = {
        "title": title,
        "description": info.get("description", ""),
        "servers": spec.get("servers", []),
        "tags": spec.get("tags", []),
        "contact": info.get("contact", {}),
        "license": info.get("license", {}),
    }
    result["auth_schemes"] = list(
        (spec.get("components", {}).get("securitySchemes", {})
         if version.startswith("3")
         else spec.get("securityDefinitions", {})).keys()
    )

    # Enrich
    result["category"] = categorize_api(result["api_info"])
    result["quality_score"] = score_api_quality(result)
    result["tags"] = generate_tags(result)

    # Build sample request from first endpoint
    if endpoints:
        result["sample_request"] = build_sample_request(
            base_url, auth_type, auth_details, endpoints[0]
        )

    # Remove internal helper fields
    del result["api_info"]
    del result["auth_schemes"]

    return result


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


@click.command()
@click.argument("source")
@click.option(
    "--output", "-o",
    default=None,
    help="Output file path. Prints to stdout if omitted.",
)
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose logging.")
def main(source: str, output: str | None, verbose: bool) -> None:
    """Parse an OpenAPI 3.x or Swagger 2.0 spec into a structured JSON template.

    SOURCE is a URL or local file path to the spec.
    """
    if verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    try:
        result = parse_openapi_spec(source)
    except click.ClickException:
        raise
    except Exception as exc:
        raise click.ClickException(f"Unexpected error: {exc}")

    json_str = json.dumps(result, indent=2, ensure_ascii=False)

    if output:
        Path(output).write_text(json_str, encoding="utf-8")
        logger.info(
            "%s%s Written to %s (%d endpoints)%s",
            Fore.GREEN, "✓", output, result["total_endpoints"], Style.RESET_ALL,
        )
    else:
        click.echo(json_str)


if __name__ == "__main__":
    main()
