# ApiDash MCP Server

> **GSoC 2026 POC** · CLI & MCP Support for [ApiDash](https://github.com/foss42/apidash)

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that exposes ApiDash's core API-testing capabilities to any MCP-compatible AI agent including Claude, GitHub Copilot (VS Code), and others.




## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Setup for AI Agents](#setup-for-ai-agents)
- [Available Tools](#available-tools)
- [Demo](#demo)
- [MCP Apps](#mcp-apps)
- [Development](#development)
- [Roadmap](#roadmap)
- [References](#references)

---

## Overview

ApiDash is an open-source, cross-platform API client built with Flutter. This package (`apidash_mcp`) wraps ApiDash's workspace and request-execution logic as an MCP server, so AI agents can:

- Browse your saved API request history
- Execute HTTP requests 
- Manage your ApiDash workspace  all from within a chat interface

The server communicates over **Standard I/O (stdio)**, making it trivially embeddable in any MCP host that supports local command execution.

---

## Features

| Tool | Description |
|---|---|
| `init_workspace` | Initialize or create a new ApiDash workspace |
| `list_history` | List API requests saved in the workspace history |
| `send_request` | Execute an HTTP request (GET, POST, PUT, DELETE, etc.) and persist it to history |
| `get_request` | Retrieve full details of a specific historical request by ID |
| `delete_request` | Remove a request from history |

### and more will be added these which i built in the poc 

---

## Installation

### Globally (Recommended)

```bash
dart pub global activate --source path packages/apidash_mcp
```

Once activated, the `apidash_mcp` will be availabe to use globally

### Locally

```bash
dart pub get
```

---

## Setup for AI Agents

### Cursor as example

```json
{
  "servers": {
    "apidash": {
      "command": "apidash_mcp"
    }
  }
}
```

### Claude Desktop

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "apidash": {
      "command": "apidash_mcp"
    }
  }
}
```

---

## Available Tools

### `init_workspace`
Initializes a new ApiDash workspace at the default or specified path. Call this once before using any other tools.

### `list_history`
Returns a list of all saved API requests in the current workspace, including method, URL, and timestamp.

### `send_request`
Executes an HTTP request with the provided parameters and saves it to the workspace history.

**Parameters:**
- `method` — HTTP method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`)
- `url` — The target URL
- `headers` _(optional)_ — Key-value map of request headers
- `body` _(optional)_ — Request body (for POST/PUT/PATCH)

### `get_request`
Retrieves the full details of a previously saved request, including the response body, status code, and headers.

**Parameters:**
- `id` — The request ID (obtained from `list_history`)

### `delete_request`
Deletes a request from the workspace history by its ID.

**Parameters:**
- `id` — The request ID to delete

---
## Demo
>this is a demo for extend the apidash as mcp server without adding mcp apps for simplisity

https://drive.google.com/drive/folders/1mQqgthrAlCvShntTuauJrW-fmJqgvs1V

---

## MCP Apps 

> This section outlines the next planned milestones, informed by **[How I built MCP Apps based Sales Analytics Agentic UI & deployed it on Amazon Bedrock AgentCore](https://dev.to/aws/how-i-built-mcp-apps-based-sales-analytics-agentic-ui-deployed-it-on-amazon-bedrock-agentcore-4e9i)** by Ashita Prasad (AWS) — a production-style walkthrough of interactive MCP Apps covering forms, charts, PDF generation, and structured content flow.

### The Problem with Plain Chat for API Testing

API testing involves many parts: method, URL, path/query parameters, headers, authentication, and the request body. 
Collecting all these through text chat is slow and often leads to mistakes, as the agent may guess incorrectly and the user has to fix and retry.

This is the same issue highlighted in the MCP Apps article: "While my friend kept responding and re-prompting, the model kept guessing and reprocessing. The interaction never evolved from a simple assistant reply into a truly functional interface."

**MCP Apps** solves this by letting the **MCP server** show interactive HTML interfaces directly inside the agent's chat. This turns the chat into a real working tool, not just a conversation.

### Planned MCP Apps

#### 1. Request Builder App

Instead of the agent collecting HTTP parameters through sequential questions, a rich HTML form renders directly in chat. The user fills in the method, URL, headers, and body visually, then clicks **Send**. The form calls the `send_request` tool from within the iframe  deterministic input, no agent guessing, no re-prompting.

Key design choices:
- `send_request` is registered as an **app-only tool** (not visible to the agent), so only the form can invoke it. This mirrors the pattern from the article where `get-sales-data` was kept hidden from the agent to prevent accidental calls.
- On submission, a `ui/update-model-context` message adds the full request + response as structured JSON into the conversation context, making it available for subsequent agent turns (e.g., "now write a test for this endpoint").

## for example : 

<p align="center">
  <img width="500" alt="Screenshot" src="https://github.com/user-attachments/assets/4775fc2d-eb21-4488-8468-7f6f1d3c368d" />
</p>

#### 2. Response Viewer App

After a request executes, rather than returning a raw JSON blob in the chat, a structured response viewer renders:
- Status code with color-coded badge (2xx green, 4xx orange, 5xx red)
- Response headers in a collapsible table
- Response body with syntax highlighting (JSON, XML, HTML)
- Response time and size metrics

The app receives its data via the `ui/notifications/tool-input` notification  clean structured data from the tool, no string parsing.

## for example : 

<p align="center">
<img width="500" height="500" alt="image" src="https://github.com/user-attachments/assets/8a09fc71-3dc3-46dd-8cca-9174a6669240" />
</p>

#### 3. History Browser App

A filterable, paginated table of past requests from the workspace  rendered interactively so the user can browse, search by URL or method, and click to re-run any request, all without prompting the agent.

## for example : 

<p align="center">
<img width="500" height="500" alt="image" src="https://github.com/user-attachments/assets/2df83185-89dc-4e52-ac8b-db3603f52b0c" />
</p>

## Security

MCP Apps follow a sandboxed model where external resources must be explicitly declared via CSP, and file downloads are handled through the host to ensure full user control.


### Transport Change

MCP Apps requires an HTTP transport (the host needs to load HTML resources from the server). The implementation will add an **Express-based HTTP transport** alongside the existing stdio transport, exposing a `/mcp` endpoint  consistent with how MCP Apps hosts expect to load UI resources.

---

## Development

Run the server in development mode:

```bash
dart run bin/mcp.dart
```

Test with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector dart run bin/mcp.dart
```

---

## Roadmap

- [x] Core MCP server over stdio
- [x] Workspace management tools (`init`, `list`, `get`, `delete`, `send`)
- [ ] HTTP transport layer for MCP Apps support
- [ ] Request Builder MCP App (interactive HTML form in chat)
- [ ] Response Viewer MCP App (syntax-highlighted response panel)
- [ ] History Browser MCP App (filterable request table)
- [ ] Add more commands in the CLI Tool

---

## References

- [How I built MCP Apps based Sales Analytics Agentic UI & deployed it on Amazon Bedrock AgentCore](https://dev.to/aws/how-i-built-mcp-apps-based-sales-analytics-agentic-ui-deployed-it-on-amazon-bedrock-agentcore-4e9i) — Ashita Prasad (AWS, 2025). The primary reference for MCP Apps architecture patterns used in the proposed extension: app-only tools, `ui/update-model-context`, `ui/notifications/tool-input`, CSP declarations, and `ui/download-file`.
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [ApiDash](https://github.com/foss42/apidash)

---

