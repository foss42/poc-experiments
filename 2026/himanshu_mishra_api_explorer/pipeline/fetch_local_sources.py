import json
import os
from openapi_parser_logic import parse_single_api

SOURCES_FILE = "sources.json"

def process_local_sources():
    print("--- Running Local Sources Fetcher ---")
    if not os.path.exists(SOURCES_FILE):
        return [], []

    with open(SOURCES_FILE, "r") as f:
        sources = json.load(f)

    valid_templates = []
    pipeline_reports = []

    for source in sources:
        result = parse_single_api(source, {"upvotes": 0, "comments": 0})
        if result["status"] == "success":
            valid_templates.append(result["data"])
        else:
            pipeline_reports.append(result["data"])

    return valid_templates, pipeline_reports