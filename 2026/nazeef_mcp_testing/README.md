# MCP Server Test Client — PoC

**GSoC 2026 | API Dash — MCP Testing & Validation Suite**
**Applicant:** Nazeef Danladi Adamu

---

## What This Is

A proof-of-concept test client that connects to a live MCP server over HTTP and validates it against the MCP specification (JSON-RPC 2.0, protocol version 2024-11-05).

The target server is [sample-mcp-apps-chatflow](https://github.com/ashitaprasad/sample-mcp-apps-chatflow) — a Sales Analytics MCP Apps server that exposes tools and UI resources for an agentic chat interface.

---

## What It Tests

| # | Test | What is checked |
|---|------|-----------------|
| 1 | Health check | Server is reachable, returns expected status |
| 2 | Initialize | JSON-RPC handshake, server name/version, protocol version field |
| 3 | Tool discovery | All 4 expected tools present, each has description and inputSchema |
| 4 | Resource discovery | All 3 UI resources present, correct mimeType and URI scheme |
| 5 | Tool execution | `visualize-sales-data` called with real inputs, response validated |
| 6 | Error handling | Unknown tool call handled gracefully without crashing |

---

## How to Run

**Step 1 — Start the MCP server:**
```bash
git clone https://github.com/ashitaprasad/sample-mcp-apps-chatflow
cd sample-mcp-apps-chatflow
npm install
./node_modules/.bin/tsx src/index.ts
```

**Step 2 — Run the tests (no dependencies needed, stdlib only):**
```bash
python test_mcp_server.py
```

---

## Sample Output

```
==================================================
  1. Health Check
==================================================
  PASS  GET /health returned {'status': 'ok', 'server': 'sample-mcp-apps-chatflow'}

==================================================
  2. Initialize (JSON-RPC handshake)
==================================================
  PASS  Server: sample-mcp-apps-chatflow v1.0.0
  PASS  Protocol version: 2024-11-05

==================================================
  3. Tool Discovery (tools/list)
==================================================
  Found 4 tools: ['select-sales-metric', 'get-sales-data', 'visualize-sales-data', 'show-sales-pdf-report']
  PASS  Tool present: select-sales-metric
  PASS  Tool present: get-sales-data
  PASS  Tool present: visualize-sales-data
  PASS  Tool present: show-sales-pdf-report

==================================================
  4. Resource Discovery (resources/list)
==================================================
  Found 3 resources
  PASS  Resource: sales-metric-input-ui | ui://sample-mcp-apps-chatflow/sales-metric-input-ui
  PASS  Resource: sales-data-visualization-ui | ui://sample-mcp-apps-chatflow/sales-visualization
  PASS  Resource: sales-pdf-report-ui | ui://sample-mcp-apps-chatflow/sales-pdf-report

==================================================
  5. Tool Execution: visualize-sales-data
==================================================
  PASS  Response: Sales visualization rendered for Revenue (Quarterly, 2024) across 2 states.
  PASS  structuredContent present in response

==================================================
  6. JSON-RPC Error Handling
==================================================
  PASS  Server returned isError=true in result content (valid MCP error handling)
```

---

## Connection to the Full Proposal

This PoC covers the core of what I proposed to build inside API Dash:

- **Transport layer testing** — the `Accept: application/json, text/event-stream` header requirement (Streamable HTTP spec) was discovered during testing. The full suite would catch this automatically.
- **Tool schema validation** — verifying inputSchema structure maps to the proposed schema conformance checks.
- **Resource mimeType enforcement** — `text/html;profile=mcp-app` is a spec-defined value the full validator would flag if wrong.
- **Structured content validation** — `structuredContent` in tool responses is part of the MCP Apps extension (SEP-1865), which the full suite would validate per schema.

The full project would embed these checks inside API Dash so developers can test any MCP server interactively without writing code.
