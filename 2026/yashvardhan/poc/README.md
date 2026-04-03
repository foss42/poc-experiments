# MCP Testing & Security Suite — POC

A proof-of-concept demonstrating MCP server connection, tool discovery, invocation, **tool poisoning detection**, and **MCP Apps UI testing** in a sandboxed iframe environment.

## What This Demonstrates

1. **MCP Client Engine** — Connects to any MCP server via stdio or Streamable HTTP transport, performs the JSON-RPC handshake, and discovers tools/resources/prompts
2. **Tool Poisoning Detector** — 10 rule-based security checks that analyze tool descriptions for malicious patterns (instruction injection, secrecy language, data exfiltration, Unicode obfuscation, etc.)
3. **MCP Apps Tester** — Tests interactive UI resources from the MCP Apps extension (SEP-1865). Renders `ui://` resources in sandboxed iframes, validates postMessage JSON-RPC communication, handles tool call approval, and supports the full App API lifecycle
4. **Web UI** — Clean light-themed dashboard built with Mantine UI with four views: Connection, Tool Explorer, Security Scan, and MCP Apps

## Demo Video for the POC
https://github.com/user-attachments/assets/448fa305-c871-4d76-b613-8c74e7c5eaf0

## Architecture

```
┌──────────────┐     HTTP/WS     ┌──────────────┐   stdio/HTTP/JSON-RPC  ┌──────────────┐
│   React UI   │ ◄────────────►  │  Express API  │ ◄──────────────────►  │  MCP Server  │
│   (Vite)     │                 │  + WebSocket  │                       │  (any)       │
└──────┬───────┘                 └──────┬───────┘                       └──────────────┘
       │                                │
       │ postMessage                    ├── McpClientEngine
       │ (JSON-RPC 2.0)                └── ToolPoisoningDetector
       ▼
┌──────────────┐
│  Sandboxed   │
│  iframe      │
│  (MCP Apps)  │
└──────────────┘
```

```
packages/
  shared/    ← Zod schemas + derived TypeScript types (single source of truth)
  server/    ← Express API, MCP client engine, security analyzers
  client/
    src/
      views/         ← ConnectionView, ToolsView, SecurityView, McpAppsView
      components/    ← IframePreview, MessageLog, ValidationPanel
      utils/         ← parseToolArgs
      services/      ← API client with Zod validation
test/
  fixtures/  ← Deliberately poisoned MCP server for demo
```

## Quick Start

```bash
# From the poc/ directory
npm install

# Start both backend + frontend (concurrently)
npm run dev
```

Or start separately:

```bash
# Terminal 1 — API server (port 3001)
npm run dev:server

# Terminal 2 — React UI (port 5173)
npm run dev:client
```

Open http://localhost:5173 in your browser.

## Demo Walkthrough

### 1. Connect to an MCP server

**stdio (local process):**
- Command: `npx`, Args: `tsx test/fixtures/poisoned-server.ts`

**Streamable HTTP (remote server):**
- URL: `http://localhost:3000/mcp` (or any MCP server URL)

### 2. Tool Explorer

Browse discovered tools, resources, and prompts. Click any tool to see its JSON Schema, fill parameters, and invoke it. Response shows status, latency, and formatted JSON output.

### 3. Security Scan

Run the Tool Poisoning Detector against all discovered tools. Results include a security score (0-100), severity breakdown, and expandable findings with evidence and remediation guidance.

### 4. MCP Apps Tester

Test MCP servers that implement the [MCP Apps extension](https://modelcontextprotocol.io). The view has three panels:

| Panel | Purpose |
|-------|---------|
| **Explorer sidebar** | Lists UI Tools (with `_meta.ui.resourceUri` + model visibility) and Standard Tools. App-only tools (visibility: `["app"]`) are hidden — they're called by iframes internally |
| **Center workspace** | Sandboxed iframe rendering `ui://` resources, plus tool invocation panel |
| **Right panel** | Live JSON-RPC message log + App API validation checklist |

**Features:**
- Detects UI tools via `_meta.ui.resourceUri` annotations from `tools/list`
- Filters by `visibility` — only `"model"` visible tools shown in sidebar
- Falls back to resource URI detection (`ui://` prefix, HTML mimeType) for servers without annotations
- Clicking a UI tool auto-loads its resource in the iframe
- UI tools with input parameters are auto-invoked with data from previous steps (chaining)
- `structuredContent` from tool responses is captured and delivered to iframes
- Iframe-initiated `tools/call` requests require user approval before execution
- `ui/update-model-context` requests are acknowledged
- `ui/download-file` requests trigger browser downloads (for sandboxed PDFs, etc.)
- Data persists across iframe switches — visualization and PDF views receive the same data

**App API Validation Checks:**

| Check | What it validates |
|-------|-------------------|
| Iframe sandbox enforced | `allow-scripts` enabled, `allow-same-origin` blocked |
| UI resource loaded | HTML content fetched from `ui://` resource and rendered |
| Tool result delivered to UI | Host sends `ui/notifications/tool-input` to iframe |
| UI-initiated tool call | Iframe sends `tools/call` request via postMessage |
| Tool call approval | Host shows approval dialog before executing iframe tool calls |
| Model context update | Iframe sends `ui/update-model-context` to host |

## Detection Rules

| ID | Rule | Severity |
|----|------|----------|
| TP-001 | Instruction injection keywords (ALWAYS, MUST, NEVER...) | High |
| TP-002 | Secrecy language ("don't tell the user") | Critical |
| TP-003 | Data exfiltration patterns (URLs, "send to") | Critical |
| TP-004 | Cross-tool references (Tool A mentions Tool B) | High |
| TP-005 | Scope escalation (requesting unrelated credentials) | High |
| TP-006 | Excessive description length (>1000 chars) | Medium |
| TP-007 | Unicode obfuscation (zero-width chars, RTL overrides) | High |
| TP-008 | Base64-encoded content | Medium |
| TP-009 | Prompt injection in parameter descriptions | High |
| TP-010 | Shadowed/duplicate tool names | Critical |

## Tech Stack

- **Runtime**: TypeScript end-to-end, npm workspaces monorepo
- **Shared**: Zod schemas as single source of truth, types derived via `z.infer`
- **Backend**: Express, WebSocket (`ws`), `@modelcontextprotocol/sdk`
- **Frontend**: React 19, Vite, Mantine UI (light theme), Tailwind CSS v4, Framer Motion, Lucide icons
- **Validation**: Zod on all 4 layers (shared → server → engine → client)
- **Transports**: stdio (local process) + Streamable HTTP (remote server)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/connect` | Connect to an MCP server (stdio or Streamable HTTP) |
| POST | `/api/disconnect` | Disconnect from current server |
| GET | `/api/capabilities` | Get discovered tools/resources/prompts (includes `_meta` annotations) |
| POST | `/api/invoke` | Invoke a tool with arguments (returns `structuredContent`) |
| POST | `/api/resources/read` | Read a resource by URI |
| POST | `/api/security/scan` | Run tool poisoning scan |
| GET | `/api/status` | Connection status |
