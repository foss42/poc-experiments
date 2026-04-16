# MCP Testing Suite — PoC

**GSoC 2026 Applicant:** [@souvikDevloper](https://github.com/souvikDevloper) (Souvik Ghosh)  
**Project:** #1 MCP Testing — [Discussion #1225](https://github.com/foss42/apidash/discussions/1225)  
**Proposal PR (merged):** [foss42/apidash#1409](https://github.com/foss42/apidash/pull/1409)

## Overview

This Proof of Concept demonstrates the core direction of the **MCP Testing** project for API Dash by testing a real MCP Apps server end to end.

The target server is the **Sales Analytics MCP Apps server** by [@ashitaprasad](https://github.com/ashitaprasad), built around the MCP Apps workflow described in the referenced article below.

The PoC launches the server locally, waits for it to become healthy, and then validates its MCP behavior over **HTTP JSON-RPC** through the `/mcp` endpoint.

## What This PoC Covers

This PoC verifies the following pieces of functionality:

- **HTTP transport validation**
  - starts the real TypeScript server with `subprocess.Popen`
  - waits for the server to come up
  - confirms readiness through `/health`

- **JSON-RPC 2.0 protocol checks**
  - `initialize`
  - `tools/list`
  - `tools/call`
  - `resources/list`

- **Tool execution testing**
  - `select-sales-metric`
  - `get-sales-data`
  - `visualize-sales-data`
  - `show-sales-pdf-report`

- **MCP Apps detection**
  - detects `ui://...` resource URIs from tool metadata and listed resources

- **4-layer failure classification**
  - transport
  - protocol
  - tool-exec
  - ui-handshake

- **Snapshot diffing**
  - demonstrates baseline comparison and field-level change detection

- **Structured JSON output**
  - useful for future integration with the full desktop application

The Python harness uses only the standard library and has **zero external Python dependencies**.

## Target Server

This PoC tests the Sales Analytics MCP Apps server from:

- **Repository:** [ashitaprasad/sample-mcp-apps-chatflow](https://github.com/ashitaprasad/sample-mcp-apps-chatflow)
- **Transport:** Streamable HTTP MCP server
- **Endpoint:** `POST /mcp`

## Why This PoC Matters

The larger MCP Testing project aims to help developers validate MCP servers more systematically.

This PoC shows that the core testing flow can already:

- start a real MCP server automatically
- verify transport and protocol behavior
- exercise actual tools with realistic inputs
- inspect MCP App resource metadata
- classify failures in a useful way for debugging and reporting

In short, this is not a mocked demo. It tests a real MCP Apps server end to end.





## Setup

### Prerequisites

- Python 3.8+
- Node.js 18+
- npm
- git

### Run

```bash
# 1. Clone this repo (or your fork of foss42/gsoc-poc)
git clone https://github.com/souvikDevloper/gsoc-poc.git
cd gsoc-poc/souvik-mcp-testing

# 2. Clone and build the Sales Analytics MCP server
bash setup.sh

# 3. Run the PoC
python3 poc_sales_analytics.py
```

## Example Output

```text
MCP Testing Suite — Sales Analytics Server PoC
════════════════════════════════════════════════
Server: ashitaprasad/sample-mcp-apps-chatflow
Transport: HTTP POST /mcp (Streamable HTTP server)

✓ L1 · Transport: spawn server
  ↳ http://127.0.0.1:<port>/health OK
✓ L1 · Transport: HTTP health check
  ↳ sample-mcp-apps-chatflow v1.0.0
✓ L2 · Protocol: initialize handshake
✓ L2 · Protocol: tools/list discovery
✓ L2 · Protocol: tool schema validation
✓ L2 · Protocol: error -32601 classification
✓ L3 · Tool exec: select-sales-metric
✓ L3 · Tool exec: get-sales-data (3 states)
✓ L3 · Tool exec: visualize-sales-data
✓ L3 · Tool exec: show-sales-pdf-report
✓ L3 · MCP Apps: resource URI detection
✓ L4 · UI handshake: ui/initialize
✓ L2 · Protocol: resources/list
✓ L2 · Replay: snapshot diff
✓ L* · Classifier: 6 rules verified

✓ All 15 tests passed

Server: sample-mcp-apps-chatflow v1.0.0 · 4 tools · 4 MCP Apps
```

## Flags

| Flag | Description |
|------|-------------|
| `--json` | Outputs structured JSON for automation and future desktop app integration |
| `--verbose` | Prints raw JSON-RPC requests and responses for each step |

## Repository Files

| File | Description |
|------|-------------|
| `poc_sales_analytics.py` | Main Python test harness for the Sales Analytics MCP Apps server |
| `setup.sh` | Clones and builds the target Sales Analytics server |
| `README.md` | PoC documentation |

## How This Connects to the Full MCP Testing Project

This PoC is a focused version of the broader MCP Testing idea proposed for API Dash.

| PoC Concept | Broader Project Direction |
|---|---|
| HTTP MCP runner | reusable transport layer |
| protocol validation | MCP request/response verification engine |
| tool execution tests | scenario runner |
| failure classification | diagnostics and trace inspection |
| snapshot diffing | regression tracking |
| JSON output | backend-to-frontend reporting format |

## Notes

- The PoC is intentionally small and focused.
- It targets one real MCP Apps server instead of trying to support many servers at once.
- The goal here is to prove the testing approach clearly, not to present the final full product.

## References

- [Sales Analytics MCP server](https://github.com/ashitaprasad/sample-mcp-apps-chatflow)
- [MCP Apps article](https://dev.to/aws/how-i-built-mcp-apps-based-sales-analytics-agentic-ui-deployed-it-on-amazon-bedrock-agentcore-4e9i)
- [MCP Apps practical guide](https://dev.to/ashita/a-practical-guide-to-building-mcp-apps-1bfm)
- [Proposal PR (merged)](https://github.com/foss42/apidash/pull/1409)
