import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

import { requestBuilderUI } from "./ui/request-builder.js";
import { testResultsUI } from "./ui/test-results.js";
import { testPlanUI } from "./ui/test-plan.js";
import { testReportUI } from "./ui/test-report.js";
import {
  executeRequest,
  runAssertions,
  type TestResult,
} from "./utils/http-client.js";
import { generateTestPlan } from "./utils/test-plan-generator.js";
import { isLLMConfigured } from "./config/llm.js";
import { runAgentPipeline, type PipelineMetadata } from "./agents/pipeline.js";
import { runWithContext, type TestCaseWithContext } from "./fsm/context-runner.js";

const MIME = "text/html;profile=mcp-app";
const PORT = parseInt(process.env.PORT || "8000");

// ─── MCP Server Factory ─────────────────────────────────────────────────────
// Creates a fresh McpServer instance per session. The MCP SDK only allows one
// transport per server, so we create a new server for each client connection.

function createServer(): McpServer {
  const server = new McpServer({
    name: "agentic-api-testing",
    version: "1.0.0",
  });

  // ─── Resources (UI templates served as MCP Apps) ───────────────────────────

  server.registerResource(
    "request-builder-ui",
    "ui://agentic-api-testing/request-builder",
    { mimeType: MIME, description: "Interactive API request builder form" },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: MIME, text: requestBuilderUI() }],
    }),
  );

  server.registerResource(
    "test-results-ui",
    "ui://agentic-api-testing/test-results",
    { mimeType: MIME, description: "API test results viewer with assertions" },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: MIME, text: testResultsUI() }],
    }),
  );

  server.registerResource(
    "test-plan-ui",
    "ui://agentic-api-testing/test-plan",
    { mimeType: MIME, description: "Test plan viewer with approval controls" },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: MIME, text: testPlanUI() }],
    }),
  );

  server.registerResource(
    "test-report-ui",
    "ui://agentic-api-testing/test-report",
    {
      mimeType: MIME,
      description: "Test report dashboard with charts and summary",
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: MIME, text: testReportUI() }],
    }),
  );

  // ─── Tool 1: configure-api-test (agent-facing) ────────────────────────────

  server.registerTool(
    "configure-api-test",
  {
    description:
      "Open the API test configuration form. Use this when the user wants to test an API endpoint. " +
      "Renders an interactive form where the user can enter URL, method, headers, body, and expected status.",
    _meta: {
      ui: {
        resourceUri: "ui://agentic-api-testing/request-builder",
        visibility: ["model", "app"],
      },
    },
  },
  async () => {
    return {
      content: [
        {
          type: "text",
          text: "The API test configuration form is now displayed. The user can enter the request details and click Send to execute the test.",
        },
      ],
    };
  },
);

// ─── Tool 2: execute-api-test (app-only) ─────────────────────────────────────
// This tool is ONLY callable from the UI iframe, not by the AI agent.
// The request builder form calls this when the user clicks "Send Request".

server.registerTool(
  "execute-api-test",
  {
    description: "Execute an API test request. Only callable from the request builder UI.",
    inputSchema: {
      testName: z.string().describe("Name of the test"),
      method: z.string().describe("HTTP method"),
      url: z.string().describe("Request URL"),
      headers: z.record(z.string()).describe("Request headers"),
      body: z.string().optional().describe("Request body (JSON string)"),
      expectedStatus: z.number().describe("Expected HTTP status code"),
      maxResponseTime: z.number().describe("Maximum acceptable response time in ms"),
    },
    _meta: {
      ui: {
        visibility: ["app"], // Only the iframe can call this
      },
    },
  },
  async (args) => {
    try {
      const response = await executeRequest({
        method: args.method,
        url: args.url,
        headers: args.headers,
        body: args.body,
      });

      const assertions = runAssertions(
        response,
        args.expectedStatus,
        args.maxResponseTime,
      );

      const result: TestResult = {
        ...response,
        assertions,
        passed: assertions.every((a) => a.passed),
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        structuredContent: result,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Request failed: ${message}` }],
        isError: true,
      };
    }
  },
);

// ─── Tool 3: show-test-results (agent-facing) ───────────────────────────────
// Renders the test results viewer. The agent calls this after a test is executed
// to display results to the user.

server.registerTool(
  "show-test-results",
  {
    description:
      "Display API test results in an interactive viewer with assertions, " +
      "response body, headers, and timing information. " +
      "Call this after executing a test to show detailed results.",
    inputSchema: {
      testConfig: z.object({
        testName: z.string(),
        method: z.string(),
        url: z.string(),
        headers: z.record(z.string()),
        body: z.string().optional(),
      }).describe("The original test configuration"),
      testResult: z.object({
        statusCode: z.number(),
        statusText: z.string(),
        headers: z.record(z.string()),
        body: z.unknown(),
        responseTime: z.number(),
        assertions: z.array(z.object({
          name: z.string(),
          passed: z.boolean(),
          detail: z.string().optional(),
        })),
        passed: z.boolean(),
      }).describe("The test execution result"),
    },
    _meta: {
      ui: {
        resourceUri: "ui://agentic-api-testing/test-results",
        visibility: ["model", "app"],
      },
    },
  },
  async (args) => {
    const { testResult } = args;
    const passCount = testResult.assertions.filter((a: { passed: boolean }) => a.passed).length;
    const total = testResult.assertions.length;

    return {
      content: [
        {
          type: "text",
          text: `Test ${testResult.passed ? "PASSED" : "FAILED"}: ${testResult.statusCode} ${testResult.statusText} in ${testResult.responseTime}ms. Assertions: ${passCount}/${total} passed.`,
        },
      ],
      structuredContent: args,
    };
  },
);

// ─── Tool 4: generate-test-plan (agent-facing) ──────────────────────────────
// Generates a test plan for an API endpoint and shows it in the plan viewer UI.
// In the full GSoC implementation, this would use multi-agent pipeline.

server.registerTool(
  "generate-test-plan",
  {
    description:
      "Generate a comprehensive test plan for an API endpoint using a multi-agent pipeline " +
      "(Generator -> Critic -> Reducer). Returns the plan data as text. " +
      "After this completes, call show-test-plan to display the interactive plan viewer.",
    inputSchema: {
      baseUrl: z.string().describe("Base URL of the API (e.g., https://api.example.com)"),
      method: z.string().describe("HTTP method (GET, POST, PUT, DELETE, etc.)"),
      path: z.string().describe("API path (e.g., /users, /posts/1)"),
      description: z.string().optional().describe("Optional description of what the endpoint does"),
    },
  },
  async (args) => {
    let plan;
    let pipelineMetadata: PipelineMetadata | undefined;

    if (isLLMConfigured()) {
      try {
        const result = await runAgentPipeline(
          args.baseUrl,
          args.method,
          args.path,
          args.description,
        );
        plan = result.plan;
        pipelineMetadata = result.metadata;
      } catch (error) {
        console.warn("[generate-test-plan] Agent pipeline failed, falling back to deterministic generator:", error);
        plan = generateTestPlan(args.baseUrl, args.method, args.path, args.description);
      }
    } else {
      plan = generateTestPlan(args.baseUrl, args.method, args.path, args.description);
    }

    const pipelineInfo = pipelineMetadata
      ? ` via ${pipelineMetadata.agentsUsed.join(" → ")} pipeline (${pipelineMetadata.generatorCount} generated, ${pipelineMetadata.criticApproved} approved, ${pipelineMetadata.reducerFinal} final)`
      : " (deterministic)";

    return {
      content: [
        {
          type: "text",
          text: `Generated test plan "${plan.planName}" with ${plan.tests.length} test cases across ${new Set(plan.tests.map((t) => t.category)).size} categories${pipelineInfo}. Now call show-test-plan to display the interactive viewer.`,
        },
      ],
      structuredContent: { ...plan, pipelineMetadata },
    };
  },
);

// ─── Tool 5: show-test-plan (agent-facing) ──────────────────────────────────
// Displays the test plan in an interactive UI. Called AFTER generate-test-plan.
// The plan data is passed as input args, so the host sends it to the iframe.

server.registerTool(
  "show-test-plan",
  {
    description:
      "Display a generated test plan in an interactive viewer where the user can " +
      "review, toggle, and approve tests. Call this after generate-test-plan completes, " +
      "passing the plan data (planName, tests array) as input.",
    inputSchema: {
      planName: z.string().describe("Name of the test plan"),
      description: z.string().optional(),
      baseUrl: z.string().optional(),
      tests: z.array(z.object({
        name: z.string(),
        method: z.string(),
        url: z.string(),
        headers: z.record(z.string()),
        body: z.string().optional(),
        expectedStatus: z.number(),
        maxResponseTime: z.number(),
        category: z.string(),
        description: z.string(),
      })).describe("Array of test cases to display"),
      pipelineMetadata: z.object({
        generatorCount: z.number(),
        criticApproved: z.number(),
        reducerFinal: z.number(),
        agentsUsed: z.array(z.string()),
      }).optional(),
    },
    _meta: {
      ui: {
        resourceUri: "ui://agentic-api-testing/test-plan",
        visibility: ["model", "app"],
      },
    },
  },
  async (args) => {
    return {
      content: [
        {
          type: "text",
          text: `Displaying test plan "${args.planName}" with ${args.tests.length} test cases. Review and click "Run Selected Tests" to execute.`,
        },
      ],
      structuredContent: args,
    };
  },
);

// ─── Tool 6: run-test-suite (agent-facing) ──────────────────────────────────
// Executes a batch of approved tests and collects results via context runner.

server.registerTool(
  "run-test-suite",
  {
    description:
      "Execute a batch of approved test cases sequentially and collect results. " +
      "Call this after the user approves tests from the test plan viewer.",
    inputSchema: {
      planName: z.string().describe("Name of the test plan"),
      tests: z.array(z.object({
        name: z.string(),
        method: z.string(),
        url: z.string(),
        headers: z.record(z.string()),
        body: z.string().optional(),
        expectedStatus: z.number(),
        maxResponseTime: z.number(),
        category: z.string(),
        description: z.string(),
      })).describe("Array of test cases to execute"),
    },
  },
  async (args) => {
    // Use context runner for variable extraction/injection between steps
    const testsWithContext: TestCaseWithContext[] = args.tests.map((t) => ({
      ...t,
      injectVariables: true,
    }));

    const execution = await runWithContext(testsWithContext);
    const { results } = execution;

    const passed = results.filter((r) => r.passed).length;
    const failed = results.length - passed;

    // Compute KPIs
    const totalAssertions = results.reduce((sum, r) => sum + r.assertions.length, 0);
    const uniqueUrls = new Set(args.tests.map((t) => new URL(t.url).pathname)).size;
    const times = results.map((r) => r.responseTime).filter((t) => t > 0).sort((a, b) => a - b);
    const avgTime = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

    const kpis = {
      passRate: results.length ? Math.round((passed / results.length) * 100) : 0,
      assertionDensity: results.length ? +(totalAssertions / results.length).toFixed(1) : 0,
      endpointCoverage: uniqueUrls,
      avgResponseTime: avgTime,
    };

    return {
      content: [
        {
          type: "text",
          text: `Test suite "${args.planName}" completed: ${passed} passed, ${failed} failed out of ${results.length} tests. KPIs: ${kpis.passRate}% pass rate, ${kpis.assertionDensity} assertions/test.`,
        },
      ],
      structuredContent: {
        planName: args.planName,
        results,
        summary: { total: results.length, passed, failed },
        kpis,
        contextStore: execution.contextStore,
        trace: execution.trace,
      },
    };
  },
);

// ─── Tool 6: show-test-report (agent-facing) ────────────────────────────────
// Renders a visual dashboard with charts showing test suite results.

server.registerTool(
  "show-test-report",
  {
    description:
      "Display a visual test report dashboard with charts, pass/fail statistics, " +
      "and response time distribution. Call this after running a test suite to show " +
      "the user a summary of results. Supports JSON report download.",
    inputSchema: {
      planName: z.string().describe("Name of the test plan"),
      results: z.array(z.object({
        testName: z.string(),
        statusCode: z.number(),
        responseTime: z.number(),
        passed: z.boolean(),
        assertions: z.array(z.object({
          name: z.string(),
          passed: z.boolean(),
          detail: z.string().optional(),
        })),
      })).describe("Array of test results"),
      summary: z.object({
        total: z.number(),
        passed: z.number(),
        failed: z.number(),
      }).describe("Summary statistics"),
      kpis: z.object({
        passRate: z.number(),
        assertionDensity: z.number(),
        endpointCoverage: z.number(),
        avgResponseTime: z.number(),
      }).optional().describe("KPI metrics"),
      pipelineMetadata: z.object({
        generatorCount: z.number(),
        criticApproved: z.number(),
        reducerFinal: z.number(),
        agentsUsed: z.array(z.string()),
      }).optional().describe("Agent pipeline metadata"),
    },
    _meta: {
      ui: {
        resourceUri: "ui://agentic-api-testing/test-report",
        visibility: ["model", "app"],
      },
    },
  },
  async (args) => {
    const kpiInfo = args.kpis
      ? ` KPIs: ${args.kpis.passRate}% pass rate, ${args.kpis.assertionDensity} assertions/test.`
      : "";

    return {
      content: [
        {
          type: "text",
          text: `Test report for "${args.planName}": ${args.summary.passed}/${args.summary.total} tests passed.${kpiInfo} View the interactive dashboard for details.`,
        },
      ],
      structuredContent: args,
    };
  },
);

  return server;
}

// ─── Express Server ──────────────────────────────────────────────────────────

const app = express();

// Store transports by session ID for session management
const transports = new Map<string, StreamableHTTPServerTransport>();

app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  // Existing session — route to its transport
  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
    return;
  }

  // New session — create server + transport, pre-register before handling
  const newSessionId = crypto.randomUUID();
  const mcpServer = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => newSessionId,
  });

  transports.set(newSessionId, transport);

  transport.onclose = () => {
    transports.delete(newSessionId);
  };

  await mcpServer.connect(transport);
  await transport.handleRequest(req, res);
});

app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
    return;
  }
  res.status(400).json({ error: "No active session. Send a POST to /mcp first." });
});

app.delete("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
    transports.delete(sessionId);
    return;
  }
  res.status(400).json({ error: "No active session." });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", tools: 7, resources: 4 });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║             Agentic API Testing - MCP Server                ║
║                                                              ║
║  MCP endpoint:  http://localhost:${PORT}/mcp                    ║
║  Health check:  http://localhost:${PORT}/health                 ║
║                                                              ║
║  Tools:                                                      ║
║    - configure-api-test  (request builder form)              ║
║    - execute-api-test    (HTTP execution, app-only)          ║
║    - show-test-results   (response viewer + assertions)      ║
║    - generate-test-plan  (auto-generate test cases)          ║
║    - run-test-suite      (batch test execution)              ║
║    - show-test-report    (dashboard with charts)             ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
