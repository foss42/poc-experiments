import os
import sys
import json
import yaml
import re
import argparse
import traceback
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse
import httpx
from pydantic import BaseModel

# Import models from Phase 2
from pipeline.parser import ParsedAPI, ParsedEndpoint, parse

# --- Models ---

class EnrichedAPI(BaseModel):
    api_id: str
    name: str
    provider: str
    description: Optional[str] = None  # Truncated version for cards
    full_description: Optional[str] = None # Original version for expansion
    version: Optional[str] = None
    base_url: Optional[str] = None
    logo_url: Optional[str] = None
    docs_url: Optional[str] = None
    categories: List[str]
    auth_type: str  # bearer_token | api_key | oauth2 | basic | none
    auth_placeholders: List[str]
    verified: bool  # True if sourced from apis.guru
    source: str  # "apis.guru" or "manual"
    endpoints: List[ParsedEndpoint]
    security_schemes: Dict[str, Any]
    enrich_warnings: List[str]

# --- Enricher Logic ---

class APIEnricher:
    """Enriches ParsedAPI data with metadata, auth detection, and logo identification."""
    
    _logo_cache: Dict[str, Optional[str]] = {}
    _category_map: Dict[str, str] = {}
    _raw_categories: Optional[List[str]] = None

    @classmethod
    def _load_category_map(cls):
        """Loads the category mapping configuration."""
        if not cls._category_map:
            base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            map_path = os.path.join(base_path, "config", "category_map.yaml")
            if os.path.exists(map_path):
                try:
                    with open(map_path, "r", encoding="utf-8") as f:
                        cls._category_map = yaml.safe_load(f) or {}
                except Exception:
                    cls._category_map = {}

    @classmethod
    def _get_raw_categories(cls) -> List[str]:
        """Loads the known raw categories registry."""
        if cls._raw_categories is None:
            base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            reg_path = os.path.join(base_path, "marketplace", "raw_categories.json")
            if os.path.exists(reg_path):
                try:
                    with open(reg_path, "r", encoding="utf-8") as f:
                        cls._raw_categories = json.load(f) or []
                except Exception:
                    cls._raw_categories = []
            else:
                cls._raw_categories = []
        return cls._raw_categories or []

    @staticmethod
    def _clean_description(description: Optional[str]) -> Optional[str]:
        """Strips markdown and HTML tags."""
        if not description:
            return None
        
        # 1. Strip Markdown links: [text](url) -> text
        text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', description)
        # 2. Strip Markdown formatting (bold, italic, code, headers)
        text = re.sub(r'[*_`#>]', '', text)
        # 3. Strip HTML tags (sometimes present in specs)
        text = re.sub(r'<[^>]+>', '', text)
        # 4. Clean whitespace
        text = ' '.join(text.split())

        return text if len(text) >= 10 else None

    @staticmethod
    def _truncate_text(text: Optional[str], limit: int = 300) -> Optional[str]:
        """Smartly truncates text to a limit at a sentence boundary."""
        if not text or len(text) <= limit:
            return text

        truncated = text[:limit]
        # Try to find the last complete sentence within the limit
        last_boundary = max(truncated.rfind('.'), truncated.rfind('!'), truncated.rfind('?'))
        
        if last_boundary > 50: # Avoid truncating too much if first sentence is long
            return truncated[:last_boundary + 1] + "..."
        
        # Fallback to word boundary
        return truncated.rsplit(' ', 1)[0] + "..."

    @staticmethod
    def _prettify_tag(tag: str) -> str:
        """Converts raw_tag to 'Raw Tag'. Special handles acronyms."""
        # 1. Handle common acronyms
        acronyms = {"iot": "IoT", "ai": "AI", "ml": "ML", "crm": "CRM", "erp": "ERP"}
        if tag.lower() in acronyms:
            return acronyms[tag.lower()]
            
        # 2. Basic cleanup
        words = tag.replace("_", " ").replace("-", " ").split()
        return " ".join(w.capitalize() for w in words)

    @staticmethod
    async def _verify_url(url: str, client: Optional[httpx.AsyncClient] = None) -> bool:
        """Verifies if a URL resolves using a HEAD request."""
        try:
            if client:
                response = await client.head(url, timeout=5.0, follow_redirects=True)
                return response.is_success
            else:
                async with httpx.AsyncClient() as new_client:
                    response = await new_client.head(url, timeout=5.0, follow_redirects=True)
                    return response.is_success
        except Exception:
            return False

    @classmethod
    async def _fetch_logo(cls, provider_domain: str, guru_logo_url: Optional[str], client: Optional[httpx.AsyncClient] = None) -> Optional[str]:
        """Identifies a valid logo URL using APIs Guru or a safe fallback."""
        if provider_domain in cls._logo_cache:
            return cls._logo_cache[provider_domain]

        # 1. Try apis.guru record
        if guru_logo_url and await cls._verify_url(guru_logo_url, client=client):
            cls._logo_cache[provider_domain] = guru_logo_url
            return guru_logo_url

        # 2. Fallback to a safe, unnamed default logo (Identicons are nice for this)
        # This keeps the design consistent without the risk of broken 3rd party logo links
        default_logo = f"https://api.dicebear.com/7.x/identicon/svg?seed={provider_domain}"
        cls._logo_cache[provider_domain] = default_logo
        return default_logo

    @staticmethod
    def _detect_auth(security_schemes: Dict[str, Any], api_id: str) -> tuple[str, List[str]]:
        """
        Detects auth type and placeholders based on security scheme definitions.
        """
        # Prefix for environment variables
        provider_name = api_id.split(':')[0].split('.')[0].upper()
        
        # Priority check
        schemes = security_schemes or {}
        
        # 1. Bearer Token
        for s in schemes.values():
            if s.get("type") == "http" and s.get("scheme") == "bearer":
                return "bearer_token", [f"{{{{{provider_name}_API_KEY}}}}"]
            if s.get("type") == "apiKey" and s.get("name", "").lower() == "authorization":
                return "bearer_token", [f"{{{{{provider_name}_API_KEY}}}}"]

        # 2. API Key
        for s in schemes.values():
            if s.get("type") == "apiKey" and s.get("in") in ["header", "query"]:
                return "api_key", [f"{{{{{provider_name}_API_KEY}}}}"]

        # 3. OAuth2
        for s in schemes.values():
            if s.get("type") == "oauth2":
                return "oauth2", [f"{{{{{provider_name}_ACCESS_TOKEN}}}}"]

        # 4. Basic Auth
        for s in schemes.values():
            if s.get("type") == "http" and s.get("scheme") == "basic":
                return "basic", [f"{{{{{provider_name}_USERNAME}}}}", f"{{{{{provider_name}_PASSWORD}}}}"]

        return "none", []

    @classmethod
    async def enrich(cls, parsed_api: ParsedAPI, metadata: Optional[Dict[str, Any]], is_guru: bool = False, client: Optional[httpx.AsyncClient] = None) -> EnrichedAPI:
        """
        Enriches the parsed API data into the final marketplace format.
        """
        cls._load_category_map()
        enrich_warnings = []
        
        # Determine Provider and Domain
        provider = parsed_api.api_id.split(':')[0]
        domain = ""
        if parsed_api.base_url:
            domain = urlparse(parsed_api.base_url).netloc
        if not domain:
            domain = provider if "." in provider else f"{provider}.com"

        # Categories
        categories = set()
        raw_cats_registry = cls._get_raw_categories()

        if metadata:
            info = metadata.get("info", {})
            guru_cats = metadata.get("x-apisguru-categories", []) or info.get("x-apisguru-categories", [])
            for gc in guru_cats:
                mapped = cls._category_map.get(gc)
                if mapped:
                    categories.add(mapped)
                else:
                    # Priority 2: Prettified fallback
                    pretty_cat = cls._prettify_tag(gc)
                    categories.add(pretty_cat)
                    
                    # Detect if it's completely new or just unmapped
                    if gc not in raw_cats_registry:
                        enrich_warnings.append(f"IMPORTANT: NEW category detected upstream: '{gc}'. Update category_map.yaml.")
                    else:
                        enrich_warnings.append(f"WARNING: Category '{gc}' is unmapped. Using prettified version: '{pretty_cat}'.")
            
            manual_cat = metadata.get("category")
            if manual_cat:
                categories.add(manual_cat)
        
        if not categories:
            categories.add("Other")

        # Name & Description
        name = (metadata or {}).get("info", {}).get("title") or (metadata or {}).get("name") or parsed_api.title or parsed_api.api_id
        raw_desc = (metadata or {}).get("info", {}).get("description") or (metadata or {}).get("description") or parsed_api.description
        
        full_description = cls._clean_description(raw_desc)
        short_description = cls._truncate_text(full_description)

        # Auth
        auth_type, auth_placeholders = cls._detect_auth(parsed_api.security_schemes, parsed_api.api_id)

        # Logo
        guru_logo = (metadata or {}).get("info", {}).get("x-logo", {}).get("url")
        logo_url = await cls._fetch_logo(domain, guru_logo, client=client)

        # URLs
        docs_url = (metadata or {}).get("externalDocs", {}).get("url") or (metadata or {}).get("docs_url")

        return EnrichedAPI(
            api_id=parsed_api.api_id,
            name=name,
            provider=provider,
            description=short_description,
            full_description=full_description,
            version=parsed_api.version,
            base_url=parsed_api.base_url,
            logo_url=logo_url,
            docs_url=docs_url,
            categories=list(categories),
            auth_type=auth_type,
            auth_placeholders=auth_placeholders,
            verified=is_guru,
            source="apis.guru" if is_guru else "manual",
            endpoints=parsed_api.endpoints,
            security_schemes=parsed_api.security_schemes,
            enrich_warnings=enrich_warnings
        )

# --- Entry Point ---

async def run_enrichment(api_id: str, parsed_api: Optional[ParsedAPI] = None, client: Optional[httpx.AsyncClient] = None) -> EnrichedAPI:
    """
    Orchestrates Phase 2 parse (if needed) and Phase 3 enrichment for an API.
    
    Args:
        api_id: The ID of the API to enrich.
        parsed_api: Optional already-parsed API object to avoid double parsing.
        
    Returns:
        An EnrichedAPI object.
    """
    metadata = None
    is_guru = False
    # Use absolute path to ensure metadata is found regardless of where script is run
    base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    list_json_path = os.path.join(base_path, "marketplace", "apis_guru_list.json")
    
    # Try to load guru metadata from the cached list
    if os.path.exists(list_json_path):
        try:
            with open(list_json_path, "r", encoding="utf-8") as f:
                full_list = json.load(f)
                
                # Normalize api_id for matching (Guru uses ':', filenames use '_')
                guru_id = api_id.replace("_", ":")
                
                # Split version if present
                base_api_id = guru_id
                requested_version = None
                if ":" in guru_id:
                    base_api_id, requested_version = guru_id.split(":", 1)

                if base_api_id in full_list:
                    api_info = full_list[base_api_id]
                    # Use requested version, otherwise preferred, otherwise first
                    versions = api_info.get("versions", {})
                    metadata = versions.get(requested_version) or versions.get(api_info.get("preferred")) or (list(versions.values())[0] if versions else None)
                    is_guru = True
                elif guru_id in full_list: # Fallback for exact match if colon wasn't a separator
                    api_info = full_list[guru_id]
                    pref = api_info.get("preferred")
                    versions = api_info.get("versions", {})
                    metadata = versions.get(pref) or (list(versions.values())[0] if versions else None)
                    is_guru = True
        except Exception:
            pass

    # For manual sources, we might find them in sources.yaml
    if not metadata:
        try:
            sources_path = os.path.join(base_path, "sources.yaml")
            with open(sources_path, "r", encoding="utf-8") as f:
                sources = yaml.safe_load(f).get("sources", [])
                metadata = next((s for s in sources if s.get("id") == api_id), None)
                is_guru = False # Explicitly mark as manual
        except Exception:
            pass

    # If we don't have the parsed object yet, we need to generate it
    if parsed_api is None:
        # Determine source_type and path based on existence in raw/
        from pipeline.fetcher import make_safe_id
        safe_id = make_safe_id(api_id)
        source_type = "openapi"
        file_path = os.path.join(base_path, "raw", f"{safe_id}.json")
        if not os.path.exists(file_path):
            file_path = os.path.join(base_path, "raw", f"{safe_id}.yaml")
            if not os.path.exists(file_path):
                file_path = os.path.join(base_path, "raw", f"{safe_id}.html")
                source_type = "html"
            
        # Call Phase 2 Parser
        parsed_api = parse(api_id, source_type)
    
    return await APIEnricher.enrich(parsed_api, metadata, is_guru=is_guru, client=client)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Enrich parsed API data.")
    parser.add_argument("--api-id", required=True, help="API ID to enrich")
    
    args = parser.parse_args()
    
    # Windows async policy
    if sys.platform == "win32":
        import asyncio
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    import asyncio
    
    async def main():
        try:
            enriched = await run_enrichment(args.api_id)
            print(enriched.model_dump_json(indent=2))
        except Exception as e:
            print(json.dumps({
                "api_id": args.api_id,
                "error": str(e),
                "traceback": traceback.format_exc()
            }, indent=2))
            sys.exit(1)

    asyncio.run(main())
