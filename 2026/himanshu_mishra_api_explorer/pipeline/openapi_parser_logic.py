import requests
import yaml

def assign_tags(title, description):
    text = f"{title} {description}".lower()
    tags = []
    if "space" in text or "astronomy" in text: tags.append("Science")
    if "finance" in text or "checkout" in text: tags.append("Finance")
    if "pet" in text or "animal" in text: tags.append("Animals")
    if not tags: tags.append("General")
    return tags

def resolve_ref(ref_string, components):
    parts = ref_string.split('/')
    if parts[1] == 'components':
        return components.get(parts[2], {}).get(parts[3], {})
    return {}

def generate_sample_from_schema(schema, components):
    if "$ref" in schema:
        schema = resolve_ref(schema["$ref"], components)
    if "example" in schema: return schema["example"]

    schema_type = schema.get("type", "string")

    if schema_type == "object" or "properties" in schema:
        sample = {}
        for prop_name, prop_schema in schema.get("properties", {}).items():
            sample[prop_name] = generate_sample_from_schema(prop_schema, components)
        return sample
    elif schema_type == "array" and "items" in schema:
        return [generate_sample_from_schema(schema["items"], components)]
    elif schema_type == "string":
        fmt = schema.get("format", "")
        return "2024-03-26T12:00:00Z" if fmt == "date-time" else "string"
    elif schema_type == "integer": return 0
    elif schema_type == "number": return 0.0
    elif schema_type == "boolean": return True
    return None

def parse_single_api(source_dict, score_data):
    """Downloads a single API, parses its parameters and generates fake JSON outputs."""
    api_name = source_dict.get("name")
    api_url = source_dict.get("url")
    print(f"[*] Processing -> {api_name}")

    try:
        response = requests.get(api_url, timeout=10)
        response.raise_for_status() 
        
        try: spec = response.json()
        except: spec = yaml.safe_load(response.text)

        if not isinstance(spec, dict) or "paths" not in spec:
            raise ValueError("Missing 'paths' root object.")

        title = spec.get("info", {}).get("title", api_name)
        description = spec.get("info", {}).get("description", "")
        base_url = spec.get("servers", [{}])[0].get("url", "https://example.com")
        
        components = spec.get("components", {})
        global_auth = list(components.get("securitySchemes", {}).keys())

        endpoints = []
        for path, methods in spec["paths"].items():
            for method, details in methods.items():
                if method.lower() not in ["get", "post", "put", "delete", "patch"]:
                    continue

                headers, queries, path_vars = [], [], []
                for p in details.get("parameters", []):
                    if "$ref" in p: p = resolve_ref(p["$ref"], components)
                    p_in = p.get("in", "")
                    p_info = {"name": p.get("name"), "required": p.get("required", False)}
                    if p_in == "header": headers.append(p_info)
                    elif p_in == "query": queries.append(p_info)
                    elif p_in == "path": path_vars.append(p_info)

                endpoint_auth = []
                for security_req in details.get("security", []):
                    endpoint_auth.extend(list(security_req.keys()))

                req_payload = None
                req_body = details.get("requestBody", {})
                if "$ref" in req_body: req_body = resolve_ref(req_body["$ref"], components)
                if "application/json" in req_body.get("content", {}):
                    req_payload = generate_sample_from_schema(req_body["content"]["application/json"].get("schema", {}), components)

                res_payload = None
                res = details.get("responses", {}).get("200", details.get("responses", {}).get("201", {}))
                if "$ref" in res: res = resolve_ref(res["$ref"], components)
                if "application/json" in res.get("content", {}):
                    res_payload = generate_sample_from_schema(res["content"]["application/json"].get("schema", {}), components)

                endpoints.append({
                    "method": method.upper(),
                    "path": path,
                    "summary": details.get("summary", ""),
                    "auth_required": endpoint_auth if endpoint_auth else global_auth,
                    "parameters": {"headers": headers, "path_variables": path_vars, "query_parameters": queries},
                    "request_body_sample": req_payload,
                    "response_body_sample": res_payload
                })

        return {
            "status": "success",
            "data": {
                "name": api_name,
                "tags": assign_tags(title, description),
                "base_url": base_url,
                "_original_url": api_url,
                "community_score": score_data,
                "global_auth_methods": components.get("securitySchemes", {}),
                "endpoints_count": len(endpoints),
                "endpoints": endpoints
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "data": {"name": api_name, "url": api_url, "error": str(e)}
        }