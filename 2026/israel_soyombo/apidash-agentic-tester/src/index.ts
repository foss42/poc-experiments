import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";

import { parseSpec, type Endpoint } from "./spec-parser.js";
import { generateTests, type TestCase } from "./test-generator.js";
import { executeTests } from "./test-executor.js";
import { TEST_RESULTS_HTML } from "./ui/test-results.js";

const PORT = 3000;
const UI_RESOURCE_URI = "ui://apidash-agent-tester/test-results";

// One transport + McpServer pair per VS Code session. We need separate instances
// because McpServer.connect() is 1:1 — connecting a second transport disconnects
// the first. Sessions live until the client sends DELETE or the SSE stream drops.
const sessions = new Map<string, StreamableHTTPServerTransport>();

// Each session gets a fresh McpServer with all tools registered on it
function createSessionServer(): McpServer {
  const server = new McpServer({
    name: "apidash-agent-tester",
    version: "0.1.0",
  });

  // The UI resource is what gets rendered as the interactive panel in VS Code.
  // Tools reference it via _meta.ui.resourceUri so the host knows to show it.
  server.resource(
    "test-results-ui",
    UI_RESOURCE_URI,
    {
      name: "Test Results Dashboard",
      description: "Interactive HTML panel showing API test results.",
      mimeType: "text/html;profile=mcp-app",
    },
    async () => ({
      contents: [
        {
          uri: UI_RESOURCE_URI,
          mimeType: "text/html;profile=mcp-app",
          text: TEST_RESULTS_HTML(),
        },
      ],
    })
  );

  server.tool(
    "parse_api_spec",
    "Parse an OpenAPI 3.x JSON spec and extract a structured list of endpoints (paths, methods, parameters, request bodies, response codes).",
    {
      spec: z.record(z.unknown()).describe("A valid OpenAPI 3.x JSON specification object."),
    },
    async ({ spec }) => {
      let endpoints: Endpoint[];
      try {
        endpoints = parseSpec(spec);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: "text", text: `Spec parsing failed: ${message}` }],
        };
      }

      const summary =
        `Parsed ${endpoints.length} endpoint${endpoints.length !== 1 ? "s" : ""}:\n` +
        endpoints.map((e) => `  ${e.method} ${e.path}`).join("\n");

      return {
        content: [{ type: "text", text: summary + "\n\n" + JSON.stringify(endpoints, null, 2) }],
        _meta: { ui: { resourceUri: UI_RESOURCE_URI } },
      };
    }
  );

  server.tool(
    "generate_test_cases",
    "Use the AI agent to generate comprehensive test cases (happy path, missing fields, invalid types) from a list of parsed endpoints.",
    {
      endpoints: z
        .array(z.record(z.unknown()))
        .describe("Array of endpoint objects returned by parse_api_spec."),
    },
    async ({ endpoints }) => {
      let testCases: TestCase[];
      try {
        testCases = await generateTests(endpoints as Endpoint[]);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: "text", text: `Test generation failed: ${message}` }],
        };
      }

      const summary =
        `Generated ${testCases.length} test case${testCases.length !== 1 ? "s" : ""}:\n` +
        testCases.map((tc) => `  [${tc.method}] ${tc.endpoint} — ${tc.description}`).join("\n");

      return {
        content: [{ type: "text", text: summary + "\n\n" + JSON.stringify(testCases, null, 2) }],
        _meta: { ui: { resourceUri: UI_RESOURCE_URI } },
      };
    }
  );

  server.tool(
    "execute_tests",
    "Execute a list of test cases against a live base URL and return detailed PASS/FAIL results with status, schema, and performance checks.",
    {
      tests: z
        .array(z.record(z.unknown()))
        .describe("Array of test case objects returned by generate_test_cases."),
      base_url: z
        .string()
        .url()
        .describe("Base URL of the API under test, e.g. https://jsonplaceholder.typicode.com"),
    },
    async ({ tests, base_url }) => {
      const results = await executeTests(tests as TestCase[], base_url);
      const passed = results.filter((r) => r.overall === "PASS").length;
      const failed = results.length - passed;

      const lines = [
        `Results: ${passed}/${results.length} passed, ${failed} failed (base: ${base_url})`,
        "",
        ...results.map((r) => {
          const icon = r.overall === "PASS" ? "✓" : "✗";
          return (
            `${icon} [${r.testCase.method}] ${r.testCase.endpoint} — ${r.testCase.description}` +
            (r.failureReason ? `\n   → ${r.failureReason}` : "")
          );
        }),
      ];

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        _meta: {
          ui: {
            resourceUri: UI_RESOURCE_URI,
            content: {
              type: "text",
              mimeType: "text/html;profile=mcp-app",
              text: TEST_RESULTS_HTML(results, base_url),
            },
          },
        },
      };
    }
  );

  return server;
}

// Read and JSON-parse a request body from the raw Node.js stream.
// We do this ourselves so we can log the method name and pass the parsed
// object directly to the SDK (avoids reading the stream twice).
async function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk: Buffer) => { raw += chunk.toString(); });
    req.on("end", () => {
      if (!raw) { resolve(undefined); return; }
      try { resolve(JSON.parse(raw)); }
      catch { resolve(undefined); }
    });
    req.on("error", reject);
  });
}

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("APIDash Agentic Tester is running\n");
    return;
  }

  if (url.pathname !== "/mcp") {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found\n");
    return;
  }

  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  try {
    if (req.method === "POST") {
      const body = await readBody(req);
      const bodyMethod = (body as Record<string, unknown> | undefined)?.method;
      console.log(`[req] POST  session=${sessionId ?? "(none)"}  method=${String(bodyMethod ?? "?")}`);

      const existing = sessionId ? sessions.get(sessionId) : undefined;

      if (existing) {
        await existing.handleRequest(req, res, body);
      } else {
        // No known session — create a fresh one. If the body isn't `initialize`
        // the SDK will reject it and VS Code will retry with a proper init request.
        const clientId = sessionId;
        let assignedId: string | undefined;

        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => clientId ?? randomUUID(),
          onsessioninitialized: (id) => {
            assignedId = id;
            sessions.set(id, transport);
            console.log(`[session] opened  ${id} (total: ${sessions.size})`);
          },
        });

        // Don't clean up on res.close — that fires as soon as the POST response
        // is sent, which would wipe the session before the next request arrives.
        // Instead clean up when the transport itself signals it's done.
        transport.onclose = () => {
          if (assignedId) {
            sessions.delete(assignedId);
            console.log(`[session] closed  ${assignedId} (total: ${sessions.size})`);
          }
        };

        const sessionServer = createSessionServer();
        await sessionServer.connect(transport);
        await transport.handleRequest(req, res, body);
      }

    } else if (req.method === "GET") {
      console.log(`[req] GET   session=${sessionId ?? "(none)"}`);
      const transport = sessionId ? sessions.get(sessionId) : undefined;
      if (!transport) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Session not found" }));
        return;
      }
      await transport.handleRequest(req, res);

    } else if (req.method === "DELETE") {
      const transport = sessionId ? sessions.get(sessionId) : undefined;
      if (!transport) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Session not found" }));
        return;
      }
      await transport.handleRequest(req, res);
      sessions.delete(sessionId!);
      console.log(`[session] deleted ${sessionId} (total: ${sessions.size})`);

    } else {
      res.writeHead(405, { "Content-Type": "text/plain" });
      res.end("Method not allowed\n");
    }

  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        error: err instanceof Error ? err.message : "Internal server error",
      }));
    }
  }
});

httpServer.listen(PORT, () => {
  console.log(`\n⚡ APIDash Agentic Tester MCP server`);
  console.log(`   Listening on http://localhost:${PORT}/mcp`);
  console.log(`   Connect via .vscode/mcp.json → http://localhost:${PORT}/mcp\n`);
});
