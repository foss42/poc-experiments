# apidash-agentic-tester

A proof of concept for my GSoC 2026 application to [API Dash](https://github.com/foss42/apidash). The idea behind the proposal is to build an AI agent that reads an API spec, figures out what tests to write, and runs them — no manual test writing needed.

This PoC shows the core pipeline works. You give it an OpenAPI spec, it extracts the endpoints, asks GPT to generate test cases, and then actually executes them against a live URL. The whole thing runs as an MCP server so it plugs directly into VS Code's Copilot chat as a set of tools.

---

## How it works

There are three tools, each mapping to a component from the proposal:

| Tool | What it does |
|---|---|
| `parse_api_spec` | Reads an OpenAPI 3.x JSON spec and pulls out every endpoint — path, method, parameters, request body shape, expected response codes |
| `generate_test_cases` | Sends those endpoints to GPT-3.5-turbo and gets back structured test cases covering happy path, missing required fields, and invalid input types |
| `execute_tests` | Runs the test cases against a real URL using fetch, checks status code, response schema, and response time, and returns a PASS/FAIL per test |

The server also registers an HTML UI panel that renders inside VS Code when you run `execute_tests` — you get a colour-coded results dashboard directly in the chat.

The self-healing module (auto-fixing failing tests) is out of scope for this PoC — that's the next phase of the full GSoC project.

---

## Project structure

```
src/
  index.ts          — MCP server, HTTP routing, session management
  spec-parser.ts    — OpenAPI 3.x → Endpoint[]
  test-generator.ts — Endpoint[] → TestCase[] via GPT-3.5-turbo
  test-executor.ts  — TestCase[] → TestResult[] against a live URL
  ui/
    test-results.ts — HTML dashboard panel (MCP Apps handshake + results UI)

sample_spec.json    — a minimal Todo API spec to test with
.env.example        — copy this to .env and add your OpenAI key
.vscode/mcp.json    — tells VS Code where to find the MCP server
```

---

## Setup

You need Node 20+ and an OpenAI API key.

```bash
git clone <repo-url>
cd apidash-agentic-tester
npm install
cp .env.example .env
# open .env and set OPENAI_API_KEY=sk-...
npm run dev
```

The server starts on `http://localhost:3000/mcp`.

---

## Connecting to VS Code

Open the project folder in VS Code — the `.vscode/mcp.json` file is already set up to point at the server. If VS Code doesn't pick it up automatically:

1. `Cmd+Shift+P` → **MCP: Add Server**
2. Choose **HTTP**, enter `http://localhost:3000/mcp`
3. Name it `apidash-agent-tester`, save to Workspace

Then open Copilot Chat, switch to **Agent mode**, and click the 🔧 tools icon — you should see the three tools listed under `apidash-agent-tester`.

---

## Running the demo

The three prompts below walk through the full pipeline. Run them in order in the Copilot Agent chat.

**Step 1 — parse the spec**
```
Parse this spec and show me the endpoints:
<paste the contents of sample_spec.json>
```

**Step 2 — generate test cases**
```
Generate test cases for these endpoints:
<paste the endpoints JSON from step 1>
```

**Step 3 — execute the tests**
```
Execute the tests against https://jsonplaceholder.typicode.com
<paste the test cases JSON from step 2>
```

After step 3 the results dashboard should appear in a panel next to the chat.

---

## Testing without VS Code (curl)

If you want to poke at it directly:

```bash
# 1. Start a session
SESSION=$(curl -s -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0"}}}' \
  -D - 2>/dev/null | grep -i "mcp-session-id" | awk '{print $2}' | tr -d '\r')
echo "Session: $SESSION"

# 2. Call a tool
curl -s -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"parse_api_spec","arguments":{"spec":{"openapi":"3.0.3","info":{"title":"Todo API","version":"1.0.0"},"paths":{"/todos":{"get":{"operationId":"listTodos","responses":{"200":{"description":"ok"}}}}}}}}}' \
  | sed 's/.*data: //'
```
