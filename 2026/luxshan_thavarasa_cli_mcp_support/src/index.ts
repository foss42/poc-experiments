import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import crypto from "crypto";
import { createServer } from "./server.js";

const PORT = parseInt(process.env.PORT || "3000", 10);
const sessions = new Map<string, StreamableHTTPServerTransport>();

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", server: "apidash-mcp-apps", version: "1.0.0" });
});

app.post("/mcp", async (req, res) => {
  try {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (sessionId && sessions.has(sessionId)) {
      await sessions.get(sessionId)!.handleRequest(req, res, req.body);
      return;
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      enableJsonResponse: true,
    });

    transport.onclose = () => {
      const sid = (transport as unknown as { sessionId?: string }).sessionId;
      if (sid) sessions.delete(sid);
    };

    // Each session gets its own server instance
    const server = createServer();
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);

    const newSessionId = res.getHeader("mcp-session-id") as string | undefined;
    if (newSessionId) sessions.set(newSessionId, transport);
  } catch (error) {
    console.error("MCP error:", error);
    if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/mcp/sse", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (sessionId && sessions.has(sessionId)) {
    await sessions.get(sessionId)!.handleRequest(req, res);
  } else {
    res.status(400).json({ error: "No valid session" });
  }
});

app.listen(PORT, () => {
  console.log(`API Dash MCP Apps Server running on http://localhost:${PORT}`);
  console.log(`  MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`  Health check: http://localhost:${PORT}/health`);
});
