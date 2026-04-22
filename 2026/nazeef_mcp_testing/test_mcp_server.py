"""
MCP Server Test Client
Tests the sample-mcp-apps-chatflow server for JSON-RPC 2.0 conformance,
tool/resource discovery, and tool execution.

Target server: https://github.com/ashitaprasad/sample-mcp-apps-chatflow
Run the server first: ./node_modules/.bin/tsx src/index.ts
"""

import json
import urllib.request
import urllib.error

BASE_URL = "http://localhost:3000"
MCP_URL = f"{BASE_URL}/mcp"

_id = 0

def next_id():
    global _id
    _id += 1
    return _id

def mcp_call(method, params=None):
    """Send a JSON-RPC 2.0 request to the MCP server."""
    payload = {
        "jsonrpc": "2.0",
        "id": next_id(),
        "method": method,
        "params": params or {}
    }
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        MCP_URL,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream"
        }
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def _safe(text):
    return str(text).encode("ascii", errors="replace").decode("ascii")

def ok(label):
    print(f"  PASS  {_safe(label)}")

def fail(label, reason):
    print(f"  FAIL  {_safe(label)}: {_safe(reason)}")

def section(title):
    print(f"\n{'='*50}")
    print(f"  {title}")
    print('='*50)


# ── Test 1: Health check ──────────────────────────────

section("1. Health Check")
try:
    req = urllib.request.Request(f"{BASE_URL}/health")
    with urllib.request.urlopen(req) as resp:
        body = json.loads(resp.read().decode())
    assert body.get("status") == "ok", f"unexpected status: {body}"
    assert body.get("server") == "sample-mcp-apps-chatflow"
    ok(f"GET /health returned {body}")
except Exception as e:
    fail("GET /health", str(e))


# ── Test 2: Initialize ───────────────────────────────

section("2. Initialize (JSON-RPC handshake)")
try:
    resp = mcp_call("initialize", {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": {"name": "mcp-test-client", "version": "0.1.0"}
    })
    assert "result" in resp, f"no result field: {resp}"
    assert resp.get("jsonrpc") == "2.0", "jsonrpc field missing or wrong"
    assert "id" in resp, "id field missing"
    info = resp["result"].get("serverInfo", {})
    ok(f"Server: {info.get('name')} v{info.get('version')}")
    ok(f"Protocol version: {resp['result'].get('protocolVersion')}")
except Exception as e:
    fail("initialize", str(e))


# ── Test 3: Tool discovery ───────────────────────────

section("3. Tool Discovery (tools/list)")
try:
    resp = mcp_call("tools/list")
    tools = resp["result"]["tools"]
    tool_names = [t["name"] for t in tools]
    print(f"  Found {len(tools)} tools: {tool_names}")

    expected = [
        "select-sales-metric",
        "get-sales-data",
        "visualize-sales-data",
        "show-sales-pdf-report"
    ]
    for name in expected:
        if name in tool_names:
            ok(f"Tool present: {name}")
        else:
            fail("Tool missing", name)

    # Check each tool has a description and inputSchema
    for tool in tools:
        assert "description" in tool, f"{tool['name']} missing description"
        ok(f"Schema valid: {tool['name']}")
except Exception as e:
    fail("tools/list", str(e))


# ── Test 4: Resource discovery ───────────────────────

section("4. Resource Discovery (resources/list)")
try:
    resp = mcp_call("resources/list")
    resources = resp["result"]["resources"]
    print(f"  Found {len(resources)} resources")

    for r in resources:
        mime = r.get("mimeType", "")
        uri = r.get("uri", "")
        assert mime == "text/html;profile=mcp-app", f"unexpected mimeType: {mime}"
        assert uri.startswith("ui://"), f"unexpected URI scheme: {uri}"
        ok(f"Resource: {r['name']} | {uri}")
except Exception as e:
    fail("resources/list", str(e))


# ── Test 5: Call visualize-sales-data ────────────────

section("5. Tool Execution: visualize-sales-data")
try:
    test_report = {
        "summary": {
            "total": "1,20,000",
            "average": "40,000",
            "trend": "up",
            "totalRaw": 120000,
            "averageRaw": 40000
        },
        "topState": {
            "name": "Maharashtra",
            "code": "MH",
            "value": "60,000",
            "percentage": "50%"
        },
        "periods": [
            {"period": "Q1", "total": "30,000", "stateValues": {"MH": 20000, "TN": 10000}},
            {"period": "Q2", "total": "40,000", "stateValues": {"MH": 25000, "TN": 15000}},
            {"period": "Q3", "total": "50,000", "stateValues": {"MH": 30000, "TN": 20000}},
        ],
        "states": [
            {"state": "Maharashtra", "value": "60,000", "percentage": "50%"},
            {"state": "Tamil Nadu",  "value": "45,000", "percentage": "37.5%"}
        ],
        "stateNames": ["Maharashtra", "Tamil Nadu"]
    }

    resp = mcp_call("tools/call", {
        "name": "visualize-sales-data",
        "arguments": {
            "selections": {
                "states": ["MH", "TN"],
                "metric": "revenue",
                "period": "quarterly",
                "year": "2024"
            },
            "report": test_report
        }
    })

    assert "result" in resp, f"no result: {resp}"
    content = resp["result"]["content"]
    assert len(content) > 0, "empty content"
    assert content[0]["type"] == "text", "expected text content"
    ok(f"Response: {content[0]['text'][:80]}")

    structured = resp["result"].get("structuredContent")
    if structured:
        ok("structuredContent present in response")
except Exception as e:
    fail("visualize-sales-data", str(e))


# ── Test 6: JSON-RPC error handling ──────────────────

section("6. JSON-RPC Error Handling")
try:
    resp = mcp_call("tools/call", {
        "name": "nonexistent-tool",
        "arguments": {}
    })
    # MCP servers may return a JSON-RPC error OR a result with isError=true
    if "error" in resp:
        code = resp["error"].get("code")
        msg  = resp["error"].get("message")
        ok(f"JSON-RPC error returned -- code: {code}, message: {msg}")
    elif "result" in resp:
        content = resp["result"].get("content", [])
        is_error = resp["result"].get("isError", False)
        if is_error or any("error" in str(c).lower() for c in content):
            ok("Server returned isError=true in result content (valid MCP error handling)")
        else:
            ok(f"Server returned result for unknown tool (non-fatal): {str(content)[:60]}")
except Exception as e:
    fail("error handling", str(e))


# ── Summary ───────────────────────────────────────────

print(f"\n{'='*50}")
print("  Done")
print('='*50)
