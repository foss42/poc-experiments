# Open Responses & Generative UI — Shridhar Panigrahi

GSoC 2026 · Idea 5 · [foss42/apidash#1358](https://github.com/foss42/apidash/pull/1358)

The Flutter widget code is integrated directly into the API Dash codebase (it modifies the response pipeline and lives inside `lib/` and `packages/genai/`), so the main implementation is in the PR above. This folder has the standalone mock server you can run without Flutter, plus full documentation on how everything fits together.

---

## What I built

**Open Responses viewer** — auto-detects the OpenAI Responses API format and renders each output item as a typed card: reasoning (collapsible), web/file search calls, function calls grouped with their results, and the final message with full markdown. Tool outputs render as a key-value table when the output is valid JSON, so you can actually read what the tool returned instead of squinting at a raw string.

**SSE streaming** — `OpenResponsesStreamParser` handles the live event sequence end-to-end. The `/stream` endpoint in the mock server emits a real event sequence so you can test streaming without an OpenAI key. It's already wired into `response_body_success.dart`.

**A2UI / Generative UI renderer** — parses A2UI JSONL and renders 15 Flutter component types (cards, rows, columns, text, buttons, inputs, progress bars, chips, tabs) with local state and JSON Pointer data binding.

**Agent chatflow** — `AgentChatView` is an interactive chat widget. Type a message, it POSTs to `/mcp/query`, and the Open Responses reply renders inline as a new turn. Shows the full agent trace per message: reasoning → tool calls → structured results → final answer. This is the part that addresses the maintainer's request to explore how Open Responses can be rendered from inside AI agents — same rendering pipeline as the response panel, but embedded in a conversation.

---

## Running the mock server

No Flutter needed for this part.

```bash
python3 mock_server.py
```

| Endpoint | What you get |
|----------|--------------|
| `GET /open-responses` | Full Open Responses JSON — reasoning, web search, file search, tool call, message |
| `GET /a2ui` | A2UI JSONL dashboard with cards, progress bar, chips, and buttons |
| `GET /agent-chat` | Two-turn chatflow — each turn is a full Open Responses object |
| `GET /stream` | SSE stream with all event types |
| `POST /mcp/query` | Send `{"message": "..."}` and get an Open Responses reply. Try "weather", "stripe", or "health" |

```bash
# quick test of the interactive endpoint
curl -X POST http://localhost:8765/mcp/query \
  -H "Content-Type: application/json" \
  -d '{"message": "check london weather"}'
```

---

## Running the Flutter demo

```bash
git clone https://github.com/sridhar-panigrahi/apidash
cd apidash
git checkout poc-open-responses-genui

# start the mock server
python3 mock_server.py

# run the interactive chat demo
flutter run -t lib/agent_chat_demo.dart

# or run the full app and point requests at the mock server
flutter run
```

---

## Tests

44 tests total — `dart test` from `packages/genai/`:

- 27 in `open_responses_test.dart` — all output types, SSE stream parsing, delta accumulation, streaming full sequence, `previous_response_id`, refusal content
- 17 in `a2ui_test.dart` — JSONL parsing, component map, data binding, edge cases

---

## How it connects to the MCP Apps pattern

After going through [ashitaprasad/sample-mcp-apps-chatflow](https://github.com/ashitaprasad/sample-mcp-apps-chatflow) and the [AWS MCP agentic UI article](https://dev.to/aws/how-i-built-mcp-apps-based-sales-analytics-agentic-ui-deployed-it-on-amazon-bedrock-agentcore-4e9i):

The MCP Apps pattern has tools returning two layers — `content` (text the agent reasons about) and `structuredContent` (typed data the UI renders). In the Open Responses format, `function_call_output.output` is that structured data. The key-value table rendering in `_StructuredOutput` is the Flutter equivalent of how the MCP chatflow renders `structuredContent` in the iframe.

`AgentChatView` is the host layer: user sends a message, widget calls `/mcp/query` (standing in for the agent host), and the returned `OpenResponsesResult` renders inline with reasoning + tool calls + answer visible in the conversation window.

---

## Video demos

[Open Responses Viewer](https://youtu.be/paN-KGIhNms) · [A2UI Renderer](https://youtu.be/T2KbHth736U)
