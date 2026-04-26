#!/usr/bin/env npx tsx
// Generates asciinema .cast file for mcp-conformance v0.3.0
// Shows 32 tests (19 core + 13 MCP Apps) against Sales Analytics server

const COLS = 110;
const ROWS = 42;

interface Event {
  time: number;
  type: "o";
  data: string;
}

const events: Event[] = [];
let cursor = 0;

const ESC = "\u001b";
const BOLD = `${ESC}[1m`;
const DIM = `${ESC}[2m`;
const RESET = `${ESC}[0m`;
const GREEN = `${ESC}[32m`;
const CYAN = `${ESC}[36m`;
const YELLOW = `${ESC}[33m`;
const CLEAR = `${ESC}[2J${ESC}[H`;

function emit(t: number, data: string) {
  events.push({ time: t, type: "o", data });
  cursor = t;
}

function nl(t: number) { emit(t, "\r\n"); }

function typeCmd(startTime: number, text: string, charDelay = 0.04): number {
  let t = startTime;
  emit(t, "$ ");
  t += 0.1;
  for (const ch of text) {
    emit(t, ch);
    t += charDelay;
  }
  emit(t, "\r\n");
  return t + 0.3;
}

function printLine(t: number, text: string, delay = 0): number {
  emit(t + delay, text + "\r\n");
  return t + delay;
}

function pass(t: number, name: string, ms: string, delay = 0.12): number {
  t += delay;
  emit(t, `  ${GREEN}✓${RESET} ${name} ${DIM}(${ms})${RESET}`); nl(t += 0.01);
  return t;
}

function category(t: number, name: string, delay = 0.2): number {
  nl(t += delay);
  t += delay;
  emit(t, `${BOLD}${name}${RESET}`); nl(t += 0.01);
  return t;
}

// ─── SCENE 1: Title ───
let t = 0;
emit(t, CLEAR);
t = 0.3;
emit(t, `${CYAN}${BOLD}mcp-conformance${RESET} ${DIM}v0.3.0${RESET}`); nl(t += 0.01);
nl(t += 0.5);
emit(t += 0.3, `${DIM}Transport-agnostic conformance testing for MCP servers${RESET}`); nl(t += 0.01);
emit(t += 0.2, `${DIM}32 tests | stdio + Streamable HTTP | MCP Apps coverage${RESET}`); nl(t += 0.01);
emit(t += 0.2, `${DIM}GSoC 2026 — API Dash | Vinícius Melo${RESET}`); nl(t += 0.01);
t += 2.5;

// ─── SCENE 2: Run against Sales Analytics via HTTP ───
nl(t);
emit(t += 0.3, `${YELLOW}${BOLD}▸ Test 1:${RESET} ${DIM}Sales Analytics MCP Apps server (Streamable HTTP)${RESET}`); nl(t += 0.01);
emit(t += 0.2, `${DIM}github.com/ashitaprasad/sample-mcp-apps-chatflow — 4 tools, 3 UI resources${RESET}`); nl(t += 0.01);
nl(t += 0.3);
t = typeCmd(t + 0.5, './node_modules/.bin/tsx src/cli.ts --transport http --url http://localhost:3000/mcp', 0.03);
t += 0.8;

emit(t, `${CYAN}${BOLD}mcp-conformance${RESET} ${DIM}v0.3.0${RESET}`); nl(t += 0.01);
emit(t += 0.1, `${DIM}Transport: http | Target: http://localhost:3000/mcp${RESET}`); nl(t += 0.01);
emit(t += 0.05, `${DIM}Suite: all${RESET}`); nl(t += 0.01);
nl(t += 0.3);
emit(t += 0.2, `${YELLOW}▸ Running core conformance suite${RESET}`); nl(t += 0.01);
nl(t += 0.2);
emit(t += 0.2, `${YELLOW}▸ Running MCP Apps suite${RESET}`); nl(t += 0.01);

// Protocol
t = category(t, "Protocol", 0.3);
t = pass(t, "initialize returns valid result", "6ms", 0.15);
t = pass(t, "server reports protocol version", "1ms");
t = pass(t, "server reports name and version", "4ms");
t = pass(t, "capabilities is an object", "1ms");

// Discovery
t = category(t, "Discovery");
t = pass(t, "tools/list returns valid array", "2ms");

// Schema
t = category(t, "Schema");
t = pass(t, "all tools have name and description", "0ms");
t = pass(t, "all tools have valid inputSchema", "0ms");

// Execution
t = category(t, "Execution");
t = pass(t, "tools/call with valid params succeeds", "2ms");
t = pass(t, "tools/call with unknown tool returns error", "1ms");
t = pass(t, "tool result contains typed content", "1ms");
t = pass(t, "tools/call to each discovered tool succeeds", "3ms");
t = pass(t, "tool content items have text field", "1ms");

// Edge Cases
t = category(t, "Edge Cases");
t = pass(t, "unknown method returns error code", "0ms", 0.1);
t = pass(t, "duplicate initialize is idempotent", "1ms", 0.1);
t = pass(t, "concurrent tool calls resolve independently", "1ms", 0.1);
t = pass(t, "tools/call with extra params does not crash", "1ms", 0.1);
t = pass(t, "tools/call with empty arguments object", "0ms", 0.1);
t = pass(t, "JSON-RPC response has correct version field", "0ms", 0.1);
t = pass(t, "error response includes message field", "0ms", 0.1);

// MCP Apps
t = category(t, "MCP Apps");
t = pass(t, "get-sales-data returns structuredContent", "1ms");
t = pass(t, "structuredContent contains valid report structure", "1ms");

// MCP Apps: Resources
t = category(t, "MCP Apps: Resources");
t = pass(t, "resources/list exposes MCP Apps UI resources", "0ms");
t = pass(t, "UI resources use mcp-app MIME type", "0ms");
t = pass(t, "UI resources use ui:// URI scheme", "0ms");
t = pass(t, "resources/read returns HTML content for UI resources", "3ms");
t = pass(t, "UI resources with CSP declare resourceDomains", "1ms");

// MCP Apps: Metadata
t = category(t, "MCP Apps: Metadata");
t = pass(t, "tools declare UI resource bindings via _meta", "1ms");
t = pass(t, "tools declare visibility levels", "1ms");

// MCP Apps: Tools
t = category(t, "MCP Apps: Tools");
t = pass(t, "visualize-sales-data returns chart structuredContent", "1ms");
t = pass(t, "show-sales-pdf-report returns PDF base64", "31ms");

// MCP Apps: Workflow
t = category(t, "MCP Apps: Workflow");
t = pass(t, "tool workflow: select → fetch data pipeline", "1ms");
t = pass(t, "full pipeline: select → data → visualize → PDF", "29ms");

nl(t += 0.3);
t += 0.4;
emit(t, `${GREEN}${BOLD}32 passed${RESET} ${DIM}(0.1s)${RESET}`); nl(t += 0.01);
t += 3;

// ─── SCENE 3: Run core via stdio (regression) ───
nl(t);
emit(t += 0.3, `${YELLOW}${BOLD}▸ Test 2:${RESET} ${DIM}Local test fixture via stdio (regression check)${RESET}`); nl(t += 0.01);
nl(t += 0.3);
t = typeCmd(t + 0.3, './node_modules/.bin/tsx src/cli.ts --server "./node_modules/.bin/tsx fixtures/test-server.ts" --suite core', 0.025);
t += 0.8;

emit(t, `${CYAN}${BOLD}mcp-conformance${RESET} ${DIM}v0.3.0${RESET}`); nl(t += 0.01);
emit(t += 0.1, `${DIM}Transport: stdio | Target: ./node_modules/.bin/tsx fixtures/test-server.ts${RESET}`); nl(t += 0.01);
emit(t += 0.05, `${DIM}Suite: core${RESET}`); nl(t += 0.01);
nl(t += 0.3);
emit(t += 0.2, `${YELLOW}▸ Running core conformance suite${RESET}`); nl(t += 0.01);

t = category(t, "Protocol", 0.3);
t = pass(t, "initialize returns valid result", "174ms", 0.1);
t = pass(t, "server reports protocol version", "0ms", 0.08);
t = pass(t, "server reports name and version", "0ms", 0.08);
t = pass(t, "capabilities is an object", "0ms", 0.08);

t = category(t, "Discovery", 0.15);
t = pass(t, "tools/list returns valid array", "0ms", 0.08);

t = category(t, "Schema", 0.15);
t = pass(t, "all tools have name and description", "0ms", 0.08);
t = pass(t, "all tools have valid inputSchema", "0ms", 0.08);

t = category(t, "Execution", 0.15);
t = pass(t, "tools/call with valid params succeeds", "0ms", 0.08);
t = pass(t, "tools/call with unknown tool returns error", "0ms", 0.08);
t = pass(t, "tool result contains typed content", "0ms", 0.08);
t = pass(t, "tools/call to each discovered tool succeeds", "0ms", 0.08);
t = pass(t, "tool content items have text field", "0ms", 0.08);

t = category(t, "Edge Cases", 0.15);
const edgeTests = [
  "unknown method returns error code",
  "duplicate initialize is idempotent",
  "concurrent tool calls resolve independently",
  "tools/call with extra params does not crash",
  "tools/call with empty arguments object",
  "JSON-RPC response has correct version field",
  "error response includes message field",
];
for (const name of edgeTests) {
  t = pass(t, name, "0ms", 0.07);
}

nl(t += 0.3);
t += 0.4;
emit(t, `${GREEN}${BOLD}19 passed${RESET} ${DIM}(0.2s)${RESET}`); nl(t += 0.01);
t += 2.5;

// ─── SCENE 4: Closing ───
nl(t);
emit(t += 0.5, `${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`); nl(t += 0.01);
emit(t += 0.3, `${CYAN}  32 tests${RESET}  ${DIM}|${RESET}  ${CYAN}stdio + HTTP${RESET}  ${DIM}|${RESET}  ${CYAN}MCP Apps${RESET}  ${DIM}|${RESET}  ${CYAN}Zero deps${RESET}  ${DIM}|${RESET}  ${CYAN}CI-native${RESET}`); nl(t += 0.01);
emit(t += 0.3, `${DIM}  PoC: github.com/foss42/gsoc-poc/pull/8${RESET}`); nl(t += 0.01);
emit(t += 0.2, `${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`); nl(t += 0.01);
t += 4;
emit(t, "");

// ─── Generate .cast file ───
const header = JSON.stringify({
  version: 2,
  width: COLS,
  height: ROWS,
  timestamp: Math.floor(Date.now() / 1000),
  idle_time_limit: 3.0,
  title: "mcp-conformance v0.3.0 — 32 tests vs Sales Analytics MCP Apps server",
  env: { SHELL: "/bin/zsh", TERM: "xterm-256color" }
});

const lines = [header];
for (const ev of events) {
  lines.push(JSON.stringify([parseFloat(ev.time.toFixed(3)), ev.type, ev.data]));
}

const fs = await import("fs");
fs.writeFileSync("demo.cast", lines.join("\n") + "\n");
console.log(`Generated demo.cast (${events.length} events, ${t.toFixed(1)}s duration)`);
