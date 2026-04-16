import os
import sys
import json
import yaml
import argparse
import traceback
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from bs4 import BeautifulSoup
from prance import ResolvingParser

# --- Models ---

class ParsedEndpoint(BaseModel):
    method: str
    path: str
    summary: Optional[str] = None
    description: Optional[str] = None
    parameters: List[Dict[str, Any]] = []
    request_body: Optional[Dict[str, Any]] = None
    response: Optional[Dict[str, Any]] = None
    security: List[str] = []

class ParsedAPI(BaseModel):
    api_id: str
    title: str
    description: Optional[str] = None
    version: Optional[str] = None
    base_url: Optional[str] = None
    security_schemes: Dict[str, Any] = {}
    endpoints: List[ParsedEndpoint] = []
    source_type: str  # "openapi" or "html"
    parse_errors: List[str] = []

# --- OpenAPI Parser ---

class OpenAPIParser:
    """Parser for OpenAPI 3.x and Swagger 2.x specs using prance for resolution."""

    @staticmethod
    def parse(api_id: str, file_path: str) -> ParsedAPI:
        """
        Parses an OpenAPI/Swagger spec file.
        
        Args:
            api_id: Unique identifier for the API.
            file_path: Path to the raw spec file.
            
        Returns:
            A ParsedAPI object containing extracted data.
        """
        parse_errors = []
        try:
            # prance.ResolvingParser resolves all $ref references.
            # It supports both JSON and YAML.
            parser = ResolvingParser(file_path, strict=False)
            spec = parser.specification
            if not isinstance(spec, dict):
                raise ValueError(f"Specification is not a dictionary (got {type(spec).__name__})")
        except Exception as e:
            return ParsedAPI(
                api_id=api_id,
                title=api_id,
                source_type="openapi",
                parse_errors=[f"Failed to resolve/parse spec: {str(e)}"]
            )

        info = spec.get("info", {})
        title = info.get("title") or api_id
        description = info.get("description")
        version = info.get("version")

        # Detect version and extract base_url
        is_swagger = "swagger" in spec
        base_url = None
        if is_swagger:
            host = spec.get("host", "")
            base_path = spec.get("basePath", "")
            scheme = spec.get("schemes", ["https"])[0] if spec.get("schemes") else "https"
            if host:
                base_url = f"{scheme}://{host}{base_path}"
        else:
            servers = spec.get("servers", [])
            if servers:
                base_url = servers[0].get("url")

        # Extract security schemes
        security_schemes = {}
        if is_swagger:
            security_schemes = spec.get("securityDefinitions", {})
        else:
            security_schemes = spec.get("components", {}).get("securitySchemes", {})

        global_security = spec.get("security", [])
        global_security_names = [list(s.keys())[0] for s in global_security if s]

        endpoints = []
        paths = spec.get("paths", {})
        for path, path_item in paths.items():
            # Parameters can be defined at the path level
            path_params = path_item.get("parameters", [])
            
            for method in ["get", "post", "put", "delete", "patch", "options", "head", "trace"]:
                operation = path_item.get(method)
                if not isinstance(operation, dict):
                    continue

                try:
                    summary = operation.get("summary")
                    op_description = operation.get("description") or path_item.get("description")
                    
                    # Skip endpoints with no identifying info
                    if not summary and not op_description and not path:
                        continue

                    # Extract parameters
                    params = []
                    # Merge path-level and operation-level parameters
                    all_params = path_params + operation.get("parameters", [])
                    for p in all_params:
                        # Required fields: name, in
                        p_name = p.get("name")
                        p_in = p.get("in")
                        if not p_name or not p_in:
                            continue
                        
                        params.append({
                            "name": p_name,
                            "in": p_in,
                            "required": p.get("required", False),
                            "schema_type": p.get("schema", {}).get("type") or p.get("type"),
                            "description": p.get("description")
                        })

                    # Extract request body
                    request_body = None
                    if "requestBody" in operation: # OpenAPI 3
                        rb = operation["requestBody"]
                        content = rb.get("content", {})
                        if content:
                            ct = next(iter(content))
                            request_body = {
                                "content_type": ct,
                                "schema": content[ct].get("schema"),
                                "example": content[ct].get("example") or content[ct].get("examples")
                            }
                    elif "parameters" in operation: # Swagger 2
                        body_param = next((p for p in operation["parameters"] if p.get("in") == "body"), None)
                        if body_param:
                            request_body = {
                                "content_type": "application/json", # Default for body params
                                "schema": body_param.get("schema"),
                                "example": body_param.get("x-example")
                            }

                    # Extract first successful response (2xx)
                    response_data = None
                    responses = operation.get("responses", {})
                    success_code = next((code for code in responses if code.startswith("2")), None)
                    if success_code:
                        resp = responses[success_code]
                        if "content" in resp: # OpenAPI 3
                            content = resp.get("content", {})
                            if content:
                                ct = next(iter(content))
                                response_data = {
                                    "content_type": ct,
                                    "schema": content[ct].get("schema"),
                                    "example": content[ct].get("example")
                                }
                        elif "schema" in resp: # Swagger 2
                            response_data = {
                                "content_type": "application/json",
                                "schema": resp.get("schema"),
                                "example": resp.get("x-example")
                            }

                    # Extract security
                    op_security = operation.get("security", [])
                    if op_security:
                        sec_names = [list(s.keys())[0] for s in op_security if s]
                    else:
                        sec_names = global_security_names

                    endpoints.append(ParsedEndpoint(
                        method=method.upper(),
                        path=path,
                        summary=summary,
                        description=op_description,
                        parameters=params,
                        request_body=request_body,
                        response=response_data,
                        security=sec_names
                    ))
                except Exception as e:
                    parse_errors.append(f"Error parsing {method.upper()} {path}: {str(e)}")

        return ParsedAPI(
            api_id=api_id,
            title=title,
            description=description,
            version=version,
            base_url=base_url,
            security_schemes=security_schemes,
            endpoints=endpoints,
            source_type="openapi",
            parse_errors=parse_errors
        )

# --- HTML Parser ---

class HTMLParser:
    """Best-effort parser for HTML API documentation."""

    @staticmethod
    def parse(api_id: str, file_path: str) -> ParsedAPI:
        """
        Parses an HTML file for API endpoints.
        
        Args:
            api_id: Unique identifier for the API.
            file_path: Path to the raw HTML file.
            
        Returns:
            A ParsedAPI object with extracted endpoints.
        """
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                soup = BeautifulSoup(f, "html.parser")
        except Exception as e:
            return ParsedAPI(
                api_id=api_id,
                title=api_id,
                source_type="html",
                parse_errors=[f"Failed to read/parse HTML: {str(e)}"]
            )

        title = str(soup.title.string) if soup.title and soup.title.string else api_id
        endpoints = []
        parse_errors = []

        # Heuristic 1: Look for tables often used for endpoints
        for table in soup.find_all("table"):
            rows = table.find_all("tr")
            for row in rows:
                cells = row.find_all(["td", "th"])
                if len(cells) >= 2:
                    text_content = [c.get_text(strip=True) for c in cells]
                    # Common pattern: Method, Path, Description
                    method_candidate = text_content[0].upper()
                    if method_candidate in ["GET", "POST", "PUT", "DELETE", "PATCH"]:
                        path = text_content[1]
                        summary = text_content[2] if len(text_content) > 2 else None
                        endpoints.append(ParsedEndpoint(
                            method=method_candidate,
                            path=path,
                            summary=summary,
                            parameters=[],
                            security=[]
                        ))

        # Heuristic 2: Look for <code> blocks or headings containing methods
        if not endpoints:
            for code in soup.find_all(["code", "pre", "h1", "h2", "h3", "h4"]):
                text = code.get_text(strip=True)
                for m in ["GET", "POST", "PUT", "DELETE", "PATCH"]:
                    if text.startswith(m) and " " in text:
                        parts = text.split(" ")
                        if len(parts) >= 2:
                            method = parts[0].upper()
                            path = parts[1]
                            endpoints.append(ParsedEndpoint(
                                method=method,
                                path=path,
                                summary=None,
                                parameters=[],
                                security=[]
                            ))
                            break

        return ParsedAPI(
            api_id=api_id,
            title=title,
            source_type="html",
            endpoints=endpoints,
            parse_errors=parse_errors
        )

# --- Entry Point ---

def parse(api_id: str, source_type: str) -> ParsedAPI:
    """
    Main function to parse an API spec based on its type.
    
    Args:
        api_id: Unique identifier for the API.
        source_type: Type of source ("openapi" or "html").
        
    Returns:
        A ParsedAPI object.
    """
    # Use the safe ID conversion for filesystem lookups
    from pipeline.fetcher import make_safe_id
    safe_id = make_safe_id(api_id)
    
    # Determine file extension based on what's available in raw/
    base_path = f"raw/{safe_id}"
    potential_files = [f"{base_path}.json", f"{base_path}.yaml", f"{base_path}.html"]
    
    actual_file = None
    for f in potential_files:
        if os.path.exists(f):
            actual_file = f
            break
            
    if not actual_file:
        return ParsedAPI(
            api_id=api_id,
            title=api_id,
            source_type=source_type,
            parse_errors=[f"Source file not found for {api_id} (tried {safe_id})"]
        )

    if source_type == "openapi":
        return OpenAPIParser.parse(api_id, actual_file)
    elif source_type == "html":
        return HTMLParser.parse(api_id, actual_file)
    else:
        return ParsedAPI(
            api_id=api_id,
            title=api_id,
            source_type=source_type,
            parse_errors=[f"Unsupported source type: {source_type}"]
        )

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Parse API specs into an intermediate structure.")
    parser.add_argument("--api-id", required=True, help="API ID to parse")
    parser.add_argument("--source-type", choices=["openapi", "html"], required=True, help="Type of spec")
    
    args = parser.parse_args()
    
    try:
        parsed_data = parse(args.api_id, args.source_type)
        # Pretty print the Pydantic model as JSON
        print(parsed_data.model_dump_json(indent=2))
    except Exception as e:
        print(json.dumps({
            "api_id": args.api_id,
            "error": str(e),
            "traceback": traceback.format_exc()
        }, indent=2))
        sys.exit(1)
