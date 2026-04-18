import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import type { CallToolResult, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { requestBuilderUI } from "./ui/request-builder.js";
import { responseViewerUI } from "./ui/response-viewer.js";
import { codeGeneratorUI } from "./ui/code-generator.js";
import { generateAllSnippets } from "./utils/codegen.js";
import { SAMPLE_REQUESTS } from "./data/sample-requests.js";

const URI = "ui://apidash-mcp-apps";

export function createServer(): McpServer {
  const server = new McpServer({ name: "apidash-mcp-apps", version: "1.0.0" });

  // ─── Resources (MCP App UIs) ────────────────────────────────

  registerAppResource(
    server,
    "request-builder-ui",
    `${URI}/request-builder`,
    { description: "Interactive API request builder with method selector, URL input, headers/params/body tabs, and preset selector." },
    async (): Promise<ReadResourceResult> => ({
      contents: [{ uri: `${URI}/request-builder`, mimeType: RESOURCE_MIME_TYPE, text: requestBuilderUI() }],
    })
  );

  registerAppResource(
    server,
    "response-viewer-ui",
    `${URI}/response-viewer`,
    { description: "HTTP response viewer with status badge, headers table, syntax-highlighted JSON body, and timing/size cards." },
    async (): Promise<ReadResourceResult> => ({
      contents: [{ uri: `${URI}/response-viewer`, mimeType: RESOURCE_MIME_TYPE, text: responseViewerUI() }],
    })
  );

  registerAppResource(
    server,
    "code-generator-ui",
    `${URI}/code-generator`,
    { description: "Code snippet viewer with tabbed language selector (cURL, Python, JS, Dart, Go) and copy button." },
    async (): Promise<ReadResourceResult> => ({
      contents: [{ uri: `${URI}/code-generator`, mimeType: RESOURCE_MIME_TYPE, text: codeGeneratorUI() }],
    })
  );

  // ─── Tools ──────────────────────────────────────────────────

  registerAppTool(
    server,
    "build-api-request",
    {
      description: "Open the request builder UI pre-populated with the given parameters.",
      inputSchema: {
        method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"]).optional().describe("HTTP method"),
        url: z.string().optional().describe("Request URL"),
        queryParams: z.record(z.string()).optional().describe("Query parameters"),
        headers: z.record(z.string()).optional().describe("HTTP headers"),
        body: z.string().optional().describe("Request body (JSON)"),
        preset: z.string().optional().describe("Preset name: " + SAMPLE_REQUESTS.map((r) => `"${r.name}"`).join(", ")),
      },
      _meta: { ui: { resourceUri: `${URI}/request-builder` } },
    },
    async (args): Promise<CallToolResult> => {
      let method = args.method || "GET";
      let url = args.url || "";
      let queryParams = args.queryParams;
      let headers = args.headers;
      let body = args.body;

      if (args.preset) {
        const preset = SAMPLE_REQUESTS.find((r) => r.name.toLowerCase() === args.preset!.toLowerCase());
        if (preset) {
          method = args.method || preset.method;
          url = args.url || preset.url;
          queryParams = args.queryParams || preset.queryParams;
          headers = args.headers || preset.headers;
          body = args.body || preset.body;
        }
      }

      return {
        content: [{ type: "text" as const, text: `Request builder: ${method} ${url || "(empty)"}` }],
        structuredContent: { method, url, queryParams, headers, body },
      };
    }
  );

  registerAppTool(
    server,
    "execute-api-request",
    {
      description: "Execute an HTTP request server-side (avoids CORS) and return the full response.",
      inputSchema: {
        method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"]).describe("HTTP method"),
        url: z.string().url().describe("Request URL"),
        queryParams: z.record(z.string()).optional().describe("Query parameters"),
        headers: z.record(z.string()).optional().describe("HTTP headers"),
        body: z.string().optional().describe("Request body"),
      },
      _meta: { ui: { resourceUri: `${URI}/response-viewer`, visibility: ["app"] as const } },
    },
    async (args): Promise<CallToolResult> => {
      const startTime = Date.now();
      try {
        const urlObj = new URL(args.url);
        if (args.queryParams) {
          for (const [key, value] of Object.entries(args.queryParams)) {
            urlObj.searchParams.set(key, value);
          }
        }

        const fetchOpts: RequestInit = { method: args.method, headers: args.headers || {} };
        if (args.body && !["GET", "HEAD"].includes(args.method)) fetchOpts.body = args.body;

        const response = await fetch(urlObj.toString(), fetchOpts);
        const duration = Date.now() - startTime;
        const responseBody = await response.text();

        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((v, k) => { responseHeaders[k] = v; });

        let parsedBody: unknown = responseBody;
        try { parsedBody = JSON.parse(responseBody); } catch { /* raw text */ }

        const result = {
          statusCode: response.status, statusText: response.statusText,
          headers: responseHeaders, body: parsedBody, duration,
          size: new TextEncoder().encode(responseBody).length,
          url: urlObj.toString(), method: args.method,
          contentType: responseHeaders["content-type"] || "",
        };

        return {
          content: [{ type: "text" as const, text: `${args.method} ${urlObj} → ${response.status} ${response.statusText} (${duration}ms)` }],
          structuredContent: result,
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Error: ${msg}` }],
          structuredContent: { error: msg, duration: Date.now() - startTime, url: args.url, method: args.method, statusCode: 0, statusText: "Error", headers: {}, body: msg },
          isError: true,
        };
      }
    }
  );

  registerAppTool(
    server,
    "visualize-api-response",
    {
      description: "Render response data in the response viewer UI with status badge, headers, and highlighted body.",
      inputSchema: {
        statusCode: z.number().describe("HTTP status code"),
        statusText: z.string().optional().describe("Status text"),
        headers: z.record(z.string()).optional().describe("Response headers"),
        body: z.unknown().describe("Response body"),
        duration: z.number().optional().describe("Duration in ms"),
        url: z.string().optional().describe("Request URL"),
        method: z.string().optional().describe("HTTP method"),
      },
      _meta: { ui: { resourceUri: `${URI}/response-viewer` } },
    },
    async (args): Promise<CallToolResult> => ({
      content: [{ type: "text" as const, text: `Response: ${args.statusCode} ${args.statusText || ""} ${args.url ? `from ${args.method || ""} ${args.url}` : ""}`.trim() }],
      structuredContent: {
        statusCode: args.statusCode, statusText: args.statusText || "",
        headers: args.headers || {}, body: args.body,
        duration: args.duration, url: args.url, method: args.method,
      },
    })
  );

  registerAppTool(
    server,
    "generate-code-snippet",
    {
      description: "Generate code snippets in cURL, Python, JavaScript, Dart, and Go for a given API request.",
      inputSchema: {
        method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"]).describe("HTTP method"),
        url: z.string().describe("Request URL"),
        queryParams: z.record(z.string()).optional().describe("Query parameters"),
        headers: z.record(z.string()).optional().describe("HTTP headers"),
        body: z.string().optional().describe("Request body"),
      },
      _meta: { ui: { resourceUri: `${URI}/code-generator` } },
    },
    async (args): Promise<CallToolResult> => {
      const snippets = generateAllSnippets(args);
      const text = snippets.map((s) => `### ${s.label}\n\`\`\`${s.language}\n${s.code}\n\`\`\``).join("\n\n");

      return {
        content: [{ type: "text" as const, text: `Code snippets for ${args.method} ${args.url} (${snippets.length} languages):\n\n${text}` }],
        structuredContent: { request: args, snippets },
      };
    }
  );

  return server;
}
