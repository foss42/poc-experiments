# API Explorer — GSoC 2026 PoC for API Dash

A proof-of-concept that lets users **discover, browse, search, and import** popular public API endpoints directly into their API Dash workspace. Built as a GSoC 2026 proposal for [foss42/apidash](https://github.com/foss42/apidash) (Issue #8).

## Architecture

```
                        ┌──────────────────────┐
                        │   OpenAPI / Swagger   │
                        │     Spec (URL/file)   │
                        └──────────┬───────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │      Python Pipeline          │
                    │  parser.py  +  enricher.py    │
                    │  (parse, categorize, score)   │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                        ┌──────────────────┐
                        │  Structured JSON  │
                        │  (API templates)  │
                        └────────┬─────────┘
                                 │
                                 ▼
              ┌──────────────────────────────────────┐
              │         MCP Server (TypeScript)       │
              │  registry.ts → tools.ts → index.ts   │
              │         html-generator.ts             │
              └────────────────┬─────────────────────┘
                               │ stdio
                               ▼
              ┌──────────────────────────────────────┐
              │    AI Agent / IDE (VSCode, Claude)    │
              │       Interactive HTML UI             │
              └──────────────────────────────────────┘
```

## Components

### Python Pipeline (`python_pipeline/`)

| File | Purpose |
|------|---------|
| `parser.py` | CLI tool + module that parses OpenAPI 3.x / Swagger 2.0 specs into structured JSON. Handles `$ref` resolution, auth detection, endpoint extraction. |
| `enricher.py` | Auto-categorizes APIs into 8 categories via keyword matching, computes a quality score (0-100), and generates tags. |
| `sample_output.json` | Real output from running `parser.py` against the Petstore spec — not hand-written. |
| `requirements.txt` | Python dependencies: pyyaml, requests, jsonschema, click, colorama. |

### MCP Server (`mcp_server/`)

| File | Purpose |
|------|---------|
| `src/index.ts` | Entry point — creates McpServer with stdio transport. |
| `src/registry.ts` | Hardcoded catalog of 12 popular APIs across 8 categories with realistic endpoints. |
| `src/html-generator.ts` | Generates a self-contained HTML UI with MCP Apps handshake for interactive browsing. |
| `src/tools.ts` | Registers 4 MCP tools + 1 resource (see table below). |

### Docs (`docs/`)

| File | Purpose |
|------|---------|
| `ui-preview.html` | Static HTML snapshot of the Explorer UI — open in any browser to preview. |

## Setup

### Python Pipeline

```bash
cd python_pipeline
pip install -r requirements.txt

# Parse any OpenAPI spec
python parser.py https://petstore3.swagger.io/api/v3/openapi.json --output output.json

# Or a local file
python parser.py ./my-spec.yaml -o output.json
```

### MCP Server

```bash
cd mcp_server
npm install

# Development (runs TypeScript directly)
npx tsx src/index.ts

# Production build
npm run build
npm start
```

### VSCode MCP Configuration

1. Open VSCode with the project folder as workspace root.
2. The `.vscode/mcp.json` file is already configured. VSCode will detect it automatically if you have MCP support enabled.
3. Alternatively, add this to your VSCode `settings.json`:

```json
{
  "mcp": {
    "servers": {
      "api-explorer": {
        "type": "stdio",
        "command": "npx",
        "args": ["tsx", "src/index.ts"],
        "cwd": "<path-to>/mcp_server"
      }
    }
  }
}
```

## MCP Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `explore_apis` | Browse, search, and filter APIs with an interactive HTML UI. | `category?` (string), `query?` (string), `auth_type?` (string) |
| `parse_openapi` | Get instructions to parse an OpenAPI spec via the Python pipeline. | `spec_url` (string) |
| `import_api` | Import an API as a pre-configured request template for API Dash. | `api_id` (string), `endpoint?` (string), `include_auth?` (boolean) |
| `get_api_details` | Get full details about an API: endpoints, auth, sample requests. | `api_id` (string) |

### MCP Resource

| URI | Description |
|-----|-------------|
| `ui://api-explorer/explorer-ui` | Interactive HTML interface (MIME: `text/html;profile=mcp-app`) |

## Demo

When you invoke `explore_apis` in a compatible AI agent (Claude Desktop, VSCode Copilot with MCP):

1. An interactive HTML UI renders inside the chat window.
2. Browse 12 pre-loaded APIs across 8 categories (Weather, AI & ML, Finance, etc.).
3. Filter by category chips, search by name/description, or filter by auth type.
4. Click **Import** on any API to generate a ready-to-use request template.
5. Click **View Docs** to open the API's official documentation.

The UI communicates with the MCP server via the MCP Apps protocol (JSON-RPC 2.0 over `postMessage`).

## API Categories

| Category | APIs |
|----------|------|
| AI & ML | OpenAI, Hugging Face |
| Weather | OpenWeatherMap |
| Finance | Stripe, CoinGecko |
| Developer Tools | GitHub, Spotify |
| Maps & Geo | Google Maps |
| Communication | SendGrid, Twilio |
| Data | NASA, Cloudinary |

## Known Issues / Limitations

1. **Python parser only resolves internal `$ref` pointers.** External file references (e.g., `$ref: './models/pet.yaml'`) are not supported. Real-world specs that split definitions across multiple files will have unresolved references logged as warnings. A production implementation would need a multi-file resolver.

2. **MCP server uses a hardcoded API registry.** The 12 APIs in `registry.ts` are static data. In a full implementation, this would be backed by the Python pipeline's JSON output stored in a database, with periodic re-parsing to keep specs up to date.

## Future Work (Full GSoC Implementation)

- **Dynamic registry**: Connect the Python pipeline output to the MCP server via a JSON file or SQLite database.
- **Multi-file $ref resolution**: Support external file references in OpenAPI specs.
- **API Dash integration**: Deep-link imported APIs directly into the API Dash workspace UI.
- **Community catalog**: Allow users to submit and share API specs.
- **Pagination and lazy loading**: Handle registries with hundreds of APIs.
- **Spec validation**: Full OpenAPI 3.1 JSON Schema validation.
- **Rate limit detection**: Parse `x-rateLimit` extensions and surface them in the UI.
- **Offline mode**: Bundle popular specs for offline browsing.
