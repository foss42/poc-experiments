# Zero-Hallucination MCP Middleware — GSoC 2026 PoC

> **Google Summer of Code 2026 · API Dash Organization**  
> **Project:** Zero Hallucination MCP Testing Security and CICD Suite  
> **Author:** Mustafa Enes Kayaci  
> **Target Server:** [`ashitaprasad/sample-mcp-apps-chatflow`](https://github.com/ashitaprasad/sample-mcp-apps-chatflow)

---

## The Problem: "Vibe Testing"

The current state of MCP developer tooling treats testing as a **manual, visual exercise**. A developer calls a tool, looks at the output, and decides whether it looks right. This approach — informally known as *vibe testing* — has a critical security gap:

> **Large Language Models are non-deterministic.** They can and do fabricate parameter values that are plausible-sounding but contractually invalid — a phenomenon known as *hallucination*. Under vibe testing, these hallucinated values propagate silently through the transport layer, reaching the MCP server where they cause runtime crashes, silent data corruption, or unpredictable behavior.

Common examples of LLM hallucinations in MCP tool calls:

| Parameter | Server Contract | LLM Hallucination |
|---|---|---|
| `period` | `"monthly" \| "quarterly"` | `"yearly"`, `"annual"`, `"weekly"` |
| `year` | `"2024"` (string) | `2024` (number), `"24"`, `"FY2024"` |
| `states` | Non-empty `string[]` | `[]`, `null`, `undefined` |

No amount of prompt engineering reliably eliminates this class of failure. **It must be enforced programmatically at the transport boundary.**

---

## The Solution: Zero-Hallucination Middleware

This PoC implements a **transport-layer security firewall** for the Model Context Protocol using [Zod](https://zod.dev) as a **Schema Validation Engine (SVE)**. Every tool call is intercepted and validated against a strict, declarative schema *before* any network communication with the MCP server occurs.

```
LLM Output (raw JSON, unknown)
         │
         ▼
┌─────────────────────────────────────────────────┐
│         ZeroHallucinationMiddleware              │
│         Zod Schema Validation Engine (SVE)       │
│                                                  │
│  ✓ Validates every parameter against schema      │
│  ✓ Returns fully typed, sanitised args on pass   │
│  ✗ Returns null + structured error on failure    │
└──────────────┬──────────────────────┬────────────┘
          PASS │                BLOCK │
               ▼                     ▼
 ┌─────────────────────┐   ┌───────────────────────┐
 │  MCP Client         │   │  Execution Aborted     │
 │  StreamableHTTP     │   │  Server never reached  │
 │  → localhost:3000   │   │  Process stays alive   │
 └─────────────────────┘   └───────────────────────┘
```

**Key guarantees enforced by this architecture:**

- **No Partial Execution** — An invalid payload is rejected entirely. No partial data reaches the server.
- **Fail-Safe by Default** — On validation failure, the process continues cleanly. Errors are reported and contained, never silently swallowed.
- **Schema-Driven Authority** — The Zod schema is the sole contractual authority. The middleware never needs modification to add a new tool — only a schema and a one-line registry entry.
- **Transport-Independent Security** — The hallucination block fires *before* any HTTP connection is attempted. The MCP server is provably protected even if it is unreachable.
- **Full Auditability** — Every blocked call is logged with the raw LLM input, the failing field paths, the Zod error codes, and the human-readable rejection reasons.

---

## Architecture

### Technology Stack

| Component | Technology |
|---|---|
| Language | TypeScript (strict mode) |
| Schema Validation Engine | [Zod v4](https://zod.dev) |
| MCP Client | `@modelcontextprotocol/sdk` |
| Transport | `StreamableHTTPClientTransport` |
| Runtime | Node.js + `ts-node` |

### Key Design Decisions

**`StreamableHTTPClientTransport` over `StdioClientTransport`**  
`sample-mcp-apps-chatflow` is an HTTP/Express MCP server exposing its endpoint at `http://localhost:3000/mcp`. The middleware uses `StreamableHTTPClientTransport` — the correct transport for this topology — rather than the stdio variant, which is designed for locally-spawned process communication.

**`validateToolCall()` returns `T | null`, not `boolean`**  
Returning the fully typed, Zod-sanitised parameter object allows `safeCallTool` to pass it directly to `client.callTool()` with zero unsafe type casting. A `null` return is the canonical abort signal — no try/catch wrappers needed at the call site.

**Managed child process lifecycle**  
The middleware spawns the target server as a managed child process, polls its `/mcp` endpoint until it is ready, connects the MCP Client, runs both scenarios, then tears down both the client and the server process in a `try/finally` block — guaranteeing clean cleanup even on unexpected errors.

### File Structure

```
project_mustafa_enes/
├── src/
│   └── index.ts          # Complete middleware + MCP client pipeline
├── package.json
├── tsconfig.json
└── README.md
```

---

## Prerequisites

**1. Clone and build the target MCP server:**

```bash
git clone https://github.com/ashitaprasad/sample-mcp-apps-chatflow.git \
  ~/Desktop/sample-mcp-apps-chatflow

cd ~/Desktop/sample-mcp-apps-chatflow
npm install
npm run build
```

> The build output will be at `dist/index.js`. The middleware spawns this binary automatically — **you do not need to start the server manually.**

**2. Verify the path in `src/index.ts`:**

```typescript
// § 5 — SERVER PROCESS MANAGER
const SERVER_ENTRY = "/Users/enesy/Desktop/sample-mcp-apps-chatflow/dist/index.js";
```

Update this constant to match the absolute path on your machine if it differs.

---

## How to Run

```bash
# 1. Install PoC dependencies
cd /path/to/project_mustafa_enes
npm install

# 2. Launch the full demonstration
npx ts-node src/index.ts
```

The middleware will:
1. Boot the Zod Schema Validation Engine
2. Spawn the target HTTP MCP server as a child process
3. Wait until the server is ready at `http://localhost:3000/mcp`
4. Connect the MCP Client via `StreamableHTTPClientTransport`
5. Execute Scenario A (hallucination → blocked)
6. Execute Scenario B (valid payload → live server response)
7. Close the client and terminate the server process cleanly

---

## Expected Output

### Middleware Boot

```
═════════════════════════════════════════════════════════════════
  🚀  Zero-Hallucination MCP Middleware
  📋  Registry Version : 2.0.0-gsoc-poc
  🛡️  Registered Tools : get-sales-data
  🎯  Target Server    : ashitaprasad/sample-mcp-apps-chatflow
═════════════════════════════════════════════════════════════════
```

---

### Scenario A — Hallucination Detected and Blocked ✗

**Input:** An LLM fabricates `"yearly"` for the `period` field.

```json
{
  "states": ["MH", "DL", "KA"],
  "metric": "revenue",
  "period": "yearly",
  "year": "2024"
}
```

**Result:** The middleware intercepts the call. The MCP server is **never contacted.**

```
🚨  VALIDATION RESULT: BLOCKED (Hallucination Detected)
────────────────────────────────────────────────────────────
🔍 Validation Errors Detected (1):

  [1] Field   : "period"
      Code    : invalid_value
      Reason  : Invalid period "yearly". The only accepted values are
                'monthly' or 'quarterly'. Values like 'yearly' or
                'annual' are hallucinated and will be blocked.

🛡️  ACTION: Execution BLOCKED. MCP Server was NOT contacted.
💀  safeCallTool: Aborting. The MCP server was protected from a
    potentially crashing request.
```

---

### Scenario B — Valid Payload Forwarded, Live Data Returned ✓

**Input:** All parameters conform to the schema.

```json
{
  "states": ["MH", "DL", "KA"],
  "metric": "revenue",
  "period": "monthly",
  "year": "2024"
}
```

**Result:** Validated args are forwarded to `client.callTool()`. The server returns real revenue data.

```
✅  VALIDATION RESULT: PASSED
📡  ACTION: Payload is SAFE. Forwarding to MCP Client transport...
🔗  safeCallTool: Calling client.callTool() → http://localhost:3000/mcp

🌐  LIVE SERVER RESPONSE:
────────────────────────────────────────────────────────────
  "summary": {
    "total": "₹1,336,144",
    "average": "₹111,345",
    "trend": "↓ 31.4%"
  },
  "topState": {
    "name": "Karnataka",
    "code": "KA",
    "value": "₹470,986",
    "percentage": "35.2"
  },
  "periods": [
    { "period": "Jan 2024", "total": "₹102,565", ... },
    { "period": "Feb 2024", "total": "₹131,960", ... },
    ...
    { "period": "Dec 2024", "total": "₹94,086",  ... }
  ]
```

---

## Summary

```
═════════════════════════════════════════════════════════════════
  📊  TEST SUITE COMPLETE  — Stage 2: Live MCP Client
  ─────────────────────────────────────────────────────────────
  Scenario A → period: 'yearly'   (hallucinated)  ✗ BLOCKED   🛡️
  Scenario B → period: 'monthly'  (valid)         ✓ FORWARDED 📡
  ─────────────────────────────────────────────────────────────
  The Zero-Hallucination layer intercepted the invalid call
  BEFORE the server was contacted. Validated payloads were
  forwarded with full type-safety via client.callTool().
═════════════════════════════════════════════════════════════════
```

---

## Extending the Middleware

Adding a new tool to the security perimeter requires **zero changes to the middleware class**. Only two additions are needed:

```typescript
// 1. Define the schema
const GetInventorySchema = z.object({
  sku:      z.string().min(1),
  warehouse: z.enum(["north", "south", "east", "west"] as const),
  quantity:  z.number().int().positive(),
});

// 2. Register it
const TOOL_SCHEMA_REGISTRY = {
  "get-sales-data":   GetSalesDataSchema,
  "get-inventory":    GetInventorySchema,  // ← one line
};
```

The `safeCallTool` proxy and all CLI reporting pick up the new tool automatically.

---

## Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.29.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@types/node": "^25.5.2",
    "ts-node": "^10.9.2",
    "typescript": "^6.0.2"
  }
}
```

---

## License

MIT — Created for GSoC 2026 · API Dash Organization
