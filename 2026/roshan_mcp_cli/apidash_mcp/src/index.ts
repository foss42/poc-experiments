#!/usr/bin/env node
/**
 * APIDash MCP Server — Composition Root
 *
 * Thin entry point that wires together:
 *   • Express app (CORS, JSON parsing)
 *   • bearerAuth middleware (OAuth 2.1, MCP Nov 2025)
 *   • /health and /.well-known/mcp routes
 *   • POST /mcp  (Streamable HTTP, stateless — per-request McpServer)
 *   • GET  /mcp/sse  (SSE streaming — per-request McpServer)
 *   • --stdio branch for Claude Desktop / VS Code Copilot
 *
 * All handler logic lives in src/factory.ts.
 *
 * Tools:
 *   - request-builder          → Interactive HTTP request builder UI
 *   - http-send-request        → Send an HTTP request and get response
 *   - view-response            → View last HTTP response in rich UI
 *   - explore-collections      → Browse saved API request collections
 *   - graphql-explorer         → Interactive GraphQL query UI
 *   - graphql-execute-query    → Execute a GraphQL query server-side
 *   - generate-code-snippet    → Generate code for HTTP request in any language
 *   - codegen-ui               → Open code generator UI for a request
 *   - manage-environment       → Manage API environment variables
 *   - update-environment-variables → Server-side env var update
 *   - get-api-request-template → Get a pre-built request template
 *   - ai-llm-request           → Send a chat completion request to any LLM
 *   - save-request             → Save a new request to the APIDash workspace
 *
 * Run with:  npm run dev
 * Inspect:   npm run inspector:http
 */

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport }          from "@modelcontextprotocol/sdk/server/stdio.js";
import express, { Request, Response }    from "express";
import crypto                            from "crypto";
import "dotenv/config";

import { createMcpServer } from "./factory.js";
import { bearerAuth }      from "./middleware/auth.js";
import healthRouter        from "./routes/health.js";
import wellKnownRouter     from "./routes/wellKnown.js";
import oauthRouter         from "./oauth/routes.js";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const URI         = "ui://apidash-mcp";
const SERVER_NAME = "apidash-mcp";

// ─────────────────────────────────────────────────────────────
// Express app
// ─────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // needed for /authorize/confirm form POST

// CORS middleware for browser clients
app.use((_req: Request, res: Response, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (_req.method === "OPTIONS") { res.sendStatus(204); return; }
  next();
});

// ── OAuth 2.1 routes (public — no bearer gate) ─────────────
// Must be mounted BEFORE the /mcp bearer-auth gate.
app.use(oauthRouter);

// OAuth 2.1 bearer token gate on all /mcp routes
app.use("/mcp", bearerAuth);

// Discovery & health routes
app.use(healthRouter);
app.use(wellKnownRouter);

// ── MCP endpoint (Streamable HTTP, stateless) ──────────────
app.post("/mcp", async (req: Request, res: Response) => {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,   // stateless
    enableJsonResponse: true,
  });

  res.on("close", () => transport.close());

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// ── SSE endpoint (standard MCP SSEServerTransport) ─────────
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

// Global map to hold active SSE transports (needed for POST /mcp/sse)
const activeSessions = new Map<string, SSEServerTransport>();

app.use((req, res, next) => {
  if (req.method === 'POST') {
    console.error(`💥 [GLOBAL POST INTERCEPTOR] ${req.url} (Body keys: ${Object.keys(req.body || {}).join(",")})`);
  }
  next();
});

app.get("/mcp/sse", async (req: Request, res: Response) => {
  console.log(`[SSE] New connection attempt. Headers:`, req.headers);
  const server = createMcpServer();
  // Provide the exact same URL + ?sessionId=... as the endpoint
  const serverUrl = `${req.protocol}://${req.get("host")}/mcp/messages`;
  const transport = new SSEServerTransport(serverUrl, res);
  
  // Store the active transport session
  activeSessions.set(transport.sessionId, transport);
  console.log(`[SSE] Session created: ${transport.sessionId}`);
  console.log(`[SSE] GET stream configured. Expected POST to: ${serverUrl}?sessionId=${transport.sessionId}`);

  res.on("close", () => {
    console.log(`❌ [SSE] Session closed event fired! Deleting session: ${transport.sessionId}`);
    activeSessions.delete(transport.sessionId);
    server.close();
  });

  await server.connect(transport);
});

app.post(["/mcp/sse", "/mcp/sse/message", "/mcp/messages"], async (req: Request, res: Response) => {
  let sessionId = req.query.sessionId as string;
  
  console.error(`🟢 [POST /mcp/sse] Received message for session: ${sessionId}`);
  console.error(`🟢 [POST /mcp/sse] Request URL: ${req.url}`);
  console.error(`🟢 [POST /mcp/sse] Active sessions:`, Array.from(activeSessions.keys()));

  // FORCE FALLBACK if sessionid is missing:
  if (!sessionId && activeSessions.size > 0) {
    sessionId = Array.from(activeSessions.keys())[0];
    console.error(`⚠️ [POST /mcp/sse] No sessionId provided! Forcing session: ${sessionId}`);
  }
  
  const transport = activeSessions.get(sessionId);
  if (!transport) {
    console.error(`❌ [POST /mcp/sse] Session NOT FOUND returning 404!`);
    res.status(404).send("Session not found");
    return;
  }
  console.error(`✅ [POST /mcp/sse] Found transport, handling message...`);
  await transport.handlePostMessage(req, res, req.body); // Pass pre-parsed body!
});

const isStdio = process.argv.includes("--stdio");

if (isStdio) {
  const server    = createMcpServer();
  const transport = new StdioServerTransport();
  server.connect(transport).then(() => {
    console.error("🚀 APIDash MCP Server running on stdio");
  });
} else {
  // ── Start server ───────────────────────────────────────────
  const port = parseInt(process.env.PORT || "8000");
  const host = process.env.HOST || "0.0.0.0";
  app.listen(port, host, () => {
    console.log(`MCP server running at http://${host}:${port}`);
  });
}
