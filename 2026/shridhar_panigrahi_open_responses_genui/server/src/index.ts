/**
 * APIDash MCP Apps Server
 *
 * Implements the MCP Apps Chatflow pattern from:
 *   https://github.com/ashitaprasad/sample-mcp-apps-chatflow
 *
 * Each tool returns two layers:
 *   content         — text the AI agent reasons about
 *   structuredContent — typed data APIDash renders as a UI card
 *
 * The connection to Open Responses:
 *   When an AI agent calls one of these tools, the MCP result becomes a
 *   function_call_output item in the Open Responses envelope.
 *   The structuredContent lands in function_call_output.output, which the
 *   APIDash structured viewer renders as a key-value table per turn.
 *
 * Run: npm run dev
 * Endpoint: POST http://localhost:3000/mcp  (MCP JSON-RPC)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";
import { z } from "zod";

const app = express();
app.use(express.json());

const server = new McpServer({
  name: "apidash-mcp-server",
  version: "1.0.0",
});

// ---------------------------------------------------------------------------
// Tool 1: run_api_test
// Fires a mock HTTP request and returns the result as structuredContent.
// In APIDash, this structuredContent becomes the function_call_output that
// the Open Responses viewer renders as a structured result card.
// ---------------------------------------------------------------------------
server.registerTool(
  "run_api_test",
  {
    description: "Run a test HTTP request against an API endpoint and return structured result",
    inputSchema: {
      method: z.enum(["GET", "POST", "PUT", "DELETE"]).describe("HTTP method"),
      url: z.string().describe("Endpoint URL to test"),
      expected_status: z.number().optional().describe("Expected HTTP status code"),
    },
  },
  async ({ method, url, expected_status }) => {
    // Mock response — in the real GSoC implementation this calls APIDash's
    // existing HTTP service so the agent can fire actual requests
    const result = {
      method,
      url,
      status: 200,
      latency_ms: 142,
      passed: expected_status ? expected_status === 200 : true,
      content_type: "application/json",
      body_preview: '{"status":"ok"}',
    };

    return {
      content: [
        {
          type: "text" as const,
          text: `${method} ${url} → HTTP ${result.status} (${result.latency_ms}ms). Test ${result.passed ? "passed" : "failed"}.`,
        },
      ],
      structuredContent: result as unknown as Record<string, unknown>,
    };
  }
);

// ---------------------------------------------------------------------------
// Tool 2: check_api_health
// Checks health across multiple services. structuredContent carries per-service
// status + aggregate metrics — APIDash renders this as a health dashboard card.
// ---------------------------------------------------------------------------
server.registerTool(
  "check_api_health",
  {
    description: "Check health status of one or more API services",
    inputSchema: {
      services: z
        .array(z.string())
        .describe('Service names to check, e.g. ["auth", "payments", "inventory"]'),
    },
  },
  async ({ services }) => {
    // Inventory is intentionally degraded to show a realistic mixed-status result
    const statuses: Record<string, string> = {};
    for (const svc of services) {
      statuses[svc] = svc === "inventory" ? "degraded" : "ok";
    }

    const result = {
      services: statuses,
      uptime_pct: 99.1,
      avg_latency_ms: 187,
      checked_at: new Date().toISOString(),
      overall: services.every((s) => statuses[s] === "ok") ? "healthy" : "degraded",
    };

    const degraded = services.filter((s) => statuses[s] !== "ok");
    const summary =
      degraded.length === 0
        ? `All ${services.length} services healthy. Uptime ${result.uptime_pct}%, avg latency ${result.avg_latency_ms}ms.`
        : `${degraded.join(", ")} degraded. Uptime ${result.uptime_pct}%.`;

    return {
      content: [{ type: "text" as const, text: summary }],
      structuredContent: result as unknown as Record<string, unknown>,
    };
  }
);

// ---------------------------------------------------------------------------
// Tool 3: list_api_templates
// Lists APIDash templates by category. structuredContent carries the list so
// the agent can present a structured selection UI instead of a plain text list.
// ---------------------------------------------------------------------------
server.registerTool(
  "list_api_templates",
  {
    description: "List available API templates in APIDash filtered by category",
    inputSchema: {
      category: z
        .enum(["payment", "weather", "auth", "storage", "all"])
        .describe("Template category to filter by"),
      limit: z.number().min(1).max(20).optional().describe("Max results (default 5)"),
    },
  },
  async ({ category, limit = 5 }) => {
    const catalogue: Record<string, string[]> = {
      payment: ["Stripe Balance", "Stripe Charges", "PayPal Orders", "Razorpay Orders", "Braintree Transactions"],
      weather: ["OpenWeatherMap Current", "OpenWeatherMap Forecast", "WeatherAPI Current"],
      auth:    ["OAuth2 Token Exchange", "JWT Verify", "API Key Validation"],
      storage: ["AWS S3 List Buckets", "GCS Upload Object", "Cloudflare R2 Put"],
      all:     ["Stripe Balance", "OpenWeatherMap Current", "OAuth2 Token Exchange", "AWS S3 List Buckets", "Razorpay Orders"],
    };

    const results = (catalogue[category] ?? []).slice(0, limit);

    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${results.length} ${category} templates: ${results.join(", ")}.`,
        },
      ],
      structuredContent: {
        category,
        count: results.length,
        templates: results,
      } as unknown as Record<string, unknown>,
    };
  }
);

// ---------------------------------------------------------------------------
// Tool 4: get_weather
// Weather lookup — mirrors the get_weather tool in the Open Responses mock
// to show the full loop: MCP tool call → structuredContent → Open Responses
// function_call_output → APIDash renders the card.
// ---------------------------------------------------------------------------
server.registerTool(
  "get_weather",
  {
    description: "Get current weather for a location",
    inputSchema: {
      location: z.string().describe("City name"),
      unit: z.enum(["celsius", "fahrenheit"]).optional().describe("Temperature unit (default celsius)"),
    },
  },
  async ({ location, unit = "celsius" }) => {
    const data: Record<string, { temperature: number; condition: string; humidity: number; wind_kph: number }> = {
      london:          { temperature: 14, condition: "Overcast",       humidity: 81, wind_kph: 12 },
      "san francisco": { temperature: 18, condition: "Partly cloudy",  humidity: 72, wind_kph: 14 },
    };

    const key = location.toLowerCase();
    const weather = data[key] ?? { temperature: 22, condition: "Clear", humidity: 60, wind_kph: 8 };
    const temp = unit === "fahrenheit" ? Math.round(weather.temperature * 9 / 5 + 32) : weather.temperature;
    const symbol = unit === "fahrenheit" ? "°F" : "°C";

    const result = {
      location,
      temperature: `${temp}${symbol}`,
      condition: weather.condition,
      humidity: `${weather.humidity}%`,
      wind: `${weather.wind_kph} km/h`,
    };

    return {
      content: [
        {
          type: "text" as const,
          text: `${location}: ${result.temperature}, ${result.condition}. Humidity ${result.humidity}, wind ${result.wind}.`,
        },
      ],
      structuredContent: result as unknown as Record<string, unknown>,
    };
  }
);

// ---------------------------------------------------------------------------
// POST /mcp — MCP JSON-RPC endpoint
// ---------------------------------------------------------------------------
app.post("/mcp", async (req: Request, res: Response) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless — new session per request
    enableJsonResponse: true,
  });
  res.on("close", () => transport.close());
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// ---------------------------------------------------------------------------
// GET /health — liveness check
// ---------------------------------------------------------------------------
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", server: "apidash-mcp-server", version: "1.0.0" });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const PORT = parseInt(process.env.PORT ?? "3000");
app.listen(PORT, () => {
  console.log(`APIDash MCP server running on http://localhost:${PORT}`);
  console.log(`  POST /mcp    — MCP JSON-RPC (tools/list, tools/call)`);
  console.log(`  GET  /health — liveness check`);
  console.log(`\nTools: run_api_test | check_api_health | list_api_templates | get_weather`);
});
