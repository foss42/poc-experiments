/**
 * createMcpServer() — per-request McpServer factory
 *
 * Creates a fully configured McpServer instance on every call.
 * This gives stateless transport compliance: no shared mutable state
 * bleeds between HTTP requests or SSE connections.
 *
 * All 6 resources and 13 tools are registered here verbatim from the
 * original index.ts.  ToolAnnotations and outputSchema are spread in
 * from the centralised src/tools/ modules.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  executeHttpRequest,
  executeGraphQLRequest,
  executeAIRequest,
  generateCode,
  getMcpWorkspaceData,
  updateMcpWorkspaceData,
} from "@apidash/mcp-core";

import { REQUEST_BUILDER_UI }    from "./ui/request-builder.js";
import { RESPONSE_VIEWER_UI }    from "./ui/response-viewer.js";
import { COLLECTIONS_EXPLORER_UI } from "./ui/collections-explorer.js";
import { GRAPHQL_EXPLORER_UI }   from "./ui/graphql-explorer.js";
import { CODE_GENERATOR_UI }     from "./ui/code-generator.js";
import { CODE_VIEWER_UI }        from "./ui/code-viewer.js";
import { ENV_MANAGER_UI }        from "./ui/env-manager.js";

import { STATUS_REASONS }        from "./data/api-data.js";
import { TOOL_ANNOTATIONS }      from "./tools/annotations.js";
import { TOOL_OUTPUT_SCHEMAS }   from "./tools/schemas.js";

// Global in-memory store for the last response, used by the Response Viewer UI via JSON-RPC
export let globalLastResponse: any = null;
export let globalLastCodeState: any = null;

// ─────────────────────────────────────────────────────────────
// Constants (shared with index.ts via re-export is not needed —
// index.ts keeps its own copy for the startup console output)
// ─────────────────────────────────────────────────────────────
const MIME = "text/html;profile=mcp-app" as const;
const URI  = "ui://apidash-mcp";
const SERVER_NAME = "apidash-mcp";

// ─────────────────────────────────────────────────────────────
// Helper: build the options object for a tool with annotations
// and outputSchema automatically merged in.
// ─────────────────────────────────────────────────────────────
function toolOpts(name: string, opts: Record<string, any>) {
  return {
    ...opts,
    annotations:  TOOL_ANNOTATIONS[name],
    outputSchema: TOOL_OUTPUT_SCHEMAS[name],
  } as never;
}

// ─────────────────────────────────────────────────────────────
// Helper: Interpolate variables before executing HTTP calls
// ─────────────────────────────────────────────────────────────
function interpolateVars(str: string | undefined): string {
  if (!str) return "";
  let result = str;
  const workspace = getMcpWorkspaceData();
  const globalEnv = workspace.environments?.find((e: any) => e.name === 'global');
  const vars = globalEnv?.values || [];
  
  vars.forEach((v: any) => {
    if (!v.enabled || !v.key) return;
    const safeKey = v.key.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&');
    const regex = new RegExp('{{' + safeKey + '}}', 'g');
    result = result.replace(regex, v.value);
  });
  return result;
}

// ─────────────────────────────────────────────────────────────
// Factory
// ─────────────────────────────────────────────────────────────
export function createMcpServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: "1.0.0" });

  // ═══════════════════════════════════════════════════════════
  // RESOURCES (UI panels, SEP-1865 apps)
  // ═══════════════════════════════════════════════════════════

  // 1. HTTP Request Builder UI
  server.registerResource(
    "request-builder-ui",
    `${URI}/request-builder`,
    {
      mimeType: MIME,
      description: "Interactive HTTP request builder with method selector, URL, params, headers, body, auth, and real-time response view",
    },
    async (uri) => {
      console.log(`📱 resources/read: ${uri.href}`);
      return {
        contents: [{
          uri: uri.href,
          mimeType: MIME,
          text: REQUEST_BUILDER_UI(),
        }],
      };
    }
  );

  // 2. Response Viewer UI
  server.registerResource(
    "response-viewer-ui",
    `${URI}/response-viewer`,
    {
      mimeType: MIME,
      description: "Rich HTTP response viewer with status code, headers table, formatted JSON body, and performance metrics",
    },
    async (uri) => {
      console.log(`📱 resources/read: ${uri.href}`);
      return {
        contents: [{
          uri: uri.href,
          mimeType: MIME,
          text: RESPONSE_VIEWER_UI(),
        }],
      };
    }
  );

  // 3. Collections Explorer UI
  server.registerResource(
    "collections-explorer-ui",
    `${URI}/collections-explorer`,
    {
      mimeType: MIME,
      description: "Browse and manage API request collections with searchable sidebar and quick-copy actions",
    },
    async (uri) => {
      console.log(`📱 resources/read: ${uri.href}`);
      return {
        contents: [{
          uri: uri.href,
          mimeType: MIME,
          text: COLLECTIONS_EXPLORER_UI(),
        }],
      };
    }
  );

  // 4. GraphQL Explorer UI
  server.registerResource(
    "graphql-explorer-ui",
    `${URI}/graphql-explorer`,
    {
      mimeType: MIME,
      description: "Interactive GraphQL explorer with query editor, variables, headers, and response viewer",
    },
    async (uri) => {
      console.log(`📱 resources/read: ${uri.href}`);
      return {
        contents: [{
          uri: uri.href,
          mimeType: MIME,
          text: GRAPHQL_EXPLORER_UI(),
          _meta: {
            ui: {
              csp: {
                resourceDomains: ["https://countries.trevorblades.com"],
              },
            },
          },
        }],
      };
    }
  );

  // 5. Code Generator UI
  server.registerResource(
    "code-generator-ui",
    `${URI}/code-generator`,
    {
      mimeType: MIME,
      description: "Generate HTTP request code in 12+ languages: cURL, Python, JavaScript, Dart, Go, Java, Kotlin, PHP, Ruby, Rust and more",
    },
    async (uri) => {
      console.log(`📱 resources/read: ${uri.href}`);
      return {
        contents: [{
          uri: uri.href,
          mimeType: MIME,
          text: CODE_GENERATOR_UI(),
        }],
      };
    }
  );

  // 5.5. Code Viewer UI
  server.registerResource(
    "code-viewer-ui",
    `${URI}/code-viewer`,
    {
      mimeType: MIME,
      description: "Read-only view for outputting generated API code snippets.",
    },
    async (uri) => {
      console.log(`📱 resources/read: ${uri.href}`);
      return {
        contents: [{
          uri: uri.href,
          mimeType: MIME,
          text: CODE_VIEWER_UI(),
        }],
      };
    }
  );

  // 6. Environment Variables Manager UI
  server.registerResource(
    "env-manager-ui",
    `${URI}/env-manager`,
    {
      mimeType: MIME,
      description: "Manage API environment variables: global, development, staging, production scopes with secret masking and interpolation preview",
    },
    async (uri) => {
      console.log(`📱 resources/read: ${uri.href}`);
      return {
        contents: [{
          uri: uri.href,
          mimeType: MIME,
          text: ENV_MANAGER_UI(),
        }],
      };
    }
  );

  // ═══════════════════════════════════════════════════════════
  // TOOLS — Model + App visible (open UI panels)
  // ═══════════════════════════════════════════════════════════

  // ── Tool 1: Open Request Builder ──────────────────────────
  server.registerTool(
    "request-builder",
    toolOpts("request-builder", {
      description: "Open an interactive HTTP request builder UI. Allows building and sending HTTP requests with a full GUI including method selector, URL, query params, headers, body (JSON/form/text), authentication (Bearer/Basic/API Key), and response viewer.",
      _meta: {
        ui: {
          resourceUri: `${URI}/request-builder`,
          visibility: ["model", "app"],
        },
      },
    }),
    async () => {
      console.error("[request-builder] Tool executed");
      return {
        content: [{
          type: "text" as const,
          text: "🚀 APIDash HTTP Request Builder is open. Use the interactive UI to:\n• Select HTTP method (GET, POST, PUT, PATCH, DELETE, etc.)\n• Enter the endpoint URL\n• Add query parameters, headers, and request body\n• Configure authentication (Bearer token, Basic auth, API key)\n• Click 'Send' to execute and view the response\n• Click 'Add to Chat' to share the result in context"
        }],
        structuredContent: {}
      };
    }
  );

  // ── Tool 2: Send HTTP Request (model + app) ───────────────
  server.registerTool(
    "http-send-request",
    toolOpts("http-send-request", {
      description: "Send an HTTP request and return the response. Supports all HTTP methods, custom headers, request body, and query parameters. Returns response status, headers, body, and timing. The response is displayed in the Response Viewer UI.",
      inputSchema: {
        method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "CONNECT", "TRACE"])
          .describe("HTTP method"),
        url: z.string().describe("Full URL including protocol (e.g. https://api.example.com/users)"),
        headers: z.record(z.string(), z.string()).optional().describe("Request headers as key-value pairs"),
        body: z.string().optional().describe("Request body (JSON string, form-encoded, or plain text)"),
        timeoutMs: z.number().optional().describe("Request timeout in milliseconds (default: 30000)"),
      },
      _meta: {
        ui: {
          resourceUri: `${URI}/response-viewer`,
          visibility: ["model", "app"],
        },
      },
    }),
    async ({ method, url, headers, body, timeoutMs }: any) => {
      const iUrl = interpolateVars(url);
      const iBody = interpolateVars(body);
      const iHeaders: Record<string, string> = {};
      if (headers) {
        Object.entries(headers).forEach(([k, v]) => {
          iHeaders[k] = interpolateVars(v as string);
        });
      }

      console.log(`🔧 [http-send-request] ${method} ${iUrl}`);
      const res = await executeHttpRequest({ method, url: iUrl, headers: iHeaders, body: iBody, timeoutMs });

      if (res.success && res.data) {
        const responseBody = res.data.body || "";
        const duration = res.data.duration;
        
        globalLastResponse = {
          type: "http",
          status: res.data.status,
          statusText: res.data.statusText,
          duration,
          method,
          url: iUrl,
          body: responseBody,
          headers: res.data.headers,
          timestamp: Date.now()
        };

        return {
          content: [{
            type: "text" as const,
            text: `📨 HTTP ${method} ${url}\n\n**Status:** ${res.data.status} ${res.data.statusText}\n**Duration:** ${duration}ms\n**Body size:** ${(new TextEncoder().encode(responseBody).length / 1024).toFixed(2)} KB\n\n**Response Body (preview):**\n\`\`\`json\n${responseBody.slice(0, 2000)}${responseBody.length > 2000 ? '\n... (truncated)' : ''}\n\`\`\``
          }],
          structuredContent: res.data as unknown as Record<string, unknown>,
        };
      } else {
        console.error(`❌ [http-send-request] Error: ${res.errorMsg}`);
        return {
          content: [{
            type: "text" as const,
            text: `❌ Request failed: ${res.errorMsg}\n\nMethod: ${method}\nURL: ${url}`
          }],
          structuredContent: res.data as unknown as Record<string, unknown>,
        };
      }
    }
  );

  // ── Tool 3: View Response UI ──────────────────────────────
  server.registerTool(
    "view-response",
    toolOpts("view-response", {
      description: "Display an HTTP response in the rich Response Viewer UI. Shows color-coded status, formatted body (JSON/HTML/text), response headers table, and performance metrics.",
      inputSchema: {
        status: z.number().describe("HTTP status code"),
        statusText: z.string().optional().describe("HTTP status text"),
        headers: z.record(z.string(), z.string()).optional().describe("Response headers"),
        body: z.string().optional().describe("Response body"),
        method: z.string().optional().describe("HTTP method used"),
        url: z.string().optional().describe("Request URL"),
        duration: z.number().optional().describe("Request duration in ms"),
      },
      _meta: {
        ui: {
          resourceUri: `${URI}/response-viewer`,
          visibility: ["model", "app"],
        },
      },
    }),
    async (input: any) => {
      console.log(`🔧 [view-response] status=${input.status}`);
      const statusText = input.statusText || STATUS_REASONS[input.status] || "";
      const statusEmoji = input.status >= 500 ? "🔴" : input.status >= 400 ? "🟡" : input.status >= 300 ? "🔵" : "🟢";
      return {
        content: [{
          type: "text" as const,
          text: `${statusEmoji} Response: ${input.status} ${statusText}${input.duration ? ` (${input.duration}ms)` : ""}`
        }],
        structuredContent: {
          response: input,
        } as unknown as Record<string, unknown>,
      };
    }
  );

  // ── Tool 4: Explore Collections ───────────────────────────
  server.registerTool(
    "explore-collections",
    toolOpts("explore-collections", {
      description: "Open the APIDash Collections Explorer to browse saved API requests. Shows a searchable list of requests with method, URL, and description. Select to see cURL preview, body, and headers. Load into builder or add to chat context.",
      _meta: {
        ui: {
          resourceUri: `${URI}/collections-explorer`,
          visibility: ["model", "app"],
        },
      },
    }),
    async () => {
      console.error("[explore-collections] Tool executed");
      const workspace = getMcpWorkspaceData();
      const requests = workspace.requests;
      const summary = requests.map((r: any) => `• ${r.method} ${r.name}: ${r.url}`).join("\n");
      return {
        content: [{
          type: "text" as const,
          text: `📁 APIDash Collections Explorer opened.\n\nAvailable requests (${requests.length}):\n${summary}\n\nUse the sidebar to browse, click to view details, and 'Load in Builder' to test.`
        }],
        structuredContent: {
          totalRequests: requests.length,
          requests: requests.map((r: any) => ({ id: r.id, name: r.name, method: r.method, url: r.url })),
        } as unknown as Record<string, unknown>,
      };
    }
  );

  // ── Tool 5: GraphQL Explorer ──────────────────────────────
  server.registerTool(
    "graphql-explorer",
    toolOpts("graphql-explorer", {
      description: "Open an interactive GraphQL Explorer UI. Features a query editor, variables JSON editor, custom headers, and formatted response viewer. Pre-loaded with a sample query against the Countries API.",
      _meta: {
        ui: {
          resourceUri: `${URI}/graphql-explorer`,
          visibility: ["model", "app"],
        },
      },
    }),
    async () => {
      console.error("[graphql-explorer] Tool executed");
      return {
        content: [{
          type: "text" as const,
          text: "⬡ APIDash GraphQL Explorer opened.\n\nFeatures:\n• Query editor with syntax hints\n• Variables editor (JSON)\n• Custom headers support\n• Formatted JSON response viewer\n• Pre-loaded sample: Countries API\n\nEnter your GraphQL endpoint URL and query, then click '▶ Run'."
        }]
      };
    }
  );

  // ── Tool 6: Execute GraphQL (app-only) ────────────────────
  server.registerTool(
    "graphql-execute-query",
    toolOpts("graphql-execute-query", {
      description: "Execute a GraphQL query against an endpoint. Returns the raw JSON response and populates the GraphQL Explorer response panel.",
      inputSchema: {
        url: z.string().describe("GraphQL endpoint URL"),
        query: z.string().describe("GraphQL query or mutation string"),
        variables: z.record(z.string(), z.unknown()).optional().describe("GraphQL variables as JSON object"),
        headers: z.record(z.string(), z.string()).optional().describe("HTTP headers"),
      },
      _meta: {
        ui: {
          resourceUri: `${URI}/graphql-explorer`,
          visibility: ["app"],
        },
      },
    }),
    async ({ url, query, variables, headers }: any) => {
      console.log(`🔧 [graphql-execute-query] ${url}`);

      const result = await executeGraphQLRequest({
        url,
        query,
        variables,
        headers: headers as Record<string, string>,
        timeoutMs: 30_000,
      });

      if (!result.success) {
        return {
          content: [{ type: "text" as const, text: `❌ GraphQL request failed: ${result.errorMsg}` }],
          structuredContent: { error: result.errorMsg, status: 0 } as unknown as Record<string, unknown>,
        };
      }

      const { status, duration, body, errors, data } = result.data;
      const hasErrors = errors && Array.isArray(errors) && errors.length > 0;

      globalLastResponse = {
        type: "graphql",
        status,
        statusText: result.data.statusText || "OK",
        duration,
        method: "POST",
        url,
        body,
        headers: result.data.headers,
        timestamp: Date.now()
      };

      return {
        content: [{
          type: "text" as const,
          text: hasErrors
            ? `❌ GraphQL errors:\n${JSON.stringify(errors, null, 2)}`
            : `✅ GraphQL query executed (${duration}ms)\n\n${body.slice(0, 2000)}`
        }],
        structuredContent: {
          status,
          duration,
          data: data ?? JSON.parse(body),
          hasErrors,
        } as unknown as Record<string, unknown>,
      };
    }
  );

  // ── Tool 7: Open Code Generator UI ───────────────────────
  server.registerTool(
    "codegen-ui",
    toolOpts("codegen-ui", {
      description: "Open the APIDash Code Generator UI to generate HTTP request code in your preferred language. Supports cURL, Python (requests), JavaScript (fetch/axios), Node.js, Dart, Go, Java, Kotlin, PHP, Ruby, and Rust.",
      inputSchema: {
        method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]).optional()
          .describe("Pre-populate with HTTP method"),
        url: z.string().optional().describe("Pre-populate with URL"),
        headers: z.record(z.string(), z.string()).optional().describe("Pre-populate with headers"),
        body: z.string().optional().describe("Pre-populate with request body"),
      },
      _meta: {
        ui: {
          resourceUri: `${URI}/code-generator`,
          visibility: ["model", "app"],
        },
      },
    }),
    async ({ method, url, headers, body }: any) => {
      console.error("[codegen-ui] Tool executed");
      return {
        content: [{
          type: "text" as const,
          text: `⚙️ APIDash Code Generator opened.\n\nSupported languages:\n• cURL, Python (requests), JavaScript (fetch & axios)\n• Node.js (fetch), Dart (http), Go, Java (HttpClient)\n• Kotlin (OkHttp), PHP (cURL), Ruby (Net::HTTP), Rust (reqwest)\n\n${method && url ? `Pre-loaded: ${method} ${url}` : "Enter request details and select a language to generate code."}`
        }],
        structuredContent: method && url
          ? { request: { method, url, headers: headers ?? {}, body } } as unknown as Record<string, unknown>
          : {},
      };
    }
  );

  // ── Tool 8: Generate Code Snippet (app-only) ──────────────
  server.registerTool(
    "generate-code-snippet",
    toolOpts("generate-code-snippet", {
      description: "Server-side code generation for HTTP requests. Returns ready-to-use code in the specified language. Called by the Code Generator UI.",
      inputSchema: {
        method: z.string().describe("HTTP method"),
        url: z.string().describe("Request URL"),
        headers: z.record(z.string(), z.string()).optional().describe("Request headers"),
        body: z.string().optional().describe("Request body"),
        generator: z.enum([
          "curl", "python-requests", "javascript-fetch", "javascript-axios",
          "nodejs-fetch", "dart-http", "go-http", "java-http",
          "kotlin-okhttp", "php-curl", "ruby-net", "rust-reqwest"
        ]).describe("Code generator to use"),
      },
      _meta: {
        ui: {
          resourceUri: `${URI}/code-viewer`,
          visibility: ["model", "app"],
        },
      },
    }),
    async ({ method, url, headers, body, generator }: any) => {
      const iUrl = interpolateVars(url);
      const iBody = interpolateVars(body);
      const iHeaders: Record<string, string> = {};
      if (headers) {
        Object.entries(headers).forEach(([k, v]) => {
          iHeaders[k] = interpolateVars(v as string);
        });
      }

      console.log(`🔧 [generate-code-snippet] generator=${generator}, ${method} ${iUrl}`);
      const code = generateCode(generator, {
        method,
        url: iUrl,
        headers: iHeaders,
        body: iBody,
      });
      
      globalLastCodeState = {
        generator,
        language: generator,
        code,
        request: { method, url: iUrl, headers: iHeaders, body: iBody },
        timestamp: Date.now()
      };

      return {
        content: [{ type: "text" as const, text: `Successfully generated ${generator} snippet. It is now mounted in the APIDash Code Viewer UI above.` }],
        structuredContent: {
          generator,
          language: generator,
          code,
          request: { method, url, headers, body },
        } as unknown as Record<string, unknown>,
      };
    }
  );

  // ── Tool 9: Open Environment Manager UI ──────────────────
  server.registerTool(
    "manage-environment",
    toolOpts("manage-environment", {
      description: "Open the APIDash Environment Variables Manager. Manage global, development, staging, and production environment variables. Supports secret masking, variable interpolation preview using {{VARIABLE_NAME}} syntax, and export.",
      _meta: {
        ui: {
          resourceUri: `${URI}/env-manager`,
          visibility: ["model", "app"],
        },
      },
    }),
    async () => {
      console.error("[manage-environment] Tool executed");
      return {
        content: [{
          type: "text" as const,
          text: "🌱 APIDash Environment Variables Manager opened.\n\nScopes: Global, Development, Staging, Production\n\nUse {{VARIABLE_NAME}} in URLs, headers, and body to reference variables.\n\nExamples:\n• https://{{BASE_URL}}/api/{{VERSION}}/users\n• Authorization: Bearer {{TOKEN}}\n• {\"api_key\": \"{{API_KEY}}\"}"
        }],
        structuredContent: {} as unknown as Record<string, unknown>,
      };
    }
  );

  // ── Tool 10: Update Environment Variables (app-only) ──────
  server.registerTool(
    "update-environment-variables",
    toolOpts("update-environment-variables", {
      description: "Update environment variables in a given scope. Called by the Environment Manager UI when saving changes.",
      inputSchema: {
        env: z.enum(["global", "development", "staging", "production"]).describe("Environment scope"),
        variables: z.array(z.object({
          key: z.string().describe("Variable name"),
          value: z.string().describe("Variable value"),
          secret: z.boolean().optional().describe("Whether this is a secret value"),
          enabled: z.boolean().optional().describe("Whether this variable is active"),
        })).describe("Array of variables to set"),
      },
      _meta: {
        ui: {
          resourceUri: `${URI}/env-manager`,
          visibility: ["app"],
        },
      },
    }),
    async ({ env, variables }: any) => {
      console.log(`🔧 [update-environment-variables] env=${env}, vars=${variables.length}`);
      const safeVars = variables.map((v: any) => ({
        key: v.key,
        value: v.secret ? "***" : v.value,
        secret: v.secret ?? false,
        enabled: v.enabled ?? true,
      }));

      // Save to sync file
      const workspace = getMcpWorkspaceData();
      let envIndex = workspace.environments.findIndex((e: any) => e.name === env);
      if (envIndex === -1) {
        workspace.environments.push({ id: env, name: env, values: variables });
      } else {
        workspace.environments[envIndex].values = variables;
      }
      updateMcpWorkspaceData({ environments: workspace.environments });

      return {
        content: [{
          type: "text" as const,
          text: `✅ Updated ${variables.length} variable(s) in ${env} environment:\n${variables.map((v: any) => `• ${v.key}${v.secret ? ' (secret)' : ''}`).join('\n')}`
        }],
        structuredContent: {
          env,
          count: variables.length,
          variables: safeVars,
        } as unknown as Record<string, unknown>,
      };
    }
  );

  // ── Tool 11: Get API Request Template ─────────────────────
  server.registerTool(
    "get-api-request-template",
    toolOpts("get-api-request-template", {
      description: "Get a pre-built API request template from the APIDash collections. Returns complete request details including method, URL, headers, body. Use this to quickly test common APIs like JSONPlaceholder, GitHub, HTTPBin.",
      inputSchema: {
        templateId: z.enum([
          "get-posts", "get-post", "create-post", "update-post", "delete-post",
          "get-users", "get-comments", "github-user", "httpbin-get", "httpbin-post"
        ]).describe("Template ID to retrieve"),
      },
      _meta: {
        ui: {
          resourceUri: `${URI}/request-builder`,
          visibility: ["model", "app"],
        },
      },
    }),
    async ({ templateId }: any) => {
      console.log(`🔧 [get-api-request-template] id=${templateId}`);
      const workspace = getMcpWorkspaceData();
      const template = workspace.requests.find((r: any) => r.id === templateId);
      if (!template) {
        return {
          content: [{ type: "text" as const, text: `❌ Template '${templateId}' not found.` }]
        };
      }
      return {
        content: [{
          type: "text" as const,
          text: `📋 Template: ${template.name}\n\nMethod: ${template.method}\nURL: ${template.url}\nDescription: ${template.description}${template.body ? `\n\nBody:\n${template.body}` : ""}`
        }],
        structuredContent: {
          request: template,
          action: "load-template",
        } as unknown as Record<string, unknown>,
      };
    }
  );

  // ── Tool 12: AI / LLM Request ─────────────────────────────
  server.registerTool(
    "ai-llm-request",
    toolOpts("ai-llm-request", {
      description: "Send a chat completion request to any OpenAI-compatible LLM endpoint. Supports OpenAI, Groq, Mistral, Together AI, Ollama (local), Google Gemini, and custom endpoints. Returns the assistant reply with token usage.",
      inputSchema: {
        url: z.string().describe("LLM endpoint URL (e.g. https://api.openai.com/v1/chat/completions). Use 'openai', 'groq', 'mistral', 'ollama', 'gemini', 'together', or 'anthropic' as shorthand."),
        model: z.string().describe("Model name (e.g. gpt-4o, llama3, mixtral-8x7b-32768, gemini-pro)"),
        prompt: z.string().describe("User message / prompt to send"),
        systemPrompt: z.string().optional().describe("Optional system prompt to set context/persona"),
        apiKey: z.string().optional().describe("Bearer API key. Can also be set via APIDASH_AI_KEY env var"),
        temperature: z.number().optional().describe("Sampling temperature 0-2 (default 0.7)"),
        maxTokens: z.number().optional().describe("Maximum output tokens (default 1024)"),
        headers: z.record(z.string(), z.string()).optional().describe("Additional HTTP headers"),
      },
    }),
    async ({ url, model, prompt, systemPrompt, apiKey, temperature, maxTokens, headers }: any) => {
      console.log(`🔧 [ai-llm-request] ${url} model=${model}`);

      // Resolve URL (named provider or raw URL)
      const PROVIDERS: Record<string, string> = {
        openai:    "https://api.openai.com/v1/chat/completions",
        groq:      "https://api.groq.com/openai/v1/chat/completions",
        mistral:   "https://api.mistral.ai/v1/chat/completions",
        together:  "https://api.together.xyz/v1/chat/completions",
        ollama:    "http://localhost:11434/api/chat",
        gemini:    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        anthropic: "https://api.anthropic.com/v1/messages",
      };
      const resolvedUrl = PROVIDERS[url?.toLowerCase()] ?? url;

      const result = await executeAIRequest({
        url: resolvedUrl,
        apiKey: apiKey || process.env.APIDASH_AI_KEY || undefined,
        model,
        messages: [{ role: "user", content: prompt }],
        systemPrompt,
        temperature,
        maxTokens,
        headers: headers as Record<string, string>,
        timeoutMs: 60_000,
      });

      if (!result.success) {
        return {
          content: [{ type: "text" as const, text: `❌ AI request failed: ${result.errorMsg}` }],
          structuredContent: { error: result.errorMsg, status: result.data?.status ?? 0 } as unknown as Record<string, unknown>,
        };
      }

      const { status, duration, content, inputTokens, outputTokens, totalTokens, finishReason } = result.data;

      if (status >= 400) {
        return {
          content: [{ type: "text" as const, text: `❌ AI request failed (HTTP ${status}):\n${result.data.rawBody.slice(0, 500)}` }],
          structuredContent: { status, error: JSON.parse(result.data.rawBody) } as unknown as Record<string, unknown>,
        };
      }

      return {
        content: [{
          type: "text" as const,
          text: `🤖 **${model}** responded (${duration}ms${totalTokens ? `, ${totalTokens} tokens` : ""}):\n\n${content}`,
        }],
        structuredContent: {
          model,
          duration,
          content,
          inputTokens,
          outputTokens,
          totalTokens,
          finishReason,
        } as unknown as Record<string, unknown>,
      };
    }
  );

  // ── Tool 13: Save Request to Workspace ────────────────────
  server.registerTool(
    "save-request",
    toolOpts("save-request", {
      description: "Save a new API request (HTTP or GraphQL) to the APIDash workspace JSON file so it appears in the Collections panel and CLI. Returns the assigned request ID.",
      inputSchema: {
        name: z.string().describe("Human-readable request name"),
        method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]).describe("HTTP method"),
        url: z.string().describe("Request URL"),
        headers: z.record(z.string(), z.string()).optional().describe("Request headers"),
        body: z.string().optional().describe("Request body (JSON string)"),
        description: z.string().optional().describe("Optional description"),
      },
    }),
    async ({ name, method, url, headers, body, description }: any) => {
      console.log(`🔧 [save-request] ${method} ${url} name="${name}"`);
      const { randomUUID } = await import("crypto");
      const workspace = getMcpWorkspaceData();
      const id = randomUUID().slice(0, 8);
      workspace.requests.push({ id, name, method, url, headers, body, description });
      const saved = updateMcpWorkspaceData({ requests: workspace.requests });
      if (!saved) {
        return {
          content: [{ type: "text" as const, text: `❌ Failed to save request — workspace file not writable.` }],
          structuredContent: { success: false } as unknown as Record<string, unknown>,
        };
      }
      return {
        content: [{
          type: "text" as const,
          text: `✅ Request saved!\n\n**Name:** ${name}\n**ID:** \`${id}\`\n**Method:** ${method}\n**URL:** ${url}\n\nRun it with: \`apidash-cli run ${id}\``,
        }],
        structuredContent: { success: true, id, name, method, url } as unknown as Record<string, unknown>,
      };
    }
  );

  // ── Tool 14: Internal Get Last Response ───────────────────
  // Called by Response Viewer UI via JSON-RPC since it can't fetch() due to stdio architecture
  server.registerTool(
    "_get-last-response",
    {
      description: "Internal tool to retrieve the last HTTP/GraphQL response.",
    } as any,
    async () => {
      return {
        content: [{ type: "text" as const, text: "OK" }],
        structuredContent: {
          lastResponse: globalLastResponse || {},
          lastCodeState: globalLastCodeState || {}
        } as unknown as Record<string, unknown>,
      };
    }
  );

  return server;
}
