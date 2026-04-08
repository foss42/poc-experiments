# PoC: Open Responses & Generative UI — Shridhar Panigrahi

GSoC 2026 · [Idea 5: Open Responses & Generative UI](https://github.com/foss42/apidash/discussions/1227)

**Main PR (integrated Flutter code):** [foss42/apidash#1358](https://github.com/foss42/apidash/pull/1358)

The PoC is integrated directly into the API Dash codebase — it modifies the response pipeline, adds widgets inside `lib/`, and extends `packages/genai/`. Because it depends on the app's source, the code lives in the main repo PR. This directory contains the standalone mock server (runnable without Flutter) and full documentation.

---

## What was built

### 1. Open Responses viewer
Parses the OpenAI Responses API format and renders each output type as a typed card:

- **Reasoning** — collapsible with summary preview
- **Web/file search calls** — status chip + query list
- **Function calls + results** — grouped by `call_id`, expandable args, tool output rendered as key-value table when JSON
- **Messages** — role-labelled chat bubbles with full GitHub Flavored Markdown
- **Token usage bar** at the bottom

Auto-activates in API Dash when a response matches `{"object": "response", "output": [...]}`.

### 2. SSE streaming
`OpenResponsesStreamParser` handles the live event sequence:
`response.created` → `output_item.added` → text/reasoning/args deltas → `output_item.done` → `response.completed`

The `/stream` endpoint in `mock_server.py` emits this sequence so it can be tested without an OpenAI key.

### 3. A2UI / Generative UI renderer
Parses A2UI JSONL (`createSurface`, `updateComponents`, `updateDataModel`) and renders 15 interactive Flutter component types with local state and JSON Pointer data binding.

### 4. Agent chatflow (MCP Apps pattern)
`AgentChatView` is an interactive chat widget. The user types a message, it POSTs to `/mcp/query`, and the Open Responses reply renders inline per turn — showing the full bidirectional loop from the [MCP Apps chatflow pattern](https://github.com/ashitaprasad/sample-mcp-apps-chatflow).

Each agent turn shows the full trace: reasoning → tool calls with structured results → final message.

---

## Running the mock server (no Flutter needed)

```bash
python3 mock_server.py
```

| Endpoint | What it does |
|----------|--------------|
| `GET /open-responses` | Full Open Responses JSON (reasoning + web/file search + tool call + message) |
| `GET /a2ui` | A2UI JSONL dashboard (cards, progress, chips, buttons, data binding) |
| `GET /agent-chat` | Two-turn chatflow JSON — each turn is a full Open Responses object |
| `GET /stream` | SSE stream — emits all Open Responses event types live |
| `POST /mcp/query` | Interactive agent backend. Send `{"message": "..."}`, get back an Open Responses object. Try: "weather", "stripe", "health" |

```bash
# Test the interactive chat endpoint
curl -X POST http://localhost:8765/mcp/query \
  -H "Content-Type: application/json" \
  -d '{"message": "check london weather"}'
```

---

## Running the full Flutter demo

```bash
git clone https://github.com/sridhar-panigrahi/apidash
cd apidash
git checkout poc-open-responses-genui

# Terminal 1
python3 mock_server.py

# Terminal 2 — interactive agent chat
flutter run -t lib/agent_chat_demo.dart

# Or run the full app and point requests at mock_server.py
flutter run
```

---

## Tests

44 tests across two files:
- `packages/genai/test/models/open_responses_test.dart` — 27 tests covering all output types, SSE stream parsing, streaming delta accumulation, previous_response_id, refusal content
- `packages/genai/test/models/a2ui_test.dart` — 17 tests covering JSONL parsing, component map, data binding, edge cases

```bash
cd packages/genai
dart test
```

---

## Architecture

```
mock_server.py              ← standalone demo backend
  /open-responses           ← triggers Structured tab in APIDash
  /a2ui                     ← triggers GenUI tab in APIDash
  /stream                   ← SSE stream for streaming parser
  POST /mcp/query           ← agent chat backend

packages/genai/lib/models/
  open_responses.dart       ← sealed output item classes + stream parser
  a2ui.dart                 ← A2UI JSONL models

lib/widgets/
  open_responses_viewer.dart  ← typed card renderer
  a2ui_renderer.dart          ← 15-component GenUI renderer
  agent_chat_view.dart        ← interactive chat timeline
  response_body.dart          ← auto-detection + routing

lib/agent_chat_demo.dart    ← standalone Flutter entry point
```

---

## Video demos

- [Open Responses Viewer](https://youtu.be/paN-KGIhNms)
- [A2UI Renderer](https://youtu.be/T2KbHth736U)

---

## MCP Apps pattern connection

After studying [ashitaprasad/sample-mcp-apps-chatflow](https://github.com/ashitaprasad/sample-mcp-apps-chatflow) and the [AWS MCP agentic UI article](https://dev.to/aws/how-i-built-mcp-apps-based-sales-analytics-agentic-ui-deployed-it-on-amazon-bedrock-agentcore-4e9i):

The MCP Apps pattern returns `structuredContent` (typed data for the UI) alongside `content` (text for the agent). In the Open Responses format, `function_call_output.output` carries that structured data. The `_StructuredOutput` widget renders it as a key-value table — same concept, Flutter-native.

`AgentChatView` plays the role of the MCP Apps host: receives agent output, renders structured cards inline in the chat window, and supports follow-up turns via `/mcp/query`.
