"""
parser.py — Parser Engine
Fetches an OpenAPI JSON spec from a public URL.
"""

import requests


def fetch_openapi_spec(url: str) -> dict:
    """Fetch and return OpenAPI spec as a dict from a given URL."""
    response = requests.get(url, timeout=10)
    response.raise_for_status()
    return response.json()
