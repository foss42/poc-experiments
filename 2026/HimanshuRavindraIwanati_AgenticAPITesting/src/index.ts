
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { z } from "zod";

import { PETSTORE_SPEC, DRIFTED_PET_RESPONSE, SEED_PET_ID_TEST } from "./constants.js";
import {
  createSession,
  getOrCreateDefaultSession,
  getSession,
  updateSession,
  transitionState,
} from "./session-store.js";
import { generateTestsForEndpoints } from "./services/llm-client.js";
import { executeTests } from "./services/test-executor.js";
import { detectDrift, generateHealingPatches } from "./services/drift-detector.js";
import { buildTestReviewHTML } from "./ui/test-review.js";
import { buildHealingDiffHTML } from "./ui/healing-diff.js";
import type { AgentSession } from "./types.js";

// ─── MCP Server Initialization ───────────────────────────────────────────────

const server = new McpServer({
  name: "apidash-agent-mcp",
  version: "1.0.0",
});

const MIME = "text/html;profile=mcp-app" as const;
const URI_BASE = "ui://apidash-agent";

// ─── Shared session ref for UI resources ─────────────────────────────────────
// UI resources are fetched by URI — we store latest session for resource rendering

let latestSession: AgentSession = getOrCreateDefaultSession();

function resolveSession(sessionId?: string): AgentSession | undefined {
  const session = sessionId ? getSession(sessionId) : latestSession;
  if (session) {
    latestSession = session;
  }
  return session;
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOL 1: parse_spec
// Ingests the JSONPlaceholder spec and initialises a session
// ─────────────────────────────────────────────────────────────────────────────

server.registerTool(
  "parse_spec",
  {
    title: "Parse API Specification",
    description: `Parses an API specification and initialises an agent session.
In this POC the JSONPlaceholder spec is used. In the full system, SpecParser 
ingests OpenAPI 3.x, Postman Collections, and GraphQL schemas.

Returns a session ID and a summary of parsed endpoints.`,
    inputSchema: {
      api_name: z.string()
        .optional()
        .describe("Optional API name override (defaults to JSONPlaceholder)"),
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  async () => {
    const session = createSession();
    const spec = {
      ...PETSTORE_SPEC,
      sessionId: session.id,
    };

    latestSession = updateSession(session.id, {
      state: "PARSING",
      spec,
    });

    transitionState(session.id, "PLANNING");
    latestSession = updateSession(session.id, { state: "PLANNING" });

    const summary = spec.endpoints.map(
      (e) => `  ${e.method.padEnd(6)} ${e.path.padEnd(20)} — ${e.summary}`
    ).join("\n");

    return {
      content: [
        {
          type: "text" as const,
          text: [
            `✅ Spec parsed successfully`,
            ``,
            `Session ID : ${session.id}`,
            `API Title  : ${spec.title}`,
            `Base URL   : ${spec.baseUrl}`,
            `Endpoints  : ${spec.endpoints.length}`,
            ``,
            `Parsed endpoints:`,
            summary,
            ``,
            `State: PLANNING`,
            `Next: Run 'generate_tests' to generate an AI-powered test suite.`,
          ].join("\n"),
        },
      ],
    };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// TOOL 2: generate_tests
// Calls LLM to generate test cases, then renders the test-review MCP App
// ─────────────────────────────────────────────────────────────────────────────

server.registerTool(
  "generate_tests",
  {
    title: "Generate AI-Powered Test Suite",
    description: `Uses an LLM (TestStrategyPlanner) to generate a comprehensive test suite 
from the parsed API specification. Covers happy paths, boundary values, and error injection.

After generation, renders the interactive test-review MCP App where the developer 
can toggle individual tests on/off before execution.

Requires parse_spec to have been called first.`,
    inputSchema: {
      session_id: z.string()
        .optional()
        .describe("Session ID from parse_spec. Uses latest session if omitted."),
      endpoint_filter: z.string()
        .optional()
        .describe("Optional tag filter e.g. 'users' or 'posts'. Generates for all if omitted."),
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,    // calls external LLM API
    },
    // MCP Apps: links this tool to the test-review UI resource
    _meta: {
      ui: { resourceUri: `${URI_BASE}/test-review` },
    },
  },
  async ({ session_id, endpoint_filter }) => {
    const session = resolveSession(session_id);
    if (!session) {
      return {
        content: [{
          type: "text" as const,
          text: `❌ Session not found: ${session_id}. Run parse_spec first.`,
        }],
      };
    }

    if (!session.spec) {
      return {
        content: [{
          type: "text" as const,
          text: "❌ No spec loaded. Run parse_spec first.",
        }],
      };
    }

    transitionState(session.id, "PLANNING");

    // Apply endpoint filter if provided
    const endpoints = endpoint_filter
      ? session.spec.endpoints.filter((e) =>
          e.tags.includes(endpoint_filter) ||
          e.path.includes(endpoint_filter)
        )
      : session.spec.endpoints;

    if (endpoints.length === 0) {
      return {
        content: [{
          type: "text" as const,
          text: `❌ No endpoints matched filter: '${endpoint_filter}'`,
        }],
      };
    }

    // LLM test generation
    const llmTests = await generateTestsForEndpoints(endpoints);

    // Inject seed test for GET /pet/{petId} drift simulation.
    // Remove any LLM-generated test that already covers the same endpoint+field
    // to avoid duplicates, then prepend our guaranteed sentinel.
    const petEndpointIncluded = endpoints.some(
      (e) => e.method === "GET" && e.path === "/pet/{petId}"
    );
    const withoutDuplicate = llmTests.filter(
      (t) => !(t.path === "/pet/{petId}" &&
               t.assertions.some((a) => a.field === "response.body.id" && a.operator === "type_is"))
    );
    const tests = petEndpointIncluded
      ? [SEED_PET_ID_TEST, ...withoutDuplicate]
      : llmTests;

    latestSession = updateSession(session.id, {
      state: "AWAITING_APPROVAL",
      generatedTests: tests,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: [
            `✅ Generated ${tests.length} test cases via AI`,
            ``,
            `Breakdown:`,
            `  Happy Path     : ${tests.filter((t) => t.type === "happy_path").length}`,
            `  Error Injection: ${tests.filter((t) => t.type === "error_injection").length}`,
            `  Boundary Value : ${tests.filter((t) => t.type === "boundary_value").length}`,
            `  Security Probe : ${tests.filter((t) => t.type === "security_probe").length}`,
            ``,
            `State: AWAITING_APPROVAL`,
            `The test-review interface is now open — approve your test selection to begin execution.`,
          ].join("\n"),
        },
      ],
    };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// TOOL 3: execute_tests
// Runs approved tests against JSONPlaceholder — called after user confirms
// ─────────────────────────────────────────────────────────────────────────────

server.registerTool(
  "execute_tests",
  {
    title: "Execute Approved Tests",
    description: `Executes the approved test suite against the live API (JSONPlaceholder).
Each test is run sequentially, assertions are evaluated, and results are collected.

Returns a pass/fail summary. Automatically detects schema drift if failures occur.
Call after the user has confirmed their selection in the test-review MCP App.`,
    inputSchema: {
      session_id: z.string()
        .optional()
        .describe("Session ID from parse_spec. Uses latest session if omitted."),
      approved_test_ids: z.array(z.string())
        .optional()
        .describe("Array of test IDs to run. Runs all enabled tests if omitted."),
      simulate_drift: z.boolean()
        .optional()
        .default(false)
        .describe("Set true to simulate schema drift on GET /pet/{petId} — demonstrates SelfHealingEngine."),
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,    // makes real HTTP calls
    },
  },
  async ({ session_id, approved_test_ids, simulate_drift }) => {
    const session = resolveSession(session_id);
    if (!session) {
      return {
        content: [{
          type: "text" as const,
          text: `❌ Session not found: ${session_id}. Run parse_spec first.`,
        }],
      };
    }

    if (session.generatedTests.length === 0) {
      return {
        content: [{
          type: "text" as const,
          text: "❌ No tests generated. Run generate_tests first.",
        }],
      };
    }

    // Filter to approved tests
    const testsToRun = approved_test_ids
      ? session.generatedTests.filter((t) => approved_test_ids.includes(t.id))
      : session.generatedTests.filter((t) => t.enabled);

    transitionState(session.id, "EXECUTING");

    // Find GET /pet/{petId} test for drift simulation
    const driftTargetTest = testsToRun.find(
      (t) => t.method === "GET" && t.path === "/pet/{petId}"
    );

    const mockResponse =
      simulate_drift && driftTargetTest
        ? {
            testId: driftTargetTest.id,
            body: DRIFTED_PET_RESPONSE,
            status: 200,
          }
        : undefined;

    const results = await executeTests(testsToRun, mockResponse);
    const passed = results.filter((r) => r.status === "passed").length;
    const failed = results.filter((r) => r.status === "failed").length;

    transitionState(session.id, "VALIDATING");
    latestSession = updateSession(session.id, {
      state: "VALIDATING",
      approvedTests: testsToRun,
      executionResults: results,
    });

    // Build result table
    const resultRows = results
      .map((r) => {
        const icon = r.status === "passed" ? "✅" : r.status === "failed" ? "❌" : "⏭️";
        const assertions = r.assertionResults.length > 0
          ? `${r.assertionResults.filter((a) => a.passed).length}/${r.assertionResults.length}`
          : "—";
        return `  ${icon} ${r.testName.padEnd(45)} ${String(r.responseStatusCode ?? "—").padEnd(6)} ${String(r.durationMs + "ms").padEnd(8)} ${assertions}`;
      })
      .join("\n");

    const driftNote = simulate_drift && failed > 0
      ? `\n⚠️  Schema drift detected on ${driftTargetTest?.endpoint ?? "GET /pet/{petId}"}!\n   Run 'detect_and_heal' to analyse and patch the failing assertion.`
      : "";

    return {
      content: [
        {
          type: "text" as const,
          text: [
            `📊 Execution Complete`,
            ``,
            `  Passed : ${passed}`,
            `  Failed : ${failed}`,
            `  Total  : ${results.length}`,
            ``,
            `Results:`,
            `  ${"TEST NAME".padEnd(45)} ${"STATUS".padEnd(6)} ${"TIME".padEnd(8)} ASSERTIONS`,
            `  ${"─".repeat(75)}`,
            resultRows,
            driftNote,
          ].join("\n"),
        },
      ],
    };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// TOOL 4: detect_and_heal
// Detects schema drift and renders the healing-diff MCP App
// ─────────────────────────────────────────────────────────────────────────────

server.registerTool(
  "detect_and_heal",
  {
    title: "Detect Drift & Generate Healing Patch",
    description: `Analyses execution failures to detect schema drift patterns.
For each drifted assertion, the SelfHealingEngine generates a proposed patch
with a confidence score and LLM-generated reasoning.

Renders the healing-diff MCP App showing a side-by-side diff of the original 
vs proposed assertion, with Approve/Reject buttons for human-in-the-loop review.

Requires execute_tests to have been run first with failures present.`,
    inputSchema: {
      session_id: z.string()
        .optional()
        .describe("Session ID. Uses latest session if omitted."),
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    // MCP Apps: links this tool to the healing-diff UI resource
    _meta: {
      ui: { resourceUri: `${URI_BASE}/healing-diff` },
    },
  },
  async ({ session_id }) => {
    const session = resolveSession(session_id);
    if (!session) {
      return {
        content: [{
          type: "text" as const,
          text: `❌ Session not found: ${session_id}. Run parse_spec first.`,
        }],
      };
    }

    if (session.executionResults.length === 0) {
      return {
        content: [{
          type: "text" as const,
          text: "❌ No execution results found. Run execute_tests first.",
        }],
      };
    }

    const failedResults = session.executionResults.filter((r) => r.status === "failed");
    if (failedResults.length === 0) {
      return {
        content: [{
          type: "text" as const,
          text: "✅ No failures detected — all tests passed. No healing required.",
        }],
      };
    }

    transitionState(session.id, "HEALING");

    // Detect drift events
    const driftEvents = detectDrift(session.approvedTests, session.executionResults);

    if (driftEvents.length === 0) {
      return {
        content: [{
          type: "text" as const,
          text: [
            `❌ ${failedResults.length} test(s) failed but no schema drift pattern detected.`,
            `The failures may be due to API unavailability or logic errors rather than schema changes.`,
            `State: FAILED`,
          ].join("\n"),
        }],
      };
    }

    // Generate healing patches (LLM-powered reasoning)
    const patches = await generateHealingPatches(session.approvedTests, driftEvents);

    latestSession = updateSession(session.id, { healingPatches: patches });

    const patchSummary = patches
      .map((p) =>
        `  ${p.severity.toUpperCase().padEnd(14)} ${p.field.padEnd(30)} ${Math.round(p.confidence * 100)}% confidence`
      )
      .join("\n");

    // Render the healing-diff MCP App for the first BREAKING patch
    // (In the full system, each patch gets its own review session)
    const primaryPatch = patches.find((p) => p.requiresHumanReview) ?? patches[0];

    return {
      content: [
        {
          type: "text" as const,
          text: [
            `🔧 Schema Drift Detected — Healing Patches Generated`,
            ``,
            `Drift events : ${driftEvents.length}`,
            `Patches      : ${patches.length}`,
            ``,
            `Patch summary:`,
            `  ${"SEVERITY".padEnd(14)} ${"FIELD".padEnd(30)} CONFIDENCE`,
            `  ${"─".repeat(58)}`,
            patchSummary,
            ``,
            `State: HEALING`,
            `⚠️  Human review required — the healing-diff interface is now open.`,
            `   Approve or reject the proposed assertion patch to continue.`,
          ].join("\n"),
        },
      ],
    };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// TOOL 5: get_status
// Returns current session state — useful during demo to check pipeline position
// ─────────────────────────────────────────────────────────────────────────────

server.registerTool(
  "get_status",
  {
    title: "Get Agent Session Status",
    description: `Returns the current state of the agent session including pipeline stage,
test counts, execution results summary, and any pending healing patches.
Use at any point to check where the pipeline is.`,
    inputSchema: {
      session_id: z.string()
        .optional()
        .describe("Session ID from parse_spec. Uses latest session if omitted."),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async ({ session_id }) => {
    const session = resolveSession(session_id);
    if (!session) {
      return {
        content: [{
          type: "text" as const,
          text: `❌ Session not found: ${session_id}. Run parse_spec first.`,
        }],
      };
    }

    const results = session.executionResults;
    const passed  = results.filter((r) => r.status === "passed").length;
    const failed  = results.filter((r) => r.status === "failed").length;

    const stateEmoji: Record<string, string> = {
      IDLE:              "💤",
      PARSING:           "📄",
      PLANNING:          "🧠",
      AWAITING_APPROVAL: "⏳",
      EXECUTING:         "⚡",
      VALIDATING:        "🔍",
      HEALING:           "🔧",
      REPORTING:         "📊",
      COMPLETE:          "✅",
      FAILED:            "❌",
    };

    const lines = [
      `${stateEmoji[session.state] ?? "❓"} Agent State: ${session.state}`,
      ``,
      `Session ID  : ${session.id}`,
      `Created     : ${session.createdAt}`,
      `Updated     : ${session.updatedAt}`,
      ``,
      `Pipeline:`,
      `  Spec loaded      : ${session.spec ? `✅ ${session.spec.title} (${session.spec.endpoints.length} endpoints)` : "❌ Not loaded"}`,
      `  Tests generated  : ${session.generatedTests.length > 0 ? `✅ ${session.generatedTests.length} tests` : "❌ None"}`,
      `  Tests approved   : ${session.approvedTests.length > 0 ? `✅ ${session.approvedTests.length} tests` : "—"}`,
      `  Executed         : ${results.length > 0 ? `✅ ${passed} passed / ${failed} failed` : "—"}`,
      `  Healing patches  : ${session.healingPatches.length > 0 ? `⚠️  ${session.healingPatches.length} pending review` : "—"}`,
    ];

    if (session.healingPatches.length > 0) {
      lines.push(``, `Pending patches:`);
      session.healingPatches.forEach((p) => {
        lines.push(`  ${p.severity.toUpperCase().padEnd(14)} ${p.field} — ${Math.round(p.confidence * 100)}% confidence`);
      });
    }

    if (failed > 0 && session.state === "VALIDATING") {
      lines.push(``, `⚠️  Next step: run 'detect_and_heal' to analyse failures`);
    }

    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
    };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// UI RESOURCE REGISTRATIONS (MCP Apps)
// ─────────────────────────────────────────────────────────────────────────────

// Resource 1: test-review — interactive test approval table
server.registerResource(
  "test-review",
  `${URI_BASE}/test-review`,
  {
    mimeType: MIME,
    description: "Interactive test case approval table with toggles and bulk actions",
    _meta: {
      ui: {
        csp: {
          connectDomains: [],   // self-contained — no external network calls
          resourceDomains: [],  // no external assets
        },
      },
    },
  },
  async (uri) => {
    const session = latestSession;
    const tests = session.generatedTests.length > 0
      ? session.generatedTests
      : [];

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: MIME,
          text: buildTestReviewHTML(tests, session.id),
        },
      ],
    };
  }
);

// Resource 2: healing-diff — side-by-side diff viewer for patch approval
server.registerResource(
  "healing-diff",
  `${URI_BASE}/healing-diff`,
  {
    mimeType: MIME,
    description: "Visual side-by-side diff viewer for self-healing patch approval",
    _meta: {
      ui: {
        csp: {
          connectDomains: [],   // self-contained — no external network calls
          resourceDomains: [],  // no external assets
        },
      },
    },
  },
  async (uri) => {
    const session = latestSession;
    const patch = session.healingPatches[0];

    if (!patch) {
      // Graceful fallback if no patch exists yet
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: MIME,
            text: `<!DOCTYPE html><html><body style="font-family:system-ui;padding:24px;background:#1e1e2e;color:#cdd6f4">
              <h3>No healing patches available</h3>
              <p style="color:#6c7086;margin-top:8px">Run detect_and_heal after executing tests with simulate_drift=true</p>
            </body></html>`,
          },
        ],
      };
    }

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: MIME,
          text: buildHealingDiffHTML(patch, session.id),
        },
      ],
    };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// SERVER STARTUP
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const app = createMcpExpressApp();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);

  app.post("/mcp", async (req, res) => {
    try {
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("Error handling MCP request:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error",
          },
          id: null,
        });
      }
    }
  });

  app.get("/mcp", (_req, res) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    });
  });

  app.delete("/mcp", (_req, res) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    });
  });

  const port = Number.parseInt(process.env.PORT || "8000", 10);
  const host = process.env.HOST || "0.0.0.0";

  app.listen(port, host, () => {
    console.error(`🚀 MCP server running at http://${host}:${port}`);
    console.error(`📡 MCP endpoint: http://${host}:${port}/mcp`);
    console.error("   Tools: parse_spec | generate_tests | execute_tests | detect_and_heal | get_status");
    console.error("   MCP Apps: test-review | healing-diff");
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
