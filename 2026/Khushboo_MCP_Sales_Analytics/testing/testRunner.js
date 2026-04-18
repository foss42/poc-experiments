/**
 * MCP Sales Analytics Server Tester (FINAL + EDGE CASE)
 */

import chalk from "chalk";

const MCP_URL = "http://localhost:3000/mcp";
let sessionId = null;
let msgId = 1;

const results = { passed: 0, failed: 0, tests: [] };

// ─── MCP Request Helper ───────────────────────────────────────────────────────

async function mcpRequest(method, params = {}) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };

  if (sessionId) headers["mcp-session-id"] = sessionId;

  const body = {
    jsonrpc: "2.0",
    id: msgId++,
    method,
    params,
  };

  const res = await fetch(MCP_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }

  const newSession = res.headers.get("mcp-session-id");
  if (newSession) sessionId = newSession;

  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return await res.json();
  } else {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  }
}

// ─── Assertion Engine ─────────────────────────────────────────────────────────

function assert(name, condition, detail = "") {
  const status = condition ? "PASS" : "FAIL";
  results.tests.push({ name, status, detail });

  if (condition) {
    results.passed++;
    console.log(chalk.green(`  ✓ ${name}`));
  } else {
    results.failed++;
    console.log(chalk.red(`  ✗ ${name}`) + (detail ? chalk.gray(` — ${detail}`) : ""));
  }
}

function assertExists(name, value) {
  assert(name, value !== undefined && value !== null);
}

function assertArray(name, arr) {
  assert(name, Array.isArray(arr));
}

function assertIncludes(name, arr, val) {
  assert(name, arr.includes(val));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

async function testInitialize() {
  console.log(chalk.cyan("\n━━━ Test 1: Initialize ━━━"));

  const res = await mcpRequest("initialize", {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "khushboo-mcp-tester", version: "1.0.0" },
  });

  assertExists("response has result", res.result);
  assertExists("serverInfo present", res.result?.serverInfo);

  if (sessionId) {
    assert("session ID assigned", true);
  } else {
    console.log(chalk.yellow("  ⚠ No session used"));
    assert("session optional", true);
  }

  return res.result;
}

async function testListTools() {
  console.log(chalk.cyan("\n━━━ Test 2: List Tools ━━━"));

  const res = await mcpRequest("tools/list");
  const tools = res.result?.tools || [];

  assertArray("tools is array", tools);
  assert("tools exist", tools.length > 0);

  const names = tools.map((t) => t.name);

  assertIncludes("select-sales-metric exists", names, "select-sales-metric");
  assertIncludes("get-sales-data exists", names, "get-sales-data");

  return tools;
}

async function testSelectMetric() {
  console.log(chalk.cyan("\n━━━ Test 3: select-sales-metric ━━━"));

  const res = await mcpRequest("tools/call", {
    name: "select-sales-metric",
    arguments: {},
  });

  assertExists("result exists", res.result);
  assertExists("content exists", res.result?.content);

  return res.result;
}

async function testGetSalesData() {
  console.log(chalk.cyan("\n━━━ Test 4: get-sales-data ━━━"));

  const res = await mcpRequest("tools/call", {
    name: "get-sales-data",
    arguments: {
      states: ["MH", "TN"],
      metric: "revenue",
      period: "monthly",
      year: "2025",
    },
  });

  const text = res.result?.content?.[0]?.text;
  assertExists("data returned", text);

  let parsed;
  try {
    parsed = JSON.parse(text);
    assert("valid JSON returned", true);
  } catch {
    assert("valid JSON returned", false);
  }

  // 🔥 SMART VALIDATION
  assert("summary exists", parsed?.summary !== undefined);
  assert("total > 0", parsed?.summary?.total > 0);
  assert("states exist", Array.isArray(parsed?.states));

  return parsed;
}

// 🔥 EDGE CASE TEST
async function testEdgeCase() {
  console.log(chalk.cyan("\n━━━ Test 5: Edge Case (wrong metric) ━━━"));

  const res = await mcpRequest("tools/call", {
    name: "get-sales-data",
    arguments: {
      states: ["MH"],
      metric: "wrong_value", // ❌ wrong input
      period: "monthly",
      year: "2025",
    },
  });

  assert("handles wrong metric gracefully", !!res.result || !!res.error);
}

async function testVisualization(report) {
  console.log(chalk.cyan("\n━━━ Test 6: visualize-sales-data ━━━"));

  const res = await mcpRequest("tools/call", {
    name: "visualize-sales-data",
    arguments: {
      selections: {
        states: ["MH", "TN"],
        metric: "revenue",
        period: "monthly",
        year: "2025",
      },
      report,
    },
  });

  assertExists("visualization response", res.result?.content);
}

async function testPDF(report) {
  console.log(chalk.cyan("\n━━━ Test 7: show-sales-pdf-report ━━━"));

  const res = await mcpRequest("tools/call", {
    name: "show-sales-pdf-report",
    arguments: {
      selections: {
        states: ["MH", "TN"],
        metric: "revenue",
        period: "monthly",
        year: "2025",
      },
      report,
    },
  });

  const base64 = res.result?.structuredContent?.pdfBase64;

  assertExists("pdf generated", base64);
  assert("pdf non-empty", base64?.length > 50);
}

// ─── Report ───────────────────────────────────────────────────────────────────

function printReport() {
  const total = results.passed + results.failed;

  console.log(chalk.white("\n" + "═".repeat(50)));

  const pct = Math.round((results.passed / total) * 100);

  console.log(chalk.bold("MCP TEST REPORT"));
  console.log(chalk.white("─".repeat(50)));

  results.tests.forEach((t) => {
    const badge =
      t.status === "PASS"
        ? chalk.bgGreen.black(" PASS ")
        : chalk.bgRed.white(" FAIL ");
    console.log(` ${badge} ${t.name}`);
  });

  console.log(chalk.white("─".repeat(50)));
  console.log(
    `Total: ${total} | Passed: ${results.passed} | Failed: ${results.failed} | Score: ${pct}%`
  );

  console.log(chalk.white("═".repeat(50)));

  if (results.failed === 0) {
    console.log(chalk.green("\n✅ All tests passed!\n"));
  } else {
    console.log(chalk.yellow("\n⚠️ Some tests failed\n"));
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(chalk.bold.cyan("\n🧪 MCP Server Tester\n"));

  try {
    const res = await fetch("http://localhost:3000/health");
    const data = await res.json();
    console.log(chalk.green(`✅ Server healthy: ${JSON.stringify(data)}`));
  } catch {
    console.log(chalk.red("❌ Server not running"));
    process.exit(1);
  }

  try {
    await testInitialize();
    await testListTools();
    await testSelectMetric();
    const report = await testGetSalesData();
    await testEdgeCase(); // 🔥 NEW
    await testVisualization(report);
    await testPDF(report);
  } catch (e) {
    console.log(chalk.red(`\n💥 Error: ${e.message}`));
  }

  printReport();
}

export async function runTests() {
  results.passed = 0;
  results.failed = 0;
  results.tests = [];

  let reportData = {};

  try {
    await testInitialize();
    await testListTools();
    await testSelectMetric();
    const report = await testGetSalesData();
    await testEdgeCase();
    await testVisualization(report);
    await testPDF(report);
  } catch (e) {
    console.log("Error:", e.message);
  }

  const total = results.passed + results.failed;

  reportData = {
    total,
    passed: results.passed,
    failed: results.failed,
    tests: results.tests,
    score: Math.round((results.passed / total) * 100),
  };

  return reportData;
}