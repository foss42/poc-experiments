# MCP Conformance Testing Engine — PoC

> Transport-agnostic conformance testing for MCP servers, including MCP Apps.
> **GSoC 2026** — Vinícius Melo ([@vinimlo](https://github.com/vinimlo))
> Proposal: [foss42/apidash#1476](https://github.com/foss42/apidash/pull/1476)

## What This Is

A protocol-first conformance testing engine that validates any MCP server — regardless of transport — against the [Model Context Protocol](https://modelcontextprotocol.io) specification.

**Key capabilities:**
- **Transport-agnostic**: 19 core protocol tests run identically over **stdio** and **Streamable HTTP**
- **MCP Apps support**: 13 tests for the [MCP Apps extension](https://dev.to/aws/how-i-built-mcp-apps-based-sales-analytics-agentic-ui-deployed-it-on-amazon-bedrock-agentcore-4e9i) — covers all 4 Sales Analytics tools, `resources/read`, CSP validation, and the full select → data → visualize → PDF pipeline
- **Zero runtime dependencies**: Uses native `fetch()` and `child_process` only
- **Protocol-direct**: No MCP SDK — implements JSON-RPC 2.0 directly to prove understanding

## Quick Start

### Testing the Sales Analytics MCP Apps Server

```bash
# Terminal 1: Start the Sales Analytics server
git clone https://github.com/ashitaprasad/sample-mcp-apps-chatflow
cd sample-mcp-apps-chatflow
npm install
npm run dev   # → http://localhost:3000/mcp

# Terminal 2: Run conformance tests
cd 2026/vinicius_mcp_testing
npm install
npx tsx src/cli.ts --transport http --url http://localhost:3000/mcp
```

### Testing via stdio (built-in fixture)

```bash
npx tsx src/cli.ts --server "npx tsx fixtures/test-server.ts"
```

## Demo Output

```
mcp-conformance v0.3.0
Transport: http | Target: http://localhost:3000/mcp
Suite: all

▸ Running core conformance suite
▸ Running MCP Apps suite

Protocol
  ✓ initialize returns valid result (40ms)
  ✓ server reports protocol version (3ms)
  ✓ server reports name and version (2ms)
  ✓ capabilities is an object (1ms)

Discovery
  ✓ tools/list returns valid array (13ms)

Schema
  ✓ all tools have name and description (0ms)
  ✓ all tools have valid inputSchema (0ms)

Execution
  ✓ tools/call with valid params succeeds (7ms)
  ✓ tools/call with unknown tool returns error (3ms)
  ✓ tool result contains typed content (3ms)
  ✓ tools/call to each discovered tool succeeds (8ms)
  ✓ tool content items have text field (1ms)

Edge Cases
  ✓ unknown method returns error code (2ms)
  ✓ duplicate initialize is idempotent (1ms)
  ✓ concurrent tool calls resolve independently (1ms)
  ✓ tools/call with extra params does not crash (1ms)
  ✓ tools/call with empty arguments object (1ms)
  ✓ JSON-RPC response has correct version field (1ms)
  ✓ error response includes message field (0ms)

MCP Apps
  ✓ get-sales-data returns structuredContent (2ms)
  ✓ structuredContent contains valid report structure (1ms)

MCP Apps: Resources
  ✓ resources/list exposes MCP Apps UI resources (2ms)
  ✓ UI resources use mcp-app MIME type (2ms)
  ✓ UI resources use ui:// URI scheme (1ms)

MCP Apps: Metadata
  ✓ resources/read returns HTML content for UI resources (2ms)
  ✓ UI resources with CSP declare resourceDomains (1ms)

MCP Apps: Metadata
  ✓ tools declare UI resource bindings via _meta (1ms)
  ✓ tools declare visibility levels (1ms)

MCP Apps: Tools
  ✓ visualize-sales-data returns chart structuredContent (1ms)
  ✓ show-sales-pdf-report returns PDF base64 (41ms)

MCP Apps: Workflow
  ✓ tool workflow: select → fetch data pipeline (1ms)
  ✓ full pipeline: select → data → visualize → PDF (37ms)

32 passed (0.1s)
```

## Architecture

```
                    ┌─────────────────┐
                    │     CLI         │  --transport stdio|http
                    │   (cli.ts)      │  --server <cmd>|--url <url>
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   MCPClient     │  JSON-RPC 2.0
                    │  (client.ts)    │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │                             │
     ┌────────▼──────┐            ┌─────────▼───────┐
     │ StdioTransport │            │  HttpTransport  │
     │  child_process  │            │  native fetch   │
     └───────────────┘            └─────────────────┘
                                           │
     ┌─────────────────────────────────────┘
     │
     ▼
  TransportAdapter interface
    connect() → send(JsonRpcRequest) → disconnect()
```

The same `MCPClient` and test suites run against **any** transport. Adding a new transport (WebSocket, SSE) requires only implementing the 3-method `TransportAdapter` interface.

## Test Categories

### Core Conformance (19 tests)

| Category | Tests | What It Validates |
|----------|-------|-------------------|
| Protocol | 4 | `initialize` response shape, protocol version, server info, capabilities |
| Discovery | 1 | `tools/list` returns valid array |
| Schema | 2 | Tool names, descriptions, inputSchema structure |
| Execution | 5 | Tool calls, unknown tool handling, content typing |
| Edge Cases | 7 | Unknown methods, idempotency, concurrency, extra params, JSON-RPC version |

### MCP Apps (13 tests)

| Category | Tests | What It Validates |
|----------|-------|-------------------|
| MCP Apps | 2 | `structuredContent` field presence and report data structure |
| MCP Apps: Resources | 5 | UI resources via `resources/list`, MIME type, `ui://` scheme, `resources/read` HTML content, CSP `resourceDomains` |
| MCP Apps: Metadata | 2 | Tool `_meta.ui.resourceUri` bindings, visibility levels (`model`/`app`) |
| MCP Apps: Tools | 2 | `visualize-sales-data` chart structuredContent, `show-sales-pdf-report` PDF base64 generation |
| MCP Apps: Workflow | 2 | 2-step pipeline (select → data), full 4-step pipeline (select → data → visualize → PDF) |

## CLI Options

```
npx tsx src/cli.ts [options]

Options:
  --transport stdio|http   Transport type (default: stdio)
  --server <command>       Server command (required for stdio)
  --url <url>              Server URL (required for http)
  --suite all|core|mcp-apps  Test suite to run (default: all)
```

## npm Scripts

```bash
npm test              # Core tests via stdio (built-in fixture)
npm run test:http     # All tests via HTTP (requires running server)
npm run test:apps     # MCP Apps tests only
```

## Files

```
src/
├── transport/
│   ├── stdio.ts          # Stdio transport (child_process spawn)
│   └── http.ts           # Streamable HTTP transport (native fetch)
├── client.ts             # MCPClient — protocol methods
├── assertions.ts         # Composable assertion library
├── suite.ts              # 19 core conformance tests
├── suite-mcp-apps.ts     # 8 MCP Apps extension tests
└── cli.ts                # CLI entry point
fixtures/
└── test-server.ts        # Minimal MCP server fixture
```
