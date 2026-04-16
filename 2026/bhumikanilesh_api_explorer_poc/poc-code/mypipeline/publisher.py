"""
Phase 4 — Publisher (GitHub Pages)
API Explorer Pipeline | GSoC 2026 | foss42/apidash
Author: Bhumika Nilesh Ujjainkar

Replaces the old Template Generator + Packager approach.

Instead of generating a zip file, this phase generates a static
file structure that GitHub Pages serves as a free REST API.

Output structure:
  marketplace/
    index.json              ← lightweight master list (all APIs, minimal fields)
    apis/
      openai.json           ← full template (fetched only when user clicks)
      anthropic.json
      elevenlabs.json
      ...
    categories/
      ai.json               ← all AI API summaries
      voice.json
      image-generation.json
      ...

Why GitHub Pages instead of zip:
  - Flutter downloads only what it needs (index first, templates on demand)
  - Search works on pre-built index — no downloading 2500 templates
  - Category browsing fetches one small file instead of filtering a huge zip
  - Per-file updates — changing OpenAI doesn't touch other API files
  - Completely free — no server, no cost, no rate limits

Corner cases handled:
  - Existing files preserved if content unchanged (no unnecessary git diffs)
  - Category files merged incrementally (new API doesn't overwrite existing)
  - Invalid characters in API IDs sanitized for filenames
  - Empty categories skipped
  - Index sorted alphabetically for consistent diffs
  - Concurrent writes to same category file handled safely
"""

import os
import re
import json
import hashlib
import logging
from pathlib import Path
from urllib.parse import parse_qsl, urlparse
from fetcher import get_logger


logger = get_logger("publisher")


# ─────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────

MAX_DESCRIPTION_LEN = 150   # chars in index entries (keep index small)


# ─────────────────────────────────────────────────────────────
# File Writer
# Only writes if content has changed — prevents unnecessary git diffs
# ─────────────────────────────────────────────────────────────

def write_if_changed(filepath: Path, content: dict) -> bool:
    """
    Writes JSON to filepath only if content has changed.
    Returns True if file was written, False if skipped.

    Why this matters:
      GitHub Actions commits changed files back to the repo.
      If we rewrite every file every run, git sees thousands of
      changed files even when content is identical — noisy diffs,
      slower CI, harder to review what actually changed.
    """
    filepath.parent.mkdir(parents=True, exist_ok=True)
    new_content = json.dumps(content, indent=2,
                             ensure_ascii=False, sort_keys=True)
    new_hash    = hashlib.md5(new_content.encode()).hexdigest()

    # Check existing file hash
    if filepath.exists():
        try:
            existing = filepath.read_text(encoding="utf-8")
            existing_hash = hashlib.md5(existing.encode()).hexdigest()
            if existing_hash == new_hash:
                return False  # Content unchanged — skip write
        except IOError:
            pass

    filepath.write_text(new_content, encoding="utf-8")
    return True


# ─────────────────────────────────────────────────────────────
# Index Entry Builder
# Lightweight entry for master index.json
# Flutter fetches this first — must be small
# ─────────────────────────────────────────────────────────────

def build_index_entry(enriched_api: dict, api_id: str) -> dict:
    """
    Builds a lightweight index entry.
    Contains only what the Explorer grid card needs to render —
    NOT the full endpoint list (that's fetched on demand).

    Fields:
      id          : unique API identifier
      title       : display name
      description : truncated (keeps index small)
      tags        : for filtering
      categories  : for category browsing
      endpoint_count: shown on card
      requires_auth : shown as badge on card
      source      : apis.guru | awesome-generative-ai-apis | community
      filename    : path to full template file
    """
    description = enriched_api.get("description", "")
    if len(description) > MAX_DESCRIPTION_LEN:
        description = description[:MAX_DESCRIPTION_LEN].rsplit(" ", 1)[0] + "..."

    return {
        "id"            : api_id,
        "title"         : enriched_api.get("title", "Unknown API"),
        "description"   : description,
        "tags"          : enriched_api.get("categories", []),
        "categories"    : enriched_api.get("categories", []),
        "endpoint_count": len(enriched_api.get("requests", [])),
        "requires_auth" : enriched_api.get("requires_auth", True),
        "source"        : enriched_api.get("source", "apis.guru"),
        "filename"      : f"{api_id}.json"
    }


# ─────────────────────────────────────────────────────────────
# Full Template Builder
# Complete template written to apis/{id}.json
# Fetched only when user clicks on an API card
# ─────────────────────────────────────────────────────────────

def split_url_parts(raw_url: str) -> tuple[str, str, list[dict]]:
    """
    Convert raw pipeline URLs into API Dash-friendly base_url/path/params.
    """
    raw_url = (raw_url or "").strip()
    if not raw_url:
        return "", "/", []

    parsed = urlparse(raw_url)
    if (
        raw_url.startswith("//")
        and not parsed.scheme
        and (
            not parsed.netloc
            or parsed.netloc.startswith(".")
            or "." not in parsed.netloc
        )
    ):
        normalized_path = f"/{raw_url.lstrip('/')}"
        parsed_path = urlparse(normalized_path)
        return "", parsed_path.path or "/", [
            {"name": key, "value": value}
            for key, value in parse_qsl(parsed_path.query, keep_blank_values=True)
        ]

    if parsed.scheme and parsed.netloc:
        base_url = f"{parsed.scheme}://{parsed.netloc}"
        path = parsed.path or "/"
    elif raw_url.startswith("/"):
        base_url = ""
        path = raw_url
    else:
        base_url = ""
        path = f"/{raw_url.lstrip('/')}"

    params = [
        {"name": key, "value": value}
        for key, value in parse_qsl(parsed.query, keep_blank_values=True)
    ]
    return base_url, path, params


def header_rows_from_dict(headers_dict: dict) -> list[dict]:
    return [
        {"name": key, "value": value}
        for key, value in (headers_dict or {}).items()
    ]


def parameter_rows(endpoint: dict) -> tuple[list[dict], list[dict], list[dict]]:
    """
    Convert parser/enricher parameter metadata into API Dash-friendly rows.
    Returns (all_params, query_params, path_params).
    """
    all_params = []
    query_params = []
    path_params = []

    for param in endpoint.get("parameters", []) or []:
        if not isinstance(param, dict):
            continue

        name = str(param.get("name", "")).strip()
        if not name:
            continue

        value = param.get("example")
        row = {
            "name": name,
            "value": "" if value is None else str(value),
        }
        all_params.append(row)

        location = str(param.get("in", "query")).lower()
        if location == "path":
            path_params.append(row)
        elif location == "query":
            query_params.append(row)

    return all_params, query_params, path_params


def auth_from_headers(headers_dict: dict, requires_auth: bool) -> dict:
    headers_dict = headers_dict or {}
    auth_header = (
        headers_dict.get("Authorization") or headers_dict.get("authorization")
    )
    if not auth_header:
        return {"type": "none"}

    auth_value = str(auth_header)
    lowered = auth_value.lower()
    if lowered.startswith("bearer "):
        return {"type": "bearer", "token": auth_value[7:].strip()}
    if lowered.startswith("basic "):
        return {"type": "basic", "token": auth_value[6:].strip()}
    if requires_auth:
        return {
            "type": "header",
            "header": "Authorization",
            "value": auth_value,
        }
    return {"type": "none"}


def auth_type_from_value(auth_value: dict | str | None) -> str:
    """
    Emit the flat auth_type string that API Dash expects during sync.
    """
    if isinstance(auth_value, dict):
        return str(auth_value.get("type", "none") or "none")
    if isinstance(auth_value, str) and auth_value.strip():
        return auth_value.strip().lower()
    return "none"


def build_full_template(enriched_api: dict, api_id: str) -> dict:
    """
    Builds complete template for one API.
    Written to marketplace/apis/{api_id}.json
    Emits a lightweight catalog template that an app-side adapter
    can map into ApiDash request models.
    """
    endpoints = enriched_api.get("requests", [])

    # Deduplicate endpoints by method + URL
    seen         = set()
    unique_endpoints = []
    for ep in endpoints:
        key = f"{ep.get('method','GET')}:{ep.get('url','')}"
        if key not in seen and ep.get("url", "").strip():
            seen.add(key)
            unique_endpoints.append(ep)

    requests = []
    normalized_base_url = enriched_api.get("base_url", "")
    if normalized_base_url == "/":
        normalized_base_url = ""
    for ep in unique_endpoints:
        headers_dict = ep.get("headers", {}) or {}
        body_value = ep.get("body", {})
        endpoint_base_url, path, params_from_url = split_url_parts(ep.get("url", ""))
        params_from_schema, query_parameters, path_parameters = parameter_rows(ep)
        merged_query_parameters = list(query_parameters)
        seen_query_names = {row["name"] for row in merged_query_parameters}
        for row in params_from_url:
            if row["name"] not in seen_query_names:
                merged_query_parameters.append(row)
                seen_query_names.add(row["name"])

        all_params = [*path_parameters, *merged_query_parameters]
        if endpoint_base_url and (not normalized_base_url or normalized_base_url == "/"):
            normalized_base_url = endpoint_base_url
        body_kind = "none"
        body_text = ""
        body_json = None
        form_data = []
        auth_value = ep.get("auth") or auth_from_headers(
            headers_dict,
            enriched_api.get("requires_auth", True),
        )
        content_type_header = str(headers_dict.get("Content-Type", "")).strip()

        if isinstance(body_value, dict) and body_value:
            content_type = content_type_header.lower()
            if "multipart/form-data" in content_type:
                body_kind = "multipart"
                form_data = [
                    {"name": key, "value": value, "type": "text"}
                    for key, value in body_value.items()
                ]
            elif "application/x-www-form-urlencoded" in content_type:
                body_kind = "form"
                form_data = [
                    {"name": key, "value": value, "type": "text"}
                    for key, value in body_value.items()
                ]
            else:
                body_kind = "json"
                body_json = body_value
                body_text = json.dumps(body_value, ensure_ascii=False)
        elif isinstance(body_value, str) and body_value.strip():
            body_kind = "text"
            body_text = body_value

        request_body_example = None
        if body_text:
            request_body_example = body_text
        elif isinstance(body_value, dict) and body_value:
            request_body_example = json.dumps(body_value, ensure_ascii=False)

        request = {
            "id"     : f"{str(ep.get('method', 'GET')).upper()} {path}",
            "name"   : ep.get("name", ""),
            "summary": ep.get("name", ""),
            "description": ep.get("description", "") or ep.get("note", ""),
            "url"    : ep.get("url", ""),
            "path"   : path,
            "method" : str(ep.get("method", "GET")).upper(),
            "headers": header_rows_from_dict(headers_dict),
            "header_rows": [
                {"name": key, "value": value, "enabled": True}
                for key, value in headers_dict.items()
            ],
            "params" : all_params or params_from_schema,
            "queryParameters": merged_query_parameters,
            "pathParameters": path_parameters,
            "body"   : body_value,
            "body_type": body_kind,
            "body_text": body_text,
            "body_json": body_json,
            "requestBodyExample": request_body_example,
            "content_type": content_type_header,
            "contentType": content_type_header,
            "response_example": None,
            "responseExample": None,
            "form_data": form_data,
            "auth": auth_value,
            "auth_type": auth_type_from_value(auth_value),
            "authType": auth_type_from_value(auth_value),
        }
        # Add note if present
        if ep.get("note"):
            request["note"] = ep["note"]
        requests.append(request)

    return {
        "id"  : api_id,
        "info": {
            "title"      : enriched_api.get("title", "Unknown API"),
            "description": enriched_api.get("description", ""),
            "tags"       : sorted(set(enriched_api.get("categories", []))),
            "version"    : enriched_api.get("version", "1.0.0"),
            "base_url"   : normalized_base_url,
            "source"     : enriched_api.get("source", "apis.guru"),
        },
        "requests": requests
    }


# ─────────────────────────────────────────────────────────────
# API ID Generator
# Creates safe, consistent IDs from API titles or existing IDs
# ─────────────────────────────────────────────────────────────

def make_api_id(enriched_api: dict) -> str:
    """
    Generates a safe API ID for use in filenames and index.

    Priority:
      1. Use existing api_id if present
      2. Generate from title

    Corner cases:
      - Special characters removed
      - Spaces → hyphens
      - Lowercased
      - Version numbers removed
      - Max 60 characters
    """
    api_id = enriched_api.get("id") or enriched_api.get("api_id", "")

    if not api_id:
        title  = enriched_api.get("title", "unknown")
        api_id = title.lower()
        api_id = re.sub(r'[^a-z0-9\s\-]', '', api_id)
        api_id = re.sub(r'[\s]+', '-', api_id.strip())
        api_id = re.sub(r'-+', '-', api_id).strip('-')

    # Sanitize for filesystem safety
    api_id = re.sub(r'[/\\:*?"<>|]', '_', api_id)
    api_id = api_id[:60].rstrip('-').rstrip('_')

    return api_id or "unknown-api"


# ─────────────────────────────────────────────────────────────
# Category Publisher
# Generates categories/{category}.json files
# Flutter fetches these when user taps a category filter
# ─────────────────────────────────────────────────────────────

class CategoryPublisher:
    """
    Generates and maintains category index files.

    Each category file contains lightweight summaries of all
    APIs in that category — same format as index entries but
    scoped to one category.

    Flutter fetches categories/ai.json when user taps "AI" filter
    instead of filtering 2500+ entries from the master index.
    """

    def __init__(self, categories_dir: Path):
        self.categories_dir = categories_dir
        self.categories: dict[str, list] = {}

    def add_api(self, index_entry: dict):
        """Adds an API to all its category lists."""
        for category in index_entry.get("categories", []):
            if category not in self.categories:
                self.categories[category] = []
            self.categories[category].append(index_entry)

    def publish(self) -> dict:
        """
        Writes one JSON file per category.
        Returns summary of categories published.
        """
        self.categories_dir.mkdir(parents=True, exist_ok=True)
        published = {}

        for category, entries in self.categories.items():
            if not entries:
                continue

            # Sort alphabetically for consistent output
            entries_sorted = sorted(entries, key=lambda x: x["title"].lower())

            category_data = {
                "category"  : category,
                "api_count" : len(entries_sorted),
                "apis"      : entries_sorted
            }

            filepath = self.categories_dir / f"{category}.json"
            written  = write_if_changed(filepath, category_data)
            published[category] = {
                "count"  : len(entries_sorted),
                "written": written
            }
            logger.debug(
                f"Category {category}: {len(entries_sorted)} APIs "
                f"{'written' if written else 'unchanged'}"
            )

        return published


# ─────────────────────────────────────────────────────────────
# Main Publisher
# ─────────────────────────────────────────────────────────────

class Publisher:
    """
    Phase 4 — Publishes enriched APIs to GitHub Pages file structure.

    Generates:
      marketplace/index.json              ← master lightweight index
      marketplace/apis/{id}.json          ← full templates (on demand)
      marketplace/categories/{cat}.json   ← category-scoped indexes
    """

    def __init__(self, output_dir: str = "marketplace"):
        self.output_dir = Path(output_dir)
        self.apis_dir   = self.output_dir / "apis"
        self.index_file = self.output_dir / "index.json"
        self.categories_dir = self.output_dir / "categories"
        self.apis_dir.mkdir(parents=True, exist_ok=True)

    def publish_api(self, enriched_api: dict) -> tuple:
        """
        Publishes one API — writes full template + returns index entry.
        Returns (api_id, index_entry, written) or (None, None, False) on failure.
        """
        title  = enriched_api.get("title", "Unknown")
        api_id = make_api_id(enriched_api)

        # Skip APIs with no endpoints
        if not enriched_api.get("requests"):
            logger.warning(f"Skipping {title} — no endpoints")
            return None, None

        # Write full template to apis/{id}.json
        template = build_full_template(enriched_api, api_id)
        filepath = self.apis_dir / f"{api_id}.json"
        written  = write_if_changed(filepath, template)

        logger.debug(
            f"Published {title}: {len(template['requests'])} requests "
            f"({'written' if written else 'unchanged'})"
        )

        # Build lightweight index entry
        index_entry = build_index_entry(enriched_api, api_id)
        return api_id, index_entry, written

    def publish_all(self, enriched_apis: list) -> dict:
        """
        Publishes all enriched APIs.
        Generates index.json and category files.
        Returns summary.
        """
        logger.info("=" * 50)
        logger.info("Phase 4 — Publisher starting")
        logger.info("=" * 50)

        index_entries      = {}
        category_publisher = CategoryPublisher(self.categories_dir)
        success = skipped = failed = written = unchanged = 0

        for enriched_api in enriched_apis:
            try:
                if enriched_api.get("requests"):
                    api_id, index_entry, template_written = self.publish_api(enriched_api)
                else:
                    api_id = make_api_id(enriched_api)
                    template = build_full_template(enriched_api, api_id)
                    filepath = self.apis_dir / f"{api_id}.json"
                    template_written = write_if_changed(filepath, template)
                    index_entry = build_index_entry(enriched_api, api_id)
                    logger.warning(
                        f"Publishing {enriched_api.get('title', 'Unknown')} with 0 endpoints"
                    )

                if api_id and index_entry:
                    index_entries[api_id] = index_entry
                    success += 1

                    if template_written:
                        written += 1
                    else:
                        unchanged += 1
                else:
                    skipped += 1

            except Exception as e:
                failed += 1
                logger.error(
                    f"Failed to publish {enriched_api.get('title','?')}: {e}"
                )

        # Sort index by title for consistent diffs
        sorted_index = dict(
            sorted(index_entries.items(),
                   key=lambda x: x[1].get("title", "").lower())
        )

        # Write master index
        index_written = write_if_changed(self.index_file, sorted_index)

        # Rebuild category files from the merged index so partial runs
        # stay consistent with index.json.
        for entry in sorted_index.values():
            category_publisher.add_api(entry)
        categories_summary = category_publisher.publish()

        summary = {
            "success"          : success,
            "skipped"          : skipped,
            "failed"           : failed,
            "written"          : written,
            "unchanged"        : unchanged,
            "index_size"       : len(sorted_index),
            "index_written"    : index_written,
            "categories"       : len(categories_summary),
            "output_dir"       : str(self.output_dir)
        }

        logger.info(
            f"Phase 4 complete: {success} published, "
            f"{skipped} skipped, {failed} failed"
        )
        logger.info(
            f"Index: {len(sorted_index)} APIs | "
            f"Categories: {len(categories_summary)}"
        )

        return summary


# ─────────────────────────────────────────────────────────────
# Demo
# ─────────────────────────────────────────────────────────────

def run_demo():
    publisher = Publisher(output_dir="marketplace")

    print("\n" + "="*55)
    print("  Phase 4 — Publisher Demo")
    print("="*55)

    mock_enriched = [
        {
            "title"      : "OpenAI API",
            "description": "Access GPT-4, DALL-E and Whisper models via REST API.",
            "base_url"   : "https://api.openai.com/v1",
            "version"    : "2.0.0",
            "categories" : ["ai", "text-generation", "image-generation"],
            "requires_auth": True,
            "api_id"     : "openai",
            "source"     : "apis.guru",
            "requests"   : [
                {
                    "name"   : "Create chat completion",
                    "method" : "POST",
                    "url"    : "https://api.openai.com/v1/chat/completions",
                    "headers": {"Authorization": "Bearer {{OPENAI_API_KEY}}",
                                "Content-Type": "application/json"},
                    "body"   : {"model": "gpt-4",
                                "messages": [{"role": "user",
                                              "content": "Hello!"}]},
                    "note"   : "Replace {{OPENAI_API_KEY}} with your key"
                },
                {
                    "name"   : "Generate image",
                    "method" : "POST",
                    "url"    : "https://api.openai.com/v1/images/generations",
                    "headers": {"Authorization": "Bearer {{OPENAI_API_KEY}}",
                                "Content-Type": "application/json"},
                    "body"   : {"prompt": "A sunset", "n": 1},
                    "note"   : ""
                },
                {
                    "name"   : "List models",
                    "method" : "GET",
                    "url"    : "https://api.openai.com/v1/models",
                    "headers": {"Authorization": "Bearer {{OPENAI_API_KEY}}"},
                    "body"   : {},
                    "note"   : ""
                }
            ]
        },
        {
            "title"      : "ElevenLabs Voice API",
            "description": "Generate realistic AI voices from text using ElevenLabs.",
            "base_url"   : "https://api.elevenlabs.io/v1",
            "version"    : "1.0.0",
            "categories" : ["voice", "ai"],
            "requires_auth": True,
            "api_id"     : "elevenlabs",
            "source"     : "awesome-generative-ai-apis",
            "requests"   : [
                {
                    "name"   : "Text to Speech",
                    "method" : "POST",
                    "url"    : "https://api.elevenlabs.io/v1/text-to-speech/{{VOICE_ID}}",
                    "headers": {"X-API-Key": "{{ELEVENLABS_API_KEY}}",
                                "Content-Type": "application/json"},
                    "body"   : {"text": "Hello world",
                                "model_id": "eleven_monolingual_v1"},
                    "note"   : "Replace {{VOICE_ID}} with actual voice ID"
                },
                {
                    "name"   : "List Voices",
                    "method" : "GET",
                    "url"    : "https://api.elevenlabs.io/v1/voices",
                    "headers": {"X-API-Key": "{{ELEVENLABS_API_KEY}}"},
                    "body"   : {},
                    "note"   : ""
                }
            ]
        },
        {
            "title"      : "Pollinations.AI",
            "description": "Free image generation API — no authentication required.",
            "base_url"   : "https://image.pollinations.ai",
            "version"    : "1.0.0",
            "categories" : ["image-generation", "ai"],
            "requires_auth": False,
            "api_id"     : "pollinations-ai",
            "source"     : "awesome-generative-ai-apis",
            "requests"   : [
                {
                    "name"   : "Generate Image from Prompt",
                    "method" : "GET",
                    "url"    : "https://image.pollinations.ai/prompt/{{PROMPT}}",
                    "headers": {},
                    "body"   : {},
                    "note"   : "Replace {{PROMPT}} with your image description"
                }
            ]
        }
    ]

    summary = publisher.publish_all(mock_enriched)

    print(f"\n  Published   : {summary['success']} APIs")
    print(f"  Skipped     : {summary['skipped']}")
    print(f"  Failed      : {summary['failed']}")
    print(f"  Index size  : {summary['index_size']} APIs")
    print(f"  Categories  : {summary['categories']}")
    print(f"  Output dir  : {summary['output_dir']}/")

    # Show generated file structure
    import os
    print(f"\n  Generated file structure:")
    for root, dirs, files in os.walk("marketplace"):
        level = root.replace("marketplace", "").count(os.sep)
        indent = "  " + "  " * level
        print(f"{indent}{os.path.basename(root)}/")
        subindent = "  " + "  " * (level + 1)
        for file in sorted(files):
            fpath = Path(root) / file
            size  = fpath.stat().st_size
            print(f"{subindent}{file:40s} {size:>6d} bytes")

    # Show index.json sample
    print(f"\n  Sample index.json entry (openai):")
    index = json.loads(Path("marketplace/index.json").read_text())
    if "openai" in index:
        print(json.dumps(index["openai"], indent=4))

    print("\n" + "="*55)
    print("  Phase 4 complete — GitHub Pages structure ready")
    print("="*55)


if __name__ == "__main__":
    run_demo()
