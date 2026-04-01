import { StdioTransport, TransportAdapter } from "./transport/stdio.js";
import { HttpTransport } from "./transport/http.js";
import { MCPClient } from "./client.js";
import { runConformanceSuite } from "./suite.js";
import { runMcpAppsSuite } from "./suite-mcp-apps.js";
import { AssertionResult } from "./assertions.js";

const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";

interface CliOptions {
  transport: "stdio" | "http";
  server?: string;
  url?: string;
  suite: "all" | "core" | "mcp-apps";
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = { transport: "stdio", suite: "all" };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--transport":
        options.transport = args[++i] as "stdio" | "http";
        break;
      case "--server":
        options.server = args[++i];
        break;
      case "--url":
        options.url = args[++i];
        break;
      case "--suite":
        options.suite = args[++i] as "all" | "core" | "mcp-apps";
        break;
    }
  }

  if (options.transport === "stdio" && !options.server) {
    console.error(
      `Usage:\n` +
      `  mcp-conformance --server "command to start MCP server"\n` +
      `  mcp-conformance --transport http --url http://localhost:3000/mcp\n` +
      `\nOptions:\n` +
      `  --transport stdio|http   Transport type (default: stdio)\n` +
      `  --server <command>       Server command (stdio transport)\n` +
      `  --url <url>              Server URL (http transport)\n` +
      `  --suite all|core|mcp-apps  Test suite to run (default: all)`
    );
    process.exit(1);
  }

  if (options.transport === "http" && !options.url) {
    console.error(`Error: --url is required when using --transport http`);
    process.exit(1);
  }

  return options;
}

function createTransport(options: CliOptions): TransportAdapter {
  if (options.transport === "http") {
    return new HttpTransport(options.url!);
  }
  return new StdioTransport(options.server!);
}

function printResults(results: AssertionResult[]): void {
  const categories = new Map<string, AssertionResult[]>();
  for (const r of results) {
    if (!categories.has(r.category)) categories.set(r.category, []);
    categories.get(r.category)!.push(r);
  }

  console.log();
  for (const [category, tests] of categories) {
    console.log(`${BOLD}${category}${RESET}`);
    for (const t of tests) {
      const icon = t.passed ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
      const time = `${DIM}(${t.durationMs.toFixed(0)}ms)${RESET}`;
      console.log(`  ${icon} ${t.name} ${time}`);
      if (!t.passed && t.error) {
        console.log(`    ${RED}→ ${t.error}${RESET}`);
      }
    }
    console.log();
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  const totalMs = results.reduce((sum, r) => sum + r.durationMs, 0);

  const summary = failed === 0
    ? `${GREEN}${BOLD}${passed} passed${RESET}`
    : `${GREEN}${passed} passed${RESET}, ${RED}${BOLD}${failed} failed${RESET}`;

  console.log(`${summary} ${DIM}(${(totalMs / 1000).toFixed(1)}s)${RESET}`);
}

async function main(): Promise<void> {
  const options = parseArgs();

  const target = options.transport === "http" ? options.url! : options.server!;
  console.log(`${CYAN}${BOLD}mcp-conformance${RESET} ${DIM}v0.3.0${RESET}`);
  console.log(`${DIM}Transport: ${options.transport} | Target: ${target}${RESET}`);
  console.log(`${DIM}Suite: ${options.suite}${RESET}`);

  const transport = createTransport(options);

  try {
    await transport.connect();
    const client = new MCPClient(transport);

    let results: AssertionResult[] = [];

    if (options.suite === "all" || options.suite === "core") {
      console.log(`\n${YELLOW}▸ Running core conformance suite${RESET}`);
      const coreResults = await runConformanceSuite(client);
      results.push(...coreResults);
    }

    if (options.suite === "all" || options.suite === "mcp-apps") {
      console.log(`\n${YELLOW}▸ Running MCP Apps suite${RESET}`);
      const appsResults = await runMcpAppsSuite(client);
      results.push(...appsResults);
    }

    printResults(results);

    const failed = results.filter((r) => !r.passed).length;
    process.exitCode = failed > 0 ? 1 : 0;
  } catch (err) {
    console.error(`${RED}Fatal error: ${err instanceof Error ? err.message : err}${RESET}`);
    process.exitCode = 1;
  } finally {
    await transport.disconnect();
  }
}

main();
