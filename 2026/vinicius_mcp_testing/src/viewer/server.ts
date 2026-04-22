/**
 * MCP Apps Interactive Viewer — Express Server
 *
 * Serves the viewer UI and acts as the bridge between the browser-rendered
 * MCP App iframes and the actual MCP server. Provides real-time visibility
 * into both protocol layers (Server Protocol + App Bridge) via SSE.
 *
 * Endpoints:
 *   GET  /           → Viewer UI (viewer.html)
 *   GET  /apps       → List available MCP Apps (resources + tools metadata)
 *   POST /load-app   → Fetch app HTML, return host page with HTTP bridge
 *   POST /bridge     → JSON-RPC bridge: iframe → PostMessageBridge → MCP server
 *   GET  /events     → SSE stream of all protocol messages (dual inspector)
 *   POST /inject     → Send tool-input notification to loaded app
 */

import express from "express";
import { MCPClient } from "../client.js";
import { PostMessageBridge } from "../host/bridge.js";
import { buildHostPage } from "../host/host-page.js";
import { TransportAdapter, JsonRpcRequest, JsonRpcResponse } from "../transport/stdio.js";
import { runConformanceSuite } from "../suite.js";
import { runMcpAppsSuite } from "../suite-mcp-apps.js";
import { AssertionResult } from "../assertions.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── SSE Event Types ──

interface ProtocolEvent {
  type: "server-msg" | "bridge-msg";
  direction: "outbound" | "inbound";
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: unknown;
  timestamp: number;
  linkedTo?: string; // cross-reference between panels
}

// ── Logging Transport Wrapper ──

/**
 * Wraps a TransportAdapter to intercept and log all MCP server calls.
 */
class LoggingTransport implements TransportAdapter {
  private listeners: Set<(event: ProtocolEvent) => void> = new Set();

  constructor(private inner: TransportAdapter) {}

  async connect(): Promise<void> {
    return this.inner.connect();
  }

  async send(message: JsonRpcRequest): Promise<JsonRpcResponse> {
    // Log outbound request
    this.emit({
      type: "server-msg",
      direction: "outbound",
      method: message.method,
      params: message.params,
      timestamp: Date.now(),
    });

    const response = await this.inner.send(message);

    // Log inbound response
    this.emit({
      type: "server-msg",
      direction: "inbound",
      method: message.method,
      result: response.result,
      error: response.error,
      timestamp: Date.now(),
    });

    return response;
  }

  async disconnect(): Promise<void> {
    return this.inner.disconnect();
  }

  onEvent(listener: (event: ProtocolEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: ProtocolEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

// ── Server ──

export async function startViewer(
  transport: TransportAdapter,
  mcpServerUrl: string,
  port = 8080
): Promise<void> {
  // Wrap transport for logging
  const loggingTransport = new LoggingTransport(transport);
  await loggingTransport.connect();
  const client = new MCPClient(loggingTransport);

  // Initialize the MCP connection
  await client.initialize();

  // Create bridge (reused across requests for a session)
  let bridge = new PostMessageBridge(client);

  // SSE clients
  const sseClients: Set<express.Response> = new Set();

  function broadcastEvent(event: ProtocolEvent): void {
    const data = JSON.stringify(event);
    for (const res of sseClients) {
      res.write(`data: ${data}\n\n`);
    }
  }

  // Forward transport events to SSE
  loggingTransport.onEvent((event) => broadcastEvent(event));

  // Hook into bridge messages for SSE
  const originalHandleMessage = bridge.handleMessage.bind(bridge);
  bridge.handleMessage = async (raw: string) => {
    let msg: any;
    try { msg = JSON.parse(raw); } catch { msg = {}; }

    // Broadcast inbound bridge message
    broadcastEvent({
      type: "bridge-msg",
      direction: "inbound",
      method: msg.method,
      params: msg.params,
      timestamp: Date.now(),
      linkedTo: msg.method === "tools/call" ? "server" : undefined,
    });

    const result = await originalHandleMessage(raw);

    // Broadcast outbound bridge response
    if (result) {
      let parsed: any;
      try { parsed = JSON.parse(result); } catch { parsed = {}; }
      broadcastEvent({
        type: "bridge-msg",
        direction: "outbound" as const,
        method: msg.method,
        result: parsed.result,
        error: parsed.error,
        timestamp: Date.now(),
      } as unknown as ProtocolEvent);
    }

    return result;
  };

  const app = express();
  app.use(express.json({ limit: "10mb" }));
  app.use(express.text({ type: "text/plain", limit: "10mb" }));

  // ── GET / — Serve viewer UI ──
  app.get("/", (_req, res) => {
    res.sendFile(join(__dirname, "viewer.html"));
  });

  // ── GET /apps — List available MCP Apps ──
  app.get("/apps", async (_req, res) => {
    try {
      const resources = await client.listResources();
      const tools = await client.listToolsRaw();
      const apps = resources.map((r) => {
        const uri = r.uri as string;
        const linkedTools = tools.filter((t) => {
          const meta = (t._meta as any)?.ui;
          return meta?.resourceUri === uri;
        });
        return {
          uri,
          name: r.name || uri.split("/").pop(),
          mimeType: r.mimeType,
          tools: linkedTools.map((t) => ({
            name: t.name,
            description: t.description,
            visibility: (t._meta as any)?.ui?.visibility,
          })),
        };
      });
      res.json(apps);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // ── POST /load-app — Load an MCP App into host page ──
  app.post("/load-app", async (req, res) => {
    try {
      const { uri } = req.body;
      const contents = await client.readResource(uri);
      if (!contents.length || !contents[0].text) {
        return res.status(404).json({ error: `No content for ${uri}` });
      }

      // Reset bridge for new app session
      bridge.reset();

      const hostHtml = buildHostPage({
        appHtml: contents[0].text as string,
        transport: "http",
        bridgeUrl: "/bridge",
      });

      res.type("html").send(hostHtml);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // ── POST /bridge — JSON-RPC bridge for iframe ──
  app.post("/bridge", async (req, res) => {
    try {
      const raw = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      const result = await bridge.handleMessage(raw);
      res.type("text").send(result || "null");
    } catch (err) {
      res.status(500).send(JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32603, message: (err as Error).message },
      }));
    }
  });

  // ── GET /events — SSE stream ──
  app.get("/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    sseClients.add(res);
    req.on("close", () => sseClients.delete(res));
  });

  // ── POST /inject — Send data to loaded app ──
  app.post("/inject", async (req, res) => {
    try {
      const { type, data } = req.body; // type: "tool-input" | "tool-result"
      const method = type === "tool-result"
        ? "ui/notifications/tool-result"
        : "ui/notifications/tool-input";

      // Broadcast as bridge notification
      broadcastEvent({
        type: "bridge-msg",
        direction: "outbound",
        method,
        params: { structuredContent: data },
        timestamp: Date.now(),
      });

      res.json({ ok: true, method });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // ══════════════════════════════════════════════════════════════════
  // Chat Engine — orchestrates the MCP Apps pipeline in a chat flow
  // ══════════════════════════════════════════════════════════════════

  interface ChatContext {
    selections?: Record<string, unknown>;
    report?: Record<string, unknown>;
    step: "idle" | "form-loaded" | "data-received" | "viz-loaded" | "pdf-loaded" | "complete";
  }

  let chatContext: ChatContext = { step: "idle" };

  // Cache tools metadata for resource URI lookups
  let toolsCache: Array<Record<string, unknown>> = [];
  client.listToolsRaw().then((t) => { toolsCache = t; }).catch(() => {});

  function getResourceUri(toolName: string): string | null {
    const tool = toolsCache.find((t) => t.name === toolName);
    return (tool?._meta as any)?.ui?.resourceUri || null;
  }

  type ChatMessage = {
    role: "agent" | "user" | "system";
    text: string;
  } | {
    role: "app";
    toolName: string;
    resourceUri: string;
    structuredContent?: unknown;
    notifyMethod?: string;
  };

  function broadcastChat(messages: ChatMessage[]): void {
    const data = JSON.stringify({ type: "chat-messages", messages });
    for (const res of sseClients) {
      res.write(`data: ${data}\n\n`);
    }
  }

  // ── POST /chat — User sends a message, agent responds ──
  app.post("/chat", async (req, res) => {
    try {
      const { message } = req.body;
      const responses: ChatMessage[] = [];

      if (chatContext.step === "idle") {
        // Start the pipeline — call select-sales-metric
        chatContext = { step: "form-loaded" };

        await client.callToolRaw("select-sales-metric", {});

        responses.push({
          role: "agent",
          text: "Let me pull up the sales metrics selector for you. Select your regions, metric, and time period, then click Submit.",
        });
        responses.push({
          role: "app",
          toolName: "select-sales-metric",
          resourceUri: getResourceUri("select-sales-metric")!,
        });
      } else if (chatContext.step === "complete") {
        // Reset and start over
        chatContext = { step: "idle" };
        bridge.reset();
        responses.push({
          role: "system",
          text: "Pipeline reset. Send a message to start a new analysis.",
        });
      } else {
        responses.push({
          role: "agent",
          text: "The pipeline is in progress. Interact with the form above to continue.",
        });
      }

      broadcastChat(responses);
      res.json({ messages: responses });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // ── POST /context-update — iframe pushed ui/update-model-context ──
  app.post("/context-update", async (req, res) => {
    try {
      const params = req.body;
      const sc = params.structuredContent || params;
      const responses: ChatMessage[] = [];

      if (sc.selections && sc.report && chatContext.step === "form-loaded") {
        // Store context from the form
        chatContext.selections = sc.selections as Record<string, unknown>;
        chatContext.report = sc.report as Record<string, unknown>;
        chatContext.step = "data-received";

        responses.push({
          role: "system",
          text: "Data received from form. Generating visualization...",
        });

        // Call visualize-sales-data
        const vizResult = await client.callToolRaw("visualize-sales-data", {
          selections: chatContext.selections,
          report: chatContext.report,
        });

        const vizUri = getResourceUri("visualize-sales-data");
        if (vizUri) {
          responses.push({
            role: "agent",
            text: "Here's your sales data visualization:",
          });
          responses.push({
            role: "app",
            toolName: "visualize-sales-data",
            resourceUri: vizUri,
            structuredContent: {
              selections: chatContext.selections,
              report: chatContext.report,
            },
            notifyMethod: "ui/notifications/tool-input",
          });
          chatContext.step = "viz-loaded";
        }

        // Call show-sales-pdf-report
        const pdfResult = await client.callToolRaw("show-sales-pdf-report", {
          selections: chatContext.selections,
          report: chatContext.report,
        });
        const pdfSc = pdfResult.structuredContent as Record<string, unknown>;

        const pdfUri = getResourceUri("show-sales-pdf-report");
        if (pdfUri && pdfSc) {
          responses.push({
            role: "agent",
            text: "And here's your downloadable PDF report:",
          });
          responses.push({
            role: "app",
            toolName: "show-sales-pdf-report",
            resourceUri: pdfUri,
            structuredContent: pdfSc,
            notifyMethod: "ui/notifications/tool-result",
          });
          chatContext.step = "complete";
        }
      }

      if (responses.length > 0) {
        broadcastChat(responses);
      }
      res.json({ ok: true, step: chatContext.step });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // ══════════════════════════════════════════════════════════════════
  // Test Runner — execute conformance suites and stream results via SSE
  // ══════════════════════════════════════════════════════════════════

  let testsRunning = false;

  app.post("/run-tests", async (_req, res) => {
    if (testsRunning) {
      return res.status(409).json({ error: "Tests already running" });
    }
    testsRunning = true;
    res.json({ ok: true });

    const startTime = Date.now();
    const allResults: AssertionResult[] = [];

    function emitResult(r: AssertionResult): void {
      allResults.push(r);
      broadcastEvent({
        type: "test-result" as any,
        method: r.name,
        params: { category: r.category, passed: r.passed, error: r.error, durationMs: r.durationMs },
        direction: r.passed ? "inbound" : "outbound",
        timestamp: Date.now(),
      });
    }

    try {
      // Suite 1: Core conformance (19 tests)
      broadcastEvent({ type: "test-suite-start" as any, method: "Core Conformance", direction: "outbound", timestamp: Date.now() });
      const coreResults = await runConformanceSuite(client);
      coreResults.forEach(emitResult);

      // Suite 2: MCP Apps metadata (13 tests)
      broadcastEvent({ type: "test-suite-start" as any, method: "MCP Apps", direction: "outbound", timestamp: Date.now() });
      const appsResults = await runMcpAppsSuite(client);
      appsResults.forEach(emitResult);

      // Suite 3: MCP Apps Host (18 tests) — requires Playwright
      try {
        const { runMcpAppsHostSuite } = await import("../suite-mcp-apps-host.js");
        broadcastEvent({ type: "test-suite-start" as any, method: "MCP Apps Host (Playwright)", direction: "outbound", timestamp: Date.now() });
        const hostResults = await runMcpAppsHostSuite(client);
        hostResults.forEach(emitResult);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("playwright") || msg.includes("Cannot find module")) {
          broadcastEvent({ type: "test-suite-start" as any, method: "MCP Apps Host: Skipped (no Playwright)", direction: "outbound", timestamp: Date.now() });
        } else {
          throw err;
        }
      }
    } catch (err) {
      broadcastEvent({
        type: "test-result" as any,
        method: "Fatal error: " + (err instanceof Error ? err.message : String(err)),
        params: { category: "Error", passed: false, error: (err as Error).message, durationMs: 0 },
        direction: "outbound",
        timestamp: Date.now(),
      });
    }

    const passed = allResults.filter((r) => r.passed).length;
    const failed = allResults.length - passed;
    broadcastEvent({
      type: "test-complete" as any,
      method: `${passed} passed${failed > 0 ? `, ${failed} failed` : ""}`,
      params: { passed, failed, total: allResults.length, durationMs: Date.now() - startTime },
      direction: "inbound",
      timestamp: Date.now(),
    });

    testsRunning = false;
  });

  // ── Start ──
  app.listen(port, "0.0.0.0", () => {
    console.log(`\n\x1b[36m\x1b[1m  MCP Apps Viewer\x1b[0m`);
    console.log(`\x1b[2m  ────────────────────────────────────\x1b[0m`);
    console.log(`  \x1b[32m▸\x1b[0m Viewer:    \x1b[1mhttp://localhost:${port}\x1b[0m`);
    console.log(`  \x1b[32m▸\x1b[0m MCP Server: ${mcpServerUrl}`);
    console.log(`\x1b[2m  ────────────────────────────────────\x1b[0m\n`);
  });
}
