"""
MCP integration layer for the API Explorer pipeline.

This server sits on top of the existing 7-stage pipeline outputs:
  - marketplace/index.json
  - marketplace/apis/{id}.json
  - logs/validation_report.json
  - logs/metrics.json

It exposes a small MCP-style JSON-RPC surface over stdio so AI agents can:
  - browse the API marketplace
  - inspect one API in detail
  - generate API Dash import payloads
  - suggest request sequences
  - inspect pipeline health and validation results
  - open the Explorer UI as an embedded HTML resource
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
MARKETPLACE_DIR = ROOT / "marketplace"
INDEX_PATH = MARKETPLACE_DIR / "index.json"
VALIDATION_REPORT_PATH = ROOT / "logs" / "validation_report.json"
METRICS_PATH = ROOT / "logs" / "metrics.json"
HTML_PATH = ROOT / "index.html"


class MarketplaceRepository:
    def __init__(self, root: Path = ROOT) -> None:
        self.root = root
        self.marketplace_dir = root / "marketplace"
        self.index_path = self.marketplace_dir / "index.json"
        self.validation_report_path = root / "logs" / "validation_report.json"
        self.metrics_path = root / "logs" / "metrics.json"
        self._index_cache: dict[str, dict[str, Any]] | None = None

    def load_index(self) -> dict[str, dict[str, Any]]:
        if self._index_cache is None:
            self._index_cache = json.loads(self.index_path.read_text(encoding="utf-8"))
        return self._index_cache

    def refresh(self) -> None:
        self._index_cache = None

    def explore(
        self,
        query: str = "",
        category: str | None = None,
        requires_auth: bool | None = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        query = query.lower().strip()
        results: list[dict[str, Any]] = []
        for api_id, entry in self.load_index().items():
            haystack = json.dumps(entry, ensure_ascii=False).lower()
            if query and query not in haystack:
                continue
            if category and category not in entry.get("categories", []):
                continue
            if requires_auth is not None and bool(entry.get("requires_auth")) != requires_auth:
                continue
            results.append(entry)
        results.sort(key=lambda item: (item.get("title", "").lower(), item.get("id", "")))
        return results[:limit]

    def get_api_detail(self, api_id: str) -> dict[str, Any]:
        entry = self.load_index().get(api_id)
        if not entry:
            raise KeyError(f"Unknown api_id: {api_id}")
        api_path = self.marketplace_dir / entry["filename"]
        detail = json.loads(api_path.read_text(encoding="utf-8"))
        detail["marketplace_summary"] = entry
        detail["suggested_sequence"] = suggest_sequence(detail)
        return detail

    def categories(self) -> list[str]:
        values = {
            category
            for entry in self.load_index().values()
            for category in entry.get("categories", [])
        }
        return sorted(values)

    def validation_report(self, limit: int = 20) -> dict[str, Any]:
        if not self.validation_report_path.exists():
            return {"entries": [], "invalid_count": 0}
        entries = json.loads(self.validation_report_path.read_text(encoding="utf-8"))
        invalid = [entry for entry in entries if not entry.get("is_valid", True)]
        return {
            "invalid_count": len(invalid),
            "entries": invalid[:limit],
        }

    def metrics(self) -> dict[str, Any]:
        if not self.metrics_path.exists():
            return {}
        return json.loads(self.metrics_path.read_text(encoding="utf-8"))

    def pipeline_status(self) -> dict[str, Any]:
        index = self.load_index()
        validation = self.validation_report(limit=10)
        metrics = self.metrics()
        return {
            "published_api_count": len(index),
            "categories": self.categories(),
            "invalid_templates": validation["invalid_count"],
            "validation_sample": validation["entries"][:5],
            "metrics": metrics,
            "marketplace_path": str(self.marketplace_dir),
        }

    def run_demo_pipeline(self) -> dict[str, Any]:
        completed = subprocess.run(
            [sys.executable, "run.py", "--demo"],
            cwd=self.root,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        self.refresh()
        return {
            "returncode": completed.returncode,
            "stdout_tail": completed.stdout[-4000:],
            "stderr_tail": completed.stderr[-4000:],
        }


def suggest_sequence(detail: dict[str, Any]) -> list[str]:
    requests = detail.get("requests", [])
    ranked: list[tuple[int, str]] = []
    for request in requests:
        method = str(request.get("method", "GET")).upper()
        url = str(request.get("url", "")).lower()
        name = str(request.get("name", "")).strip() or url
        priority = 50

        if any(token in url for token in ("auth", "login", "token")):
            priority = 0
        elif method == "POST" and "{" not in url:
            priority = 10
        elif method == "GET" and "{" not in url:
            priority = 20
        elif method == "POST" and "{" in url:
            priority = 30
        elif method == "GET" and "{" in url:
            priority = 40

        ranked.append((priority, name))

    return [name for _, name in sorted(ranked)]


def generate_apidash_collection(detail: dict[str, Any]) -> dict[str, Any]:
    requests: list[dict[str, Any]] = []
    for request in detail.get("requests", []):
        headers = request.get("headers", {}) or {}
        header_rows = request.get("header_rows")
        if not header_rows:
            header_rows = [
                {"name": key, "value": value, "enabled": True}
                for key, value in headers.items()
            ]

        requests.append(
            {
                "name": request.get("name", ""),
                "method": request.get("method", "GET"),
                "url": request.get("url", ""),
                "headers": header_rows,
                "body": request.get("body", {}),
                "body_type": request.get("body_type", "json"),
                "auth": request.get("auth", {"type": "none"}),
                "note": request.get("note", ""),
            }
        )

    info = detail.get("info", {})
    return {
        "collection_name": f"{info.get('title', detail.get('id', 'API'))} - API Dash Import",
        "api_id": detail.get("id"),
        "base_url": info.get("base_url", ""),
        "description": info.get("description", ""),
        "requests": requests,
    }


def build_embedded_html(repository: MarketplaceRepository) -> str:
    bootstrap = {
        "index": repository.load_index(),
        "categories": repository.categories(),
        "pipelineStatus": repository.pipeline_status(),
    }
    html = HTML_PATH.read_text(encoding="utf-8")
    injection = (
        "<script>"
        f"window.__PIPELINE_BOOTSTRAP__ = {json.dumps(bootstrap, ensure_ascii=False)};"
        "</script>"
    )
    return html.replace("</head>", f"{injection}\n</head>", 1)


class APIMarketplaceMCPServer:
    def __init__(self) -> None:
        self.repository = MarketplaceRepository()

    def handle(self, message: dict[str, Any]) -> dict[str, Any] | None:
        method = message.get("method")
        request_id = message.get("id")

        if method == "initialize":
            return self._response(
                request_id,
                {
                    "protocolVersion": "2024-11-05",
                    "serverInfo": {
                        "name": "api-explorer-marketplace",
                        "version": "0.1.0",
                    },
                    "capabilities": {"tools": {}, "resources": {}},
                },
            )
        if method == "tools/list":
            return self._response(request_id, {"tools": self._tools()})
        if method == "resources/list":
            return self._response(
                request_id,
                {
                    "resources": [
                        {
                            "uri": "ui://api-explorer",
                            "name": "API Explorer UI",
                            "mimeType": "text/html",
                        }
                    ]
                },
            )
        if method == "resources/read":
            return self._response(
                request_id,
                {
                    "contents": [
                        {
                            "uri": "ui://api-explorer",
                            "mimeType": "text/html",
                            "text": build_embedded_html(self.repository),
                        }
                    ]
                },
            )
        if method == "tools/call":
            params = message.get("params", {})
            result = self._call_tool(params.get("name"), params.get("arguments", {}))
            return self._response(
                request_id,
                {"content": [{"type": "text", "text": json.dumps(result, indent=2, ensure_ascii=False)}]},
            )
        return self._response(request_id, {"error": f"Unsupported method: {method}"})

    def _call_tool(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        if name == "explore_apis":
            return {
                "apis": self.repository.explore(
                    query=str(arguments.get("query", "")),
                    category=arguments.get("category"),
                    requires_auth=arguments.get("requires_auth"),
                    limit=int(arguments.get("limit", 20)),
                )
            }
        if name == "get_api_details":
            return self.repository.get_api_detail(arguments["api_id"])
        if name == "generate_apidash_collection":
            return generate_apidash_collection(self.repository.get_api_detail(arguments["api_id"]))
        if name == "suggest_sequence":
            detail = self.repository.get_api_detail(arguments["api_id"])
            return {"api_id": arguments["api_id"], "sequence": suggest_sequence(detail)}
        if name == "get_pipeline_status":
            return self.repository.pipeline_status()
        if name == "read_validation_report":
            return self.repository.validation_report(limit=int(arguments.get("limit", 20)))
        if name == "refresh_demo_marketplace":
            return self.repository.run_demo_pipeline()
        raise ValueError(f"Unknown tool: {name}")

    def _tools(self) -> list[dict[str, Any]]:
        return [
            {
                "name": "explore_apis",
                "description": "Search published APIs by query, category, auth requirement, and limit.",
            },
            {
                "name": "get_api_details",
                "description": "Load one published API template from marketplace/apis/{id}.json.",
            },
            {
                "name": "generate_apidash_collection",
                "description": "Convert one marketplace API into an API Dash import payload.",
            },
            {
                "name": "suggest_sequence",
                "description": "Suggest a practical request order for exploring or testing an API.",
            },
            {
                "name": "get_pipeline_status",
                "description": "Inspect marketplace counts, categories, metrics, and validation health.",
            },
            {
                "name": "read_validation_report",
                "description": "Read invalid template entries and validation issues from the pipeline logs.",
            },
            {
                "name": "refresh_demo_marketplace",
                "description": "Run the existing pipeline in demo mode and refresh the MCP view.",
            },
        ]

    @staticmethod
    def _response(request_id: Any, result: Any) -> dict[str, Any]:
        return {"jsonrpc": "2.0", "id": request_id, "result": result}


def serve_stdio() -> None:
    server = APIMarketplaceMCPServer()
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        message = json.loads(line)
        response = server.handle(message)
        if response is not None:
            sys.stdout.write(json.dumps(response, ensure_ascii=False) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    serve_stdio()
