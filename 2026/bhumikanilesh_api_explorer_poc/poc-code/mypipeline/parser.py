"""
Phase 2 — Parser
API Explorer Pipeline | GSoC 2026 | foss42/apidash
Author: Bhumika Nilesh Ujjainkar

Responsibilities:
  - Parse OpenAPI 3.x specs
  - Parse Swagger 2.x specs (different structure from 3.x)
  - Resolve $ref pointers inline (what prance does)
  - Parse HTML documentation pages (BeautifulSoup)
  - Parse Markdown documentation files
  - Output unified clean structure regardless of input format

Corner cases handled:
  - $ref circular references (infinite loop prevention)
  - Missing required fields in spec (graceful defaults)
  - Swagger 2.x vs OpenAPI 3.x base URL differences
  - Auth scheme differences between formats
  - requestBody missing in POST endpoints
  - Parameters defined at path level vs operation level
  - Allof/OneOf/AnyOf schema merging
  - Empty paths object
  - Non-standard HTTP methods
  - HTML pages with no code blocks
  - Markdown with no endpoint definitions
  - Encoding errors in spec files
"""

import os
import json
import yaml
import logging
import re
from pathlib import Path
from bs4 import BeautifulSoup
from fetcher import get_logger


logger = get_logger("parser")


# ─────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────

VALID_METHODS   = {"get", "post", "put", "delete", "patch", "head", "options"}
BILLABLE_METHODS = {"get", "post", "put", "delete", "patch"}  # exclude head/options from templates

MAX_ENDPOINTS_PER_API = 50  # cap endpoints — prevents massive APIs flooding templates


# ─────────────────────────────────────────────────────────────
# Unified Output Structure
# Every parser outputs this same clean structure
# regardless of whether input was OpenAPI, Swagger, HTML or MD
# ─────────────────────────────────────────────────────────────

def make_clean_endpoint(name, method, url, parameters=None,
                        request_body=None, auth_scheme=None,
                        description="", response_schema=None):
    """
    Unified endpoint structure — output of every parser.
    This feeds directly into Phase 4 (Publisher).
    """
    return {
        "name"          : name,
        "method"        : method.upper(),
        "url"           : url,
        "parameters"    : parameters    or [],
        "request_body"  : request_body  or {},
        "auth_scheme"   : auth_scheme   or "none",
        "description"   : description,
        "response_schema": response_schema or {}
    }


def make_parsed_api(title, description, base_url,
                    version, endpoints, source_format):
    """
    Unified parsed API structure output by Phase 2.
    Consumed by Phase 3 (Enricher).
    """
    return {
        "title"        : title        or "Unknown API",
        "description"  : description  or "",
        "base_url"     : base_url     or "",
        "version"      : version      or "1.0.0",
        "endpoints"    : endpoints,
        "source_format": source_format,
        "endpoint_count": len(endpoints)
    }


# ─────────────────────────────────────────────────────────────
# $ref Resolver
# OpenAPI specs use $ref pointers like:
#   $ref: '#/components/schemas/ChatRequest'
# These must be resolved before parsing endpoints
# ─────────────────────────────────────────────────────────────

class RefResolver:
    """
    Resolves JSON $ref pointers within a spec document.

    Why we need this:
      Real OpenAPI specs (Stripe, Twilio etc.) use $ref heavily.
      Without resolving, request body schemas appear as
      {"$ref": "#/components/schemas/XYZ"} which is useless.

    Corner cases:
      - Circular references (A → B → A) — tracked with seen set
      - Missing $ref targets — returns empty dict
      - Nested $refs (resolve recursively)
      - External $refs (URLs) — skipped, only internal supported
    """

    def __init__(self, spec: dict):
        self.spec = spec
        self._resolving = set()  # tracks current resolution chain for cycle detection

    def resolve(self, obj, depth=0):
        """
        Recursively resolves all $ref pointers in obj.
        depth limit prevents runaway recursion on pathological specs.
        """
        # Hard depth limit — prevents stack overflow on deeply nested specs
        if depth > 20:
            return obj

        if isinstance(obj, dict):
            if "$ref" in obj:
                ref_path = obj["$ref"]

                # Skip external $refs (URLs) — only handle internal refs
                if ref_path.startswith("http"):
                    return {}

                # Circular reference detection
                if ref_path in self._resolving:
                    logger.debug(f"Circular $ref detected: {ref_path} — returning empty")
                    return {}

                self._resolving.add(ref_path)
                try:
                    resolved = self._lookup(ref_path)
                    result   = self.resolve(resolved, depth + 1)
                    return result
                finally:
                    self._resolving.discard(ref_path)

            # Recursively resolve all values in dict
            return {k: self.resolve(v, depth + 1) for k, v in obj.items()}

        elif isinstance(obj, list):
            return [self.resolve(item, depth + 1) for item in obj]

        return obj

    def _lookup(self, ref_path: str) -> dict:
        """
        Looks up a $ref path like '#/components/schemas/ChatRequest'
        in the spec document.
        Returns empty dict if path not found.
        """
        if not ref_path.startswith("#/"):
            return {}

        parts   = ref_path[2:].split("/")
        current = self.spec

        for part in parts:
            # URL-decode path parts (%2F → / etc.)
            part = part.replace("~1", "/").replace("~0", "~")
            if isinstance(current, dict) and part in current:
                current = current[part]
            else:
                logger.debug(f"$ref path not found: {ref_path}")
                return {}

        return current


# ─────────────────────────────────────────────────────────────
# Schema Example Extractor
# Generates sample request body from schema definition
# ─────────────────────────────────────────────────────────────

def extract_example_from_schema(schema: dict, depth=0) -> dict:
    """
    Generates a sample value from an OpenAPI schema.
    Used when no explicit example is provided.

    Handles:
      - Primitive types (string, integer, boolean, number)
      - Objects with properties
      - Arrays
      - allOf / oneOf / anyOf merging
      - Nested schemas (recursive, depth-limited)
    """
    if depth > 5 or not schema:
        return {}

    # Use explicit example if available
    if "example" in schema:
        return schema["example"]

    schema_type = schema.get("type", "object")

    # allOf — merge all schemas
    if "allOf" in schema:
        merged = {}
        for sub in schema["allOf"]:
            sub_example = extract_example_from_schema(sub, depth + 1)
            if isinstance(sub_example, dict):
                merged.update(sub_example)
        return merged

    # oneOf / anyOf — use first schema
    for key in ("oneOf", "anyOf"):
        if key in schema and schema[key]:
            return extract_example_from_schema(schema[key][0], depth + 1)

    # Object — recurse into properties
    if schema_type == "object" or "properties" in schema:
        result = {}
        for prop_name, prop_schema in schema.get("properties", {}).items():
            result[prop_name] = extract_example_from_schema(prop_schema, depth + 1)
        return result

    # Array — return list with one sample item
    if schema_type == "array":
        items = schema.get("items", {})
        return [extract_example_from_schema(items, depth + 1)]

    # Primitives — return sensible defaults
    type_defaults = {
        "string" : schema.get("enum", [schema.get("default", "")])[0] or "",
        "integer": schema.get("default", 0),
        "number" : schema.get("default", 0.0),
        "boolean": schema.get("default", False),
    }
    return type_defaults.get(schema_type, "")


# ─────────────────────────────────────────────────────────────
# Auth Scheme Detector
# Detects auth type from security definitions
# ─────────────────────────────────────────────────────────────

def detect_auth_scheme(spec: dict, operation: dict, spec_version: str) -> str:
    """
    Detects authentication scheme for an endpoint.
    Returns one of: 'bearer', 'api_key', 'basic', 'oauth2', 'none'

    Handles both OpenAPI 3.x and Swagger 2.x auth formats.
    """
    # Get security requirements for this operation
    # Operation-level security overrides spec-level security
    security = operation.get("security", spec.get("security", []))

    if not security:
        return "none"

    # Get security scheme definitions
    if spec_version == "3":
        schemes = spec.get("components", {}).get("securitySchemes", {})
    else:
        schemes = spec.get("securityDefinitions", {})

    for req in security:
        for scheme_name in req.keys():
            scheme = schemes.get(scheme_name, {})
            scheme_type = scheme.get("type", "").lower()

            if scheme_type == "http":
                http_scheme = scheme.get("scheme", "").lower()
                if http_scheme == "bearer":
                    return "bearer"
                elif http_scheme == "basic":
                    return "basic"

            elif scheme_type == "apikey":
                return "api_key"

            elif scheme_type == "oauth2":
                return "oauth2"

            # Swagger 2.x types
            elif scheme_type == "basic":
                return "basic"

    # If security is required but scheme unknown — assume bearer
    return "bearer" if security else "none"


# ─────────────────────────────────────────────────────────────
# OpenAPI 3.x Parser
# ─────────────────────────────────────────────────────────────

class OpenAPIParser:
    """
    Parses OpenAPI 3.x specification files.

    Key differences from Swagger 2.x:
      - Base URL in 'servers' array (not 'host' + 'basePath')
      - Request body in 'requestBody' (not 'body' parameter)
      - Auth in 'components.securitySchemes' (not 'securityDefinitions')
      - Responses in 'components.responses' (not 'definitions')
    """

    def parse(self, spec: dict) -> dict:
        # Resolve all $refs first
        resolver = RefResolver(spec)
        spec     = resolver.resolve(spec)

        info        = spec.get("info", {})
        title       = info.get("title", "Unknown API")
        description = info.get("description", "")
        version     = info.get("version", "1.0.0")

        # Base URL from servers array
        # Corner case: multiple servers — use first
        servers  = spec.get("servers", [])
        base_url = servers[0].get("url", "") if servers else ""

        # Corner case: relative server URL (e.g. "/v1")
        if base_url.startswith("/"):
            logger.debug(f"Relative server URL found: {base_url}")

        endpoints = []
        paths     = spec.get("paths", {})

        # Corner case: empty paths
        if not paths:
            logger.warning(f"No paths found in spec for {title}")

        for path, path_item in paths.items():
            if not isinstance(path_item, dict):
                continue

            # Parameters defined at path level apply to all operations
            path_level_params = path_item.get("parameters", [])

            for method, operation in path_item.items():
                if method not in BILLABLE_METHODS:
                    continue

                if not isinstance(operation, dict):
                    continue

                name        = operation.get("summary", f"{method.upper()} {path}")
                description = operation.get("description", "")
                full_url    = base_url + path

                # Merge path-level and operation-level parameters
                op_params  = operation.get("parameters", [])
                all_params = path_level_params + op_params

                parameters = []
                for param in all_params:
                    parameters.append({
                        "name"    : param.get("name", ""),
                        "in"      : param.get("in", "query"),
                        "required": param.get("required", False),
                        "type"    : param.get("schema", {}).get("type", "string"),
                        "example" : param.get("example", "")
                    })

                # Request body extraction
                request_body = {}
                rb = operation.get("requestBody", {})
                if rb:
                    content = rb.get("content", {})
                    # Prefer application/json, fallback to first content type
                    if "application/json" in content:
                        schema       = content["application/json"].get("schema", {})
                        request_body = extract_example_from_schema(schema)
                    elif content:
                        first_ct     = list(content.values())[0]
                        schema       = first_ct.get("schema", {})
                        request_body = extract_example_from_schema(schema)

                auth_scheme = detect_auth_scheme(spec, operation, "3")

                endpoints.append(make_clean_endpoint(
                    name         = name,
                    method       = method,
                    url          = full_url,
                    parameters   = parameters,
                    request_body = request_body,
                    auth_scheme  = auth_scheme,
                    description  = description
                ))

                # Cap endpoints per API
                if len(endpoints) >= MAX_ENDPOINTS_PER_API:
                    logger.debug(f"Endpoint cap reached for {title}")
                    break

            if len(endpoints) >= MAX_ENDPOINTS_PER_API:
                break

        return make_parsed_api(title, description, base_url,
                               version, endpoints, "openapi_3")


# ─────────────────────────────────────────────────────────────
# Swagger 2.x Parser
# ─────────────────────────────────────────────────────────────

class SwaggerParser:
    """
    Parses Swagger 2.x specification files.

    Key differences from OpenAPI 3.x:
      - Base URL = scheme + host + basePath (not 'servers')
      - Request body is a 'body' parameter (not 'requestBody')
      - Auth in 'securityDefinitions' (not 'components.securitySchemes')
      - Schemas in 'definitions' (not 'components.schemas')
    """

    def parse(self, spec: dict) -> dict:
        # Resolve $refs first
        resolver = RefResolver(spec)
        spec     = resolver.resolve(spec)

        info        = spec.get("info", {})
        title       = info.get("title", "Unknown API")
        description = info.get("description", "")
        version     = info.get("version", "1.0.0")

        # Base URL construction (Swagger 2.x specific)
        # Corner case: missing host/basePath
        host      = spec.get("host", "")
        base_path = spec.get("basePath", "")
        schemes   = spec.get("schemes", ["https"])
        scheme    = schemes[0] if schemes else "https"
        base_url  = f"{scheme}://{host}{base_path}" if host else base_path

        endpoints = []
        paths     = spec.get("paths", {})

        for path, path_item in paths.items():
            if not isinstance(path_item, dict):
                continue

            path_level_params = path_item.get("parameters", [])

            for method, operation in path_item.items():
                if method not in BILLABLE_METHODS:
                    continue

                if not isinstance(operation, dict):
                    continue

                name        = operation.get("summary", f"{method.upper()} {path}")
                description = operation.get("description", "")
                full_url    = base_url + path

                # Parameters — Swagger uses 'in: body' for request body
                all_params   = path_level_params + operation.get("parameters", [])
                parameters   = []
                request_body = {}

                for param in all_params:
                    if param.get("in") == "body":
                        # This IS the request body in Swagger 2.x
                        schema       = param.get("schema", {})
                        request_body = extract_example_from_schema(schema)
                    else:
                        parameters.append({
                            "name"    : param.get("name", ""),
                            "in"      : param.get("in", "query"),
                            "required": param.get("required", False),
                            "type"    : param.get("type", "string"),
                            "example" : param.get("x-example", "")
                        })

                auth_scheme = detect_auth_scheme(spec, operation, "2")

                endpoints.append(make_clean_endpoint(
                    name         = name,
                    method       = method,
                    url          = full_url,
                    parameters   = parameters,
                    request_body = request_body,
                    auth_scheme  = auth_scheme,
                    description  = description
                ))

                if len(endpoints) >= MAX_ENDPOINTS_PER_API:
                    break

            if len(endpoints) >= MAX_ENDPOINTS_PER_API:
                break

        return make_parsed_api(title, description, base_url,
                               version, endpoints, "swagger_2")


# ─────────────────────────────────────────────────────────────
# HTML Parser
# ─────────────────────────────────────────────────────────────

class HTMLParser:
    """
    Parses HTML API documentation pages.
    Used for AI APIs from awesome-generative-ai-apis that
    don't publish machine-readable OpenAPI specs.

    Strategy:
      1. Look for structured API reference tables
      2. Look for code blocks containing HTTP method + path patterns
      3. Look for heading + code block patterns
      4. Fallback: extract any HTTP method mentions

    Corner cases:
      - JavaScript-rendered pages (can't parse dynamic content)
      - Pages that require auth to view docs
      - Docs split across multiple pages
      - Non-standard endpoint presentation formats
    """

    # Pattern: HTTP method followed by path
    ENDPOINT_PATTERN = re.compile(
        r'\b(GET|POST|PUT|DELETE|PATCH)\b\s+(/[\w\-/{}.?=&%]*)',
        re.IGNORECASE
    )

    def parse(self, html_content: str, base_url: str = "", api_name: str = "") -> dict:
        try:
            soup = BeautifulSoup(html_content, "html.parser")
        except Exception as e:
            logger.error(f"Failed to parse HTML for {api_name}: {e}")
            return make_parsed_api(api_name, "", base_url, "1.0.0", [], "html")

        # Extract title
        title_tag = soup.find("title")
        title     = title_tag.text.strip() if title_tag else api_name or "Unknown API"
        # Clean up common title suffixes like " | API Reference"
        title = re.sub(r'\s*[\|–-]\s*(API Reference|Docs|Documentation).*$', '', title)

        # Extract description from meta tag
        meta        = soup.find("meta", attrs={"name": "description"})
        description = meta["content"] if meta else ""

        endpoints = []
        seen_endpoints = set()  # deduplication

        # Strategy 1: Look in code blocks
        for block in soup.find_all(["code", "pre"]):
            text    = block.get_text()
            matches = self.ENDPOINT_PATTERN.findall(text)
            for method, path in matches:
                key = f"{method.upper()}:{path}"
                if key not in seen_endpoints:
                    seen_endpoints.add(key)
                    full_url = base_url + path if base_url else path
                    # Try to find a description from nearby heading
                    desc = self._find_nearby_heading(block)
                    endpoints.append(make_clean_endpoint(
                        name        = f"{method.upper()} {path}",
                        method      = method.upper(),
                        url         = full_url,
                        description = desc
                    ))

        # Strategy 2: Scan all text for endpoint patterns
        # (catches endpoints not in code blocks)
        if len(endpoints) < 3:
            full_text = soup.get_text()
            matches   = self.ENDPOINT_PATTERN.findall(full_text)
            for method, path in matches:
                key = f"{method.upper()}:{path}"
                if key not in seen_endpoints:
                    seen_endpoints.add(key)
                    full_url = base_url + path if base_url else path
                    endpoints.append(make_clean_endpoint(
                        name   = f"{method.upper()} {path}",
                        method = method.upper(),
                        url    = full_url
                    ))

        # Corner case: no endpoints found
        # This happens with JS-rendered docs or non-standard formats
        if not endpoints:
            logger.warning(f"No endpoints found in HTML for {api_name}. "
                           f"Page may be JavaScript-rendered.")

        # Cap endpoints
        endpoints = endpoints[:MAX_ENDPOINTS_PER_API]

        return make_parsed_api(title, description, base_url,
                               "1.0.0", endpoints, "html")

    def _find_nearby_heading(self, element) -> str:
        """Finds the nearest preceding heading to use as endpoint description."""
        for tag in ["h1", "h2", "h3", "h4"]:
            heading = element.find_previous(tag)
            if heading:
                return heading.get_text().strip()
        return ""


# ─────────────────────────────────────────────────────────────
# Markdown Parser
# ─────────────────────────────────────────────────────────────

class MarkdownParser:
    """
    Parses Markdown API documentation files.
    Used for APIs that publish docs as .md files on GitHub.

    Strategy:
      1. Extract title from first H1 heading
      2. Extract description from first paragraph
      3. Scan code blocks for HTTP method + path patterns
      4. Use preceding headings as endpoint names

    Corner cases:
      - Multiple H1 headings
      - Endpoints in inline code vs fenced code blocks
      - Method names in bold (**POST**) vs plain text
      - Paths without leading slash
    """

    ENDPOINT_PATTERN = re.compile(
        r'\b(GET|POST|PUT|DELETE|PATCH)\b\s+(`?)(/[\w\-/{}.?=&%]*)',
        re.IGNORECASE
    )

    def parse(self, content: str, base_url: str = "", api_name: str = "") -> dict:
        lines = content.split("\n")

        # Extract title from first H1
        title = api_name or "Unknown API"
        for line in lines:
            if line.startswith("# "):
                title = line[2:].strip()
                break

        # Extract description from first substantial paragraph
        description = ""
        for line in lines:
            stripped = line.strip()
            if (stripped and not stripped.startswith("#")
                    and not stripped.startswith("|")
                    and len(stripped) > 40):
                description = stripped
                break

        endpoints    = []
        seen         = set()
        current_name = ""

        for line in lines:
            # Track current section heading for endpoint naming
            if line.startswith("#"):
                current_name = line.lstrip("#").strip()

            # Look for endpoint patterns
            # Match: POST /v1/chat or `POST /v1/chat` or **POST** /v1/chat
            clean_line = line.replace("**", "").replace("`", "")
            matches    = self.ENDPOINT_PATTERN.findall(clean_line)

            for method, _, path in matches:
                key = f"{method.upper()}:{path}"
                if key not in seen:
                    seen.add(key)
                    full_url = base_url + path if base_url else path
                    name     = current_name or f"{method.upper()} {path}"
                    endpoints.append(make_clean_endpoint(
                        name   = name,
                        method = method.upper(),
                        url    = full_url
                    ))

        # Corner case: nothing found
        if not endpoints:
            logger.warning(f"No endpoints found in Markdown for {api_name}")

        endpoints = endpoints[:MAX_ENDPOINTS_PER_API]

        return make_parsed_api(title, description, base_url,
                               "1.0.0", endpoints, "markdown")


# ─────────────────────────────────────────────────────────────
# Main Parser — routes to correct sub-parser
# ─────────────────────────────────────────────────────────────

class Parser:
    """
    Main parser — detects spec format and routes to correct sub-parser.
    """

    def __init__(self):
        self.openapi_parser  = OpenAPIParser()
        self.swagger_parser  = SwaggerParser()
        self.html_parser     = HTMLParser()
        self.markdown_parser = MarkdownParser()

    def detect_spec_version(self, spec: dict) -> str:
        """
        Detects whether spec is OpenAPI 3.x or Swagger 2.x.
        Returns '3' for OpenAPI 3.x, '2' for Swagger 2.x.
        """
        if "openapi" in spec:
            version = str(spec["openapi"])
            return "3" if version.startswith("3") else "2"
        elif "swagger" in spec:
            return "2"
        # Default to 3 for unknown format
        return "3"

    def parse_spec_file(self, filepath: str, api_id: str = "") -> dict:
        """
        Parses an OpenAPI/Swagger spec file from disk.

        Corner cases:
          - File not found
          - Encoding errors (some specs use latin-1)
          - Invalid YAML/JSON
          - Empty file
          - Valid JSON but not an API spec
        """
        filepath = Path(filepath)

        if not filepath.exists():
            logger.error(f"Spec file not found: {filepath}")
            return None

        # Read file — try UTF-8 first, fallback to latin-1
        try:
            content = filepath.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            logger.warning(f"UTF-8 decode failed for {filepath}, trying latin-1")
            try:
                content = filepath.read_text(encoding="latin-1")
            except Exception as e:
                logger.error(f"Failed to read {filepath}: {e}")
                return None

        # Corner case: empty file
        if not content.strip():
            logger.warning(f"Empty spec file: {filepath}")
            return None

        # Parse YAML or JSON
        try:
            if filepath.suffix in (".yaml", ".yml"):
                spec = yaml.safe_load(content)
            else:
                spec = json.loads(content)
        except (yaml.YAMLError, json.JSONDecodeError) as e:
            logger.error(f"Failed to parse spec file {filepath}: {e}")
            return None

        # Corner case: parsed but not a dict
        if not isinstance(spec, dict):
            logger.error(f"Spec file is not a dict: {filepath}")
            return None

        # Corner case: valid JSON/YAML but not an API spec
        if "paths" not in spec and "openapi" not in spec and "swagger" not in spec:
            logger.warning(f"File doesn't look like an API spec: {filepath}")
            return None

        # Route to correct parser
        version = self.detect_spec_version(spec)
        logger.debug(f"Detected spec version {version} for {api_id}")

        if version == "3":
            return self.openapi_parser.parse(spec)
        else:
            return self.swagger_parser.parse(spec)

    def parse_html_content(self, html: str, base_url: str = "",
                           api_name: str = "") -> dict:
        return self.html_parser.parse(html, base_url, api_name)

    def parse_markdown_content(self, content: str, base_url: str = "",
                               api_name: str = "") -> dict:
        return self.markdown_parser.parse(content, base_url, api_name)

    def parse_all(self, fetch_results: dict) -> list:
        """
        Processes all fetch results from Phase 1.
        Routes each item to the correct parser.
        Returns list of parsed API dicts.
        """
        logger.info("=" * 50)
        logger.info("Phase 2 — Parser starting")
        logger.info("=" * 50)

        parsed_apis = []
        total       = 0
        success     = 0
        failed      = 0

        # Parse apis.guru results (OpenAPI/Swagger specs)
        for result in fetch_results.get("apis_guru", []):
            if result.get("status") not in {"fetched", "cached"}:
                continue

            total   += 1
            api_id   = result["api_id"]
            filepath = result.get("filepath")

            if not filepath:
                failed += 1
                continue

            try:
                parsed = self.parse_spec_file(filepath, api_id)
                if parsed:
                    # Carry over categories from apis.guru metadata
                    parsed["apis_guru_categories"] = result.get("categories", [])
                    parsed["api_id"]               = api_id
                    parsed_apis.append(parsed)
                    success += 1
                    logger.debug(f"Parsed {api_id}: {parsed['endpoint_count']} endpoints")
                else:
                    failed += 1
                    logger.warning(f"Parser returned None for {api_id}")
            except Exception as e:
                failed += 1
                logger.error(f"Unexpected error parsing {api_id}: {e}")

        # Parse awesome-generative-ai-apis results
        # These need HTML parsing (no OpenAPI spec available for most)
        for ai_api in fetch_results.get("ai_apis", []):
            total  += 1
            name    = ai_api.get("name", "Unknown")
            parsed  = {
                "title"                : name,
                "description"          : f"Generative AI API — {name}",
                "base_url"             : ai_api.get("docs_url", ""),
                "version"              : "1.0.0",
                "endpoints"            : [],
                "source_format"        : "awesome_ai_apis_entry",
                "endpoint_count"       : 0,
                "requires_auth"        : ai_api.get("requires_auth", True),
                "source"               : "awesome-generative-ai-apis",
                "api_id"               : name.lower().replace(" ", "_"),
                "apis_guru_categories" : ["machine_learning"]
            }
            parsed_apis.append(parsed)
            success += 1

        # Parse manual sources from sources.yaml
        # These are community-contributed entries that aren't on apis.guru
        # or awesome-generative-ai-apis. The fetcher loads their metadata
        # but does not download spec files, so we create stub entries the
        # same way we do for ai_apis — categories are taken from the YAML
        # entry itself instead of being defaulted to machine_learning.
        for manual in fetch_results.get("manual_sources", []):
            total += 1
            name  = manual.get("name", "Unknown")
            # Prefer spec_url as base_url (more machine-readable);
            # fall back to docs_url if spec_url is absent.
            base_url = manual.get("spec_url") or manual.get("docs_url", "")

            # Use declared categories if provided, otherwise leave empty
            # so the Enricher's keyword categoriser can assign them.
            manual_categories = manual.get("categories", [])

            parsed = {
                "title"               : name,
                "description"         : manual.get("description",
                                                    f"Community API — {name}"),
                "base_url"            : base_url,
                "version"             : manual.get("version", "1.0.0"),
                "endpoints"           : [],
                "source_format"       : "manual_source",
                "endpoint_count"      : 0,
                "requires_auth"       : manual.get("requires_auth", True),
                "source"              : "manual",
                "api_id"              : name.lower().replace(" ", "_"),
                "apis_guru_categories": manual_categories,
            }
            parsed_apis.append(parsed)
            success += 1

        logger.info(f"Phase 2 complete: {success}/{total} APIs parsed, {failed} failed")

        # Save parsed results for Phase 3
        os.makedirs("data", exist_ok=True)
        with open("data/parsed_apis.json", "w") as f:
            json.dump(parsed_apis, f, indent=2)

        return parsed_apis


# ─────────────────────────────────────────────────────────────
# Demo
# ─────────────────────────────────────────────────────────────

def run_demo():
    parser = Parser()

    print("\n" + "="*55)
    print("  Phase 2 — Parser Demo")
    print("="*55)

    # Demo 1: OpenAPI 3.x spec
    print("\n[1] OpenAPI 3.x Parser")
    openapi3_spec = {
        "openapi": "3.0.0",
        "info": {"title": "OpenAI API", "description": "GPT models API", "version": "2.0.0"},
        "servers": [{"url": "https://api.openai.com/v1"}],
        "security": [{"BearerAuth": []}],
        "components": {
            "securitySchemes": {
                "BearerAuth": {"type": "http", "scheme": "bearer"}
            },
            "schemas": {
                "ChatRequest": {
                    "type": "object",
                    "properties": {
                        "model":    {"type": "string", "example": "gpt-4"},
                        "messages": {"type": "array",
                                     "items": {"type": "object"}}
                    }
                }
            }
        },
        "paths": {
            "/chat/completions": {
                "post": {
                    "summary": "Create chat completion",
                    "requestBody": {
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/ChatRequest"}
                            }
                        }
                    }
                }
            },
            "/models": {
                "get": {"summary": "List models"}
            },
            "/images/generations": {
                "post": {
                    "summary": "Generate image",
                    "requestBody": {
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "prompt": {"type": "string",
                                                   "example": "A sunset"},
                                        "n":      {"type": "integer",
                                                   "example": 1}
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    result = parser.openapi_parser.parse(openapi3_spec)
    print(f"  Title: {result['title']}")
    print(f"  Endpoints: {result['endpoint_count']}")
    for ep in result["endpoints"]:
        print(f"    {ep['method']} {ep['url']} — auth: {ep['auth_scheme']}")

    # Demo 2: Swagger 2.x spec
    print("\n[2] Swagger 2.x Parser")
    swagger2_spec = {
        "swagger": "2.0",
        "info": {"title": "Stripe API", "description": "Payment APIs", "version": "2024-01"},
        "host": "api.stripe.com",
        "basePath": "/v1",
        "schemes": ["https"],
        "securityDefinitions": {
            "bearerAuth": {"type": "basic"}
        },
        "paths": {
            "/charges": {
                "post": {
                    "summary": "Create charge",
                    "security": [{"bearerAuth": []}],
                    "parameters": [
                        {
                            "in"  : "body",
                            "name": "body",
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "amount"  : {"type": "integer", "example": 2000},
                                    "currency": {"type": "string",  "example": "usd"}
                                }
                            }
                        }
                    ]
                }
            },
            "/customers": {
                "get": {
                    "summary": "List customers",
                    "parameters": [
                        {"in": "query", "name": "limit", "type": "integer"}
                    ]
                }
            }
        }
    }

    result2 = parser.swagger_parser.parse(swagger2_spec)
    print(f"  Title: {result2['title']}")
    print(f"  Base URL: {result2['base_url']}")
    print(f"  Endpoints: {result2['endpoint_count']}")
    for ep in result2["endpoints"]:
        print(f"    {ep['method']} {ep['url']} — body: {ep['request_body']}")

    # Demo 3: HTML parsing
    print("\n[3] HTML Parser")
    mock_html = """
    <html>
    <head>
        <title>ElevenLabs API Reference | Voice Generation</title>
        <meta name="description" content="ElevenLabs voice generation API">
    </head>
    <body>
        <h2>Text to Speech</h2>
        <pre><code>POST /v1/text-to-speech/{voice_id}</code></pre>
        <h2>List Voices</h2>
        <pre><code>GET /v1/voices</code></pre>
        <h2>Get User Info</h2>
        <pre><code>GET /v1/user</code></pre>
    </body>
    </html>
    """
    result3 = parser.parse_html_content(
        mock_html, "https://api.elevenlabs.io", "ElevenLabs"
    )
    print(f"  Title: {result3['title']}")
    print(f"  Endpoints: {result3['endpoint_count']}")
    for ep in result3["endpoints"]:
        print(f"    {ep['method']} {ep['url']}")

    # Demo 4: Markdown parsing
    print("\n[4] Markdown Parser")
    mock_md = """
# Mistral AI API

Access Mistral's powerful language models via simple REST API.

## Chat Completions

`POST /v1/chat/completions`

Send messages to Mistral models.

## List Models

`GET /v1/models`

Returns available models.

## Embeddings

`POST /v1/embeddings`

Generate text embeddings.
    """
    result4 = parser.parse_markdown_content(
        mock_md, "https://api.mistral.ai", "Mistral AI"
    )
    print(f"  Title: {result4['title']}")
    print(f"  Endpoints: {result4['endpoint_count']}")
    for ep in result4["endpoints"]:
        print(f"    {ep['method']} {ep['url']}")

    # Demo 5: $ref resolution
    print("\n[5] $ref Resolution (circular reference protection)")
    spec_with_refs = {
        "openapi": "3.0.0",
        "info": {"title": "Ref Test API", "description": "Tests $ref resolution"},
        "servers": [{"url": "https://api.example.com"}],
        "components": {
            "schemas": {
                "Node": {
                    "type": "object",
                    "properties": {
                        "id"    : {"type": "string"},
                        "child" : {"$ref": "#/components/schemas/Node"}
                    }
                }
            }
        },
        "paths": {
            "/nodes": {
                "get": {"summary": "Get nodes"}
            }
        }
    }
    result5 = parser.openapi_parser.parse(spec_with_refs)
    print(f"  Circular $ref handled safely: {result5['endpoint_count']} endpoints parsed")

    print("\n" + "="*55)
    print("  Phase 2 complete — all parsers working")
    print("="*55)


if __name__ == "__main__":
    run_demo()
