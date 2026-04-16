# API Explorer PoC — hitarth_api_explorer

**GSoC 2026 Proof of Concept** by [@hitarthium](https://github.com/hitarthium)  
**Proposal:** [API Explorer (#8)](https://github.com/foss42/apidash/pull/1525) · **Org:** foss42 / API Dash

---

## What This Demonstrates

This PoC has **two components** directly corresponding to the proposal:

### 1. Python OpenAPI Parser Pipeline (`python_pipeline/`)
Parses any OpenAPI 3.x / Swagger 2.0 spec (URL or file) and outputs a structured JSON template for the API Explorer registry. This is the automation backend described in the proposal.

**Features:**
- Fetches specs from URL or local file (JSON/YAML)
- Extracts: name, base_url, auth_type, endpoints, params, sample responses
- Auto-tags category using keyword classification
- Outputs a clean JSON template ready for the registry

### 2. MCP Server with MCP Apps UI (`mcp_server/`)
A TypeScript MCP server that exposes API Explorer as an **interactive UI rendered directly inside an AI agent chat window** using the MCP Apps protocol — as requested in the PoC guidelines.

**Tools exposed:**
| Tool | Description |
|------|-------------|
| `explore_apis` | Renders interactive API Explorer UI inside AI chat (MCP Apps) |
| `parse_openapi` | Parses an OpenAPI spec URL → JSON template |
| `import_api` | Imports an API endpoint into API Dash workspace |

---

## Architecture

```
User (in AI Agent chat)
        │
        │  "Show me weather APIs"
        ▼
  AI Agent (VS Code / Claude / ChatGPT)
        │
        │  calls tool: explore_apis(category="Weather")
        ▼
  MCP Server (api-explorer)
        │
        │  returns HTML resource (MCP Apps)
        ▼
  Interactive API Explorer UI
  rendered inside chat window
        │
        │  user clicks "+ Import"
        ▼
  import_api tool called
        │
        ▼
  API Dash Workspace
  (pre-configured request ready to send)
```

```
OpenAPI Spec (URL/File)
        │
        ▼
  parser.py
  ├── Fetch & parse YAML/JSON
  ├── Extract endpoints, params, responses
  ├── Detect auth type
  ├── Auto-tag category
        │
        ▼
  sample_output.json  →  API Registry  →  MCP Server
```

---

## Setup & Running

### Python Pipeline

```bash
cd python_pipeline
pip install -r requirements.txt

# Parse a real spec
python parser.py https://petstore3.swagger.io/api/v3/openapi.json

# Output saved to sample_output.json
# See existing sample_output.json for OpenWeatherMap example
```

### MCP Server

```bash
cd mcp_server
npm install
npm run dev
```

**Test in VS Code Insiders (MCP Apps support):**

1. Open this folder in VS Code Insiders
2. The `.vscode/mcp.json` is already configured
3. Open GitHub Copilot chat
4. Type: `explore apis` or `show me weather APIs`
5. The interactive UI renders inside the chat window

**Test via CLI (quick check):**

```bash
cd mcp_server
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | npx tsx src/index.ts
```

---

## Connection to the Proposal

| Proposal Component | PoC Implementation |
|---|---|
| Python automation pipeline | `python_pipeline/parser.py` — full OpenAPI parser |
| JSON registry format | `python_pipeline/sample_output.json` — real parsed output |
| Auto-tagging by category | `detect_category()` in parser.py |
| Auth type detection | `detect_auth_type()` in parser.py |
| API Explorer UI | `mcp_server/src/index.ts` — React-style HTML in MCP Apps |
| One-click import | `import_api` tool — creates request in workspace |
| **MCP Apps agentic rendering** | `explore_apis` tool — UI rendered inside AI agent chat |

The last row is the key insight from the PoC guidelines: API Explorer should work not just as a standalone UI panel inside API Dash, but also as an **agentic interface** — discoverable and usable directly from within AI agent chat windows via MCP.

---

## Sample Interaction

```
User:    "Show me finance APIs"
Agent:   [calls explore_apis(category="Finance")]
         [Interactive UI renders with Stripe, PayPal cards]
User:    [clicks "+ Import" on Stripe /payment_intents]
Agent:   [calls import_api(api_id="stripe-payments", endpoint="/payment_intents")]
         ✅ Request created in API Dash workspace
```

---

## File Structure

```
hitarth_api_explorer/
├── python_pipeline/
│   ├── parser.py           # OpenAPI spec parser
│   ├── requirements.txt    # httpx, pyyaml
│   └── sample_output.json  # Real output from OpenWeatherMap spec
├── mcp_server/
│   ├── src/
│   │   └── index.ts        # MCP server + MCP Apps UI generator
│   ├── package.json
│   └── tsconfig.json
├── .vscode/
│   └── mcp.json            # VS Code MCP config (test instantly)
└── README.md
```

---

*Built for GSoC 2026 — foss42 / API Dash · Idea #8 API Explorer*