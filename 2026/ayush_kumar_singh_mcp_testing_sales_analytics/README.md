# MCP Testing PoC - Sales Analytics MCP Apps Server

This PoC is for **GSoC 2026 Idea #1 (MCP Testing)** and follows the required reference:

- https://dev.to/aws/how-i-built-mcp-apps-based-sales-analytics-agentic-ui-deployed-it-on-amazon-bedrock-agentcore-4e9i

It demonstrates a minimal MCP testing workflow against the **Sales Analytics MCP Apps server**:

1. `initialize`
2. `tools/list`
3. `resources/list`
4. Optional `tools/call` (`get-sales-data` if available)
5. Artifact recording (JSON + Markdown summary)

## Folder Contents

- `run_sales_mcp_poc.py` - PoC runner script
- `artifacts/` - generated run outputs

## Prerequisites

- Python 3.10+
- Sales Analytics MCP Apps server running from the article source
- MCP endpoint available (default): `http://localhost:3000/mcp`

## 1) Run the Sales Analytics MCP Apps Server

Use the article's server source and run it (as described in the article):

```bash
npm install
npm run dev
```

Reference server repo from the article:

- https://github.com/ashitaprasad/sample-mcp-apps-chatflow

Expected endpoint:

- Server base: `http://localhost:3000`
- MCP endpoint: `http://localhost:3000/mcp`

## 2) Run the PoC tester

From this folder:

```bash
python3 run_sales_mcp_poc.py --endpoint http://localhost:3000/mcp --call-tool
```

If you only want protocol checks (without tool invocation):

```bash
python3 run_sales_mcp_poc.py --endpoint http://localhost:3000/mcp
```

## 3) What this validates

- MCP server accepts and responds to `initialize`
- Session handling via `mcp-session-id` header (if returned)
- `tools/list` includes expected Sales Analytics tools
  - `select-sales-metric`
  - `get-sales-data`
  - `visualize-sales-data`
  - `show-sales-pdf-report`
- `resources/list` returns MCP Apps resources and at least one HTML resource
- Optional: `tools/call` for `get-sales-data` returns structured result

## 4) Artifacts produced

Each run stores:

- `artifacts/run_<timestamp>.json`
- `artifacts/run_<timestamp>.md`

The artifact includes:

- step-by-step requests/responses
- timings
- pass/fail checks
- discovered tools/resources
- tool-call outcome (if executed)

## Example command output (shape)

```text
[PASS] initialize
[PASS] tools/list
[PASS] resources/list
[PASS] tools/call(get-sales-data)
Saved artifacts:
 - artifacts/run_2026-04-01T08-50-05Z.json
 - artifacts/run_2026-04-01T08-50-05Z.md
```

## Proof of execution (this PoC run)

Command used:

```bash
python3 run_sales_mcp_poc.py --endpoint http://localhost:3000/mcp --call-tool
```

Observed output:

```text
[PASS] initialize
[PASS] tools/list
[PASS] resources/list
[PASS] tools/call(get-sales-data)
Saved artifacts:
 - artifacts/run_2026-04-01T15-03-26Z.json
 - artifacts/run_2026-04-01T15-03-26Z.md
```

## Notes

- This PoC is intentionally minimal and focused on proving MCP testing workflow feasibility.
- It is not the full API Dash implementation.
