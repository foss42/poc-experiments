"""
tagger.py — Simple keyword-based tagging engine

Assigns a category to each endpoint using path + summary.
Uses scoring instead of first-match to avoid incorrect tagging.
"""

TAG_RULES = {
    "Animals": ["pet", "animal", "dog", "cat"],
    "User/Auth": ["user", "login", "auth", "token", "register"],
    "Store": ["store", "order", "inventory", "product"],
}

DEFAULT_TAG = "General"


def tag_endpoint(endpoint: dict) -> str:
    """
    Return a category tag for an endpoint using keyword scoring.
    Falls back to 'General' if no keywords match.
    """
    haystack = f"{endpoint['path']} {endpoint['summary']}".lower()

    scores = {tag: 0 for tag in TAG_RULES}

    for tag, keywords in TAG_RULES.items():
        for kw in keywords:
            if kw in haystack:
                scores[tag] += 1

    best_tag = max(scores, key=scores.get)

    return best_tag if scores[best_tag] > 0 else DEFAULT_TAG


def tag_all(endpoints: list[dict]) -> list[dict]:
    """Attach a 'tag' field to each endpoint."""
    for endpoint in endpoints:
        endpoint["tag"] = tag_endpoint(endpoint)
    return endpoints