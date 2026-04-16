#!/usr/bin/env python3
"""
Minimal MCP testing PoC for Sales Analytics MCP Apps server.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


EXPECTED_TOOLS = {
    "select-sales-metric",
    "get-sales-data",
    "visualize-sales-data",
    "show-sales-pdf-report",
}


@dataclass
class StepResult:
    name: str
    passed: bool
    duration_ms: int
    detail: str
    response_json: Optional[Dict[str, Any]] = None
    response_headers: Optional[Dict[str, str]] = None


def post_json(
    endpoint: str,
    payload: Dict[str, Any],
    session_id: Optional[str] = None,
    timeout_s: int = 20,
) -> Tuple[Dict[str, Any], Dict[str, str], int]:
    body = json.dumps(payload).encode("utf-8")
    headers = {
        "content-type": "application/json",
        "accept": "application/json, text/event-stream",
    }
    if session_id:
        headers["mcp-session-id"] = session_id

    req = Request(endpoint, data=body, headers=headers, method="POST")
    start = time.perf_counter()
    try:
        with urlopen(req, timeout=timeout_s) as resp:
            raw = resp.read().decode("utf-8")
            parsed = json.loads(raw) if raw else {}
            out_headers = {k.lower(): v for k, v in resp.headers.items()}
            duration_ms = int((time.perf_counter() - start) * 1000)
            return parsed, out_headers, duration_ms
    except HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTPError {e.code}: {err_body}") from e
    except URLError as e:
        raise RuntimeError(f"URLError: {e}") from e


def check_initialize(endpoint: str) -> Tuple[StepResult, Optional[str]]:
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2025-03-26",
            "capabilities": {"roots": {"listChanged": False}, "sampling": {}},
            "clientInfo": {"name": "gsoc-poc-mcp-tester", "version": "0.1.0"},
        },
    }
    resp, headers, dur = post_json(endpoint, payload)
    session_id = headers.get("mcp-session-id")
    passed = "result" in resp and "error" not in resp
    detail = "initialize returned result" if passed else "initialize failed"
    return (
        StepResult(
            name="initialize",
            passed=passed,
            duration_ms=dur,
            detail=detail,
            response_json=resp,
            response_headers=headers,
        ),
        session_id,
    )


def check_tools_list(endpoint: str, session_id: Optional[str]) -> Tuple[StepResult, List[str]]:
    payload = {
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/list",
        "params": {},
    }
    resp, headers, dur = post_json(endpoint, payload, session_id=session_id)

    tools = resp.get("result", {}).get("tools", []) if isinstance(resp, dict) else []
    names = [t.get("name", "") for t in tools if isinstance(t, dict)]
    found_expected = sorted(EXPECTED_TOOLS.intersection(set(names)))

    passed = len(names) > 0 and len(found_expected) > 0 and "error" not in resp
    detail = (
        f"found {len(names)} tools; expected hits: {', '.join(found_expected) or 'none'}"
    )
    return (
        StepResult(
            name="tools/list",
            passed=passed,
            duration_ms=dur,
            detail=detail,
            response_json=resp,
            response_headers=headers,
        ),
        names,
    )


def check_resources_list(endpoint: str, session_id: Optional[str]) -> Tuple[StepResult, List[Dict[str, Any]]]:
    payload = {
        "jsonrpc": "2.0",
        "id": 3,
        "method": "resources/list",
        "params": {},
    }
    resp, headers, dur = post_json(endpoint, payload, session_id=session_id)
    resources = resp.get("result", {}).get("resources", []) if isinstance(resp, dict) else []
    html_resources = []
    for r in resources:
        if not isinstance(r, dict):
            continue
        mime = str(r.get("mimeType", "")).lower()
        uri = str(r.get("uri", "")).lower()
        if "text/html" in mime or uri.endswith(".html"):
            html_resources.append(r)

    passed = len(resources) > 0 and len(html_resources) > 0 and "error" not in resp
    detail = f"found {len(resources)} resources; html-like resources: {len(html_resources)}"
    return (
        StepResult(
            name="resources/list",
            passed=passed,
            duration_ms=dur,
            detail=detail,
            response_json=resp,
            response_headers=headers,
        ),
        resources,
    )


def maybe_call_get_sales_data(
    endpoint: str,
    session_id: Optional[str],
    available_tools: List[str],
) -> StepResult:
    if "get-sales-data" not in available_tools:
        return StepResult(
            name="tools/call(get-sales-data)",
            passed=False,
            duration_ms=0,
            detail="skipped: get-sales-data not found in tools/list",
        )

    payload = {
        "jsonrpc": "2.0",
        "id": 4,
        "method": "tools/call",
        "params": {
            "name": "get-sales-data",
            "arguments": {
                "states": ["MH", "KA", "TN"],
                "metric": "revenue",
                "period": "quarterly",
                "year": "2024",
            },
        },
    }
    resp, headers, dur = post_json(endpoint, payload, session_id=session_id)
    is_error = bool(resp.get("result", {}).get("isError")) if isinstance(resp, dict) else True
    passed = "result" in resp and "error" not in resp and not is_error
    detail = "tool call returned result" if passed else "tool call returned error"
    return StepResult(
        name="tools/call(get-sales-data)",
        passed=passed,
        duration_ms=dur,
        detail=detail,
        response_json=resp,
        response_headers=headers,
    )


def save_artifacts(
    out_dir: Path,
    endpoint: str,
    session_id: Optional[str],
    steps: List[StepResult],
    tools: List[str],
    resources_count: int,
) -> Tuple[Path, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")
    json_path = out_dir / f"run_{ts}.json"
    md_path = out_dir / f"run_{ts}.md"

    payload = {
        "timestamp_utc": ts,
        "endpoint": endpoint,
        "session_id": session_id,
        "summary": {
            "passed_steps": sum(1 for s in steps if s.passed),
            "total_steps": len(steps),
            "all_passed": all(s.passed for s in steps),
        },
        "discovery": {
            "tools": tools,
            "resources_count": resources_count,
        },
        "steps": [
            {
                "name": s.name,
                "passed": s.passed,
                "duration_ms": s.duration_ms,
                "detail": s.detail,
                "response_json": s.response_json,
                "response_headers": s.response_headers,
            }
            for s in steps
        ],
    }
    json_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    lines = [
        f"# MCP Testing PoC Run ({ts})",
        "",
        f"- Endpoint: `{endpoint}`",
        f"- Session ID: `{session_id or 'N/A'}`",
        "",
        "## Step Results",
    ]
    for s in steps:
        state = "PASS" if s.passed else "FAIL"
        lines.append(f"- **{state}** `{s.name}` ({s.duration_ms} ms) - {s.detail}")
    lines.extend(
        [
            "",
            "## Discovery Snapshot",
            f"- Tools found: {len(tools)}",
            f"- Resources found: {resources_count}",
            "",
            "## Tools",
            *(f"- `{name}`" for name in tools),
        ]
    )
    md_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return json_path, md_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Sales Analytics MCP testing PoC")
    parser.add_argument(
        "--endpoint",
        default="http://localhost:3000/mcp",
        help="MCP endpoint URL",
    )
    parser.add_argument(
        "--call-tool",
        action="store_true",
        help="Also run tools/call for get-sales-data",
    )
    parser.add_argument(
        "--out-dir",
        default="artifacts",
        help="Output folder for artifacts",
    )
    args = parser.parse_args()

    steps: List[StepResult] = []
    tools: List[str] = []
    resources_count = 0
    session_id: Optional[str] = None

    try:
        s_init, session_id = check_initialize(args.endpoint)
        steps.append(s_init)
        print(f"[{'PASS' if s_init.passed else 'FAIL'}] {s_init.name}")
        if not s_init.passed:
            raise RuntimeError("initialize failed")

        s_tools, tools = check_tools_list(args.endpoint, session_id)
        steps.append(s_tools)
        print(f"[{'PASS' if s_tools.passed else 'FAIL'}] {s_tools.name}")

        s_res, resources = check_resources_list(args.endpoint, session_id)
        resources_count = len(resources)
        steps.append(s_res)
        print(f"[{'PASS' if s_res.passed else 'FAIL'}] {s_res.name}")

        if args.call_tool:
            s_call = maybe_call_get_sales_data(args.endpoint, session_id, tools)
            steps.append(s_call)
            print(f"[{'PASS' if s_call.passed else 'FAIL'}] {s_call.name}")

    except Exception as e:  # noqa: BLE001
        print(f"PoC run failed: {e}", file=sys.stderr)
        # Keep artifact generation for debugging where possible.
    finally:
        json_path, md_path = save_artifacts(
            out_dir=Path(args.out_dir),
            endpoint=args.endpoint,
            session_id=session_id,
            steps=steps,
            tools=tools,
            resources_count=resources_count,
        )
        print("Saved artifacts:")
        print(f" - {json_path}")
        print(f" - {md_path}")

    all_passed = len(steps) > 0 and all(s.passed for s in steps)
    return 0 if all_passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
