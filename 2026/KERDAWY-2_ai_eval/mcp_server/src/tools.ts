/**
 * MCP Tool & Resource Registration — 4 tools + 1 resource for the API Explorer.
 *
 * Part of the API Explorer MCP Server (GSoC 2026, API Dash).
 * Tools: explore_apis, parse_openapi, import_api, get_api_details
 * Resource: ui://api-explorer/explorer-ui
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { API_REGISTRY, CATEGORIES } from "./registry.js";
import { generateExplorerHTML } from "./html-generator.js";
import type { ApiEntry } from "./registry.js";

const APP_MIME = "text/html;profile=mcp-app";
const UI_BASE = "ui://api-explorer";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findApi(apiId: string): ApiEntry | undefined {
  return API_REGISTRY.find((a) => a.id === apiId);
}

function filterApis(
  category: string,
  query: string,
  authType: string
): ApiEntry[] {
  return API_REGISTRY.filter((api) => {
    if (category !== "All" && api.category !== category) return false;
    if (authType !== "any" && api.auth_type !== authType) return false;
    if (query) {
      const q = query.toLowerCase();
      const haystack = `${api.name} ${api.description} ${api.category} ${api.tags.join(" ")}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerTools(server: McpServer): void {
  // -----------------------------------------------------------------------
  // Tool 1: explore_apis
  // -----------------------------------------------------------------------
  server.tool(
    "explore_apis",
    "Browse, search, and filter public APIs available for import into API Dash workspace.",
    {
      category: z
        .string()
        .optional()
        .describe(
          "Filter by category: All, AI & ML, Weather, Finance, Developer Tools, Maps & Geo, Communication, Data, Other"
        ),
      query: z.string().optional().describe("Search by name or description"),
      auth_type: z
        .string()
        .optional()
        .describe("Filter by auth type: any, api_key, bearer, oauth2, basic, none"),
    },
    async (params) => {
      try {
        const cat = params.category || "All";
        const q = params.query || "";
        const auth = params.auth_type || "any";
        const filtered = filterApis(cat, q, auth);
        const html = generateExplorerHTML(API_REGISTRY, q, cat, auth);

        return {
          content: [
            {
              type: "text" as const,
              text: `Found ${filtered.length} of ${API_REGISTRY.length} APIs` +
                (cat !== "All" ? ` in category "${cat}"` : "") +
                (q ? ` matching "${q}"` : "") +
                (auth !== "any" ? ` with auth type "${auth}"` : "") +
                ".\n\nThe interactive API Explorer UI is displayed above. " +
                "Use `import_api` to import a specific API or `get_api_details` for full details.",
            },
          ],
          _meta: {
            ui: {
              resourceUri: `${UI_BASE}/explorer-ui`,
              visibility: ["model", "app"],
            },
          },
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error: ${String(err)}` }],
          isError: true,
        };
      }
    }
  );

  // -----------------------------------------------------------------------
  // Tool 2: parse_openapi
  // -----------------------------------------------------------------------
  server.tool(
    "parse_openapi",
    "Parse an OpenAPI 3.x or Swagger 2.0 spec URL and generate a structured API template for the Explorer.",
    {
      spec_url: z.string().describe("URL to an OpenAPI/Swagger spec (JSON or YAML)"),
    },
    async (params) => {
      try {
        const url = params.spec_url;
        const instructions = [
          "## Parse OpenAPI Spec",
          "",
          "Run the Python pipeline to parse this spec:",
          "",
          "```bash",
          "cd python_pipeline",
          "pip install -r requirements.txt",
          `python parser.py "${url}" --output parsed_api.json`,
          "```",
          "",
          "This will generate a structured JSON file with:",
          "- API metadata (name, provider, version, base URL)",
          "- All endpoints with parameters, request/response examples",
          "- Auto-detected auth type and details",
          "- Category classification and quality score",
          "- Generated tags",
          "",
          "The output follows the same schema as `sample_output.json`.",
          "To add it to the MCP server registry, include the parsed JSON in `registry.ts`.",
        ].join("\n");

        return {
          content: [{ type: "text" as const, text: instructions }],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error: ${String(err)}` }],
          isError: true,
        };
      }
    }
  );

  // -----------------------------------------------------------------------
  // Tool 3: import_api
  // -----------------------------------------------------------------------
  server.tool(
    "import_api",
    "Import a specific API (and optionally a specific endpoint) into the API Dash workspace as a pre-configured request template.",
    {
      api_id: z.string().describe("API identifier from the registry"),
      endpoint: z
        .string()
        .optional()
        .describe("Specific endpoint path to import (imports first endpoint if omitted)"),
      include_auth: z
        .boolean()
        .optional()
        .describe("Whether to include auth header template (default: true)"),
    },
    async (params) => {
      try {
        const api = findApi(params.api_id);
        if (!api) {
          return {
            content: [
              {
                type: "text" as const,
                text: `API not found: "${params.api_id}". Use explore_apis to browse available APIs.`,
              },
            ],
            isError: true,
          };
        }

        const includeAuth = params.include_auth !== false;

        // Find the requested endpoint
        let ep = api.endpoints[0];
        if (params.endpoint) {
          const found = api.endpoints.find((e) => e.path === params.endpoint);
          if (found) ep = found;
        }

        if (!ep) {
          return {
            content: [
              { type: "text" as const, text: `No endpoints found for API "${api.name}".` },
            ],
            isError: true,
          };
        }

        // Build headers
        const headers: Record<string, string> = {};
        if (includeAuth) {
          switch (api.auth_type) {
            case "bearer":
              headers["Authorization"] = `Bearer {{${api.id.toUpperCase().replace(/-/g, "_")}_API_KEY}}`;
              break;
            case "api_key":
              headers["X-API-Key"] = `{{${api.id.toUpperCase().replace(/-/g, "_")}_API_KEY}}`;
              break;
            case "basic":
              headers["Authorization"] = `Basic {{${api.id.toUpperCase().replace(/-/g, "_")}_CREDENTIALS}}`;
              break;
            case "oauth2":
              headers["Authorization"] = `Bearer {{${api.id.toUpperCase().replace(/-/g, "_")}_OAUTH_TOKEN}}`;
              break;
          }
        }

        if (ep.content_type && ["POST", "PUT", "PATCH"].includes(ep.method)) {
          headers["Content-Type"] = ep.content_type;
        }

        const template = {
          status: "imported",
          api: api.name,
          endpoint: ep.path,
          method: ep.method,
          base_url: api.base_url,
          full_url: `${api.base_url}${ep.path}`,
          auth_type: api.auth_type,
          headers,
          sample_body:
            Object.keys(ep.request_body_example).length > 0
              ? ep.request_body_example
              : undefined,
          parameters: ep.parameters.length > 0 ? ep.parameters : undefined,
          message: `Request created in API Dash workspace. Open API Dash to view and send.`,
        };

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(template, null, 2),
            },
          ],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error: ${String(err)}` }],
          isError: true,
        };
      }
    }
  );

  // -----------------------------------------------------------------------
  // Tool 4: get_api_details
  // -----------------------------------------------------------------------
  server.tool(
    "get_api_details",
    "Get full details about a specific API including all endpoints, auth setup, and sample requests.",
    {
      api_id: z.string().describe("API identifier from the registry"),
    },
    async (params) => {
      try {
        const api = findApi(params.api_id);
        if (!api) {
          return {
            content: [
              {
                type: "text" as const,
                text: `API not found: "${params.api_id}". Use explore_apis to browse available APIs.`,
              },
            ],
            isError: true,
          };
        }

        const lines: string[] = [
          `# ${api.name}`,
          "",
          `**Provider:** ${api.provider}`,
          `**Category:** ${api.category}`,
          `**Auth:** ${api.auth_type}`,
          `**Base URL:** ${api.base_url}`,
          `**Quality Score:** ${api.quality_score}/100`,
          `**Tags:** ${api.tags.join(", ")}`,
          `**Docs:** ${api.docs_url}`,
          "",
          api.description,
          "",
          `## Endpoints (${api.total_endpoints})`,
          "",
        ];

        for (const ep of api.endpoints) {
          lines.push(`### ${ep.method} ${ep.path}`);
          lines.push(`${ep.summary}`);
          if (ep.description && ep.description !== ep.summary) {
            lines.push(ep.description);
          }

          if (ep.parameters.length > 0) {
            lines.push("");
            lines.push("**Parameters:**");
            for (const p of ep.parameters) {
              const req = p.required ? " *(required)*" : "";
              lines.push(`- \`${p.name}\` (${p.in}, ${p.type})${req}: ${p.description}`);
            }
          }

          if (Object.keys(ep.request_body_example).length > 0) {
            lines.push("");
            lines.push("**Request body example:**");
            lines.push("```json");
            lines.push(JSON.stringify(ep.request_body_example, null, 2));
            lines.push("```");
          }

          if (Object.keys(ep.response_example).length > 0) {
            lines.push("");
            lines.push("**Response example:**");
            lines.push("```json");
            lines.push(JSON.stringify(ep.response_example, null, 2));
            lines.push("```");
          }

          lines.push("");
        }

        lines.push("## Sample Request");
        lines.push("```json");
        lines.push(JSON.stringify(api.sample_request, null, 2));
        lines.push("```");

        return {
          content: [{ type: "text" as const, text: lines.join("\n") }],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error: ${String(err)}` }],
          isError: true,
        };
      }
    }
  );

  // -----------------------------------------------------------------------
  // Resource: API Explorer UI
  // -----------------------------------------------------------------------
  server.resource(
    "explorer-ui",
    `${UI_BASE}/explorer-ui`,
    {
      mimeType: APP_MIME,
      description:
        "Interactive HTML interface for browsing, searching, and importing public APIs.",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: APP_MIME,
          text: generateExplorerHTML(API_REGISTRY),
        },
      ],
    })
  );
}
