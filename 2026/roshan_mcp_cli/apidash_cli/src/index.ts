#!/usr/bin/env node
/**
 * APIDash CLI — Headless terminal executor
 *
 * SAVED-REQUEST COMMANDS (workspace-backed):
 *   list                              List all saved requests
 *   run   <id|index> [--timeout ms]  Execute a saved request
 *   env   [scope]                    List environment variables
 *   set   <scope> <key> <value>      Set an environment variable
 *   codegen <id|index> <lang>        Generate code snippet
 *   langs                            List supported code generators
 *   info                             Show workspace info
 *
 * AD-HOC COMMANDS (no workspace needed):
 *   request <METHOD> <URL>           Send a one-off HTTP request
 *   graphql <URL>                    Send a GraphQL query/mutation
 *   ai      <URL|provider>           Chat with an AI/LLM endpoint
 *   save    <METHOD> <URL>           Save an ad-hoc request to workspace
 *   providers                        List known AI provider shortcuts
 */

import {
  getMcpWorkspaceData,
  getSyncFilePath,
  updateMcpWorkspaceData,
  executeHttpRequest,
  executeGraphQLRequest,
  executeAIRequest,
  AI_PROVIDERS,
  generateCode,
  SUPPORTED_GENERATORS
} from "@apidash/mcp-core";
import type { WorkspaceRequest, GeneratorId } from "@apidash/mcp-core";
import fs from "fs";
import { randomUUID } from "crypto";

// ─────────────────────────────────────────────────────────────
// Terminal colours (no chalk dep)
// ─────────────────────────────────────────────────────────────

const c = {
  reset:   "\x1b[0m",  bold:    "\x1b[1m",  dim:     "\x1b[2m",
  green:   "\x1b[32m", yellow:  "\x1b[33m", cyan:    "\x1b[36m",
  red:     "\x1b[31m", blue:    "\x1b[34m", magenta: "\x1b[35m",
  white:   "\x1b[37m", bgGreen: "\x1b[42m", bgRed:   "\x1b[41m",
  bgYellow:"\x1b[43m", bgBlue:  "\x1b[44m", bgMag:   "\x1b[45m",
};

const bold    = (s: string) => `${c.bold}${s}${c.reset}`;
const dim     = (s: string) => `${c.dim}${s}${c.reset}`;
const green   = (s: string) => `${c.green}${s}${c.reset}`;
const yellow  = (s: string) => `${c.yellow}${s}${c.reset}`;
const cyan    = (s: string) => `${c.cyan}${s}${c.reset}`;
const red     = (s: string) => `${c.red}${s}${c.reset}`;
const blue    = (s: string) => `${c.blue}${s}${c.reset}`;
const magenta = (s: string) => `${c.magenta}${s}${c.reset}`;

function statusBadge(code: number): string {
  if (code === 0)   return `${c.bgRed}${c.white} ERR ${c.reset}`;
  if (code < 300)   return `${c.bgGreen}${c.white} ${code} ${c.reset}`;
  if (code < 400)   return `${c.bgYellow}${c.white} ${code} ${c.reset}`;
  return                   `${c.bgRed}${c.white} ${code} ${c.reset}`;
}

function methodBadge(method: string): string {
  const m = method.toUpperCase();
  const colors: Record<string, string> = {
    GET: c.green, POST: c.blue, PUT: c.yellow, PATCH: c.magenta,
    DELETE: c.red, HEAD: c.cyan, OPTIONS: c.dim,
  };
  return `${colors[m] ?? c.white}${c.bold}${m}${c.reset}`;
}

function hr(char = "─", width = 60): string { return dim(char.repeat(width)); }

// ─────────────────────────────────────────────────────────────
// Argument helpers
// ─────────────────────────────────────────────────────────────

/** Extract --flag value pairs from argv, returns map + leftover positional args */
function parseFlags(args: string[]): {
  flags: Record<string, string>;
  positional: string[];
} {
  const flags: Record<string, string> = {};
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = "true"; // boolean flag
      }
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

/** Parse repeated --header "Key: Value" flags into a Record */
function parseHeaderFlags(raw: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const h of raw) {
    const sep = h.indexOf(":");
    if (sep < 0) continue;
    const k = h.slice(0, sep).trim();
    const v = h.slice(sep + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

/** Collect all values for a repeated flag (e.g. --header can appear many times) */
function collectRepeated(args: string[], flag: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === `--${flag}` && args[i + 1]) {
      out.push(args[i + 1]);
      i++;
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// Pretty-print response body
// ─────────────────────────────────────────────────────────────

function printBody(body: string, maxLines = 50, truncateAt = 4000) {
  const preview = body.slice(0, truncateAt);
  const truncated = body.length > truncateAt;
  try {
    const parsed = JSON.parse(preview);
    const pretty = JSON.stringify(parsed, null, 2);
    const lines  = pretty.split("\n");
    console.log(lines.slice(0, maxLines).map(l => `  ${green(l)}`).join("\n"));
    if (lines.length > maxLines) console.log(dim(`  ... (${lines.length - maxLines} more lines)`));
  } catch {
    const lines = preview.split("\n");
    console.log(lines.slice(0, maxLines).map(l => `  ${l}`).join("\n"));
  }
  if (truncated) console.log(yellow(`\n  ⚠  Body truncated at ${truncateAt} chars (full: ${body.length})`));
}

// ─────────────────────────────────────────────────────────────
// Help
// ─────────────────────────────────────────────────────────────

function printHelp() {
  console.log(`
${bold(cyan("╔══════════════════════════════════════════════════════╗"))}
${bold(cyan("║       APIDash CLI  — v2.0.0                          ║"))}
${bold(cyan("║  HTTP · GraphQL · AI  —  Saved & Ad-Hoc requests     ║"))}
${bold(cyan("╚══════════════════════════════════════════════════════╝"))}

${bold("SAVED-REQUEST COMMANDS")} ${dim("(from APIDash workspace)")}
  ${yellow("list")}                              List all saved requests
  ${yellow("run")}  ${dim("<id|index>")} ${dim("[--timeout ms]")}   Execute a saved request
  ${yellow("env")}  ${dim("[scope]")}                   Show environment variables
  ${yellow("set")}  ${dim("<scope> <key> <val>")}       Set an environment variable
  ${yellow("codegen")} ${dim("<id|index> <lang>")}      Generate a code snippet
  ${yellow("langs")}                            List supported code generators
  ${yellow("info")}                             Show workspace path & stats

${bold("AD-HOC COMMANDS")} ${dim("(no workspace needed)")}
  ${yellow("request")} ${dim("<METHOD> <URL>")}         Send a one-off HTTP request
            ${dim("--header 'Key: Value'")}    (repeatable)
            ${dim("--body    '<json>'")}
            ${dim("--timeout <ms>")}
            ${dim("--save    [name]")}         Save to workspace after running
            ${dim("--codegen <lang>")}         Also output a code snippet

  ${yellow("graphql")} ${dim("<URL>")}                  Send a GraphQL query/mutation
            ${dim("--query     '<gql>'")}
            ${dim("--variable  'key=value'")}  (repeatable)
            ${dim("--operation <name>")}
            ${dim("--header    'Key: Value'")} (repeatable)
            ${dim("--timeout   <ms>")}
            ${dim("--save      [name]")}

  ${yellow("ai")}      ${dim("<URL|provider>")}         Chat with an AI/LLM API
            ${dim("--prompt  '<text>'")}       User message
            ${dim("--system  '<text>'")}       System prompt
            ${dim("--model   <name>")}         Model to use
            ${dim("--key     <api-key>")}      Bearer token
            ${dim("--temp    <0-2>")}          Temperature (default 0.7)
            ${dim("--tokens  <n>")}            Max output tokens (default 1024)
            ${dim("--raw")}                    Print full JSON response

  ${yellow("save")}    ${dim("<METHOD> <URL>")}         Save a request to workspace
            ${dim("--name   <name>")}
            ${dim("--header 'Key: Value'")}   (repeatable)
            ${dim("--body   '<json>'")}

  ${yellow("providers")}                        List known AI provider shortcuts

${bold("EXAMPLES")}
  ${dim("$ apidash-cli list")}
  ${dim("$ apidash-cli run 1")}
  ${dim("$ apidash-cli request GET https://jsonplaceholder.typicode.com/posts/1")}
  ${dim("$ apidash-cli request POST https://api.example.com/users \\")}
  ${dim("      --header 'Content-Type: application/json' \\")}
  ${dim("      --header 'Authorization: Bearer token123' \\")}
  ${dim("      --body '{\"name\":\"Alice\"}' --save 'Create User'")}
  ${dim("$ apidash-cli graphql https://countries.trevorblades.com \\")}
  ${dim("      --query 'query { countries { code name } }'")}
  ${dim("$ apidash-cli ai openai --prompt 'Explain REST APIs' --model gpt-4o --key sk-...")}
  ${dim("$ apidash-cli ai ollama --prompt 'Hello!' --model llama3")}
  ${dim("$ apidash-cli save GET https://api.example.com/users --name 'List Users'")}
  ${dim("$ apidash-cli codegen 1 python-requests")}
  ${dim("$ apidash-cli env global")}

${bold("ENVIRONMENT")}
  ${cyan("MCP_WORKSPACE_PATH")}   Override default workspace JSON path
  ${cyan("APIDASH_AI_KEY")}       Default AI API key (used when --key is omitted)

${bold("WORKSPACE")}
  ${dim(getSyncFilePath())}
`);
}

// ─────────────────────────────────────────────────────────────
// Saved-request commands (unchanged from v1)
// ─────────────────────────────────────────────────────────────

function cmdList() {
  const { requests } = getMcpWorkspaceData();
  const syncFile = getSyncFilePath();
  const fromFile = fs.existsSync(syncFile);
  console.log(`\n${bold("📁 APIDash Request Collections")}`);
  console.log(dim(`   Source: ${fromFile ? syncFile : "sample data (Flutter not synced)"}`));
  console.log(hr());
  if (requests.length === 0) { console.log(yellow("  No requests found.")); return; }
  const idWidth = Math.max(...requests.map(r => r.id.length), 4);
  requests.forEach((r, i) => {
    const idx  = dim(`${String(i + 1).padStart(2, " ")}.`);
    const id   = cyan(r.id.padEnd(idWidth, " "));
    const meth = methodBadge(r.method);
    const url  = dim(r.url.length > 50 ? r.url.slice(0, 47) + "..." : r.url);
    const name = r.name !== r.id ? `  ${dim("›")} ${r.name}` : "";
    console.log(`  ${idx} ${id}  ${meth}  ${url}${name}`);
  });
  console.log(hr());
  console.log(dim(`  ${requests.length} request(s)  •  run: apidash-cli run <id|index>`));
  console.log();
}

async function cmdRun(input: string, timeoutMs: number) {
  const { requests } = getMcpWorkspaceData();
  let req: WorkspaceRequest | undefined;
  const idx = parseInt(input);
  if (!isNaN(idx) && idx > 0 && idx <= requests.length) req = requests[idx - 1];
  else req = requests.find(r => r.id === input);

  if (!req) {
    console.error(red(`\n  ✗ Request "${input}" not found.`));
    console.error(dim("    Use 'apidash-cli list' to see available IDs or Indices.\n"));
    process.exit(1);
  }

  console.log(`\n${bold("🚀 Executing")}  ${methodBadge(req.method)}  ${cyan(req.url)}`);
  console.log(dim(`   ID: ${req.id}  •  Timeout: ${timeoutMs}ms`));
  console.log(hr());

  const result = await executeHttpRequest({ method: req.method, url: req.url, headers: req.headers, body: req.body, timeoutMs });
  dispatchHttpResult(result, req.method, req.url);
}

function dispatchHttpResult(result: Awaited<ReturnType<typeof executeHttpRequest>>, method: string, url: string) {
  if (!result.success) {
    console.log(`\n  ${statusBadge(0)}  ${red(result.errorMsg ?? "Network error")}`);
    console.log(dim(`  Duration: ${result.data.duration}ms\n`));
    process.exit(1);
  }
  const { status, statusText, duration, body, headers: resHeaders } = result.data;
  const sizeKb = (new TextEncoder().encode(body).length / 1024).toFixed(2);
  console.log(`\n  ${statusBadge(status)}  ${bold(statusText)}  ${dim(`${duration}ms`)}  ${dim(`${sizeKb} KB`)}\n`);

  const importantHeaders = ["content-type", "content-length", "x-request-id", "cache-control", "server", "x-ratelimit-remaining"];
  const ph = Object.entries(resHeaders).filter(([k]) => importantHeaders.includes(k.toLowerCase())).slice(0, 8);
  if (ph.length > 0) {
    console.log(bold("  Headers (selected):"));
    for (const [k, v] of ph) console.log(`    ${cyan(k.padEnd(24))} ${dim(String(v))}`);
    console.log();
  }

  console.log(bold("  Response Body:"));
  console.log(hr("─", 56));
  printBody(body);
  console.log(hr("─", 56));
  console.log(dim(`  ✓ Done  •  ${method} ${url}`));
  console.log();
}

function cmdEnv(scope?: string) {
  const { environments } = getMcpWorkspaceData();
  console.log(`\n${bold("🌱 APIDash Environments")}`);
  console.log(hr());
  if (environments.length === 0) {
    console.log(yellow("  No environments saved yet."));
    console.log(dim("  Use 'apidash-cli set <scope> <key> <value>' to add one.\n")); return;
  }
  const envsToPrint = scope ? environments.filter(e => e.name.toLowerCase() === scope.toLowerCase()) : environments;
  if (envsToPrint.length === 0) {
    console.log(red(`  No environment named "${scope}" found.`));
    console.log(dim(`  Available: ${environments.map(e => cyan(e.name)).join(", ")}\n`)); return;
  }
  for (const env of envsToPrint) {
    console.log(`\n  ${bold(magenta(env.name.toUpperCase()))}  ${dim(`(${env.values?.length ?? 0} var(s))`)}`);
    if (!env.values || env.values.length === 0) { console.log(dim("    (empty)")); continue; }
    for (const v of env.values) {
      if (!v.enabled && v.enabled !== undefined) continue;
      console.log(`    ${cyan(v.key.padEnd(24))} = ${v.secret ? dim("●●●●●●●●") : green(String(v.value))}${v.secret ? dim(" [secret]") : ""}`);
    }
  }
  console.log();
}

function cmdSet(scope: string, key: string, value: string, secret = false) {
  const workspace = getMcpWorkspaceData();
  let env = workspace.environments.find(e => e.name.toLowerCase() === scope.toLowerCase());
  if (!env) { env = { id: scope, name: scope, values: [] }; workspace.environments.push(env); }
  const existingIdx = env.values.findIndex(v => v.key === key);
  const entry = { key, value, secret, enabled: true };
  if (existingIdx >= 0) { env.values[existingIdx] = entry; console.log(green(`\n  ✓ Updated`), cyan(key), dim("in"), magenta(scope)); }
  else { env.values.push(entry); console.log(green(`\n  ✓ Added`), cyan(key), dim("to"), magenta(scope)); }
  const saved = updateMcpWorkspaceData({ environments: workspace.environments });
  if (!saved) { console.error(red("  ✗ Failed to save workspace file.")); process.exit(1); }
  console.log(dim(`  Workspace: ${getSyncFilePath()}\n`));
}

function cmdCodegen(input: string, lang: string) {
  const { requests } = getMcpWorkspaceData();
  let req: WorkspaceRequest | undefined;
  const idx = parseInt(input);
  if (!isNaN(idx) && idx > 0 && idx <= requests.length) req = requests[idx - 1];
  else req = requests.find(r => r.id === input);
  if (!req) { console.error(red(`\n  ✗ Request "${input}" not found.\n`)); process.exit(1); }
  if (!SUPPORTED_GENERATORS.includes(lang as GeneratorId)) { console.error(red(`\n  ✗ Generator "${lang}" unsupported.\n`)); process.exit(1); }
  const code = generateCode(lang as GeneratorId, { method: req.method, url: req.url, headers: req.headers, body: req.body });
  console.log(`\n${bold("⚙  Code Generator")}  ${cyan(lang)}  ${dim("›")}  ${methodBadge(req.method)} ${dim(req.url)}`);
  console.log(hr("─", 60));
  console.log(green(code));
  console.log(hr("─", 60));
  console.log(dim(`  Copy and run the snippet above.\n`));
}

function cmdLangs() {
  const langLabels: Record<string, string> = {
    "curl": "cURL", "python-requests": "Python — requests",
    "javascript-fetch": "JavaScript — fetch", "javascript-axios": "JavaScript — axios",
    "nodejs-fetch": "Node.js — node-fetch", "dart-http": "Dart — http",
    "go-http": "Go — net/http", "java-http": "Java — HttpClient",
    "kotlin-okhttp": "Kotlin — OkHttp", "php-curl": "PHP — cURL",
    "ruby-net": "Ruby — Net::HTTP", "rust-reqwest": "Rust — reqwest",
  };
  console.log(`\n${bold("⚙  Supported Code Generators")}`);
  console.log(hr());
  SUPPORTED_GENERATORS.forEach((id, i) => {
    console.log(`  ${dim(`${String(i + 1).padStart(2, " ")}.`)}  ${cyan(id.padEnd(22))}  ${dim(langLabels[id] ?? id)}`);
  });
  console.log();
  console.log(dim(`  Usage: apidash-cli codegen <request-id> <generator-id>\n`));
}

function cmdInfo() {
  const syncFile = getSyncFilePath();
  const exists = fs.existsSync(syncFile);
  const { requests, environments, lastUpdated } = getMcpWorkspaceData();
  console.log(`\n${bold("ℹ  APIDash CLI — Workspace Info")}`);
  console.log(hr());
  console.log(`  ${dim("File path:  ")} ${exists ? green(syncFile) : red(syncFile + " (not found)")}`);
  console.log(`  ${dim("Status:     ")} ${exists ? green("Connected to APIDash Flutter") : yellow("Using built-in sample data")}`);
  console.log(`  ${dim("Requests:   ")} ${cyan(String(requests.length))}`);
  console.log(`  ${dim("Envs:       ")} ${cyan(String(environments.length))}`);
  if (lastUpdated) console.log(`  ${dim("Last sync:  ")} ${dim(new Date(lastUpdated).toLocaleString())}`);
  console.log(`  ${dim("Platform:   ")} ${dim(process.platform)}  ${dim("Node:")} ${dim(process.version)}`);
  console.log();
}

// ─────────────────────────────────────────────────────────────
// NEW: request  — ad-hoc HTTP
// ─────────────────────────────────────────────────────────────

async function cmdRequest(rawArgs: string[]) {
  const method = (rawArgs[0] ?? "GET").toUpperCase();
  const url    = rawArgs[1];

  if (!url) {
    console.error(red("\n  ✗ Missing URL."));
    console.error(dim("    Usage: apidash-cli request <METHOD> <URL> [options]\n"));
    process.exit(1);
  }

  const { flags } = parseFlags(rawArgs.slice(2));
  const rawHeaders = collectRepeated(rawArgs.slice(2), "header");
  const headers    = parseHeaderFlags(rawHeaders);
  const body       = flags["body"];
  const timeoutMs  = parseInt(flags["timeout"] ?? "30000");
  const saveFlag   = flags["save"];          // optional name
  const codegenLang = flags["codegen"];

  console.log(`\n${bold("🌐 HTTP Request")}  ${methodBadge(method)}  ${cyan(url)}`);
  if (Object.keys(headers).length) {
    for (const [k, v] of Object.entries(headers)) console.log(`  ${dim("›")} ${cyan(k)}: ${dim(v)}`);
  }
  if (body) console.log(`  ${dim("body:")} ${dim(body.slice(0, 80))}${body.length > 80 ? "…" : ""}`);
  console.log(hr());

  const result = await executeHttpRequest({ method, url, headers, body, timeoutMs });
  dispatchHttpResult(result, method, url);

  // Optional: codegen
  if (codegenLang && SUPPORTED_GENERATORS.includes(codegenLang as GeneratorId)) {
    const code = generateCode(codegenLang as GeneratorId, { method, url, headers, body });
    console.log(`\n${bold("⚙  Code Snippet")}  ${cyan(codegenLang)}`);
    console.log(hr("─", 60));
    console.log(green(code));
    console.log(hr("─", 60) + "\n");
  }

  // Optional: save to workspace
  if (saveFlag !== undefined) {
    const name = typeof saveFlag === "string" && saveFlag !== "true" ? saveFlag : `${method} ${url}`;
    saveRequestToWorkspace({ method, url, headers, body, name });
  }
}

// ─────────────────────────────────────────────────────────────
// NEW: graphql  — ad-hoc GraphQL
// ─────────────────────────────────────────────────────────────

async function cmdGraphQL(rawArgs: string[]) {
  const url = rawArgs[0];
  if (!url) {
    console.error(red("\n  ✗ Missing URL."));
    console.error(dim("    Usage: apidash-cli graphql <URL> --query '<gql>' [--variable key=val]\n"));
    process.exit(1);
  }

  const { flags } = parseFlags(rawArgs.slice(1));
  const query = flags["query"] ?? flags["q"];
  if (!query) {
    console.error(red("\n  ✗ --query is required."));
    console.error(dim("    Example: apidash-cli graphql https://countries.trevorblades.com --query 'query { countries { code name } }'\n"));
    process.exit(1);
  }

  const rawVars   = collectRepeated(rawArgs.slice(1), "variable");
  const variables: Record<string, unknown> = {};
  for (const v of rawVars) {
    const sep = v.indexOf("=");
    if (sep >= 0) {
      const k = v.slice(0, sep).trim();
      const val = v.slice(sep + 1).trim();
      try { variables[k] = JSON.parse(val); }
      catch { variables[k] = val; }
    }
  }

  const rawHeaders  = collectRepeated(rawArgs.slice(1), "header");
  const headers     = parseHeaderFlags(rawHeaders);
  const operation   = flags["operation"];
  const timeoutMs   = parseInt(flags["timeout"] ?? "30000");
  const saveFlag    = flags["save"];

  console.log(`\n${bold("⬡ GraphQL Request")}  ${cyan(url)}`);
  if (operation) console.log(`  ${dim("operation:")} ${magenta(operation)}`);
  if (Object.keys(variables).length) console.log(`  ${dim("variables:")} ${dim(JSON.stringify(variables))}`);
  console.log(`  ${dim("query:")} ${dim(query.slice(0, 80))}${query.length > 80 ? "…" : ""}`);
  console.log(hr());

  const result = await executeGraphQLRequest({ url, query, variables, operationName: operation, headers, timeoutMs });

  if (!result.success) {
    console.log(`\n  ${statusBadge(0)}  ${red(result.errorMsg ?? "Network error")}`);
    console.log(dim(`  Duration: ${result.data.duration}ms\n`));
    process.exit(1);
  }

  const { status, statusText, duration, data: gqlData, errors } = result.data;
  const sizeKb = (new TextEncoder().encode(result.data.body).length / 1024).toFixed(2);
  console.log(`\n  ${statusBadge(status)}  ${bold(statusText)}  ${dim(`${duration}ms`)}  ${dim(`${sizeKb} KB`)}`);

  if (errors && Array.isArray(errors) && errors.length > 0) {
    console.log(`\n  ${red("⚠ GraphQL Errors:")}`);
    errors.forEach((e: any, i) => console.log(`    ${dim(`${i + 1}.`)} ${red(e?.message ?? JSON.stringify(e))}`));
  }

  console.log(`\n${bold("  GraphQL Data:")}`);
  console.log(hr("─", 56));
  printBody(gqlData ? JSON.stringify(gqlData, null, 2) : result.data.body);
  console.log(hr("─", 56));
  console.log(dim("  ✓ Done\n"));

  if (saveFlag !== undefined) {
    const name = typeof saveFlag === "string" && saveFlag !== "true" ? saveFlag : `GraphQL ${url}`;
    saveRequestToWorkspace({
      method: "POST",
      url,
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ query, variables, operationName: operation }),
      name,
    });
  }
}

// ─────────────────────────────────────────────────────────────
// NEW: ai  — chat with an LLM
// ─────────────────────────────────────────────────────────────

async function cmdAI(rawArgs: string[]) {
  const urlOrProvider = rawArgs[0];
  if (!urlOrProvider) {
    console.error(red("\n  ✗ Missing URL or provider."));
    console.error(dim("    Usage: apidash-cli ai <URL|provider> --prompt '<text>' [options]"));
    console.error(dim("    Run 'apidash-cli providers' to see provider shortcuts.\n"));
    process.exit(1);
  }

  const { flags } = parseFlags(rawArgs.slice(1));
  const rawHeaders = collectRepeated(rawArgs.slice(1), "header");
  const headers    = parseHeaderFlags(rawHeaders);

  // Resolve URL (named provider or raw URL)
  const provider = AI_PROVIDERS[urlOrProvider.toLowerCase()];
  const url      = provider?.url ?? urlOrProvider;
  const label    = provider?.label ?? urlOrProvider;

  const prompt    = flags["prompt"] ?? flags["p"];
  const system    = flags["system"] ?? flags["s"];
  const model     = flags["model"]  ?? flags["m"] ?? "gpt-4o";
  const apiKey    = flags["key"]    ?? process.env.APIDASH_AI_KEY ?? "";
  const temp      = parseFloat(flags["temp"] ?? "0.7");
  const maxTokens = parseInt(flags["tokens"] ?? "1024");
  const showRaw   = flags["raw"] === "true";

  if (!prompt) {
    console.error(red("\n  ✗ --prompt is required."));
    console.error(dim("    Example: apidash-cli ai openai --prompt 'Hello!' --model gpt-4o --key sk-...\n"));
    process.exit(1);
  }

  console.log(`\n${bold("🤖 AI Request")}  ${`${c.bgMag}${c.white} ${label} ${c.reset}`}  ${dim(`model: ${model}`)}`);
  if (system) console.log(`  ${dim("system:")} ${dim(system.slice(0, 80))}${system.length > 80 ? "…" : ""}`);
  console.log(`  ${dim("prompt:")} ${cyan(prompt.slice(0, 100))}${prompt.length > 100 ? "…" : ""}`);
  console.log(hr());

  const result = await executeAIRequest({
    url,
    apiKey: apiKey || undefined,
    model,
    messages: [{ role: "user", content: prompt }],
    systemPrompt: system,
    temperature: temp,
    maxTokens,
    headers,
  });

  if (!result.success) {
    console.log(`\n  ${statusBadge(0)}  ${red(result.errorMsg ?? "AI request failed")}`);
    console.log(dim(`  Duration: ${result.data.duration}ms\n`));
    process.exit(1);
  }

  const { status, content, inputTokens, outputTokens, totalTokens, finishReason, duration } = result.data;
  console.log(`\n  ${statusBadge(status)}  ${dim(`${duration}ms`)}${
    totalTokens ? `  ${dim(`tokens: ${inputTokens ?? "?"}→${outputTokens ?? "?"} = ${totalTokens}`)}` : ""
  }${finishReason ? `  ${dim(`stop: ${finishReason}`)}` : ""}\n`);

  console.log(bold("  Assistant:"));
  console.log(hr("─", 56));
  if (content) {
    const lines = content.split("\n");
    lines.forEach(l => console.log(`  ${green(l)}`));
  } else {
    console.log(yellow("  (no content in response)"));
  }
  console.log(hr("─", 56));

  if (showRaw) {
    console.log(`\n${bold("  Raw Response:")}`);
    console.log(hr("─", 56));
    printBody(result.data.rawBody);
    console.log(hr("─", 56));
  }

  console.log(dim("\n  ✓ Done\n"));
}

// ─────────────────────────────────────────────────────────────
// NEW: save  — save a request to the workspace
// ─────────────────────────────────────────────────────────────

function saveRequestToWorkspace(req: { method: string; url: string; headers?: Record<string, string>; body?: string; name?: string }) {
  const workspace = getMcpWorkspaceData();
  const id = randomUUID().slice(0, 8);
  const name = req.name ?? `${req.method} ${req.url}`;
  const entry: WorkspaceRequest = {
    id,
    name,
    method: req.method.toUpperCase(),
    url: req.url,
    headers: req.headers,
    body: req.body,
  };
  workspace.requests.push(entry);
  const saved = updateMcpWorkspaceData({ requests: workspace.requests });
  if (saved) {
    console.log(green(`\n  ✓ Saved request`), bold(`"${name}"`), dim(`(id: ${id})`));
    console.log(dim(`  Workspace: ${getSyncFilePath()}\n`));
  } else {
    console.error(red("  ✗ Failed to save — workspace file not writable.\n"));
  }
  return id;
}

function cmdSave(rawArgs: string[]) {
  const method = (rawArgs[0] ?? "GET").toUpperCase();
  const url    = rawArgs[1];
  if (!url) {
    console.error(red("\n  ✗ Missing URL."));
    console.error(dim("    Usage: apidash-cli save <METHOD> <URL> [--name <name>] [--header 'K: V'] [--body '<json>']\n"));
    process.exit(1);
  }
  const { flags } = parseFlags(rawArgs.slice(2));
  const rawHeaders = collectRepeated(rawArgs.slice(2), "header");
  const headers    = parseHeaderFlags(rawHeaders);
  const body       = flags["body"];
  const name       = flags["name"] ?? `${method} ${url}`;

  console.log(`\n${bold("💾 Save Request")}  ${methodBadge(method)}  ${cyan(url)}`);
  console.log(hr());
  saveRequestToWorkspace({ method, url, headers, body, name });
}

// ─────────────────────────────────────────────────────────────
// NEW: providers  — list AI provider shortcuts
// ─────────────────────────────────────────────────────────────

function cmdProviders() {
  console.log(`\n${bold("🤖 Known AI Provider Shortcuts")}`);
  console.log(hr());
  Object.entries(AI_PROVIDERS).forEach(([id, { url, label }], i) => {
    console.log(`  ${dim(`${String(i + 1).padStart(2, " ")}.`)}  ${cyan(id.padEnd(12))}  ${bold(label)}`);
    console.log(`              ${dim(url)}`);
  });
  console.log();
  console.log(dim("  Usage: apidash-cli ai <provider-id> --prompt '...' --model <model> --key <api-key>"));
  console.log(dim("  Example: apidash-cli ai groq --prompt 'Hello' --model mixtral-8x7b-32768 --key gsk_..."));
  console.log(dim("  Env var: APIDASH_AI_KEY=<key> (used when --key is omitted)\n"));
}

// ─────────────────────────────────────────────────────────────
// Entry
// ─────────────────────────────────────────────────────────────

async function main() {
  const args    = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp(); return;
  }

  switch (command) {
    case "list":      cmdList();                                                        break;
    case "run":       {
      const id = args[1];
      if (!id) { console.error(red("\n  ✗ Missing request ID.\n")); process.exit(1); }
      const tidx = args.indexOf("--timeout");
      const tms  = tidx >= 0 ? parseInt(args[tidx + 1] ?? "30000") : 30000;
      await cmdRun(id, tms);
      break;
    }
    case "env":       cmdEnv(args[1]);                                                 break;
    case "set":       {
      const [, scope, key, value] = args;
      if (!scope || !key || !value) { console.error(red("\n  ✗ Usage: apidash-cli set <scope> <key> <value>\n")); process.exit(1); }
      cmdSet(scope, key, value, args.includes("--secret"));
      break;
    }
    case "codegen":   {
      const id   = args[1];
      const lang = args[2] ?? "curl";
      if (!id) { console.error(red("\n  ✗ Missing request ID.\n")); process.exit(1); }
      cmdCodegen(id, lang);
      break;
    }
    case "langs":     cmdLangs();                                                       break;
    case "info":      cmdInfo();                                                        break;

    // ── Ad-hoc commands ──────────────────────────────────────
    case "request":   await cmdRequest(args.slice(1));                                 break;
    case "graphql":   await cmdGraphQL(args.slice(1));                                 break;
    case "ai":        await cmdAI(args.slice(1));                                      break;
    case "save":      cmdSave(args.slice(1));                                          break;
    case "providers": cmdProviders();                                                   break;

    default: {
      console.error(red(`\n  ✗ Unknown command: "${command}"`));
      console.error(dim("    Run 'apidash-cli help' for available commands.\n"));
      process.exit(1);
    }
  }
}

main().catch(err => {
  console.error(red(`\n  ✗ Fatal: ${err instanceof Error ? err.message : String(err)}\n`));
  process.exit(1);
});
