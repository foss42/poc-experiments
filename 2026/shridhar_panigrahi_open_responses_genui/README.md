# Open Responses & Generative UI — Shridhar Panigrahi

GSoC 2026 · Idea 5 · APIDash PoC

**Flutter implementation:** [foss42/apidash#1358](https://github.com/foss42/apidash/pull/1358)
**Live hosted endpoints:** [apidash-liart.vercel.app](https://apidash-liart.vercel.app)

---

## What this PoC demonstrates

After studying [ashitaprasad/sample-mcp-apps-chatflow](https://github.com/ashitaprasad/sample-mcp-apps-chatflow) and the [AWS MCP agentic UI article](https://dev.to/aws/how-i-built-mcp-apps-based-sales-analytics-agentic-ui-deployed-it-on-amazon-bedrock-agentcore-4e9i), the core insight is:

> **The MCP Apps pattern and the Open Responses format solve the same problem at different layers.** MCP tools return `structuredContent` for the UI to render. Open Responses wraps those tool calls in a typed envelope. APIDash needs to render both.

This PoC shows the full loop end-to-end.

---

## Architecture

```
User types in APIDash
        │
        ▼
  AgentChatView (Flutter)
        │  POST /mcp/query  (or POST /mcp for real MCP JSON-RPC)
        ▼
  MCP Server (server/src/index.ts)
        │  tool returns { content, structuredContent }
        ▼
  Open Responses envelope
  {
    "type": "function_call_output",
    "output": { <structuredContent> }   ← APIDash renders this as a UI card
  }
        │
        ▼
  OpenResponsesViewer (Flutter)
   ├─ ReasoningCard     — collapsible chain-of-thought
   ├─ ToolCallGroup     — function call + structured result table
   └─ MessageCard       — markdown answer
```

### The structuredContent connection

In the MCP Apps pattern, every tool returns:
- `content` — text the LLM reasons about
- `structuredContent` — typed data the UI renders directly

In the Open Responses format, `function_call_output.output` IS that structured data. The APIDash viewer renders it as a key-value table today, and as richer widgets (charts, status boards) in the full GSoC implementation.

```
MCP tool result:
  content:          "London: 14°C, Overcast"
  structuredContent: { temperature: "14°C", condition: "Overcast", humidity: "81%" }

Open Responses function_call_output:
  output: '{"temperature":"14°C","condition":"Overcast","humidity":"81%"}'
                      ↑
              APIDash renders this as a structured card, not a raw string
```

---

## What's in this repo

### `server/` — TypeScript MCP Apps server

Implements the same pattern as [ashitaprasad/sample-mcp-apps-chatflow](https://github.com/ashitaprasad/sample-mcp-apps-chatflow), adapted for APIDash use cases.

Four tools, each returning `content` + `structuredContent`:

| Tool | What it does | structuredContent shape |
|------|-------------|------------------------|
| `run_api_test` | Fire a test HTTP request | `{ method, url, status, latency_ms, passed }` |
| `check_api_health` | Multi-service health check | `{ services: {name: status}, uptime_pct, avg_latency_ms }` |
| `list_api_templates` | Browse APIDash template catalogue | `{ category, count, templates: string[] }` |
| `get_weather` | Weather lookup | `{ location, temperature, condition, humidity, wind }` |

```bash
cd server
npm install
npm run dev
# MCP server at http://localhost:3000

# Test via MCP JSON-RPC:
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0", "id": 1, "method": "tools/call",
    "params": {
      "name": "get_weather",
      "arguments": { "location": "London", "unit": "celsius" }
    }
  }'
```

### `api/` + `vercel.json` + `public/` — Hosted Vercel mock endpoints

Python serverless functions that return Open Responses format directly, deployed at [apidash-liart.vercel.app](https://apidash-liart.vercel.app).

| Endpoint | What you get |
|----------|-------------|
| `GET /open-responses` | Full Open Responses object — reasoning, web search, tool call, message |
| `GET /a2ui` | A2UI JSONL dashboard with cards, progress bar, chips, buttons |
| `GET /agent-chat` | Two-turn chatflow — each turn is a full Open Responses object |
| `GET /stream` | SSE stream — all event types including deltas |
| `POST /mcp/query` | Send `{"message": "..."}` → Open Responses reply. Try "weather", "stripe", "health" |

No setup needed — hit these from APIDash directly.

### `mock_server.py` — Local Python server (no Node needed)

Same endpoints as the Vercel deployment, runs locally on port 8765.

```bash
python3 mock_server.py
# then use http://localhost:8765/<endpoint> in APIDash
```

---

## Running the Flutter demo

```bash
git clone https://github.com/sridhar-panigrahi/apidash
cd apidash
git checkout poc-open-responses-genui

# Option A: use the hosted Vercel endpoints (no local server needed)
flutter run -t lib/agent_chat_demo.dart

# Option B: run the mock server locally
python3 mock_server.py
flutter run
```

---

## Flutter implementation (apidash#1358)

| File | What it does |
|------|-------------|
| `packages/genai/lib/models/open_responses.dart` | Sealed classes for all output item types + `OpenResponsesStreamParser` for live SSE |
| `lib/widgets/open_responses_viewer.dart` | Typed cards per item — reasoning (collapsible), tool calls grouped with structured result table, markdown message |
| `lib/widgets/a2ui_renderer.dart` | A2UI JSONL parser + renderer for 15 component types with local state and JSON Pointer data binding |
| `lib/widgets/agent_chat_view.dart` | Interactive chat — user types, POSTs to `/mcp/query`, Open Responses reply renders inline per turn |
| `lib/widgets/response_body.dart` | Auto-detects Open Responses / SSE stream / A2UI before media-type routing |

**44 tests** — `dart test` from `packages/genai/`:
- 27 in `open_responses_test.dart` — all output types, SSE parsing, delta accumulation
- 17 in `a2ui_test.dart` — JSONL parsing, component map, data binding

---

## Video demos

- [Open Responses Viewer](https://youtu.be/paN-KGIhNms) — structured tab with reasoning trace, tool calls, markdown answer
- [A2UI Renderer](https://youtu.be/T2KbHth736U) — JSONL command stream building a live Flutter widget tree
- [Agent Chat](https://youtu.be/VLeFj6EyVqM) — interactive MCP chatflow: type a query, full agent trace renders inline per turn
