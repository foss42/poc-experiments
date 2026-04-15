![](./images/GSOCBANNER_APIDASH.jpg)

# APIDash Headless CLI & Model Context Protocol (MCP) Integration

### Summary

The main goal of this project is to implement a production-grade headless execution layer for APIDash and integrate it natively with a Model Context Protocol (MCP) server. The architecture enables zero-latency terminal execution ideal for CI/CD pipelines, and allows host AI Agents to securely execute HTTP/GraphQL/AI queries autonomously, transforming APIDash into an AI-first development platform.

**Owner:** rocroshanga@gmail.com  
**Contributors:** Roshan Melvin G A  
**Approvers:** Ankit Mahato (`@animator`) , Ashita Prasad (`@ashitaprasad`) 
**Status:** For Review  
**Created:** 31/03/2026(#1650)
**Updated:** 15/04/2026

---

## Overview

I am **Roshan Melvin G A**, an active contributor to **API Dash** - the open-source, cross-platform API client built with Flutter. My proposal targets the integration of a **Headless CLI & Model Context Protocol (MCP)**, which empowers APIDash to act as a seamless provider of tools and resources directly to AI agents.

API Dash is a collaboration-driven open-source project that aims to provide developers with a fast, native, cross-platform API testing and development tool. The goal of this project is to eliminate the fragmented workflow that forces developers to manually interact with the UI for automated tasks or AI-driven generation. By exposing APIDash state through a robust MCP layer and a shared workspace JSON, the system bridges the Flutter GUI securely into terminal pipelines and AI workflows.

Before writing this proposal, I shipped a working PoC in PR `#1613` (which is an updated version of the initial PR `#1529`), which natively separates the CLI and MCP Server so neither depends on the other. This proposal describes the plan to take that PoC to a fully production-ready, tested, and documented merged implementation.

---

### About

1. Full Name: Roshan Melvin G A
2. Contact info (public email): rocroshanga@gmail.com
3. Discord handle in our server: roshanmelvin
4. Home page: https://github.com/roshan-melvin
5. Blog: https://dev.to/roshan_melvin
6. GitHub profile link: https://github.com/roshan-melvin
7. Twitter, LinkedIn, other socials: https://www.linkedin.com/in/roshan-melvin-tyech5/
8. Time zone: IST (UTC+5:30)
9. Link to a resume: https://drive.google.com/file/d/195X3Ix5Q1sqyCQkNf_FjvrRBmP6azFIO/view?usp=drive_link

### University Info

1. University name: Sri Sairam Engineering College, Chennai
2. Program you are enrolled in (Degree & Major/Minor): Bachelor of Engineering in Computer Science and Engineering (Internet of Things)
3. Year: Third Year (2023–2027)
4. Expected graduation date: 2027

### Motivation & Past Experience

1. Have you worked on or contributed to a FOSS project before? Can you attach repo links or relevant PRs?
   - Yes. My active Proof-of-Concept PR #1613 (which is an updated version of the initial PR #1529) for APIDash demonstrates a fully working MCP & CLI integration inside the existing monorepo. The implementation spans three packages: `apidash_mcp` (Node.js MCP server), `apidash_mcp_core` (shared TypeScript library), and `apidash_cli` (headless terminal executor).
2. What is your one project/achievement that you are most proud of? Why?
   - The Decoupled Sibling Architecture: separating the CLI and MCP Server so neither depends on the other, yet both share a single `@apidash/mcp-core` library and a single workspace JSON file. This was non-trivial — it required redesigning the workspace reader/writer to be filesystem-singleton-safe, handling cross-platform path resolution (Linux XDG, macOS Application Support, Windows `%APPDATA%`), and implementing the SHA-256 `ToolHashRegistry` to prevent prompt-injection schema drift — all while keeping the Flutter GUI in full bi-directional sync through the `McpSyncService` Dart watcher.
3. What kind of problems or challenges motivate you the most to solve them?
   - Bridging heterogeneous tech stacks elegantly. The APIDash ecosystem has a Flutter/Dart front-end and a Node.js back-end that must share live state without either knowing about each other's internals. Solving this elegantly — a cross-language, cross-process pub-sub channel using a shared JSON file and OS file-watch events — is exactly the kind of architectural challenge I thrive on.
4. Will you be working on GSoC full-time?
   - Yes, full-time throughout the coding period.
5. Do you mind regularly syncing up with the project mentors?
   - Not at all. I prefer weekly standups and am available on Discord for async questions at any time (IST, UTC+5:30).
6. What interests you the most about API Dash?
   - APIDash is one of the few Flutter-native API clients that is genuinely extensible. The combination of Hive persistence, Riverpod reactive state, and now a fully open MCP integration means it can evolve into an AI-first development platform rather than a static request-sender.
7. Can you mention some areas where the project can be improved?
   - Adding headless automation for CI/CD pipelines (partially done in this proposal), deepening AI-agent integration so LLMs can self-heal broken request collections, and adding a streaming-response viewer for SSE/WebSocket endpoints directly in the MCP chat UI.
8. Have you interacted with and helped API Dash community?
   - Yes. Beyond PR #1613, I have reviewed open issues, proposed the `apidash_mcp_workspace.json` cross-platform path spec that was subsequently adopted in the main branch, and contributed documentation clarifying the Hive box key schema for new contributors.

### Project Proposal Information

1. Proposal Title: **APIDash Headless CLI & Model Context Protocol (MCP) Integration**
2. Abstract:
   This project implements a production-grade headless execution layer for APIDash and integrates it natively with a Model Context Protocol (MCP) server. The architecture enables zero-latency terminal execution ideal for CI/CD pipelines, and allows host AI Agents (Claude Desktop, VS Code Copilot, or any MCP-compatible client) to securely execute HTTP/GraphQL/AI queries autonomously. All state — whether written by the Flutter GUI, the CLI, or an AI tool — flows through a single shared `apidash_mcp_workspace.json` file that the Flutter `McpSyncService` watches bidirectionally, keeping the desktop UI in perfect sync at all times.

### Video Walkthroughs (Working PoC)

Before reviewing the architecture breakdowns, please watch the actively working PoC (integrated in PR `#1613`):

**Both MCP & CLI Demonstration**


https://github.com/user-attachments/assets/3a310ed8-6608-4db8-a18f-1e59a7e4a8e5



**Only MCP Video**


https://github.com/user-attachments/assets/181532ac-5df0-4080-ac2d-7348140eeec9



**Only CLI Video**


https://github.com/user-attachments/assets/0994cc8b-4c77-4fc9-97d6-2cff18ddbecb



3. Detailed Description:

---

## System Architecture Overview

The overarching system relies on a **Decoupled File-Sync Architecture** bridging two distinct technological stacks: a Flutter/Riverpod desktop app and a Node.js/TypeScript MCP backend. Neither stack imports the other's types or calls the other's APIs — they communicate exclusively through a shared JSON file on the OS filesystem.

### Components

| Component | Stack | Role |
|---|---|---|
| **APIDash Flutter GUI** | Flutter / Dart / Riverpod | Primary UI; persists requests in Hive; writes & watches `apidash_mcp_workspace.json` |
| **McpSyncService** | Dart | Bi-directional file bridge; serialises Riverpod state → JSON; watches for external writes |
| **apidash_mcp** (MCP Server) | Node.js / TypeScript | Registers 14 MCP tools + 7 SEP-1865 UI resources over `streamable-HTTP` or `stdio` |
| **apidash_mcp_core** | TypeScript (ESM) | Shared zero-duplication library: executor, graphql, ai, codegen, workspace I/O |
| **apidash_cli** | Node.js / TypeScript | Terminal-first headless executor; delegates all logic to `@apidash/mcp-core` |
| **Agent Client** | Any MCP-compatible host | Claude Desktop, VS Code Copilot, or custom chatflow connecting via JSON-RPC 2.0 |

---

## Flowchart 1 — High-Level System Topology

<img width="1354" height="699" alt="Gemini_Generated_Image_j2ts0kj2ts0kj2ts" src="https://github.com/user-attachments/assets/3b08d91f-391d-4714-bd2e-7c990264f517" />


---

## Flowchart 2 — MCP Tool Invocation & Security Flow

This diagram traces a single AI-agent tool call from JSON-RPC arrival to response, showing exactly how the SHA-256 Hash Gate operates at every step.

<img width="1392" height="752" alt="4006c45b-08d6-42dc-b1e2-765f16b9d8ff-u2_b8599359-a2c8-41ab-9b4a-1253fb142d28" src="https://github.com/user-attachments/assets/b7e1affe-bbd3-4477-bfd8-7ac1b38f9211" />


---

## Flowchart 3 — CLI Command Execution Pipeline

This diagram shows the full path for every CLI command, from `process.argv` parsing to final output.

<img width="1408" height="768" alt="Gemini_Generated_Image_8y9pbp8y9pbp8y9p" src="https://github.com/user-attachments/assets/0daa9165-4cfb-4ec9-abc4-654dbe1d77dd" />


---

## Flowchart 4 — Dart McpSyncService Bidirectional Sync

This diagram shows the internal Dart logic bridging Riverpod ↔ the JSON file ↔ the Node.js tools.

<img width="1328" height="800" alt="image" src="https://github.com/user-attachments/assets/e65d05e7-9d7e-4086-a0f2-65bc5ab7eeda" />


---

## Flowchart 5 — Monorepo Package Dependency Graph

<img width="1392" height="752" alt="eb80151b-5df3-49f3-989b-a5c4d928f537-u2_3a6b8a86-5ef6-4996-b353-4644d7003e9e" src="https://github.com/user-attachments/assets/4e2064f7-47f6-493e-b7c8-d9a5b4ce85f8" />


---

## The "Sibling" Decoupled Monorepo Advantage

A defining characteristic of this architecture is that the **CLI (`apidash-cli`) does not communicate via RPC with the MCP Server (`apidash-mcp`)**. They are true siblings in the same NPM monorepo, linked via `"@apidash/mcp-core": "file:../apidash_mcp_core"`, both delegating all heavy lifting to the shared library and reading from the same `apidash_mcp_workspace.json` source of truth.

**Why this matters:**
1. *Zero-Latency Terminal Execution:* The CLI fires requests without spinning up an HTTP server, perfect for sub-100 ms CI/CD pipelines.
2. *AI Independence:* Developers get full automation natively with `apidash-cli` without opting into any AI tooling.
3. *Omni-Sync State:* Whether Claude edits an API key via `update-environment-variables`, or a developer runs `apidash-cli set production AUTH_TOKEN s3cr3t`, the Flutter app reflects the change within milliseconds through `McpSyncService`'s `fs.watch()` listener.
4. *Zero Code Duplication:* `executor.ts`, `graphql.ts`, `ai.ts`, `codegen.ts`, and `workspace.ts` exist in exactly one place — `@apidash/mcp-core` — and are statically imported by both consumers.

---

## @apidash/mcp-core — Shared Library Reference

| Module | Exports | Description |
|---|---|---|
| `executor.ts` | `executeHttpRequest(HttpRequestContext)` | axios wrapper; returns `{success, data:{status,body,headers,duration}}` |
| `graphql.ts` | `executeGraphQLRequest({url,query,variables,operationName,headers,timeoutMs})` | GraphQL-over-HTTP; parses `errors[]` and `data` fields |
| `ai.ts` | `executeAIRequest(AIRequestContext)`, `AI_PROVIDERS` | OpenAI-compat chat-completion; handles system prompt, token usage, finish reason |
| `codegen.ts` | `generateCode(generatorId, CodeGenInput)`, `SUPPORTED_GENERATORS` | 12 language generators; pure functions, zero side-effects |
| `workspace.ts` | `getMcpWorkspaceData()`, `updateMcpWorkspaceData(patch)`, `getSyncFilePath()` | Cross-platform JSON I/O; Linux XDG, macOS Application Support, Windows `%APPDATA%` |
| `index.ts` | re-exports all above | Single entry point for consumers |

### The Story Behind `@apidash/mcp-core`

> **`mcp-core` is not an official part of the Model Context Protocol.** MCP itself is simply a server that exposes **Tools** (functions an AI can call) and **Resources** (data an AI can read). What we built on top of that is an architectural insight.

#### Phase 1 — How it Worked Before (The Naive Way)

When you first build an MCP server, everything lives in one file. The network logic, the file-system access, and the MCP protocol are all tangled together inside each tool's handler:

```typescript
// apidash_mcp/src/index.ts  —  THE OLD WAY
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import axios from "axios";
import fs from "fs";

const server = new McpServer({ name: "apidash", version: "1.0.0" });

server.registerTool("http-send-request", schema, async (input) => {
  // The MCP tool is doing the Axios networking directly — tightly coupled!
  const response = await axios({ method: input.method, url: input.url });
  return { content: [{ type: "text", text: String(response.status) }] };
});

server.registerTool("save-request", schema, async (input) => {
  // The MCP tool is doing filesystem writes directly — tightly coupled!
  const db = JSON.parse(fs.readFileSync('/path/to/workspace.json', 'utf-8'));
  db.requests.push(input);
  fs.writeFileSync('/path/to/workspace.json', JSON.stringify(db));
  return { content: [{ type: "text", text: "Saved!" }] };
});
```

This worked. But it worked the way a single tangled ball of string works — until you need to extend it.

#### Phase 2 — The Problem: Adding a CLI

When we decided to add `apidash-cli` (so developers can run `apidash-cli run my-request` in a terminal without involving AI), we hit a wall. **How does the CLI send an HTTP request?**

The Axios logic was trapped inside the MCP Tool handler. The CLI does not speak JSON-RPC and has no reason to boot up an Express server just to fire a `GET`. We faced two bad options:

- **Copy-paste the Axios code into the CLI.** Now there are two copies to maintain. Fix a timeout bug in one? The other still has the bug.
- **Boot a full MCP server from the CLI.** This adds ~500 ms cold-start overhead and left a dangling server process the user would have to kill manually.

Both options are unacceptable for a tool that is supposed to feel instant in a CI/CD pipeline.

#### Phase 3 — The Solution: Extract the Engine

The fix was to pull the "heavy lifting" code out of `index.ts` and into a dedicated, dependency-free package called `@apidash/mcp-core`. It contains only pure TypeScript functions with no knowledge of MCP, Express, or terminals:

```typescript
// apidash_mcp_core/src/executor.ts  — PURE LOGIC, NO PROTOCOL
import axios from "axios";

export async function executeHttpRequest(input) {
  const response = await axios({ method: input.method, url: input.url });
  return { success: true, data: { status: response.status, body: response.data } };
}
```

Now both the MCP Server and the CLI are thin wrappers that simply plug into this shared engine:

```typescript
// MCP Server (apidash_mcp) — just wraps the result for Claude
import { executeHttpRequest } from "@apidash/mcp-core";
server.registerTool("http-send-request", schema, async (input) => {
  const result = await executeHttpRequest(input);
  return { content: [{ type: "text", text: `HTTP ${result.data.status}` }] };
});

// CLI (apidash_cli) — calls the exact same engine, formats for terminal
import { executeHttpRequest } from "@apidash/mcp-core";
const result = await executeHttpRequest({ method: "GET", url: args.url });
console.log(`\x1b[32m ${result.data.status} \x1b[0m`); // coloured output
```

The same function. Zero duplication. The CLI now cold-starts in **under 50 ms** while the MCP Server carries zero terminal-formatting dead weight.

#### The Result: Five Files That Power Everything

| File | What It Powers |
|---|---|
| `executor.ts` | `http-send-request` tool + `apidash-cli request` command |
| `graphql.ts` | `graphql-execute-query` tool + `apidash-cli graphql` command |
| `ai.ts` | `ai-llm-request` tool + `apidash-cli ai` command |
| `codegen.ts` | `generate-code-snippet` tool + `apidash-cli codegen` command |
| `workspace.ts` | All `save-*` / `update-*` tools + `apidash-cli save` / `set` commands |

---

## Future-Proof Dual Transport (Ahead of the Curve)

### The Evolving MCP Cloud Architecture
The MCP ecosystem is rapidly shifting towards **Streamable HTTP (Stateless)** for specific cloud environments. 

When Model Context Protocol officially launched, it relied almost entirely on **SSE (Server-Sent Events)** for remote HTTP connections. However, SSE requires the server to lock in a long-lived, continuously open connection for the entire duration of the chat session. In modern **serverless enterprise environments** (like AWS Lambda, Cloudflare Workers, or lightweight AI wrappers like Amazon **AgentCore**), keeping long-lived idle continuous connections open is highly inefficient, incredibly costly, and sometimes technically impermissible by the API Gateway layer.

Because of this friction, the newer **2025 MCP spec additions** introduced the stateless `StreamableHTTPServerTransport`. It strictly relies on standard HTTP POST requests that stream chunks down, intelligently avoiding the strict persistent session overhead of traditional SSE.

### Where APIDash is Uniquely Positioned
While typical modern deployment articles assume most web servers are isolated into either using the new standard or lagging behind on the older SSE spec, **APIDash's architecture uniquely implements BOTH transports concurrently**:

1. **The Modern Stateless Spec (`POST /mcp`):**
   ```typescript
   app.post("/mcp", async (req: Request, res: Response) => {
     // A fully functioning streaming HTTP tunnel 
     const transport = new StreamableHTTPServerTransport({
       sessionIdGenerator: undefined,   // forces stateless connections
       enableJsonResponse: true,
     });
     await server.connect(transport);
   });
   ```
   **This proves APIDash is AgentCore-ready right out of the box.** If any developer needs to integrate natively with AgentCore or a bleeding-edge serverless cloud platform, they simply point the agent to our `POST /mcp` endpoint and it operates natively without any manual proxy adaptations.

2. **Legacy Backwards Compatibility (`GET /mcp/sse`):**
   Because widespread tools like classical desktop clients (Claude Desktop) or legacy integrations strictly expect the original `SSEServerTransport`, we explicitly map an active server-sent events generator at `/mcp/sse` protecting the userbase from sudden deprecation shocks.
   
3. **Stand-Alone Processes (`stdio`):**
   For lightweight desktop extensions securely bridged over local machine process pipelines (e.g. VS Code Copilot CLI integrations).

### Transport Conclusion
Our codebase uniquely supports **all paradigms simultaneously**. By hosting the modern, stateless, edge-ready `StreamableHTTPServerTransport` natively alongside the persistent `SSEServerTransport`, the APIDash implementation mathematically guarantees to be universally mountable across any hardware format without modification.

---

## Installation & Start Scripts

*APIDash MCP Server:*
```bash
cd packages/apidash_mcp_core && npm install && npm run build
cd ../apidash_mcp && npm install
npm run dev           # HTTP mode on :3001
# OR:
node dist/index.js --stdio   # stdio mode for Claude Desktop / VS Code
```

*APIDash CLI:*
```bash
cd packages/apidash_cli && npm install
npx tsx src/index.ts help    # run directly
npm run build && npm link     # install globally as apidash-cli
apidash-cli help
```

---

### Agent Configurations & OAuth 2.1 Authentication Flow

To secure the MCP Server, APIDash implements a 3-Tier authentication architecture (configurable via `.env`):
1. **Mode 1 - Open**: No auth required (best for local dev).
2. **Mode 2 - Full OAuth 2.1**: Enforces PKCE flow, dynamic client registration, and access tokens.
3. **Mode 3 - Legacy Static Token**: Enforces a single pre-shared Bearer token.

#### Flowchart 6 — OAuth 2.1 Dynamic Client Registration & PKCE Flow
The following sequence demonstrates how headless agents (like VS Code Copilot) dynamically establish trust and acquire Bearer tokens via the APIDash MCP Server's `.well-known` endpoints without relying on hardcoded keys.

<img width="1392" height="752" alt="02efa50e-7c6e-4977-a8db-9f033e2586d4-u1_9a2eff9a-b3a0-49d2-ad62-8b416c66a760 (1)" src="https://github.com/user-attachments/assets/0b7bad8a-dd5e-4571-8d2b-1bfc095993d4" />


#### Step 1 — Configure the Server Auth Mode

Add a `.env` file to your `apidash_mcp` project root:

```bash
# MODE 2 — Enable OAuth 2.1 (Dynamic Token Generation)
APIDASH_MCP_AUTH=true

# OR: MODE 3 — Pre-shared Secret Key Configuration
# APIDASH_MCP_TOKEN=X7kP2mNqR9vL4wYjH8cE1dZsA3uT5bGf6nMoW0eI=

# Optional: Set a specific Base URL for public proxy deployments
# BASE_URL=https://api.domain.com
```

#### Step 2 — Configure the AI Agent Client

If relying on **Mode 2 (OAuth 2.1)**, clients do *NOT* need hardcoded auth headers. The MCP Client will handle the challenge and redirect automatically.

**VS Code / GitHub Copilot (mcp.json):**
```jsonc
{
  "servers": {
    "apidash-mcp": {
      "type": "sse",
      "url": "http://localhost:3002/mcp/sse"
      // Note: No "headers" block required when OAuth 2.1 is enabled!
    }
  }
}
```

**Claude Desktop Configuration (HTTP Mode with Legacy Mode 3 Auth):**
If enforcing `APIDASH_MCP_TOKEN`, you must explicitly pass the `Authorization` header.
```jsonc
{
  "mcpServers": {
    "apidash": {
      "type": "http",
      "url": "https://your-server-url.com/mcp",
      "headers": {
        "Authorization": "Bearer X7kP2mNqR9vL4wYjH8cE1dZsA3uT5bGf6nMoW0eI="
      }
    }
  }
}
```

#### Verification Checklist

| Issue | What to Check |
|---|---|
| Copilot stuck waiting for Server | Ensure your `.env` is loaded by restarting the server. Run `Developer: Reload Window` in VS Code to clear the broken handshake cache and trigger the OAuth prompt. |
| Still getting `401` in Mode 3 | Ensure the header reads `Bearer <space> <token>` — the space after `Bearer` is mandatory |
| Updated agent config but no change | Fully quit and relaunch Claude Desktop or VS Code |

---

## Amazon Bedrock AgentCore Cloud Deployment

To take the MCP server beyond localhost and make it accessible globally to cloud agents or team members, APIDash natively supports deployment to the **Amazon Bedrock AgentCore Runtime**.

Because our architecture uniquely supports the `StreamableHTTPServerTransport` at `POST /mcp` (the exact protocol AgentCore expects), the server is fully ready for zero-latency serverless cloud deployments.

#### Architecture Flow: Amazon Bedrock to APIDash MCP

<img width="1408" height="768" alt="Gemini_Generated_Image_3irdc3irdc3irdc3" src="https://github.com/user-attachments/assets/d8e29bce-33fd-4521-b0b6-6bea187e0f76" />


### Required Files & AWS Configurations

To explicitly target the AWS runtime environment, the project root contains the following custom configurations:

1. **`Dockerfile` & `.dockerignore`**: Preconfigured for a 2-stage build targeting AWS's `linux/arm64` container runtime utilizing Node.js 22 Slim.
2. **`agentcore/agentcore.json`**: The internal scaffolding file read by the AWS `@aws/agentcore` CLI. It configures the runtime to recognize our server's `POST /mcp` endpoint and mandates a `CUSTOM_JWT` Authorizer to protect the web interfaces from unauthorized execution.
3. **`agentcore/aws-targets.json`**: Declares the `us-east-1` AWS deployment region and specific AWS account targets.

### Changes Made to `src/index.ts`

Only a single minimal adjustment was made to the Express boot sequence to accommodate AWS serverless networking limitations:
- The `app.listen()` block was explicitly bound to host `"0.0.0.0"` and assigned to `PORT=8000` via the environment variables to align with Amazon ECS's strict networking interface.

### Deployment Setup Guide

**Step 1: Update Target AWS Account**
Edit `agentcore/aws-targets.json` and replace `"PLACEHOLDER_ACCOUNT_ID"` with your 12-digit AWS account number.

**Step 2: Create AWS Cognito User Pool & App Client**
To ensure secure M2M communication between Bedrock and the MCP server, we provision a Cognito User Pool specifically scoped for `client_credentials` flows:

```bash
export REGION=us-east-1

# 1. Create user pool
POOL_ID=$(aws cognito-idp create-user-pool --pool-name "salesmcpapps-pool" --region $REGION --query 'UserPool.Id' --output text)

# 2. Add domain for OAuth
aws cognito-idp create-user-pool-domain --user-pool-id $POOL_ID --domain "salesmcpapps-auth" --region $REGION

# 3. Create resource server
aws cognito-idp create-resource-server --user-pool-id $POOL_ID --identifier "salesmcpapps-auth" --name "Sales MCP Apps" --scopes '[{"ScopeName":"invoke","ScopeDescription":"Invoke MCP server"}]' --region $REGION

# 4. Create an App Client
CLIENT_OUTPUT=$(aws cognito-idp create-user-pool-client --user-pool-id $POOL_ID --client-name "salesmcpapps-client" --generate-secret --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH --allowed-o-auth-flows client_credentials --allowed-o-auth-scopes "salesmcpapps-auth/invoke" --allowed-o-auth-flows-user-pool-client --supported-identity-providers COGNITO --region $REGION)

CLIENT_ID=$(echo $CLIENT_OUTPUT | python3 -c "import sys,json; print(json.load(sys.stdin)['UserPoolClient']['ClientId'])")
CLIENT_SECRET=$(echo $CLIENT_OUTPUT | python3 -c "import sys,json; print(json.load(sys.stdin)['UserPoolClient']['ClientSecret'])")

echo "Your Client ID: $CLIENT_ID"
echo "Your Discovery URL: https://cognito-idp.$REGION.amazonaws.com/$POOL_ID/.well-known/openid-configuration"
```

**Step 3: Hydrate AgentCore Configurations**
Copy the `Client ID` and the `Discovery URL` outputted from the terminal block above. Open `agentcore/agentcore.json` and replace `"PLACEHOLDER_CLIENT_ID"` and `"PLACEHOLDER_DISCOVERY_URL"`.

**Step 4: Execute Deployment**
With the network and security layers configured, the server is deployed automatically via the `@aws/agentcore` CLI:

```bash
npm install -g @aws/agentcore
agentcore deploy --target default --yes
```

AWS automates the CDK synthesis, builds the Docker container utilizing AWS CodeBuild, pushes the image to Amazon ECR, and configures the AgentCore API Gateway.

### Connecting Custom AI Code Editors (VS Code)

Once the deployment finishes and the ARN is returned in `.cli/deployed-state.json`, any MCP client can consume it instantly.

You simply inject the ARN directly into your client's configuration (e.g., `.vscode/mcp.json`). Crucially, if you use VS Code, you must double-encode the URI parameter (`%252F` instead of `%2F`) so it strictly maps through the AgentCore HTTP translation API transparently:

```json
{
  "servers": {
    "apidash-mcp-remote": {
      "type": "http",
      "url": "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%...%252Fmy-server-abc123/invocations",
      "headers": {
        "Authorization": "Bearer <YOUR_GENERATED_JWT_TOKEN>"
      }
    }
  }
}
}
```

### Server Configuration Testing via cURL
To manually test the deployed Remote AWS endpoint securely, you must acquire an OAuth Bearer token using the `client_credentials` grant type and pass it alongside the URL-encoded runtime ARN.

```bash
# 1. Get Bearer token
TOKEN=$(curl -s -X POST \
  "https://salesmcpapps-auth.auth.$REGION.amazoncognito.com/oauth2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET&scope=salesmcpapps-auth/invoke" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 2. Extract & URL-encode the deployed ARN
RUNTIME_ARN=$(python3 -c "
import json
with open('agentcore/.cli/deployed-state.json') as f:
    state = json.load(f)
rt = list(state['targets']['default']['resources']['runtimes'].values())[0]
print(rt['runtimeArn'])
")
ENCODED_ARN=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$RUNTIME_ARN', safe=''))")

# 3. Execute MCP Initialization
curl -s -X POST \
  "https://bedrock-agentcore.$REGION.amazonaws.com/runtimes/${ENCODED_ARN}/invocations" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}'
```
You will receive a successful protocol response containing the `serverInfo` string, MCP version, and all 14 programmatic capabilities natively exported by APIDash.

### Cloud Cleanup
If you ever wish to cleanly destroy the deployed resources remotely without orphan entities (to permanently avoid unintended billing charges), execute:
```bash
aws cloudformation delete-stack --stack-name AgentCore-apidashmcp-default --region $REGION
aws cognito-idp delete-user-pool-domain --user-pool-id $POOL_ID --domain "salesmcpapps-auth" --region $REGION
aws cognito-idp delete-user-pool --user-pool-id $POOL_ID --region $REGION
```

---

## HTTP Health Check Verification

```bash
curl http://localhost:3001/health
```
```json
{
  "status": "ok",
  "server": "apidash-mcp",
  "version": "2.0.0",
  "tools": 14,
  "resources": 7,
  "transport": "streamable-http",
  "sep": "SEP-1865"
}
```

---

## Workspace Sync File — Cross-Platform Paths

Both CLI and MCP Server resolve the path via `getSyncFilePath()` in `@apidash/mcp-core/workspace.ts`:

| Platform | Default Path | Override |
|---|---|---|
| Linux | `~/.local/share/apidash/apidash_mcp_workspace.json` | `MCP_WORKSPACE_PATH=<path>` |
| macOS | `~/Library/Application Support/apidash/apidash_mcp_workspace.json` | `MCP_WORKSPACE_PATH=<path>` |
| Windows | `%APPDATA%\apidash\apidash_mcp_workspace.json` | `MCP_WORKSPACE_PATH=<path>` |

If the file does not exist, both tools fall back gracefully to `SAMPLE_REQUESTS` from `@apidash/mcp-core/data/api-data.ts`.

---

## Environment Variables

| Variable | Used by | Effect |
|---|---|---|
| `MCP_WORKSPACE_PATH` | CLI + MCP Server | Override the default cross-platform workspace JSON path |
| `APIDASH_AI_KEY` | CLI (`apidash-cli ai`) + MCP (`ai-llm-request`) | Default Bearer API key for LLM requests when `--key` is omitted |
| `APIDASH_MCP_TOKEN` | MCP Server (`bearerAuth` middleware) | OAuth 2.1 Bearer token. If set, all `/mcp` requests must send `Authorization: Bearer <token>` |

---

## Issues Faced & Fixes

During the development and testing of the Model Context Protocol (MCP) server, we encountered several complex integration challenges, particularly with exact protocol compliance for visual agents like VS Code Copilot. 

### 1. VS Code Copilot Authentication Loop
* **Issue:** When securing the MCP server, Copilot would not accept hardcoded `Authorization` headers in the `mcp.json` file. Instead, it would fail silently or get stuck in an endless loop reading `Waiting for server to respond to initialize request`, rejecting the standard static token implementations.
* **Fix:** We discovered that VS Code's internal MCP implementation strictly demands an **RFC 8414 OAuth 2.1 Metadata Discovery** flow to trigger its native UI. We resolved this by:
  1. Implementing `/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server` endpoints to dynamically serve the authorization URLs and capabilities.
  2. Modifying our 401 Unauthorized middleware to explicitly attach `WWW-Authenticate: Bearer resource_metadata="..."`. 
  This exact handshake allows VS Code to natively intercept the 401, pop up its built-in "Sign In" dialog, and negotiate an OAuth token seamlessly via the PKCE flow.

### 2. Configuration Precedence & Endpoint Masking
* **Issue:** We faced recurrent `fetch failed` and `ECONNREFUSED` connection errors (e.g., aiming at an obsolete port 3001 instead of 3002) despite the global MCP configurations being perfectly correct.
* **Fix:** We identified a configuration priority conflict—VS Code aggressively prioritizes the workspace-level configuration (`.vscode/mcp.json`) over the global user profile (`~/.config/Code/User/mcp.json`). We solved this by standardizing and strictly defining the `sse` transport endpoint (`http://localhost:3002/mcp/sse`) at the workspace level and removing legacy hardcoded token parameters to allow the OAuth 2.1 flow to take over completely.

### 3. Illegal URI Authority for Webview Routers
* **Issue:** We originally registered MCP UI resources using paths containing underscores (e.g., `ui://apidash_mcp_server`). Strict webview routers, including VS Code's internal browser, silently dropped or refused to parse these URIs because underscores are illegal in hostnames under the RFC 3986 URI specification.
* **Fix:** We renamed the authority to use a strictly compliant, hyphenated sequence (`ui://apidash-mcp`), ensuring reliable parsing and HTML rendering across all MCP-enabled agent webviews.

### 4. Bypassing the SEP-1865 App Lifecycle via Eager HTML
* **Issue:** When a UI tool like the HTTP Request Builder was called, our initial server implementation eagerly returned the absolute HTML string inline within the tool response. This actively bypassed the deliberate SEP-1865 (Apps Extension) lifecycle required for mounting visual elements.
* **Fix:** We refactored the tools to only return text instructions alongside a `_meta: { ui: { resourceUri: ... } }` tag. This architecture forces the client to explicitly fire a secondary `resources/read` request, which correctly fires the webview mounting sequence without overwhelming the LLM's context window.

### 5. Aggressive Client Tool Caching
* **Issue:** Even after comprehensively updating the server's tools or fixing bugs, VS Code Copilot aggressively cached the old `tools/list` payloads. The agent remained completely unaware that new capabilities existed and hallucinated failures when explicitly prompted.
* **Fix:** We instituted strict testing procedures mandating the use of `Developer: Reload Window` or temporarily renaming the server key inside `mcp.json` to spoof a new agent identity and trigger a fresh capabilities handshake from the client.

### 6. Copilot Edits vs. Copilot Chat Webview Support
* **Issue:** We spent debugging cycles attempting to render the visual UI cards inside the "Copilot Edits" pane. The UI would never appear because this specific workspace pane is designed purely for inline text editing and actively strips out or ignores webview renderers.
* **Fix:** We strictly documented and restricted all UI tool interactions to the main "Copilot Chat" sidebar, which is the only engine within VS Code that currently supports natively intercepting and rendering `ui://` resources.

### 7. Explicit Output Payload Validation (AxiosHeaders crash)
* **Issue:** When executing tools like `http-send-request`, the LLM agent threw an abrupt output validation error: `Invalid input: expected record, received AxiosHeaders`. This crash occurred because our MCP payload builder was passing raw Axios responses downstream. In Axios v1.0+, `response.headers` is an instance of the `AxiosHeaders` class—not a plain JSON object. The MCP Protocol strictly enforces its schema, and `z.record()` validation crashed because the object prototype didn't cleanly match a standard JS Dictionary.
* **Fix:** We updated `@apidash/mcp-core/executor.ts` to rigidly serialize the response headers via `JSON.parse(JSON.stringify(response.headers))` before dropping them into the `structuredContent` MCP block. This aggressively flattens the `AxiosHeaders` class instance back into a strict dictionary of string key-value pairs, resolving the Zod structural parse crash.

### 8. Cross-Process Webview UI State Synchronization (Stalled Iframes)
* **Issue:** Tools designed to render standalone UX panels (like the API Response Viewer) were stalling indefinitely on "Waiting for response data..." when invoked autonomously by an AI agent over standard `stdio`. The VS Code/Cursor Webview API pushes the LLM's raw intent (`ui/notifications/tool-input`) into the iframe lifecycle, but drops the vast underlying JSON *Output Result*, severely restricting how the UI syncs dynamic backend data in proxy environments that lack an accessible localhost HTTP origin. 
* **Fix:** We completely bypassed traditional network polling architectures by injecting native JSON-RPC loops directly into the iframe's lifecycle. By maintaining a single `globalLastResponse` shared memory pool in the Node backend and spinning up an invisible `_get-last-response` internal tool, the UI iframe actively executes downstream polling *through* the client's own IPC socket. The agent tunnels the request perfectly down its `stdio` stream back to our Node instance and safely returns the backend memory structure entirely over the standard tool bridge.

---

## MCP Tool Manifest (14 Tools)

| # | Tool Name | Visibility | Description |
|---|---|---|---|
| 1 | `request-builder` | model + app | Opens interactive HTTP request builder UI (SEP-1865 iframe) |
| 2 | `http-send-request` | model + app | Executes HTTP request via `executeHttpRequest`; returns status, headers, body, timing |
| 3 | `view-response` | model + app | Renders response in rich viewer UI with colour-coded status |
| 4 | `explore-collections` | model + app | Reads `apidash_mcp_workspace.json` and renders a searchable request list |
| 5 | `graphql-explorer` | model + app | Opens interactive GraphQL editor (pre-loaded Countries API example) |
| 6 | `graphql-execute-query` | app only | Server-side GraphQL execution via `executeGraphQLRequest`; app-visibility sandboxed |
| 7 | `codegen-ui` | model + app | Opens Code Generator UI; pre-populates with optional method/URL/body |
| 8 | `generate-code-snippet` | app only | Returns ready-to-copy code in 12 languages; app-visibility sandboxed |
| 9 | `manage-environment` | model + app | Opens Environment Variables Manager (global, dev, staging, prod scopes) |
| 10 | `update-environment-variables` | **app only** | Mutates env scope in workspace JSON; UI-sandboxed to prevent LLM hallucination |
| 11 | `get-api-request-template` | model + app | Fetches a saved request by ID from workspace JSON for inspection or execution |
| 12 | `ai-llm-request` | model | Chat-completion proxy to any OpenAI-compatible LLM (7 built-in provider shortcuts) |
| 13 | `save-request` | model | Persists a new HTTP/GraphQL request to `apidash_mcp_workspace.json` via `updateMcpWorkspaceData` |
| 14 | `_get-last-response` | app only | Internal polling endpoint used by Webview UIs to bypass `-32602` JSON-RPC payload limits |

**SEP-1865 UI Resources (7 panels):**

| Resource URI | Rendered by |
|---|---|
| `ui://apidash-mcp/request-builder` | `REQUEST_BUILDER_UI()` |
| `ui://apidash-mcp/response-viewer` | `RESPONSE_VIEWER_UI()` |
| `ui://apidash-mcp/collections-explorer` | `COLLECTIONS_EXPLORER_UI()` |
| `ui://apidash-mcp/graphql-explorer` | `GRAPHQL_EXPLORER_UI()` |
| `ui://apidash-mcp/code-generator` | `CODE_GENERATOR_UI()` |
| `ui://apidash-mcp/env-manager` | `ENV_MANAGER_UI()` |
| `ui://apidash-mcp/code-viewer` | `CODE_VIEWER_UI()` |

---

## Extended MCP Agent Triggering Prompts

The following is a complete prompt reference for all 14 tools exposed by the APIDash MCP server. These prompts are designed to trigger each tool naturally inside Claude Desktop, VS Code Copilot, or any MCP-compatible agent.

---

### Tool 1 — `request-builder` · Open HTTP Request Builder UI

> Opens an interactive HTTP request builder panel inside the agent chat window (SEP-1865 App panel).

**Example Prompts:**
- *"Open the APIDash request builder."*
- *"I want to build an HTTP request visually."*
- *"Launch the API request editor."*

**What the Agent Does:** Invokes `request-builder` → renders the full interactive UI panel with method selector, URL input, headers table, body editor, and auth fields directly inside the chat.

---

### Tool 2 — `http-send-request` · Execute an HTTP Request

> Sends a live HTTP request and returns the status, headers, body, and duration. The response populates the Response Viewer UI panel.

**Example Prompts:**
- *"Fire a GET request to `https://jsonplaceholder.typicode.com/posts/1`."*
- *"Send a POST to `https://httpbin.org/post` with body `{"name": "apidash"}`."*
- *"Hit `https://api.github.com/users/octocat` and show me the response."*
- *"Call `https://reqres.in/api/users` with `Authorization: Bearer mytoken123` header."*

**What the Agent Does:** Calls `http-send-request` with extracted method/URL/headers/body → displays HTTP status, timing, and formatted body in the Response Viewer.

---

### Tool 3 — `view-response` · Display a Response in the Viewer UI

> Renders any HTTP response (status, headers, body) inside the rich Response Viewer panel.

**Example Prompts:**
- *"Show that response in the APIDash viewer."*
- *"Display the API response I just got."*
- *"Open the response panel with status 200 and this JSON body: `{"id": 1}`."*

**What the Agent Does:** Calls `view-response` with the provided response data → opens the Response Viewer UI panel color-coded by status, with formatted JSON body and metrics.

---

### Tool 4 — `explore-collections` · Browse Saved API Collections

> Lists all saved requests from the APIDash workspace file and opens the Collections Explorer panel.

**Example Prompts:**
- *"Show me all my saved API requests."*
- *"Open my APIDash collections."*
- *"What requests have I saved in APIDash?"*
- *"List my request library."*

**What the Agent Does:** Calls `explore-collections` → reads `apidash_mcp_workspace.json` and returns a searchable list of all saved requests. Opens the Collections Explorer sidebar panel in the chat.

---

### Tool 5 — `graphql-explorer` · Open GraphQL Explorer UI

> Launches an interactive GraphQL query editor panel pre-wired to the Countries public API.

**Example Prompts:**
- *"Open the APIDash GraphQL explorer."*
- *"I want to write a GraphQL query interactively."*
- *"Launch the GraphQL dashboard."*

**What the Agent Does:** Calls `graphql-explorer` → renders the full GraphQL Editor panel with a query editor, variables JSON editor, headers section, and built-in formatter inside the chat.

---

### Tool 6 — `graphql-execute-query` · Execute a GraphQL Query

> Runs a GraphQL query or mutation server-side and returns the parsed JSON response.

**Example Prompts:**
- *"Run this GraphQL query against `https://countries.trevorblades.com/graphql`: `{ countries { name code } }`."*
- *"Execute a GraphQL mutation on my API at `https://api.example.com/graphql`."*
- *"Query the GitHub GraphQL API for my repository list."*

**What the Agent Does:** Calls `graphql-execute-query` with the endpoint URL, query string, and optional variables → returns status code, duration, the data object, and a `hasErrors` boolean.

---

### Tool 7 — `codegen-ui` · Open Code Generator UI Panel

> Opens the Code Generator UI panel, optionally pre-loaded with a specific request.

**Example Prompts:**
- *"Open the APIDash code generator."*
- *"I want to generate code for this API call."*
- *"Launch the code snippet generator for a GET to `https://api.example.com/data`."*

**What the Agent Does:** Calls `codegen-ui` → opens the Code Generator panel showing language options (cURL, Python, JavaScript, Dart, Go, Java, Kotlin, PHP, Ruby, Rust, and more). If a method/URL was specified, the panel is pre-populated.

---

### Tool 8 — `generate-code-snippet` · Generate Code for Any Language

> Server-side code generation — returns ready-to-run code for a given HTTP request in the specified programming language.

**Example Prompts:**
- *"Generate a Python `requests` snippet for `GET https://jsonplaceholder.typicode.com/posts`."*
- *"Give me a cURL command for a POST to `https://httpbin.org/post` with a JSON body."*
- *"Generate Dart `http` code for this API call."*
- *"Write a Go HTTP snippet for a DELETE request to `https://api.example.com/items/5`."*

**Supported Generators:** `curl`, `python-requests`, `javascript-fetch`, `javascript-axios`, `nodejs-fetch`, `dart-http`, `go-http`, `java-http`, `kotlin-okhttp`, `php-curl`, `ruby-net`, `rust-reqwest`

**What the Agent Does:** Calls `generate-code-snippet` with the generator name + request details → returns complete, runnable code in a markdown code block.

---

### Tool 9 — `manage-environment` · Open Environment Variables Manager

> Opens the Environment Variables Manager UI panel with all four scopes: Global, Development, Staging, Production.

**Example Prompts:**
- *"Open the APIDash environment manager."*
- *"I need to set my API keys in APIDash."*
- *"Manage my API environment variables."*
- *"Show me my production environment config."*

**What the Agent Does:** Calls `manage-environment` → opens the Env Manager panel. Use `{{VARIABLE_NAME}}` syntax in URLs, headers, and body fields to reference any variable (e.g. `https://{{BASE_URL}}/api/{{VERSION}}/users`).

---

### Tool 10 — `update-environment-variables` · Save Environment Variables

> Saves a set of key-value environment variables to the specified scope and persists them to the workspace JSON file.

**Example Prompts:**
- *"Set `BASE_URL` to `https://api.example.com` in the development environment."*
- *"Save my production API key. Set `API_KEY` to `sk-prod-abc123` as a secret."*
- *"Update my staging environment: `HOST=staging.myapp.com`, `DEBUG=true`."*

**What the Agent Does:** Calls `update-environment-variables` with the scope and variables array → writes to `apidash_mcp_workspace.json` → Flutter `McpSyncService` detects the file change and hydrates the Riverpod providers within milliseconds.

---

### Tool 11 — `get-api-request-template` · Load a Saved Request Template

> Retrieves a complete pre-built API request definition from the workspace by its template ID.

**Example Prompts:**
- *"Load the 'create-post' request template."*
- *"Get me the GitHub user request template."*
- *"Fetch the `httpbin-post` template and run it."*

**Available Template IDs:** `get-posts`, `get-post`, `create-post`, `update-post`, `delete-post`, `get-users`, `get-comments`, `github-user`, `httpbin-get`, `httpbin-post`

**What the Agent Does:** Calls `get-api-request-template` → returns the full request object (method, URL, headers, body, description) and opens it in the Request Builder panel.

---

### Tool 12 — `ai-llm-request` · Chat with Any LLM via APIDash

> Sends a chat completion to any OpenAI-compatible LLM endpoint and returns the model's reply with full token usage stats.

**Example Prompts:**
- *"Ask GPT-4o: `Summarize this API response for me.`"*
- *"Send this to Llama 3 on Groq: `Explain REST vs GraphQL.`"*
- *"Use Gemini Pro to write a test case for this endpoint."*
- *"Ask my local Ollama model `What is the best HTTP method for updating a resource?`"*
- *"Call Mistral with system prompt `You are an API testing expert.` and ask `What status code means rate limited?`"*

**Supported Provider Shorthands:** `openai`, `groq`, `mistral`, `together`, `ollama`, `gemini`, `anthropic` (or any raw URL)

**What the Agent Does:** Calls `ai-llm-request` with the resolved endpoint URL, model, and messages → returns the model's content, duration, and token counts (`inputTokens`, `outputTokens`, `totalTokens`).

---

### Tool 13 — `save-request` · Save a New Request to Workspace

> Persists a new API request definition (name, method, URL, headers, body) to the APIDash workspace JSON file so it appears in the Flutter app's collections and the CLI.

**Example Prompts:**
- *"Save this GET request to `https://api.github.com/users/octocat` as 'GitHub Octocat Profile'."*
- *"Add this POST endpoint to my APIDash workspace."*
- *"Save the request we just built to my collection."*

**What the Agent Does:** Calls `save-request` → generates a unique ID → appends the request to `apidash_mcp_workspace.json` → Flutter UI and `apidash-cli list` both show it immediately. Returns the assigned ID so you can call `apidash-cli run <id>` directly.

---

## Headless CLI Capability Matrix (v2.0)

| Command | Sub-flags | Capability |
|---|---|---|
| `list` | — | Indexed table of all saved requests (ID + index + method + URL + name) |
| `run <id\|index>` | `--timeout <ms>` | Execute saved request by 1-based index or string ID; coloured status badge |
| `request <METHOD> <URL>` | `--header`, `--body`, `--timeout`, `--save [name]`, `--codegen <lang>` | Ad-hoc HTTP; optionally saves to workspace and/or prints code snippet |
| `graphql <URL>` | `--query`, `--variable key=val` (repeatable), `--operation`, `--header`, `--timeout`, `--save [name]` | Ad-hoc GraphQL with inline variables |
| `ai <url\|provider>` | `--prompt`, `--system`, `--model`, `--key`, `--temp`, `--tokens`, `--raw` | Chat with any OpenAI-compatible LLM |
| `save <METHOD> <URL>` | `--name`, `--header`, `--body` | Persist new request to workspace |
| `providers` | — | List 7 built-in AI provider shortcuts (openai, groq, mistral, together, ollama, gemini, anthropic) |
| `env [scope]` | — | Display environment variables; masks `--secret` values as `●●●●●●●●` |
| `set <scope> <key> <val>` | `--secret` | Upsert environment variable; persists to workspace JSON |
| `codegen <id\|index> <lang>` | — | Generate code snippet in 12 languages |
| `langs` | — | List all 12 supported code generator IDs |
| `info` | — | Workspace path, connection status, request/env counts, last sync, platform |
| `help / -h / --help` | — | Full ASCII banner with all commands, flags, and environment variables |

---

## Expanded CLI Reference

*`run` Options & Overrides:*
```bash
apidash-cli run 1                         # by 1-based index
apidash-cli run get-posts                 # by string ID
apidash-cli run create-post --timeout 5000
apidash-cli run my-production-endpoint
```

*`env` & `set` Commands:*
```bash
apidash-cli env                          # all scopes
apidash-cli env global                   # one scope
apidash-cli set development API_KEY abc123xyz
apidash-cli set production AUTH_TOKEN s3cr3t --secret  # masked in env output
```

*`codegen` Examples:*
```bash
apidash-cli codegen 1 python-requests
apidash-cli codegen get-posts javascript-fetch
apidash-cli codegen create-post dart-http
apidash-cli codegen github-user curl
apidash-cli codegen httpbin-post rust-reqwest
```

**Supported generators:** `curl`, `python-requests`, `javascript-fetch`, `javascript-axios`, `nodejs-fetch`, `dart-http`, `go-http`, `java-http`, `kotlin-okhttp`, `php-curl`, `ruby-net`, `rust-reqwest`.

---

## CLI Sample Execution Output Logs

*`list` command:*
```
📁 APIDash Request Collections
   Source: ~/.local/share/apidash/apidash_mcp_workspace.json
────────────────────────────────────────────────────────────
    1. get-posts     GET     https://jsonplaceholder.typicode.com/posts
    2. create-post   POST    https://jsonplaceholder.typicode.com/posts
   14 request(s)  •  run: apidash-cli run <id|index>
```

*`run 2` output:*
```
🚀 Executing  POST  https://jsonplaceholder.typicode.com/posts
   ID: create-post  •  Timeout: 30000ms
────────────────────────────────────────────────────────────
   201  Created    87ms   0.05 KB

  Headers (selected):
    content-type          application/json; charset=utf-8

  Response Body:
  ──────────────────────────────────────────────────────
  {
    "title": "foo",
    "body": "bar",
    "userId": 1,
    "id": 101
  }
```

*`info` command:*
```
ℹ  APIDash CLI — Workspace Info
────────────────────────────────────────────────────────────
  File path:    ~/.local/share/apidash/apidash_mcp_workspace.json
  Status:       Connected to APIDash Flutter
  Requests:     14
  Envs:         3
  Last sync:    6/4/2026, 9:47:32 PM
  Platform:     linux  Node: v20.19.1
```

*`codegen 1 python-requests`:*
```python
import requests

url = "https://jsonplaceholder.typicode.com/posts"
headers = {}

response = requests.get(url, headers=headers)
print(response.status_code)
print(response.json())
```

*`ai groq --prompt "Summarise REST APIs" --model mixtral-8x7b-32768`:*
```
🤖 AI Request  [ Groq ]  model: mixtral-8x7b-32768
  prompt: Summarise REST APIs
────────────────────────────────────────────────────────────
  ✅ 200  412ms  tokens: 8→152 = 160  stop: stop

  Assistant:
  ──────────────────────────────────────────────────────
  REST (Representational State Transfer) is an architectural style
  for designing networked applications. It uses standard HTTP methods
  (GET, POST, PUT, DELETE) and is stateless...
```

---

## Protocol Security & System Methodologies

### Hash Gate Security Layer
The server implements a `ToolHashRegistry` that, at boot time, computes `SHA-256(name + description + JSON.stringify(schema))` for every registered tool. On every invocation, `verifyAndThrow()` recomputes the same hash and rejects with error code `-32600` if the signature has drifted. This makes prompt-injection attacks that attempt to substitute a different schema at runtime impossible.

```typescript
class ToolHashRegistry {
  private hashes = new Map<string, string>();
  register(name: string, description: string, schema: any = {}) {
    const hash = crypto.createHash('sha256')
      .update(name + description + JSON.stringify(schema))
      .digest('hex');
    this.hashes.set(name, hash);
  }
  verifyAndThrow(name: string, description: string, schema: any = {}) {
    const currentHash = crypto.createHash('sha256')
      .update(name + description + JSON.stringify(schema))
      .digest('hex');
    if (this.hashes.get(name) !== currentHash) {
      throw { code: -32600, message: `Invalid tool signature for ${name}` };
    }
  }
}
```

### Multi-Transport Support

| Transport | Invocation | Use-case |
|---|---|---|
| `StreamableHTTPServerTransport` | POST `/mcp` (stateless) | Web-based chatflows, browser clients, Inspector debugging |
| `StdioServerTransport` | `node dist/index.js --stdio` | Claude Desktop, VS Code Copilot, any stdio-compatible MCP host |
| SSE endpoint | GET `/mcp/sse` | Long-lived streaming responses for real-time events |

### SEP-1865 Client App Extensions

* **Two-Way Setup Handshake:** All UI resources initiate secure mounting with `request('ui/initialize')` → host propagates context → `notify('ui/notifications/initialized')`.
* **Tool Visibility Sandboxing:** Destructive write tools (`update-environment-variables`, `generate-code-snippet`, `graphql-execute-query`) carry `visibility: ["app"]` in their `_meta.ui` block. This prevents the LLM itself from triggering these mutations — only in-iframe button clicks from verified UI surfaces can call them.
* **Memory Injection:** `ui/update-model-context` is emitted after every HTTP execution, pushing the response JSON and analytics into the active LLM's working memory.
* **Content Security Policy:** GraphQL Explorer declares `resourceDomains: ["https://countries.trevorblades.com"]` to prevent cross-origin fetch exploitation within injected iframes.
* **Context Theming:** `applyHostContext()` listens to `ui/notifications/host-context-changed` and swaps the CSS-in-JS templates between dark/light mode in sync with the host OS.
* **Native File Save:** `downloadJSON()` triggers `ui/download-file` to invoke the OS file-save dialog without any additional Electron or native bridges.

### Graceful Degradation

Both the MCP Server and the CLI detect when `apidash_mcp_workspace.json` does not exist. Rather than crashing, they fall back to a rich set of sample requests and empty environments (`SAMPLE_REQUESTS` from `@apidash/mcp-core/data/api-data.ts`). This means new users without a running Flutter instance can still demo every tool immediately after `npm install`.

---

## Evolving to MCP 2025–2026 Standards: The Architectural Refactor

The initial Proof-of-Concept for the APIDash MCP server was built as a single monolithic file. As the MCP specification evolved — adding OAuth gates, stateless transports, safety annotations, and output schemas — keeping everything in one file became a structural bottleneck. The following documents the deliberate refactor from a prototype to a production-grade, spec-compliant server.

### Before — The 853-Line Monolith

```
src/
├── index.ts     ← 853 lines: entry point + server config + 14 tools + 7 resources + routing + security
├── styles.ts
├── data/
│   └── api-data.ts
└── ui/
    ├── request-builder.ts
    ├── response-viewer.ts
    ├── collections-explorer.ts
    ├── graphql-explorer.ts
    ├── code-generator.ts
    └── env-manager.ts
```

**Problems with the monolith:**
- A single global `new McpServer()` at the top of the file meant all concurrent HTTP clients shared the same instance — state could bleed between sessions.
- Mixing Express routing, security middleware, UI definitions, and 13 tool handlers in one file made debugging and reviewing PRs extremely slow.
- No room to adopt new MCP spec features without pushing the file well past 1,000 lines.

---

### After — MCP 2025–2026 Compliant Modular Structure

```text
src/
├── index.ts                  ← ~110 lines: thin composition root (wiring only)
├── factory.ts                ← createMcpServer(): all 14 tools + 7 resources
├── middleware/
│   └── auth.ts               ← Bearer token config gate
├── oauth/                    ← Added: Full OAuth2.1 Authorization Code Flow
│   ├── routes.ts             ← /oauth/authorize, /oauth/callback, /oauth/token
│   └── store.ts              ← In-memory Token/State PKCE store
├── routes/
│   ├── health.ts             ← GET /health
│   └── wellKnown.ts          ← GET /.well-known/mcp (server card, March 2026)
├── tools/
│   ├── annotations.ts        ← ToolAnnotations for all tools
│   └── schemas.ts            ← outputSchema for all tools
├── styles.ts                 
├── data/
│   └── api-data.ts           
└── ui/                       
    ├── code-generator.ts
    ├── code-viewer.ts
    ├── collections-explorer.ts
    ├── env-manager.ts
    ├── graphql-explorer.ts
    ├── request-builder.ts
    └── response-viewer.ts
```

---

### What Changed and Why

#### 1. Per-Request Stateless Factory (`src/factory.ts`)
- **Old:** `const server = new McpServer(...)` — single shared global instance.
- **New:** `export function createMcpServer()` — returns a fully configured server on every call. Both `POST /mcp` and `GET /mcp/sse` call this at the top of their handlers.
- **Why:** Stateless Transport Compliance. Each HTTP request gets an isolated `McpServer` instance. Session A can never bleed tool context or state into Session B.

> **In Plain Terms:** Think of a global server as a single shared shopping cart in a store. If two customers add items simultaneously, their carts get mixed up. The factory pattern gives every customer their *own* cart. If User A is running a task, their data or context cannot accidentally leak into User B's session because they are not sharing the same server object.

#### 2. Thin Composition Root (`src/index.ts`)
- **Old:** index.ts contained all tool registrations, resource definitions, Express routes, and startup logic.
- **New:** index.ts only handles Express setup, CORS, middleware mounting, and delegates all server logic to `createMcpServer()`.
- **Why:** Clear separation of concerns. The network layer is decoupled from tool behaviour. The file shrunk from 853 lines to ~110 lines with zero loss of functionality.

> **In Plain Terms:** The main file became a small "traffic controller" for the web server. It knows *where* to send requests, not *how* to handle them. It is easier to maintain a 110-line file than an 850-line one — a PR reviewer can understand the whole entry point in 2 minutes instead of 20.

#### 3. OAuth 2.1 Bearer Token Middleware (`src/middleware/auth.ts`)
- **Added:** A reusable Express middleware that reads `APIDASH_MCP_TOKEN` from the environment. If unset, all requests pass through. If set, every `POST /mcp` request must carry a matching `Authorization: Bearer <token>` header or receive `401 Unauthorized`.
- **Why:** Moves authentication to the network edge. Tools never execute if the client is unauthenticated. This implements the MCP November 2025 OAuth 2.1 spec requirement.

> **In Plain Terms:** This is the "bouncer at the door." If the environment variable is not set, everyone gets in freely (useful in local development). Once the token is set in production, any agent without the matching secret password is bounced immediately — it never even reaches a tool handler.

```typescript
// Applied as: app.use('/mcp', bearerAuth)
export function bearerAuth(req, res, next) {
  const token = process.env.APIDASH_MCP_TOKEN;
  if (!token) return next();
  const auth = req.headers['authorization'] || '';
  if (!auth.startsWith('Bearer ') || auth.slice(7) !== token)
    return res.status(401).json({ error: 'Unauthorized' });
  next();
}
```

##### When Does Authentication Fail? (`401 Unauthorized`)

The middleware returns a `401` error in exactly three scenarios:

| Failure Scenario | Cause |
|---|---|
| **No-ID Fail** | Request arrives with no `Authorization` header at all |
| **Wrong Format Fail** | Header exists but does not start with `Bearer ` (note: space is mandatory) |
| **Wrong Password Fail** | Header format is correct but the token string does not exactly match `APIDASH_MCP_TOKEN` |



#### 4. MCP Server Discovery Card (`src/routes/wellKnown.ts`)
- **Added:** `GET /.well-known/mcp` — returns the server's name, protocol version, capabilities, and endpoint.
- **Why:** The MCP March 2026 Roadmap adopts standard discovery routes analogous to `/.well-known/openid-configuration`. Agentic clients can query capabilities without an active connection, enabling zero-config integration in Claude Desktop, VS Code Copilot, and registry tooling.

> **In Plain Terms:** This is the server's public "business card." Modern AI tools can read this card and automatically know how to connect, what protocol to speak, and what features are available — without a human having to manually type in settings.

```json
{
  "name": "apidash-mcp",
  "protocolVersion": "2025-11-25",
  "capabilities": { "tools": {}, "resources": {}, "prompts": {} },
  "endpoint": "/mcp",
  "transport": "streamable-http"
}
```

#### 5. Tool Safety Annotations (`src/tools/annotations.ts`)
- **Added:** Per-tool `ToolAnnotations` objects — `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint` — for all 14 tools.
- **Why (MCP Blog March 16 2026):** AI models use these hints to decide whether to ask for user confirmation. For example, `http-send-request` carries `destructiveHint: true, openWorldHint: true`, signalling to Claude that this action reaches out to the real world and may not be reversible. `explore-collections` carries `readOnlyHint: true`, allowing the LLM to call it freely with no confirmation needed.

> **In Plain Terms:** These are "Warning Labels" on each tool that tell the AI exactly how dangerous it is.
> - `readOnlyHint: true` → The AI can run this freely with no confirmation (e.g., browsing a list of saved requests).
> - `destructiveHint: true` → The AI **must stop and ask the user** before executing (e.g., sending an HTTP request that could modify real data on an external server).
> - `openWorldHint: true` → The tool reaches out to the internet; its effects are unpredictable.

```typescript
"http-send-request":            { readOnlyHint: false, destructiveHint: true,  openWorldHint: true  },
"explore-collections":          { readOnlyHint: true,  destructiveHint: false, openWorldHint: false },
"update-environment-variables": { readOnlyHint: false, destructiveHint: true,  idempotentHint: true, openWorldHint: false },
```

#### 6. Granular Output Schemas (`src/tools/schemas.ts`)
- **Added:** Explicit JSON Schema `outputSchema` for every tool, matching the exact shape of each tool's `structuredContent` return value.
- **Why (MCP spec rev 2025-06-18):** Without output schemas, the LLM must guess what fields a tool returns, leading to hallucinated field names in chained tool calls. With them, the model knows exactly that `ai-llm-request` returns `{ model, duration, content, inputTokens, outputTokens, totalTokens, finishReason }` — enabling safe, accurate agent reasoning chains.

> **In Plain Terms:** Without this, an AI might guess the name of a return field and get it wrong (hallucination). For example, it might look for `response_body` when the real field is called `body`. Now the AI knows the *exact* shape of every tool's response, making multi-step reasoning chains dramatically more reliable.

---

### Summary

This architectural evolution transforms the APIDash MCP server from an experimental single-file prototype into a professional-grade, secure, and agent-friendly toolset. Each change maps directly to an official MCP specification requirement or roadmap milestone — making the server a first-class citizen in the 2025–2026 agentic ecosystem.

| Change | Standard Addressed |
|---|---|
| Per-request server factory | Stateless transport compliance |
| OAuth 2.1 middleware | MCP Nov 2025 security spec |
| `/.well-known/mcp` card | MCP March 2026 Roadmap |
| Tool annotations | MCP Blog March 16 2026 |
| Output schemas | MCP spec rev 2025-06-18 |

### SDK Version

`@modelcontextprotocol/sdk` was bumped from `^1.25.2` to `^1.29.0` to access the `ToolAnnotations` type and `outputSchema` field added in the 2025 November and June 2025 protocol revisions.

---


## Streamable Debugging (MCP Inspector)

```bash
# Inspect HTTP transport live
npm run inspector:http
# → Opens Inspector UI at http://localhost:5173
# → Connected to: http://localhost:3001/mcp

# Inspect stdio transport
npx @modelcontextprotocol/inspector -- npx tsx src/index.ts --stdio
```

The Inspector lets you:
- Browse all 14 registered tools and their Zod-validated input schemas
- Browse all 7 SEP-1865 resource URIs and preview their HTML content
- Execute tools manually and inspect raw JSON-RPC payloads
- Verify SHA-256 Hash Gate signatures are accepting calls correctly

---

## Installation & Development Features

### CLI E2E Test Suite (`test_cli.sh`)
A bash integration test suite covering **25 test scenarios** across every command path:

| Section | Tests |
|---|---|
| Saved-request commands | `help`, `info`, `langs`, `list`, `run` (by index + by ID), `codegen` (4 languages), `set` + `env` with secret masking |
| Ad-hoc HTTP | GET 200, GET response body, POST 201, `--codegen` flag, `--save` flag, DELETE, multi-header |
| Ad-hoc GraphQL | Basic query, query with variable, `--save` flag |
| AI (error paths) | Auth failure graceful exit (no crash), missing `--prompt` usage hint |
| Providers | Lists openai, groq, ollama, gemini |
| Save command | GET + POST with body + header, appears in `list` |
| Error handling | Unknown command, missing ID, missing URL, missing `--query` |

```bash
cd packages/apidash_cli
chmod +x test_cli.sh
./test_cli.sh
# → Prints: Tests: 25   ✅ Passed: 25   ❌ Failed: 0
```

---

## 4. Development Timeline (March 31 – April 8, 2026)

| Date | Deliverables & Milestones |
|---|---|
| **March 31** | Submitted PR #1613 covering the initial MQTT, WebSocket, and gRPC implementation idea and architecture. |
| **April 1–2** | **Monorepo Architecture:** Finalized the Decoupled Sibling Architecture by extracting `@apidash/mcp-core` into a shared library. Confirmed it resolves cleanly in both consumers. |
| **April 3** | **State Synchronization:** Implemented Dart `McpSyncService` for bi-directional file synchronization between Flutter and Node.js. |
| **April 4–5** | **Amazon Bedrock AgentCore Implementation:** Containerized the APIDash MCP server for cloud environments. Configured `agentcore.json`, Dockerfiles, built AWS Cognito M2M Authorizer pools, and deployed serverless architecture onto the Amazon Bedrock AgentCore execution layer. |
| **April 6** | **Transport, Security & OAuth 2.1:** Implemented `StreamableHTTPServerTransport`, `SSEServerTransport`, and `ToolHashRegistry`. Finalized RFC 8414 OAuth 2.1 Metadata Discovery to securely handshake with VS Code Copilot. |
| **April 7** | **Integration & Flowcharts:** Resolved complex integration issues (e.g., Copilot Cache busting, AxiosHeaders validation crashes, UI iframe polling). Designed and added comprehensive Mermaid architecture flowcharts documenting the entire communication stack. |
| **April 8** | **Final Merge & Submission:** Final PR Polish, synchronized proposal document details, and submitted the final GSoC 2026 Proposal PR. |

---

## 5. Communications

I am comfortable with any communication channel. For text communication, I prefer **Discord** and **Email**. For video calls and pair programming sessions, I prefer using **Google Meet**.

During the summer, as I will have no academic commitments, I will be dedicating **40-50 hours per week** (approximately **7-8 hours on weekdays** and **5-6 hours on weekends**). In case of any delays or blockers, I will promptly communicate with my mentors to discuss the issue and find a solution. I am also willing to work overtime if necessary to meet the project goals. I have explicitly set aside the final week of the timeline as a buffer to accommodate any unforeseen adjustments.

- **Timezone:** IST / GMT +5:30 (Indian Standard Time)
- **Working Hours:** Flexible, typically 10:00 AM – 8:00 PM IST
- **Email:** rocroshanga@gmail.com
- **Phone:** +91-7826860136
- **Discord:** `roshanmelvin`

---

## 6. Feedback from API Dash

*If you have read this proposal, please provide your short general feedback in the section below. Feel free to make comments anywhere above as well.*

| Reviewer Username | Date | Comment |
|:---|:---|:---|
| *(reviewer)* | *(date)* | *(feedback here)* |
| *(reviewer)* | *(date)* | *(feedback here)* |
| *(reviewer)* | *(date)* | *(feedback here)* |
