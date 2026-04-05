#!/usr/bin/env node
/**
 * API Dash MCP Apps PoC
 * 
 * Exposes MCP server via Streamable HTTP for web-based clients.
 * Uses Apps Extension (SEP-1865) for UI rendering.
 * Replaces sales analytics tools with 3 API Dash MCP Apps:
 *  1. execute-request   — Request picker + executor
 *  2. list-requests     — Collection browser with Chart.js
 *  3. view-response     — Response viewer with highlight.js
 * 
 * Run with: npm run dev
 * Test with: npm run inspector:http
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";
import { z } from "zod";

import { REQUEST_EXECUTOR_UI } from "./ui/request-executor.js";
import { COLLECTION_BROWSER_UI } from "./ui/collection-browser.js";
import { RESPONSE_VIEWER_UI } from "./ui/response-viewer.js";
import { savedRequests, getRequestById } from "./data/requests-data.js";
import { environments, getEnvironmentById } from "./data/environments-data.js";

const MIME = "text/html;profile=mcp-app" as const;
const URI = "ui://apidash-mcp-apps";

// Create MCP server with metadata
const server = new McpServer({
  name: "apidash-mcp-apps",
  version: "1.0.0",
});

// =========================================
// MCP App 1: execute-request
// UI: Request picker + environment selector
// =========================================

server.registerResource(
  "request-executor-ui",
  `${URI}/request-executor`,
  {
    mimeType: MIME,
    description: "Interactive API request picker. Select a saved request, choose an environment, and click Run to simulate execution.",
  },
  async (uri) => {
    console.log(`📱 resources/read called for: ${uri.href}`);
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: MIME,
          text: REQUEST_EXECUTOR_UI(),
        },
      ],
    };
  }
);

server.registerTool(
  "execute-request",
  {
    description: "Open the API Dash Request Executor UI. Allows the user to pick a saved API request from the collection, select a target environment (dev/staging/prod), and click Run to simulate executing the HTTP request. After execution, the request + response data is added to the model context for analysis.",
    _meta: {
      ui: {
        resourceUri: `${URI}/request-executor`,
        visibility: ["model", "app"],
      },
    },
  },
  async () => {
    console.error("[execute-request] Tool executed");
    return {
      content: [{
        type: "text" as const,
        text: "API Dash Request Executor opened. Select a request and environment, then click ▶ Run.",
      }]
    };
  }
);

// =========================================
// App-only: run-request-data
// Called by UI to simulate HTTP execution
// =========================================

server.registerTool(
  "run-request-data",
  {
    description: "Simulate executing an HTTP request from the saved collection and return the mock response. Called by the Request Executor app UI. Returns structured response data including status, headers, body, timing, and size.",
    inputSchema: {
      requestId: z.string().describe("The ID of the saved request to execute"),
      environmentId: z.string().describe("The environment ID to use (dev/staging/prod)"),
    },
    _meta: {
      ui: {
        resourceUri: `${URI}/request-executor`,
        visibility: ["app"],
      },
    },
  },
  async ({ requestId, environmentId }) => {
    console.log(`🔧 [run-request-data] requestId=${requestId}, environmentId=${environmentId}`);

    const req = getRequestById(requestId);
    if (!req) {
      return {
        content: [{ type: "text" as const, text: `Request '${requestId}' not found.` }],
        isError: true,
      };
    }

    const env = getEnvironmentById(environmentId) || environments[0];

    // Simulate a small processing delay variance in the mock response
    const jitter = Math.floor(Math.random() * 30) - 15;
    const adjustedTime = Math.max(10, req.mockResponse.timeMs + jitter);

    const responseData = {
      request: {
        id: req.id,
        name: req.name,
        method: req.method,
        url: req.url,
        headers: req.headers || {},
        body: req.body || null,
        tags: req.tags,
      },
      environment: {
        id: env.id,
        name: env.name,
        variables: env.variables,
      },
      response: {
        status: req.mockResponse.status,
        statusText: req.mockResponse.statusText,
        headers: req.mockResponse.headers,
        body: req.mockResponse.body,
        timeMs: adjustedTime,
        sizeBytes: req.mockResponse.sizeBytes,
      },
      executedAt: new Date().toISOString(),
    };

    console.log(`✅ [run-request-data] Simulated ${req.method} ${req.url} → ${req.mockResponse.status} in ${adjustedTime}ms`);

    return {
      content: [{
        type: "text" as const,
        text: `Executed ${req.method} ${req.url} → ${req.mockResponse.status} ${req.mockResponse.statusText} (${adjustedTime}ms)`,
      }],
      structuredContent: responseData as unknown as Record<string, unknown>,
    };
  }
);

// =========================================
// MCP App 2: list-requests
// UI: Collection browser + Chart.js chart
// =========================================

server.registerResource(
  "collection-browser-ui",
  `${URI}/collection-browser`,
  {
    mimeType: MIME,
    description: "Collection browser dashboard showing all saved API requests with method badges, URLs, tags, and a response-time bar chart.",
  },
  async (uri) => {
    console.log(`📱 resources/read called for: ${uri.href}`);
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: MIME,
          text: COLLECTION_BROWSER_UI(),
          _meta: {
            ui: {
              csp: {
                resourceDomains: ["https://cdn.jsdelivr.net"],
              },
              prefersBorder: false,
            },
          },
        },
      ],
    };
  }
);

server.registerTool(
  "list-requests",
  {
    description: "Open the API Dash Collection Browser. Displays all saved API requests as a filterable table with method badges, names, URLs, and tags. Also renders a Chart.js bar chart of mock response times per request. Data can be filtered by HTTP method (GET/POST/PUT/DELETE) and searched by name or tag.",
    inputSchema: {
      filter: z.object({
        method: z.enum(["ALL", "GET", "POST", "PUT", "DELETE"]).optional().describe("Optional method filter"),
        tag: z.string().optional().describe("Optional tag to filter by"),
      }).optional().describe("Optional filter options"),
    },
    _meta: {
      ui: {
        resourceUri: `${URI}/collection-browser`,
        visibility: ["model", "app"],
      },
    },
  },
  async ({ filter }) => {
    console.log(`🔧 [list-requests] filter=${JSON.stringify(filter)}`);

    let requests = savedRequests;
    if (filter?.method && filter.method !== "ALL") {
      requests = requests.filter(r => r.method === filter.method);
    }
    if (filter?.tag) {
      requests = requests.filter(r => r.tags.includes(filter.tag!));
    }

    const summary = {
      total: requests.length,
      methods: ["GET", "POST", "PUT", "DELETE"].map(m => ({
        method: m,
        count: requests.filter(r => r.method === m).length,
      })),
      avgResponseTime: requests.length > 0
        ? Math.round(requests.reduce((s, r) => s + r.mockResponse.timeMs, 0) / requests.length)
        : 0,
    };

    return {
      content: [{
        type: "text" as const,
        text: `📚 Collection browser opened — ${requests.length} requests in collection. Avg response time: ${summary.avgResponseTime}ms.`,
      }],
      structuredContent: {
        requests,
        summary,
        filter: filter || null,
      } as unknown as Record<string, unknown>,
    };
  }
);

// =========================================
// MCP App 3: view-response
// UI: Response viewer with highlight.js
// =========================================

server.registerResource(
  "response-viewer-ui",
  `${URI}/response-viewer`,
  {
    mimeType: MIME,
    description: "Response viewer showing status badge, timing, size, syntax-highlighted JSON body, collapsible headers, and Export JSON button.",
  },
  async (uri) => {
    console.log(`📱 resources/read called for: ${uri.href}`);
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: MIME,
          text: RESPONSE_VIEWER_UI(),
          _meta: {
            ui: {
              csp: {
                resourceDomains: ["https://cdn.jsdelivr.net"],
              },
              prefersBorder: false,
            },
          },
        },
      ],
    };
  }
);

server.registerTool(
  "view-response",
  {
    description: "Open the API Dash Response Viewer to inspect an HTTP response. Shows a colored status badge (green 2xx, yellow 3xx, red 4xx/5xx), response time, body size, syntax-highlighted JSON body, collapsible response headers section, and an Export JSON button to download the full response data. Accepts a requestId for a stored mock response or raw response data.",
    inputSchema: {
      requestId: z.string().optional().describe("ID of a saved request whose mock response to view"),
      responseData: z.object({
        status: z.number().describe("HTTP status code"),
        statusText: z.string().describe("HTTP status text"),
        headers: z.record(z.string(), z.string()).describe("Response headers"),
        body: z.unknown().describe("Response body (JSON or string)"),
        timeMs: z.number().describe("Response time in milliseconds"),
        sizeBytes: z.number().describe("Response size in bytes"),
      }).optional().describe("Raw response data to display (alternative to requestId)"),
    },
    _meta: {
      ui: {
        resourceUri: `${URI}/response-viewer`,
        visibility: ["model", "app"],
      },
    },
  },
  async ({ requestId, responseData }) => {
    console.log(`🔧 [view-response] requestId=${requestId}`);

    let req = requestId ? getRequestById(requestId) : null;
    const resp = responseData || (req ? req.mockResponse : null);

    if (!resp) {
      return {
        content: [{ type: "text" as const, text: "No response data provided. Specify a requestId or responseData." }],
        isError: true,
      };
    }

    const viewData = {
      request: req ? {
        id: req.id,
        name: req.name,
        method: req.method,
        url: req.url,
      } : null,
      response: {
        status: (resp as typeof req.mockResponse).status,
        statusText: (resp as typeof req.mockResponse).statusText,
        headers: (resp as typeof req.mockResponse).headers,
        body: (resp as typeof req.mockResponse).body,
        timeMs: (resp as typeof req.mockResponse).timeMs,
        sizeBytes: (resp as typeof req.mockResponse).sizeBytes,
      },
    };

    const statusCode = viewData.response.status;
    const statusGroup = statusCode < 300 ? "✅ Success" : statusCode < 400 ? "↩ Redirect" : "❌ Error";

    return {
      content: [{
        type: "text" as const,
        text: `${statusGroup} — ${statusCode} ${viewData.response.statusText} in ${viewData.response.timeMs}ms (${viewData.response.sizeBytes} bytes). Use the Response Viewer to inspect headers and body.`,
      }],
      structuredContent: viewData as unknown as Record<string, unknown>,
    };
  }
);

// Express app for HTTP transport
const app = express();
app.use(express.json());

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    server: "apidash-mcp-apps",
    tools: ["execute-request", "run-request-data", "list-requests", "view-response"],
    apps: [
      { name: "Request Executor", uri: `${URI}/request-executor` },
      { name: "Collection Browser", uri: `${URI}/collection-browser` },
      { name: "Response Viewer", uri: `${URI}/response-viewer` },
    ],
  });
});

// MCP endpoint
app.post("/mcp", async (req: Request, res: Response) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  res.on("close", () => transport.close());

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// SSE endpoint for streaming (optional)
app.get("/mcp/sse", async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    enableJsonResponse: false,
  });

  res.on("close", () => transport.close());

  await server.connect(transport);
  await transport.handleRequest(req, res);
});

const port = parseInt(process.env.PORT || "3000");

app.listen(port, () => {
  console.log(`🚀 API Dash MCP Apps server running at http://localhost:${port}`);
  console.log(`📡 MCP endpoint: http://localhost:${port}/mcp`);
  console.log(`🔍 Test with: npx @modelcontextprotocol/inspector http://localhost:${port}/mcp`);
  console.log(`💚 Health check: http://localhost:${port}/health`);
  console.log(`\n📦 Registered MCP Apps:`);
  console.log(`   ⚡ execute-request   → ${URI}/request-executor`);
  console.log(`   📚 list-requests     → ${URI}/collection-browser`);
  console.log(`   👁  view-response     → ${URI}/response-viewer`);
});
