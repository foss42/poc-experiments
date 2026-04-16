"""
API Explorer - OpenAPI Parser Pipeline
GSoC 2026 PoC by hitarthium

Takes an OpenAPI 3.x spec URL or file path,
outputs a clean JSON template for the API Explorer registry.
"""

import json
import sys
import httpx
import yaml


CATEGORY_KEYWORDS = {
    "AI & ML":       ["ai", "ml", "model", "llm", "inference", "embedding", "vision", "nlp", "openai", "anthropic", "gemini"],
    "Weather":       ["weather", "forecast", "climate", "temperature", "humidity", "wind", "precipitation"],
    "Finance":       ["finance", "stock", "payment", "bank", "currency", "crypto", "invoice", "billing", "stripe", "plaid"],
    "Social Media":  ["social", "twitter", "instagram", "facebook", "linkedin", "post", "feed", "followers"],
    "Maps & Geo":    ["map", "geo", "location", "coordinates", "address", "route", "distance", "places"],
    "Developer Tools": ["github", "gitlab", "ci", "deploy", "repository", "webhook", "token", "auth"],
    "Communication": ["email", "sms", "message", "notification", "slack", "whatsapp", "twilio", "sendgrid"],
    "Data & Analytics": ["analytics", "metrics", "dashboard", "report", "chart", "data", "statistics"],
    "Entertainment": ["movie", "music", "game", "spotify", "youtube", "netflix", "podcast", "book"],
    "E-Commerce":    ["ecommerce", "shop", "product", "order", "cart", "inventory", "shipping"],
}


def detect_category(title: str, description: str) -> str:
    text = (title + " " + description).lower()
    scores = {}
    for category, keywords in CATEGORY_KEYWORDS.items():
        scores[category] = sum(1 for kw in keywords if kw in text)
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "General"


def detect_auth_type(security_schemes: dict) -> str:
    if not security_schemes:
        return "none"
    for scheme in security_schemes.values():
        t = scheme.get("type", "").lower()
        if t == "apikey":
            return "api_key"
        if t == "oauth2":
            return "oauth2"
        if t == "http":
            return scheme.get("scheme", "bearer").lower()
    return "unknown"


def extract_example(schema: dict, depth: int = 0) -> any:
    if depth > 3 or not schema:
        return None
    if "example" in schema:
        return schema["example"]
    t = schema.get("type", "")
    if t == "string":
        return schema.get("enum", ["example"])[0]
    if t == "integer" or t == "number":
        return 42
    if t == "boolean":
        return True
    if t == "array":
        items = schema.get("items", {})
        return [extract_example(items, depth + 1)]
    if t == "object" or "properties" in schema:
        props = schema.get("properties", {})
        return {k: extract_example(v, depth + 1) for k, v in list(props.items())[:3]}
    return None


def parse_endpoint(path: str, method: str, operation: dict, components: dict) -> dict:
    params = []
    for param in operation.get("parameters", []):
        if "$ref" in param:
            ref_key = param["$ref"].split("/")[-1]
            param = components.get("parameters", {}).get(ref_key, param)

        schema = param.get("schema", {})
        params.append({
            "name":     param.get("name", ""),
            "in":       param.get("in", "query"),
            "required": param.get("required", False),
            "type":     schema.get("type", "string"),
            "example":  schema.get("example", param.get("example", "YOUR_VALUE")),
        })

    sample_body = None
    req_body = operation.get("requestBody", {})
    if req_body:
        content = req_body.get("content", {})
        for mime, media in content.items():
            if "json" in mime:
                schema = media.get("schema", {})
                sample_body = extract_example(schema)
                break

    sample_response = None
    responses = operation.get("responses", {})
    for code in ["200", "201", "default"]:
        if code in responses:
            resp = responses[code]
            content = resp.get("content", {})
            for mime, media in content.items():
                if "json" in mime:
                    schema = media.get("schema", {})
                    sample_response = extract_example(schema)
                    break
            break

    return {
        "method":          method.upper(),
        "path":            path,
        "summary":         operation.get("summary", operation.get("description", "")[:80]),
        "params":          params,
        "sample_body":     sample_body,
        "sample_response": sample_response,
    }


def parse_openapi(source: str) -> dict:
    print(f"Fetching spec from: {source}")

    if source.startswith("http"):
        response = httpx.get(source, follow_redirects=True, timeout=15)
        response.raise_for_status()
        raw = response.text
    else:
        with open(source) as f:
            raw = f.read()

    if source.endswith(".yaml") or source.endswith(".yml") or raw.strip().startswith("openapi:"):
        spec = yaml.safe_load(raw)
    else:
        spec = json.loads(raw)

    info       = spec.get("info", {})
    servers    = spec.get("servers", [{}])
    components = spec.get("components", {})
    security_schemes = components.get("securitySchemes", {})

    title       = info.get("title", "Unknown API")
    description = info.get("description", "")[:200]
    base_url    = servers[0].get("url", "") if servers else ""
    auth_type   = detect_auth_type(security_schemes)
    category    = detect_category(title, description)

    endpoints = []
    paths = spec.get("paths", {})
    for path, path_item in list(paths.items())[:10]:
        for method in ["get", "post", "put", "patch", "delete"]:
            if method in path_item:
                operation = path_item[method]
                ep = parse_endpoint(path, method, operation, components)
                endpoints.append(ep)

    template = {
        "id":          title.lower().replace(" ", "-").replace("/", "-")[:40],
        "name":        title,
        "provider":    title.split()[0] if title else "Unknown",
        "category":    category,
        "auth_type":   auth_type,
        "base_url":    base_url,
        "description": description,
        "docs_url":    info.get("termsOfService", ""),
        "version":     info.get("version", "1.0.0"),
        "endpoints":   endpoints,
    }

    return template


def main():
    test_specs = [
        "https://petstore3.swagger.io/api/v3/openapi.json",
        "https://api.apis.guru/v2/specs/openweathermap.org/1.0.0/openapi.yaml",
    ]

    source = sys.argv[1] if len(sys.argv) > 1 else test_specs[0]

    try:
        result = parse_openapi(source)
        output_path = "sample_output.json"
        with open(output_path, "w") as f:
            json.dump(result, f, indent=2)
        print(f"\nSuccess! Template written to {output_path}")
        print(f"API: {result['name']}")
        print(f"Category: {result['category']}")
        print(f"Auth: {result['auth_type']}")
        print(f"Endpoints extracted: {len(result['endpoints'])}")
        print(f"\nSample:\n{json.dumps(result['endpoints'][0], indent=2) if result['endpoints'] else 'none'}")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()