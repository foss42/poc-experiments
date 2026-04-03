"""
builder.py — Template Builder
Constructs a structured JSON template from API metadata and tagged endpoints.
"""


def build_template(spec: dict, endpoints: list[dict]) -> dict:
    """
    Build a JSON-serialisable template dict from spec info and tagged endpoints.

    Schema:
    {
        "name":        str,   # API title from spec info
        "version":     str,   # API version from spec info
        "description": str,   # API description from spec info
        "category":    str,   # Most common tag across all endpoints
        "source":      str,   # OpenAPI spec URL (populated by main.py)
        "endpoints": [
            {
                "path":    str,
                "method":  str,
                "summary": str,
                "tag":     str,
            },
            ...
        ]
    }
    """
    info = spec.get("info", {})

    dominant_tag = _dominant_tag(endpoints)

    return {
        "name":        info.get("title", "Unknown API"),
        "version":     info.get("version", "N/A"),
        "description": info.get("description", ""),
        "category":    dominant_tag,
        "source":      "",      
        "endpoints":   endpoints,
    }




def _dominant_tag(endpoints: list[dict]) -> str:
    """Return the tag that appears most frequently across all endpoints."""
    if not endpoints:
        return "General"

    counts: dict[str, int] = {}
    for ep in endpoints:
        tag = ep.get("tag", "General")
        counts[tag] = counts.get(tag, 0) + 1

    return max(counts, key=counts.__getitem__)
