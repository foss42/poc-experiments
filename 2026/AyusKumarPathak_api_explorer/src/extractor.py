"""
extractor.py — Metadata Extraction
Extracts endpoints (path + HTTP method + summary) from an OpenAPI spec.
"""

SUPPORTED_METHODS = {"get", "post", "put", "patch", "delete", "options", "head"}


def extract_endpoints(spec: dict) -> list[dict]:
    """
    Extract all endpoints from the OpenAPI 'paths' object.

    Returns a list of dicts:
        { "path": str, "method": str, "summary": str }
    """
    endpoints = []
    paths = spec.get("paths", {})

    for path, path_item in paths.items():
        for method, operation in path_item.items():
            if method.lower() not in SUPPORTED_METHODS:
                continue
            endpoints.append({
                "path": path,
                "method": method.upper(),
                "summary": operation.get("summary", "No summary provided"),
            })

    return endpoints
