import os
import sys
import json
import re
import argparse
import logging
import traceback
import asyncio
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from slugify import slugify

# Import models from previous phases
from pipeline.parser import ParsedEndpoint
from pipeline.enricher import EnrichedAPI, run_enrichment

# Configure logging
logging.basicConfig(level=logging.WARNING, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

# --- Models ---

class EndpointTemplate(BaseModel):
    id: str
    name: str
    description: Optional[str]
    method: str
    url: str
    headers: Dict[str, str]
    query_params: Dict[str, str]
    body: Optional[Any]
    sample_response: Any
    auth_placeholders: List[str]
    notes: str

class GeneratedAPITemplates(BaseModel):
    api_id: str
    endpoint_count: int
    templates: List[EndpointTemplate]

# --- Generator Logic ---

class TemplateGenerator:
    """Generates API Dash request templates from EnrichedAPI data."""

    @staticmethod
    def _slugify_unique(text: str, existing_ids: set) -> str:
        """Generates a unique kebab-case slug for an endpoint."""
        base_slug = slugify(text) or "endpoint"
        slug = base_slug
        counter = 2
        while slug in existing_ids:
            slug = f"{base_slug}-{counter}"
            counter += 1
        existing_ids.add(slug)
        return slug

    @staticmethod
    def _process_path(path: str) -> tuple[str, List[str]]:
        """
        Replaces {param} with {{PARAM}} in path and identifies placeholders.
        Returns (processed_path, placeholders).
        """
        placeholders = []
        
        # Regex to find {param_name}
        def replace(match):
            param_name = match.group(1).upper()
            placeholder = f"{{{{{param_name}}}}}"
            placeholders.append(placeholder)
            return placeholder

        processed_path = re.sub(r'\{([^}]+)\}', replace, path)
        return processed_path, list(set(placeholders))

    @staticmethod
    def _get_placeholder_value(prop_type: str) -> Any:
        """Returns a default placeholder value based on property type."""
        mapping = {
            "string": "",
            "integer": 0,
            "number": 0.0,
            "boolean": False,
            "array": [],
            "object": {}
        }
        return mapping.get(prop_type, "")

    @classmethod
    def _build_body(cls, schema: Dict[str, Any]) -> Any:
        """Recursively builds a sample body from an OpenAPI schema."""
        if not schema or not isinstance(schema, dict):
            return None

        # If example is provided at this level, use it
        if "example" in schema:
            return schema["example"]
        
        # Determine type
        spec_type = schema.get("type")
        
        if spec_type == "object" or "properties" in schema:
            properties = schema.get("properties", {})
            required_fields = schema.get("required", [])
            
            body_dict = {}
            # If required is specified, only include those. Otherwise, all top-level.
            fields_to_include = required_fields if required_fields else properties.keys()
            
            for field in fields_to_include:
                if field in properties:
                    prop_schema = properties[field]
                    # Check for example/default in property schema
                    if "example" in prop_schema:
                        body_dict[field] = prop_schema["example"]
                    elif "default" in prop_schema:
                        body_dict[field] = prop_schema["default"]
                    else:
                        # Falling back to type placeholder
                        field_type = prop_schema.get("type", "string")
                        body_dict[field] = cls._get_placeholder_value(field_type)
            return body_dict

        if spec_type == "array":
            items = schema.get("items", {})
            return [cls._build_body(items)] if items else []

        # Scalar types
        return cls._get_placeholder_value(spec_type or "string")

    @classmethod
    def generate(cls, enriched_api: EnrichedAPI) -> GeneratedAPITemplates:
        """
        Main generation logic for an EnrichedAPI.
        """
        templates = []
        existing_ids = set()
        provider_slug = cls._slugify_unique(enriched_api.provider, set()).upper().replace("-", "_")

        for ep in enriched_api.endpoints:
            if not ep.method or not ep.path:
                logger.warning("Skipping malformed endpoint: %s", ep)
                continue

            # 1. ID & Name
            ep_id_source = ep.summary or ep.path
            if not ep.summary and ep.method:
                ep_id_source = f"{ep.method}-{ep.path}"
            
            unique_id = cls._slugify_unique(ep_id_source, existing_ids)
            name = ep.summary if ep.summary else f"{ep.method} {ep.path}"
            
            # 2. Description
            description = ep.description or ep.summary or None

            # 3. URL and Path Params
            processed_path, path_placeholders = cls._process_path(ep.path)
            base_url = (enriched_api.base_url or "").rstrip("/")
            full_url = f"{base_url}{processed_path}"

            # 4. Auth, Headers, and Query Params
            headers = {}
            query_params = {}
            
            # Content-Type for mutations
            if ep.method in ["POST", "PUT", "PATCH"]:
                headers["Content-Type"] = "application/json"

            # Auth Headers/Params
            auth_type = enriched_api.auth_type
            if auth_type == "bearer_token":
                headers["Authorization"] = f"Bearer {{{{ {provider_slug}_API_KEY }}}}"
            elif auth_type == "oauth2":
                headers["Authorization"] = f"Bearer {{{{ {provider_slug}_ACCESS_TOKEN }}}}"
            elif auth_type == "basic":
                headers["Authorization"] = f"Basic {{{{ {provider_slug}_BASE64_CREDENTIALS }}}}"
            elif auth_type == "api_key":
                # Find the api_key scheme details
                api_key_name = "X-Api-Key" # Fallback
                api_key_in = "header"
                
                for scheme in enriched_api.security_schemes.values():
                    if scheme.get("type") == "apiKey":
                        api_key_name = scheme.get("name", api_key_name)
                        api_key_in = scheme.get("in", "header")
                        break
                
                if api_key_in == "query":
                    query_params[api_key_name] = f"{{{{ {provider_slug}_API_KEY }}}}"
                else:
                    headers[api_key_name] = f"{{{{ {provider_slug}_API_KEY }}}}"

            # 5. Endpoint Query Params
            for param in ep.parameters:
                if param.get("in") == "query" and param.get("required"):
                    p_name = param.get("name")
                    if p_name and p_name not in query_params:
                        query_params[p_name] = "" # Empty placeholder for required param

            # 6. Body
            body = None
            if ep.method in ["POST", "PUT", "PATCH"] and ep.request_body:
                # Use example if top-level example exists
                if ep.request_body.get("example"):
                    body = ep.request_body["example"]
                elif ep.request_body.get("schema"):
                    body = cls._build_body(ep.request_body["schema"])

            # 7. Sample Response
            sample_response = {}
            if ep.response and ep.response.get("example"):
                sample_response = ep.response["example"]

            # 8. Placeholders & Notes
            auth_placeholders = list(enriched_api.auth_placeholders)
            # Standardize placeholders to match our internal generation (strip extra spaces if any)
            auth_placeholders = [p.replace(" ", "") for p in auth_placeholders]
            
            # Add path placeholders
            all_placeholders = list(set(auth_placeholders + path_placeholders))
            
            notes_list = []
            if auth_type == "none":
                notes_list.append("No authentication required.")
            else:
                for p in auth_placeholders:
                    clean_p = p.replace("{", "").replace("}", "")
                    notes_list.append(f"Replace {p} with your {clean_p.replace('_', ' ')}.")
            
            for p in path_placeholders:
                clean_p = p.replace("{", "").replace("}", "")
                notes_list.append(f"Replace {p} with a real {clean_p.lower()}.")
            
            notes = " ".join(notes_list)

            # Cleanup: ensure placeholders in headers/query don't have spaces if they were generated that way
            for k, v in headers.items():
                headers[k] = v.replace(" ", "")
            for k, v in query_params.items():
                query_params[k] = v.replace(" ", "")

            templates.append(EndpointTemplate(
                id=unique_id,
                name=name,
                description=description,
                method=ep.method,
                url=full_url,
                headers=headers,
                query_params=query_params,
                body=body,
                sample_response=sample_response,
                auth_placeholders=all_placeholders,
                notes=notes
            ))

        return GeneratedAPITemplates(
            api_id=enriched_api.api_id,
            endpoint_count=len(templates),
            templates=templates
        )

# --- Entry Point ---

def generate(enriched_api: EnrichedAPI) -> GeneratedAPITemplates:
    """
    Public API for the template generator.
    
    Args:
        enriched_api: The enriched API model from Phase 3.
        
    Returns:
        GeneratedAPITemplates containing API Dash ready templates.
    """
    return TemplateGenerator.generate(enriched_api)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate API Dash templates.")
    parser.add_argument("--api-id", required=True, help="API ID to process")
    
    args = parser.parse_args()

    # Windows async policy
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    async def main():
        try:
            # Phase 2 + 3
            enriched = await run_enrichment(args.api_id)
            
            # Phase 4
            generated = generate(enriched)
            
            # Output JSON
            print(generated.model_dump_json(indent=2))
            
        except Exception as e:
            print(json.dumps({
                "api_id": args.api_id,
                "error": str(e),
                "traceback": traceback.format_exc()
            }, indent=2))
            sys.exit(1)

    asyncio.run(main())
