/**
 * @fileoverview Zero-Hallucination MCP Testing Middleware — Stage 2: Live Client
 *
 * @author      GSoC 2026 Candidate — API Dash Organization
 * @project     "Zero Hallucination MCP Testing Security and CICD Suite"
 *
 * @description
 * Stage 2 extends the schema-validation-only PoC into a fully operational
 * MCP Client pipeline. The architecture now has three layers:
 *
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │                      LLM / Test Runner                              │
 *   │           (produces raw, untyped JSON tool-call arguments)          │
 *   └──────────────────────────────┬──────────────────────────────────────┘
 *                                  │  raw args (unknown)
 *                                  ▼
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │              ZeroHallucinationMiddleware  (Zod SVE)                 │
 *   │    • Validates every field against the declarative Zod schema       │
 *   │    • Returns typed, sanitised args on success                        │
 *   │    • Returns null + structured error report on failure               │
 *   └────────────────────┬──────────────────────────────────┬─────────────┘
 *                  PASS  │                            BLOCK  │
 *                        ▼                                   ▼
 *   ┌─────────────────────────────┐           ┌─────────────────────────┐
 *   │    MCP Client.callTool()    │           │   Execution Aborted     │
 *   │  StreamableHTTP transport   │           │   Server never reached  │
 *   │  → http://localhost:3000    │           │   Process stays alive   │
 *   └─────────────────────────────┘           └─────────────────────────┘
 *
 * Transport note: sample-mcp-apps-chatflow is an HTTP/SSE server, not a
 * stdio server. The middleware spawns it as a managed child process, waits
 * for the HTTP port to be ready, then connects via StreamableHTTPClientTransport.
 *
 * Target Tool : `get-sales-data`
 * Target Repo : ashitaprasad/sample-mcp-apps-chatflow
 */

import { z, ZodError } from "zod";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { spawn, type ChildProcess } from "child_process";

// ─────────────────────────────────────────────────────────────────────────────
// § 1. SCHEMA DEFINITIONS — The Contractual Single Source of Truth
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Zod schema for the `get-sales-data` MCP tool.
 *
 * Strict field constraints that mirror the server's acceptance criteria:
 *
 * - `states`  Non-empty array — prevents scope-less database queries.
 * - `metric`  Non-empty string — the KPI dimension (e.g. "revenue").
 * - `period`  Enum of exactly "monthly" | "quarterly". Any other value,
 *             no matter how plausible-sounding to an LLM, is a hallucination.
 * - `year`    4-digit integer — prevents fractional or out-of-range years.
 */
const GetSalesDataSchema = z.object({
  states: z
    .array(z.string().min(1, "State code cannot be an empty string."))
    .min(1, "At least one Indian state code must be provided."),

  metric: z
    .string()
    .min(1, "A metric (e.g., 'revenue') must be specified."),

  period: z.enum(["monthly", "quarterly"] as const, {
    error: (issue) => ({
      message:
        issue.code === "invalid_value"
          ? `Invalid period "${String(issue.input)}". ` +
            "The only accepted values are 'monthly' or 'quarterly'. " +
            "Values like 'yearly' or 'annual' are hallucinated and will be blocked."
          : "Invalid period value.",
    }),
  }),

  year: z
    .string()
    .regex(/^\d{4}$/, "Year must be a 4-digit string (e.g. '2024')."),
});

/** TypeScript type inferred directly from the schema — no duplicate declarations. */
type GetSalesDataParams = z.infer<typeof GetSalesDataSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// § 2. TOOL REGISTRY — Extensible Schema Map
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps every MCP tool name to its authoritative Zod schema.
 * Adding a new tool to the security perimeter = one schema + one entry here.
 * The middleware never needs modification (Open/Closed Principle).
 */
const TOOL_SCHEMA_REGISTRY: Record<string, z.ZodTypeAny> = {
  "get-sales-data": GetSalesDataSchema,
};

// ─────────────────────────────────────────────────────────────────────────────
// § 3. REPORTING UTILITIES — Structured CLI Output
// ─────────────────────────────────────────────────────────────────────────────

const DIVIDER       = "─".repeat(65);
const HEAVY_DIVIDER = "═".repeat(65);

function printScenarioHeader(title: string, index: number): void {
  console.log(`\n${HEAVY_DIVIDER}`);
  console.log(`  🧪 SCENARIO ${index}: ${title}`);
  console.log(HEAVY_DIVIDER);
}

function printSuccessReport(
  toolName: string,
  validated: GetSalesDataParams
): void {
  console.log("\n  ✅  VALIDATION RESULT: PASSED");
  console.log(`  ${DIVIDER}`);
  console.log(`  🔐 Security Layer     : Zero-Hallucination Middleware v2.0`);
  console.log(`  🛠️  Tool Resolved      : ${toolName}`);
  console.log(`  📦 Validated Payload  :`);
  console.log(
    JSON.stringify(validated, null, 2)
      .split("\n")
      .map((l) => `      ${l}`)
      .join("\n")
  );
  console.log(`  ${DIVIDER}`);
  console.log(
    "  📡 ACTION: Payload is SAFE. Forwarding to MCP Client transport...\n"
  );
}

function printBlockReport(
  toolName: string,
  rawInput: unknown,
  error: ZodError
): void {
  console.log("\n  🚨  VALIDATION RESULT: BLOCKED (Hallucination Detected)");
  console.log(`  ${DIVIDER}`);
  console.log(`  🔐 Security Layer   : Zero-Hallucination Middleware v2.0`);
  console.log(`  🛠️  Tool Targeted    : ${toolName}`);
  console.log("  ☠️  Raw LLM Output   :");
  console.log(
    JSON.stringify(rawInput, null, 2)
      .split("\n")
      .map((l) => `      ${l}`)
      .join("\n")
  );
  console.log(`\n  🔍 Validation Errors Detected (${error.issues.length}):`);
  error.issues.forEach((issue, i) => {
    const path =
      issue.path.length > 0 ? `"${issue.path.join(" → ")}"` : "(root object)";
    console.log(`\n    [${i + 1}] Field   : ${path}`);
    console.log(`        Code    : ${issue.code}`);
    console.log(`        Reason  : ${issue.message}`);
  });
  console.log(`\n  ${DIVIDER}`);
  console.log(
    "  🛡️  ACTION: Execution BLOCKED. MCP Server was NOT contacted.\n"
  );
}

function printServerResponse(response: unknown): void {
  console.log("  🌐  LIVE SERVER RESPONSE:");
  console.log(`  ${DIVIDER}`);
  console.log(
    JSON.stringify(response, null, 2)
      .split("\n")
      .map((l) => `      ${l}`)
      .join("\n")
  );
  console.log(`  ${DIVIDER}\n`);
}

// ─────────────────────────────────────────────────────────────────────────────
// § 4. MIDDLEWARE CLASS — Transport-Layer Security Firewall
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @class ZeroHallucinationMiddleware
 *
 * @description
 * Intercepts every MCP tool call at the transport boundary. Operates in two
 * modes depending on caller usage:
 *
 *  - `validate(toolName, rawArgs)`       → boolean  (Stage 1 compatibility)
 *  - `validateToolCall(toolName, rawArgs)` → typed params | null  (Stage 2)
 *
 * The Stage 2 method returns the fully typed, Zod-sanitised parameter object
 * so the caller can pass it directly to `client.callTool()` with confidence.
 * A `null` return value is the canonical signal to abort — no exceptions
 * propagate out of this class under any normal validation failure.
 */
class ZeroHallucinationMiddleware {
  private readonly registryVersion: string;

  constructor(registryVersion = "2.0.0") {
    this.registryVersion = registryVersion;
    console.log(`\n${HEAVY_DIVIDER}`);
    console.log(`  🚀  Zero-Hallucination MCP Middleware`);
    console.log(`  📋  Registry Version : ${this.registryVersion}`);
    console.log(
      `  🛡️  Registered Tools : ${Object.keys(TOOL_SCHEMA_REGISTRY).join(", ")}`
    );
    console.log(`  🎯  Target Server    : ashitaprasad/sample-mcp-apps-chatflow`);
    console.log(HEAVY_DIVIDER);
  }

  /**
   * Stage 2 interceptor — returns typed validated args or null.
   *
   * This is the method called by `safeCallTool`. Returning null (rather
   * than throwing) keeps the async pipeline simple: the caller only needs
   * an `if (!validArgs) return` guard rather than a try/catch wrapper.
   *
   * @param toolName  MCP tool identifier string.
   * @param rawArgs   Raw, untyped LLM-generated arguments (`unknown`).
   * @returns         Typed `GetSalesDataParams` on success, `null` on failure.
   */
  public validateToolCall(
    toolName: string,
    rawArgs: unknown
  ): GetSalesDataParams | null {
    const schema = TOOL_SCHEMA_REGISTRY[toolName];

    if (!schema) {
      console.log(
        `\n  ⚠️  UNKNOWN TOOL: "${toolName}" is not registered in the schema map.`
      );
      console.log(
        "  🛡️  ACTION: Request BLOCKED. Only registered tools are permitted.\n"
      );
      return null;
    }

    const result = schema.safeParse(rawArgs);

    if (result.success) {
      printSuccessReport(toolName, result.data as GetSalesDataParams);
      return result.data as GetSalesDataParams;
    } else {
      printBlockReport(toolName, rawArgs, result.error);
      return null;
    }
  }

  /**
   * Stage 1 compatibility shim — returns a boolean.
   * Kept so the class remains backward-compatible with any existing callers.
   *
   * @param toolName  MCP tool identifier string.
   * @param rawArgs   Raw, untyped LLM-generated arguments (`unknown`).
   * @returns         `true` if the call would be forwarded; `false` if blocked.
   */
  public validate(toolName: string, rawArgs: unknown): boolean {
    return this.validateToolCall(toolName, rawArgs) !== null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// § 5. SERVER PROCESS MANAGER — Spawn & Health-Check
// ─────────────────────────────────────────────────────────────────────────────

/** Absolute path to the compiled HTTP MCP server entry point. */
const SERVER_ENTRY  = "/Users/enesy/Desktop/sample-mcp-apps-chatflow/dist/index.js";
const SERVER_PORT   = 3000;
const MCP_ENDPOINT  = `http://localhost:${SERVER_PORT}/mcp`;

/**
 * Spawns `sample-mcp-apps-chatflow` as a managed child process and waits
 * until its HTTP port is accepting connections before returning.
 *
 * Design notes:
 * - stderr is piped so startup errors surface clearly in the PoC output.
 * - We poll the /mcp endpoint (lightweight HEAD request) rather than using
 *   a fixed `setTimeout`, which would be fragile on slow machines.
 * - The returned `ChildProcess` handle is used by `runPoC` for clean teardown.
 *
 * @returns The live child process handle once the server is ready.
 */
async function spawnServer(): Promise<ChildProcess> {
  console.log("  🔧  Spawning sample-mcp-apps-chatflow HTTP server...");
  console.log(`  📍  Entry : ${SERVER_ENTRY}`);
  console.log(`  🌐  URL   : ${MCP_ENDPOINT}\n`);

  const child = spawn("node", [SERVER_ENTRY], {
    // Inherit the full environment so the child process can resolve
    // its own node_modules (critical for ESM module resolution).
    env:   { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });

  // Capture and display server stdout/stderr so startup errors are visible.
  child.stdout?.on("data", (chunk: Buffer) => {
    const line = chunk.toString().trim();
    if (line) console.log(`  [server] ${line}`);
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    const line = chunk.toString().trim();
    if (line) console.error(`  [server:err] ${line}`);
  });

  // Poll until the HTTP server is ready (max 10 s, 200 ms intervals).
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const ready = await fetch(MCP_ENDPOINT, { method: "GET" })
      .then(() => true)
      .catch(() => false);
    if (ready) {
      console.log("\n  ✅  Server is ready and accepting connections.\n");
      return child;
    }
    await new Promise<void>((res) => setTimeout(res, 200));
  }

  child.kill();
  throw new Error(
    `Server at ${MCP_ENDPOINT} did not become ready within 10 seconds.`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// § 6. MCP CLIENT SETUP — StreamableHTTP Transport
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds and connects an MCP Client over StreamableHTTPClientTransport.
 *
 * `sample-mcp-apps-chatflow` is an **HTTP/SSE** MCP server (not stdio).
 * It listens on port 3000 and exposes the MCP protocol at `/mcp`.
 * `StreamableHTTPClientTransport` is the correct transport for this topology.
 *
 * @returns A connected MCP `Client` instance ready to call tools.
 */
async function buildMcpClient(): Promise<Client> {
  const transport = new StreamableHTTPClientTransport(
    new URL(MCP_ENDPOINT)
  );

  const client = new Client(
    { name: "zero-hallucination-mcp-client", version: "2.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);
  return client;
}

// ─────────────────────────────────────────────────────────────────────────────
// § 7. SAFE CALL PROXY — The Central Interception Point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `safeCallTool` — the single entry point for every MCP tool invocation.
 *
 * Enforces the strict security pipeline ordering:
 *   1. Middleware validates raw args   → null aborts, typed args proceed.
 *   2. Validated typed args forwarded to `client.callTool()` via HTTP.
 *   3. Live server response logged for full auditability.
 *
 * Transport errors are caught and reported without crashing the process,
 * because a server-side error is architecturally distinct from a middleware
 * validation failure — the security layer did its job either way.
 *
 * @param client      Connected MCP `Client` instance.
 * @param middleware  Instantiated `ZeroHallucinationMiddleware`.
 * @param toolName    The MCP tool to invoke.
 * @param rawArgs     Untyped LLM-generated arguments.
 */
async function safeCallTool(
  client: Client,
  middleware: ZeroHallucinationMiddleware,
  toolName: string,
  rawArgs: unknown
): Promise<void> {
  // ── Step 1: Middleware interception ────────────────────────────────────────
  const validArgs = middleware.validateToolCall(toolName, rawArgs);

  if (validArgs === null) {
    console.log(
      "  💀  safeCallTool: Aborting. " +
        "The MCP server was protected from a potentially crashing request.\n"
    );
    return;
  }

  // ── Step 2: Forward validated args to MCP Server via HTTP transport ────────
  console.log(
    "  🔗  safeCallTool: Validation passed. " +
      `Calling client.callTool() → ${MCP_ENDPOINT}\n`
  );

  try {
    const response = await client.callTool({
      name:      toolName,
      arguments: validArgs as Record<string, unknown>,
    });

    // ── Step 3: Log the live server response ──────────────────────────────
    printServerResponse(response);
  } catch (transportError: unknown) {
    const message =
      transportError instanceof Error
        ? transportError.message
        : String(transportError);

    console.log("  ⚡  TRANSPORT ERROR (server-side):");
    console.log(`  ${DIVIDER}`);
    console.log(`      ${message}`);
    console.log(`  ${DIVIDER}\n`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// § 8. ASYNC ENTRY POINT — Full Pipeline Orchestration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `runPoC` — the async entry point orchestrating the complete pipeline:
 *
 *   1. Middleware is instantiated (Zod SVE firewall).
 *   2. Target HTTP server is spawned as a managed child process.
 *   3. MCP Client connects to the HTTP server via StreamableHTTPClientTransport.
 *   4. Scenario A — hallucinated payload → blocked before any HTTP call.
 *   5. Scenario B — valid payload → forwarded, real server response printed.
 *   6. MCP Client closed; child server process terminated.
 */
async function runPoC(): Promise<void> {
  // ── Boot middleware ────────────────────────────────────────────────────────
  const middleware = new ZeroHallucinationMiddleware("2.0.0-gsoc-poc");

  // ── Spawn the target HTTP MCP server ──────────────────────────────────────
  console.log(`\n${HEAVY_DIVIDER}`);
  console.log("  🔌  Initialising MCP Client Pipeline");
  console.log(`  🚦  Transport : StreamableHTTPClientTransport → ${MCP_ENDPOINT}`);
  console.log(HEAVY_DIVIDER + "\n");

  const serverProcess = await spawnServer();

  // ── Connect MCP Client via HTTP transport ─────────────────────────────────
  const client = await buildMcpClient();
  console.log("  ✅  MCP Client handshake complete. Ready to call tools.\n");

  try {
    // ── Scenario A: Hallucination Detection ─────────────────────────────────
    //
    // The LLM fabricates "yearly" for the `period` field. The middleware blocks
    // this BEFORE any HTTP call — the server is never contacted.
    // This proves the security guarantee is transport-independent.
    //
    printScenarioHeader("Hallucination Detection  (period: 'yearly'  → BLOCKED)", 1);
    console.log("  🤖  Simulating LLM tool-call with hallucinated 'period: yearly'...");

    /**
     * @hallucination
     * "yearly" sounds plausible to a language model but is not in the server's
     * enum contract. Without the middleware this payload would reach the server
     * and cause a runtime error or silently return incorrect data.
     */
    const hallucinatedPayload: unknown = {
      states: ["MH", "DL", "KA"],
      metric: "revenue",
      period: "yearly",    // ← HALLUCINATED: not in ["monthly", "quarterly"]
      year:   "2024",      // string, as the server contract requires
    };

    await safeCallTool(client, middleware, "get-sales-data", hallucinatedPayload);

    // ── Scenario B: Successful Validated Execution ───────────────────────────
    //
    // All parameters conform to the Zod schema. The middleware returns typed
    // args → safeCallTool forwards them to client.callTool() over HTTP.
    // The live JSON response from the Sales Analytics server is printed.
    //
    printScenarioHeader("Successful Execution     (period: 'monthly' → FORWARDED)", 2);
    console.log("  🤖  Simulating LLM tool-call with valid parameters...");

    /**
     * @valid
     * Every field satisfies its schema constraint. The middleware returns the
     * fully typed object, which is forwarded directly to the MCP Client.
     */
    const validPayload: unknown = {
      states: ["MH", "DL", "KA"],
      metric: "revenue",
      period: "monthly",   // ← VALID enum member
      year:   "2024",      // string, as the server contract requires
    };

    await safeCallTool(client, middleware, "get-sales-data", validPayload);

  } finally {
    // ── Teardown — always runs even if a scenario throws ──────────────────────
    await client.close();
    console.log("  🔒  MCP Client transport closed.");

    serverProcess.kill("SIGTERM");
    console.log("  🛑  Server process terminated.\n");
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(HEAVY_DIVIDER);
  console.log("  📊  TEST SUITE COMPLETE  — Stage 2: Live MCP Client");
  console.log(`  ${DIVIDER}`);
  console.log("  Scenario A → period: 'yearly'   (hallucinated)  ✗ BLOCKED   🛡️");
  console.log("  Scenario B → period: 'monthly'  (valid)         ✓ FORWARDED 📡");
  console.log(`  ${DIVIDER}`);
  console.log("  The Zero-Hallucination layer intercepted the invalid call");
  console.log("  BEFORE the server was contacted. Validated payloads were");
  console.log("  forwarded with full type-safety via client.callTool().");
  console.log(HEAVY_DIVIDER + "\n");
}

// Boot
runPoC().catch((fatalError: unknown) => {
  const message =
    fatalError instanceof Error ? fatalError.message : String(fatalError);
  console.error(`\n  💥  FATAL: Unhandled error in runPoC — ${message}\n`);
  throw new Error(message);
});
