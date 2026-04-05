# API Dash MCP Apps — GSoC 2026 PoC

**Applicant:** Ashutosh Sharma  
**GitHub:** [@AshutoshSharma-pixel](https://github.com/AshutoshSharma-pixel)  
**Project:** #6 — CLI & MCP Support with MCP Apps for API Dash  
**Organization:** API Dash (foss42)

---

## What This PoC Demonstrates

This PoC is built by studying and modifying the [sample-mcp-apps-chatflow](https://github.com/ashitaprasad/sample-mcp-apps-chatflow) server from Ashita Prasad's article — [How I built MCP Apps based Sales Analytics Agentic UI](https://dev.to/aws/how-i-built-mcp-apps-based-sales-analytics-agentic-ui-deployed-it-on-amazon-bedrock-agentcore-4e9i).

The Sales Analytics tools have been replaced with **API Dash MCP Apps** — demonstrating that the same MCP Apps patterns can power an API testing workflow natively inside AI agent chat windows (VS Code, Claude Desktop).

---

## The 3 API Dash MCP Apps

### App 1: Request Executor (`execute-request`)
Replaces `select-sales-metric` from the original sample.

- Shows all saved API requests as cards with colored method badges (GET/POST/PUT/DELETE)
- Environment selector (Development / Staging / Production)
- Search and filter by method
- On clicking **Run**: calls app-only tool `run-request-data` to simulate HTTP execution
- Pushes full request + response into model context via `ui/update-model-context`

### App 2: Collection Browser (`list-requests`)
Replaces `visualize-sales-data` from the original sample.

- Filterable table of all saved requests with method badges, URLs, tags
- Chart.js bar chart of mock response times per request (loaded from CDN, CSP declared)
- Hydrated via `ui/notifications/tool-input` (same pattern as the sales visualization)

### App 3: Response Viewer (`view-response`)
Replaces `show-sales-pdf-report` from the original sample.

- Colored status badge (green 2xx, yellow 3xx, red 4xx/5xx)
- Response time and size display
- Syntax highlighted JSON body via highlight.js (CDN, CSP declared)
- Collapsible headers section
- **Export as JSON** button using `ui/download-file` (same pattern as PDF download)

---

## All 10 MCP Apps Patterns Implemented

| Pattern | Implementation |
|---|---|
| `ui/initialize` handshake | All 3 apps |
| `applyHostContext()` host-aware theming | All 3 apps via CSS variables |
| `ui/notifications/initialized` | All 3 apps |
| `ui/update-model-context` | App 1 after request execution |
| App-only tool (`visibility: ["app"]`) | `run-request-data` tool |
| `ui/notifications/tool-input` hydration | App 2 and App 3 |
| CSP `resourceDomains` declaration | Chart.js + highlight.js CDN |
| `ui/download-file` | JSON export in App 3 |
| `structuredContent` in tool responses | All tools |
| `ui/notifications/size-changed` | All 3 apps after render |

---

## How It Maps to My GSoC Proposal

| Proposal Component | PoC Validation |
|---|---|
| `packages/apidash_mcp` MCP server | This TypeScript server mirrors the exact architecture |
| `execute_request` tool with response viewer MCP App | App 1 + App 3 |
| `list_requests` collection browser MCP App | App 2 |
| File-based storage (mock) | `requests-data.ts` and `environments-data.ts` |
| MCP Apps handshake + host theming | All 3 apps |

---

## Run Locally

```bash
npm install
npm run dev
```

Server starts at `http://localhost:3000`

### Test with MCP Inspector

```bash
npx @modelcontextprotocol/inspector http://localhost:3000/mcp
```

Select **Streamable HTTP** transport, URL `http://localhost:3000/mcp`, click Connect.

### Connect from VS Code Insiders

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "apidash-mcp-apps": {
      "type": "http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

---

## Project Structure

```
src/
├── index.ts                  # MCP server — 4 tools, 3 resources
├── styles.ts                 # Shared CSS variables for host-aware theming
├── data/
│   ├── requests-data.ts      # 7 mock API requests (GitHub, JSONPlaceholder, Open-Meteo)
│   └── environments-data.ts  # 3 environments: dev, staging, prod
└── ui/
    ├── request-executor.ts   # App 1: Request picker form
    ├── collection-browser.ts # App 2: Collection table + Chart.js
    └── response-viewer.ts    # App 3: Response viewer + JSON export
```

---

## References

- [MCP Apps Article (Ashita Prasad)](https://dev.to/aws/how-i-built-mcp-apps-based-sales-analytics-agentic-ui-deployed-it-on-amazon-bedrock-agentcore-4e9i)
- [Original sample-mcp-apps-chatflow](https://github.com/ashitaprasad/sample-mcp-apps-chatflow)
- [API Dash repo](https://github.com/foss42/apidash)
- [My GSoC Proposal PR #1554](https://github.com/foss42/apidash/pull/1554)
- [My PR #1374 (Flutter dep fix)](https://github.com/foss42/apidash/pull/1374)
