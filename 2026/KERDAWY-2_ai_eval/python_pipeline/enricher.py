"""
API Enricher — Auto-categorization, quality scoring, and tag generation for parsed OpenAPI specs.

Part of the API Explorer PoC (GSoC 2026, API Dash).
Called by parser.py after the raw spec is parsed to add category, quality_score, and generated tags.
"""

import re
from typing import Any

# ---------------------------------------------------------------------------
# Category keyword maps
# ---------------------------------------------------------------------------

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "AI & ML": [
        "openai", "ai", "ml", "machine learning", "model", "inference",
        "hugging", "neural", "gpt", "llm", "embedding", "completion",
        "prediction", "vision", "nlp", "deep learning", "tensor",
    ],
    "Weather": [
        "weather", "forecast", "temperature", "climate", "wind",
        "humidity", "precipitation", "meteorolog", "atmospheric",
    ],
    "Finance": [
        "payment", "stripe", "billing", "invoice", "currency", "coin",
        "crypto", "stock", "trading", "banking", "financial", "money",
        "exchange", "wallet", "transaction", "ledger", "price",
    ],
    "Developer Tools": [
        "github", "git", "repository", "commit", "deploy", "ci",
        "pipeline", "webhook", "oauth", "token", "sdk", "developer",
        "api", "registry", "package", "npm", "build", "code",
    ],
    "Maps & Geo": [
        "maps", "geocode", "geocoding", "location", "places",
        "directions", "gps", "latitude", "longitude", "geographic",
        "route", "navigation", "coordinate", "address",
    ],
    "Communication": [
        "email", "sms", "sendgrid", "twilio", "message", "notification",
        "chat", "voice", "call", "messaging", "mail", "push",
    ],
    "Data": [
        "nasa", "space", "data", "dataset", "open data", "science",
        "research", "analytics", "statistic", "public api", "government",
        "image", "media", "upload", "video", "audio", "storage", "cdn",
        "cloud", "file",
    ],
}

VALID_CATEGORIES = list(CATEGORY_KEYWORDS.keys()) + ["Other"]


def categorize_api(api_info: dict[str, Any]) -> str:
    """Assign one of 8 categories based on keyword matching against API metadata.

    Scans title, description, server URLs, and tags for keywords.
    Returns the category with the highest match count, or "Other" if none match.
    """
    text_parts: list[str] = []

    for field in ("title", "description", "name"):
        val = api_info.get(field, "")
        if val:
            text_parts.append(str(val).lower())

    # Include server URLs if available
    servers = api_info.get("servers", [])
    if isinstance(servers, list):
        for srv in servers:
            if isinstance(srv, dict):
                text_parts.append(str(srv.get("url", "")).lower())
            elif isinstance(srv, str):
                text_parts.append(srv.lower())

    # Include tags
    tags = api_info.get("tags", [])
    if isinstance(tags, list):
        for tag in tags:
            if isinstance(tag, dict):
                text_parts.append(str(tag.get("name", "")).lower())
                text_parts.append(str(tag.get("description", "")).lower())
            elif isinstance(tag, str):
                text_parts.append(tag.lower())

    combined = " ".join(text_parts)

    scores: dict[str, int] = {}
    for category, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in combined)
        if score > 0:
            scores[category] = score

    if not scores:
        return "Other"

    return max(scores, key=lambda k: scores[k])


def score_api_quality(parsed_result: dict[str, Any]) -> int:
    """Compute a quality score (0-100) for a parsed API spec.

    Weighted factors:
      - Has description:        +15
      - Has auth defined:       +15
      - Endpoint count (scaled):+20  (1 pt per endpoint, max 20)
      - Has examples in spec:   +10
      - Has tags:               +10
      - Parameter documentation: +10
      - Has servers defined:    +10
      - Has contact/license:    +10
    """
    score = 0
    api_info = parsed_result.get("api_info", parsed_result)

    # Has description (+15)
    desc = api_info.get("description", "")
    if desc and len(str(desc).strip()) > 10:
        score += 15

    # Has auth defined (+15)
    auth_type = parsed_result.get("auth_type", api_info.get("auth_type", "none"))
    auth_schemes = parsed_result.get("auth_schemes", [])
    if auth_type != "none" or auth_schemes:
        score += 15

    # Endpoint count scaled (+20 max)
    endpoints = parsed_result.get("endpoints", [])
    score += min(len(endpoints), 20)

    # Has examples (+10)
    has_examples = False
    for ep in endpoints:
        if ep.get("request_body_example") or ep.get("response_example"):
            has_examples = True
            break
    if has_examples:
        score += 10

    # Has tags (+10)
    tags = api_info.get("tags", parsed_result.get("tags", []))
    if tags and len(tags) > 0:
        score += 10

    # Parameter documentation (+10)
    documented_params = 0
    total_params = 0
    for ep in endpoints:
        for param in ep.get("parameters", []):
            total_params += 1
            if param.get("description"):
                documented_params += 1
    if total_params > 0 and (documented_params / total_params) >= 0.5:
        score += 10

    # Has servers defined (+10)
    servers = api_info.get("servers", [])
    base_url = parsed_result.get("base_url", api_info.get("base_url", ""))
    if servers or base_url:
        score += 10

    # Has contact/license (+10)
    contact = api_info.get("contact", {})
    api_license = api_info.get("license", {})
    if contact or api_license:
        score += 10

    return min(score, 100)


def generate_tags(parsed_result: dict[str, Any]) -> list[str]:
    """Generate meaningful tags from the spec's existing tags, path names, and title words.

    Deduplicates, lowercases, and returns a sorted list.
    """
    tag_set: set[str] = set()
    api_info = parsed_result.get("api_info", parsed_result)

    # Extract from spec tags
    tags = api_info.get("tags", parsed_result.get("tags", []))
    if isinstance(tags, list):
        for tag in tags:
            if isinstance(tag, dict):
                name = tag.get("name", "")
            else:
                name = str(tag)
            if name:
                tag_set.add(name.lower().strip())

    # Extract meaningful words from title
    title = api_info.get("title", "")
    if title:
        words = re.findall(r"[a-zA-Z]{3,}", title)
        stop_words = {
            "the", "and", "for", "with", "api", "rest", "openapi",
            "swagger", "version", "spec", "specification", "http",
        }
        for word in words:
            w = word.lower()
            if w not in stop_words:
                tag_set.add(w)

    # Extract from endpoint paths
    endpoints = parsed_result.get("endpoints", [])
    for ep in endpoints:
        path = ep.get("path", "")
        segments = path.strip("/").split("/")
        for seg in segments:
            # Skip path parameters like {id}
            if seg.startswith("{") or not seg:
                continue
            # Split camelCase / snake_case
            parts = re.findall(r"[a-zA-Z]{3,}", seg)
            for part in parts:
                tag_set.add(part.lower())

    # Remove overly generic tags
    generic = {"api", "get", "set", "list", "all", "new", "the", "index"}
    tag_set -= generic

    return sorted(tag_set)
