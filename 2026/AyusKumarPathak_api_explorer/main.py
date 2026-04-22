"""
main.py — Pipeline Orchestrator
Runs the full API discovery pipeline:
  fetch → extract → tag → build → save → agent demo
"""

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from src.openapi_parser   import fetch_openapi_spec
from src.extractor import extract_endpoints
from src.tagger   import tag_all
from src.builder  import build_template
from src.agent    import run_agent_demo

API_URL     = "https://petstore3.swagger.io/api/v3/openapi.json"
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "data", "output.json")


# ── Pipeline ──────────────────────────────────────────────────────────────────

def run_pipeline() -> dict:
    print("=" * 60)
    print("  GSoC PoC — Automated API Discovery Pipeline")
    print("=" * 60)

    # Step 1 — Fetch spec
    print(f"\n[1/4] Fetching OpenAPI spec from:\n      {API_URL}")
    spec = fetch_openapi_spec(API_URL)
    print(f"      ✓ Spec loaded  (title: {spec.get('info', {}).get('title', '?')})")

    # Step 2 — Extract endpoints
    print("\n[2/4] Extracting endpoints …")
    endpoints = extract_endpoints(spec)
    print(f"      ✓ Found {len(endpoints)} endpoints")

    # Step 3 — Tag endpoints
    print("\n[3/4] Tagging endpoints …")
    tagged = tag_all(endpoints)
    tag_counts: dict[str, int] = {}
    for ep in tagged:
        tag_counts[ep["tag"]] = tag_counts.get(ep["tag"], 0) + 1
    for tag, count in sorted(tag_counts.items()):
        print(f"      {tag:15s} → {count} endpoint(s)")

    print("\n[4/4] Building JSON template …")
    template = build_template(spec, tagged)
    template["source"] = API_URL

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as fh:
        json.dump(template, fh, indent=2)
    print(f"      ✓ Template saved → {OUTPUT_PATH}")

    return template


def main() -> None:
    template = run_pipeline()

    run_agent_demo(template)

    print(f"\n✅ Pipeline complete. Output → {OUTPUT_PATH}\n")


if __name__ == "__main__":
    main()
