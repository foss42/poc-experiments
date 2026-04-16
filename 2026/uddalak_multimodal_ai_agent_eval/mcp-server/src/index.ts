import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "crypto";

const API_BASE_URL = "http://localhost:8000";
const HTTP_PORT = 3001;

// ─── Tool Definitions ─────────────────────────────────────────────────────────
export const TOOLS = [
  {
    name: "open_eval_dashboard",
    description:
      "Launch the EvalForge dashboard as an embedded MCP App. Provides a full UI for configuring and running AI evaluations (text, multimodal, agent) across multiple providers.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "test_sales_analytics_mcp",
    description:
      "Launch a verifier UI to score the output from the Sales Analytics MCP server (ashitaprasad/sample-mcp-apps-chatflow). Paste agent responses and tool-call traces to get quality scores.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "run_quick_eval",
    description:
      "Trigger a background evaluation job on the EvalForge FastAPI backend for a specific dataset and modality.",
    inputSchema: {
      type: "object",
      properties: {
        dataset: {
          type: "string",
          description: "Name of the dataset (e.g., mmlu_sample, agent_sample)",
        },
        modality: {
          type: "string",
          enum: ["text", "multimodal", "agent"],
        },
        provider: {
          type: "string",
          enum: ["gemini", "groq", "openai"],
          description: "AI provider to use. Defaults to gemini.",
        },
        model: {
          type: "string",
          description: "Model ID. Defaults to gemini-2.0-flash for Gemini, llama-3.3-70b-versatile for Groq.",
        },
      },
      required: ["dataset", "modality"],
    },
  },
];

// ─── Tool Handler ─────────────────────────────────────────────────────────────
export async function handleCallTool(name: string, args: any) {
  console.error(`[mcp-server] Tool called: ${name}`, args ?? {});

  try {
    if (name === "open_eval_dashboard") {
      return {
        content: [
          {
            type: "text",
            text: "Launching EvalForge Dashboard (MCP App). Configure providers, select datasets, and run evals across text, multimodal, and agent modalities.",
          },
          {
            type: "resource",
            resource: {
              uri: `${API_BASE_URL}/static/eval-dashboard.html`,
              mimeType: "text/html",
              text: "EvalForge Dashboard — MCP App Interface",
            },
          },
        ],
      };
    }

    if (name === "test_sales_analytics_mcp") {
      return {
        content: [
          {
            type: "text",
            text: "Launching Sales Analytics Verifier UI. Paste the agent text output and/or JSON tool-call trace from the Sales Analytics MCP server (ashitaprasad/sample-mcp-apps-chatflow) to score it on Data Fidelity, Constraint Adherence, and Tool Call Accuracy.",
          },
          {
            type: "resource",
            resource: {
              uri: `${API_BASE_URL}/static/sales-analytics-test.html`,
              mimeType: "text/html",
              text: "Sales Analytics Verifier Interface",
            },
          },
        ],
      };
    }

    if (name === "run_quick_eval") {
      const { dataset, modality, provider = "gemini", model } = args;
      const modelId =
        model ||
        (provider === "groq" ? "llama-3.3-70b-versatile" : "gemini-2.0-flash");

      console.error(`[mcp-server] Initiating eval: ${dataset} / ${modality} via ${provider}/${modelId}`);

      const response = await fetch(`${API_BASE_URL}/eval/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providers: [{ name: provider, model: modelId }],
          modality,
          dataset: [{ prompt: `Run ${modality} eval on ${dataset}`, ground_truth: "" }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend Error (${response.status}): ${errorText || response.statusText}`);
      }

      const data = await response.json();
      console.error(`[mcp-server] Job created: ${data.job_id}`);

      return {
        content: [
          {
            type: "text",
            text: `✅ Eval job started.\n\nJob ID: ${data.job_id}\nProvider: ${provider}/${modelId}\nModality: ${modality}\nDataset: ${dataset}\n\nPoll status at: GET /eval/status/${data.job_id}\nOr open the EvalForge Dashboard to monitor progress.`,
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error: any) {
    console.error(`[mcp-server] Error in ${name}:`, error.message);
    return {
      content: [
        {
          type: "text",
          text: `Error executing ${name}: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}

// ─── Server Factory ───────────────────────────────────────────────────────────
function createServer(): Server {
  const server = new Server(
    { name: "eval-forge-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return handleCallTool(name, args);
  });
  return server;
}

// ─── HTTP Transport (primary — matches sample-mcp-apps-chatflow pattern) ──────
async function startHttpServer(): Promise<void> {
  const app = express();
  app.use(express.json());

  // Store transports per session for stateful HTTP
  const transports = new Map<string, StreamableHTTPServerTransport>();

  app.post("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (sessionId && transports.has(sessionId)) {
      // Reuse existing transport session
      const transport = transports.get(sessionId)!;
      await transport.handleRequest(req, res, req.body);
      return;
    }

    // New session
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        transports.set(id, transport);
        console.error(`[mcp-server] New HTTP session: ${id}`);
      },
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        transports.delete(transport.sessionId);
        console.error(`[mcp-server] Session closed: ${transport.sessionId}`);
      }
    };

    const server = createServer();
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  // SSE endpoint for notifications (GET /mcp)
  app.get("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).json({ error: "Invalid or missing session ID" });
      return;
    }
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
  });

  app.delete("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (sessionId && transports.has(sessionId)) {
      transports.delete(sessionId);
    }
    res.status(204).end();
  });

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", server: "eval-forge-mcp", version: "0.1.0" });
  });

  app.listen(HTTP_PORT, () => {
    console.error(`🚀 EvalForge MCP Server (HTTP) running at http://localhost:${HTTP_PORT}`);
    console.error(`📡 MCP endpoint: http://localhost:${HTTP_PORT}/mcp`);
    console.error(`❤️  Health check: http://localhost:${HTTP_PORT}/health`);
  });
}

// ─── Stdio Transport (for subprocess / IDE integration) ───────────────────────
async function startStdioServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("EvalForge MCP Server running on stdio");
}

// ─── Entry Point ──────────────────────────────────────────────────────────────
const useStdio =
  process.argv.includes("--stdio") ||
  process.env.MCP_TRANSPORT === "stdio";

if (useStdio) {
  startStdioServer().catch((err) => {
    console.error("Stdio server error:", err);
    process.exit(1);
  });
} else {
  startHttpServer().catch((err) => {
    console.error("HTTP server error:", err);
    process.exit(1);
  });
}
