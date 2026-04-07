#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";
import { z } from "zod";

import {
  browseAPIEndpoints,
  getAPICategories,
  getAPISummaryList,
  getAPITemplate,
  getFeaturedAPIs,
  searchAPIEndpoints,
  searchAPIs,
} from "./data/api-search.js";
import {
  addAPIReview,
  buildContributionSuggestion,
  listAPIReviews,
  rateAPI,
} from "./data/community.js";
import { API_SEARCH_UI } from "./ui/api-search.js";
import { DISCOVERY_UI } from "./ui/discovery.js";
import { FEATURED_APIS_UI } from "./ui/featured-apis.js";

const MIME = "text/html;profile=mcp-app" as const;
const URI = "ui://api-explorer";
const HTTP_METHOD_SCHEMA = z.enum(["get", "post", "put", "patch", "delete"]);

const server = new McpServer({
  name: "api-explorer-mcp-poc",
  version: "0.1.0",
});

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

function discoverResults(query?: string, category?: string) {
  return searchAPIs(query || "", category);
}

function browseEndpointResults(args: { apiId?: string; category?: string; method?: HttpMethod }) {
  return browseAPIEndpoints(args);
}

function searchEndpointResults(args: {
  query: string;
  apiId?: string;
  category?: string;
  method?: HttpMethod;
}) {
  return searchAPIEndpoints(args.query, {
    apiId: args.apiId,
    category: args.category,
    method: args.method,
  });
}

// Discovery UI
server.registerResource(
  "api-discovery-ui",
  `${URI}/discovery`,
  {
    mimeType: MIME,
    description: "Explore API catalog, search, and select sources",
  },
  async (uri) => {
    console.log(`📱 resources/read called for: ${uri.href}`);
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: MIME,
          text: DISCOVERY_UI(getFeaturedAPIs(), getAPICategories()),
        },
      ],
    };
  },
);

server.registerTool(
  "discover-apis",
  {
    description: "Explore the API catalog and filter by search query or category.",
    inputSchema: {
      query: z.string().optional().describe("Search query for API names or tags"),
      category: z.string().optional().describe("Filter by category"),
    },
    _meta: {
      ui: {
        resourceUri: `${URI}/discovery`,
        visibility: ["model", "app"],
      },
    },
  },
  async ({ query, category }: { query?: string; category?: string }) => {
    const normalizedQuery = (query || "").trim();
    const hasFilters = normalizedQuery.length > 0 || Boolean(category);

    if (!hasFilters) {
      console.log("🔧 [discover-apis] launcher opened without filters");
      return {
        content: [
          {
            type: "text" as const,
            text: "Discovery UI opened. Use the app panel to search and pick an API.",
          },
        ],
      };
    }

    console.log(`🔧 [discover-apis] query=${query || ""}, category=${category || "all"}`);
    const results = discoverResults(query, category);
    console.log(`🔧 [discover-apis] matched ${results.length} APIs`);
    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${results.length} API${results.length === 1 ? "" : "s"} in discovery search.`,
        },
      ],
      structuredContent: { results } as Record<string, unknown>,
    };
  },
);

server.registerTool(
  "get-api-categories",
  {
    description: "List API categories available in the explorer catalog.",
    inputSchema: {},
  },
  async () => {
    const categories = getAPICategories();
    console.log(`🔧 [get-api-categories] loaded ${categories.length} categories`);
    return {
      content: [
        {
          type: "text" as const,
          text: `Loaded ${categories.length} API categor${categories.length === 1 ? "y" : "ies"}.`,
        },
      ],
      structuredContent: { categories } as Record<string, unknown>,
    };
  },
);

server.registerTool(
  "rate-api",
  {
    description: "Add a user rating for an API and update its community score.",
    inputSchema: {
      apiId: z.string().describe("API id to rate"),
      rating: z.number().int().min(1).max(5).describe("Rating from 1 to 5"),
    },
  },
  async ({ apiId, rating }: { apiId: string; rating: number }) => {
    const rated = rateAPI(apiId, rating);
    return {
      content: [
        {
          type: "text" as const,
          text: `${rated.api.name} is now rated ${rated.averageRating}/5 from ${rated.votes} vote${
            rated.votes === 1 ? "" : "s"
          }.`,
        },
      ],
      structuredContent: {
        api: rated.api,
        averageRating: rated.averageRating,
        votes: rated.votes,
      } as Record<string, unknown>,
    };
  },
);

server.registerTool(
  "add-api-review",
  {
    description: "Add a short community review for an API.",
    inputSchema: {
      apiId: z.string().describe("API id to review"),
      author: z.string().min(1).default("community-user").describe("Review author name"),
      comment: z.string().min(3).describe("Review text"),
      rating: z.number().int().min(1).max(5).optional().describe("Optional rating from 1 to 5"),
    },
  },
  async ({
    apiId,
    author,
    comment,
    rating,
  }: {
    apiId: string;
    author: string;
    comment: string;
    rating?: number;
  }) => {
    const result = addAPIReview({ apiId, author, comment, rating });
    return {
      content: [
        {
          type: "text" as const,
          text: `Review added for ${result.api.name}${
            typeof rating === "number" && result.averageRating
              ? `. Updated rating: ${result.averageRating}/5.`
              : "."
          }`,
        },
      ],
      structuredContent: {
        api: result.api,
        review: result.review,
        averageRating: result.averageRating,
        votes: result.votes,
      } as Record<string, unknown>,
    };
  },
);

server.registerTool(
  "list-api-reviews",
  {
    description: "List recent community reviews for an API.",
    inputSchema: {
      apiId: z.string().describe("API id"),
      limit: z.number().int().min(1).max(20).optional().describe("Max reviews to return"),
    },
  },
  async ({ apiId, limit }: { apiId: string; limit?: number }) => {
    const listed = listAPIReviews(apiId, limit ?? 10);
    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${listed.reviews.length} review${listed.reviews.length === 1 ? "" : "s"} for ${listed.api.name}.`,
        },
      ],
      structuredContent: listed as Record<string, unknown>,
    };
  },
);

server.registerTool(
  "suggest-api-change",
  {
    description: "Generate a GitHub-ready community contribution draft for an API update.",
    inputSchema: {
      apiId: z.string().describe("API id"),
      changeType: z.enum(["fix", "improve", "new-endpoint", "metadata"]).describe("Type of contribution"),
      summary: z.string().min(3).describe("Short summary"),
      details: z.string().optional().describe("Optional details"),
    },
  },
  async ({
    apiId,
    changeType,
    summary,
    details,
  }: {
    apiId: string;
    changeType: "fix" | "improve" | "new-endpoint" | "metadata";
    summary: string;
    details?: string;
  }) => {
    const suggestion = buildContributionSuggestion({ apiId, changeType, summary, details });
    return {
      content: [
        {
          type: "text" as const,
          text: `Contribution draft generated for ${suggestion.api.name}.`,
        },
      ],
      structuredContent: suggestion as Record<string, unknown>,
    };
  },
);

// Featured APIs UI
server.registerResource(
  "featured-apis-ui",
  `${URI}/featured`,
  {
    mimeType: MIME,
    description: "View and select featured API sources",
  },
  async (uri) => {
    console.log(`📱 resources/read called for: ${uri.href}`);
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: MIME,
          text: FEATURED_APIS_UI(getFeaturedAPIs()),
        },
      ],
    };
  },
);

server.registerTool(
  "featured-apis",
  {
    description: "Get the curated list of featured APIs.",
    inputSchema: {},
    _meta: {
      ui: {
        resourceUri: `${URI}/featured`,
        visibility: ["model", "app"],
      },
    },
  },
  async () => {
    const featured = getFeaturedAPIs();
    console.log(`🔧 [featured-apis] loaded ${featured.length} featured APIs`);
    return {
      content: [
        {
          type: "text" as const,
          text: `Loaded ${featured.length} featured API sources.`,
        },
      ],
      structuredContent: { featured } as Record<string, unknown>,
    };
  },
);

// API search UI
server.registerResource(
  "endpoint-browser-ui",
  `${URI}/endpoints`,
  {
    mimeType: MIME,
    description: "Browse and search API endpoints, then fetch preconfigured templates",
  },
  async (uri) => {
    console.log(`📱 resources/read called for: ${uri.href}`);
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: MIME,
          text: API_SEARCH_UI(getAPISummaryList(), getAPICategories()),
        },
      ],
    };
  },
);

server.registerTool(
  "browse-api-endpoints",
  {
    description: "Browse endpoint templates by API, category, or HTTP method.",
    inputSchema: {
      apiId: z.string().optional().describe("API identifier to scope endpoints"),
      category: z.string().optional().describe("Filter by category"),
      method: HTTP_METHOD_SCHEMA.optional().describe("Filter by HTTP method"),
    },
    _meta: {
      ui: {
        resourceUri: `${URI}/endpoints`,
        visibility: ["model", "app"],
      },
    },
  },
  async ({
    apiId,
    category,
    method,
  }: {
    apiId?: string;
    category?: string;
    method?: HttpMethod;
  }) => {
    console.log(
      `🔧 [browse-api-endpoints] apiId=${apiId || "all"}, category=${category || "all"}, method=${method || "all"}`,
    );
    const endpoints = browseEndpointResults({ apiId, category, method });
    console.log(`🔧 [browse-api-endpoints] matched ${endpoints.length} endpoints`);
    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${endpoints.length} endpoint template${endpoints.length === 1 ? "" : "s"}.`,
        },
      ],
      structuredContent: { endpoints } as Record<string, unknown>,
    };
  },
);

server.registerTool(
  "search-api-endpoints",
  {
    description: "Search endpoint templates by keyword and optional filters.",
    inputSchema: {
      query: z.string().describe("Search query"),
      apiId: z.string().optional().describe("API identifier to scope endpoints"),
      category: z.string().optional().describe("Filter by category"),
      method: HTTP_METHOD_SCHEMA.optional().describe("Filter by HTTP method"),
    },
    _meta: {
      ui: {
        resourceUri: `${URI}/endpoints`,
        visibility: ["model", "app"],
      },
    },
  },
  async ({
    query,
    apiId,
    category,
    method,
  }: {
    query: string;
    apiId?: string;
    category?: string;
    method?: HttpMethod;
  }) => {
    console.log(
      `🔧 [search-api-endpoints] query=${query}, apiId=${apiId || "all"}, category=${category || "all"}, method=${method || "all"}`,
    );
    const endpoints = searchEndpointResults({ query, apiId, category, method });
    console.log(`🔧 [search-api-endpoints] matched ${endpoints.length} endpoints`);
    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${endpoints.length} endpoint template${endpoints.length === 1 ? "" : "s"} for the search.`,
        },
      ],
      structuredContent: { endpoints } as Record<string, unknown>,
    };
  },
);

// App-only execution tools used by embedded UI to avoid duplicate model chatter.
server.registerTool(
  "execute-discover-apis",
  {
    description: "App-only execution for discovery search.",
    inputSchema: {
      query: z.string().optional().describe("Search query for API names or tags"),
      category: z.string().optional().describe("Filter by category"),
    },
    _meta: {
      ui: {
        resourceUri: `${URI}/discovery`,
        visibility: ["app"],
      },
    },
  },
  async ({ query, category }: { query?: string; category?: string }) => {
    console.log(`🔧 [execute-discover-apis] query=${query || ""}, category=${category || "all"}`);
    const results = discoverResults(query, category);
    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${results.length} API${results.length === 1 ? "" : "s"} in discovery search.`,
        },
      ],
      structuredContent: { results } as Record<string, unknown>,
    };
  },
);

server.registerTool(
  "execute-browse-api-endpoints",
  {
    description: "App-only execution for endpoint browsing.",
    inputSchema: {
      apiId: z.string().optional().describe("API identifier to scope endpoints"),
      category: z.string().optional().describe("Filter by category"),
      method: HTTP_METHOD_SCHEMA.optional().describe("Filter by HTTP method"),
    },
    _meta: {
      ui: {
        resourceUri: `${URI}/endpoints`,
        visibility: ["app"],
      },
    },
  },
  async ({
    apiId,
    category,
    method,
  }: {
    apiId?: string;
    category?: string;
    method?: HttpMethod;
  }) => {
    console.log(
      `🔧 [execute-browse-api-endpoints] apiId=${apiId || "all"}, category=${category || "all"}, method=${method || "all"}`,
    );
    const endpoints = browseEndpointResults({ apiId, category, method });
    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${endpoints.length} endpoint template${endpoints.length === 1 ? "" : "s"}.`,
        },
      ],
      structuredContent: { endpoints } as Record<string, unknown>,
    };
  },
);

server.registerTool(
  "execute-search-api-endpoints",
  {
    description: "App-only execution for endpoint search.",
    inputSchema: {
      query: z.string().describe("Search query"),
      apiId: z.string().optional().describe("API identifier to scope endpoints"),
      category: z.string().optional().describe("Filter by category"),
      method: HTTP_METHOD_SCHEMA.optional().describe("Filter by HTTP method"),
    },
    _meta: {
      ui: {
        resourceUri: `${URI}/endpoints`,
        visibility: ["app"],
      },
    },
  },
  async ({
    query,
    apiId,
    category,
    method,
  }: {
    query: string;
    apiId?: string;
    category?: string;
    method?: HttpMethod;
  }) => {
    console.log(
      `🔧 [execute-search-api-endpoints] query=${query}, apiId=${apiId || "all"}, category=${category || "all"}, method=${method || "all"}`,
    );
    const endpoints = searchEndpointResults({ query, apiId, category, method });
    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${endpoints.length} endpoint template${endpoints.length === 1 ? "" : "s"} for the search.`,
        },
      ],
      structuredContent: { endpoints } as Record<string, unknown>,
    };
  },
);

server.registerTool(
  "execute-get-api-template",
  {
    description: "App-only execution for endpoint template retrieval.",
    inputSchema: {
      apiId: z.string().describe("API identifier"),
      endpointId: z.string().describe("Endpoint identifier"),
    },
    _meta: {
      ui: {
        resourceUri: `${URI}/endpoints`,
        visibility: ["app"],
      },
    },
  },
  async ({ apiId, endpointId }: { apiId: string; endpointId: string }) => {
    console.log(`🔧 [execute-get-api-template] apiId=${apiId}, endpointId=${endpointId}`);
    const template = getAPITemplate(apiId, endpointId);
    if (!template) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No template found for the requested API and endpoint IDs.",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Loaded template for ${template.api.name} - ${template.endpoint.name}.`,
        },
      ],
      structuredContent: { template } as Record<string, unknown>,
    };
  },
);

server.registerTool(
  "get-api-template",
  {
    description: "Get a preconfigured request template for a specific API endpoint.",
    inputSchema: {
      apiId: z.string().describe("API identifier"),
      endpointId: z.string().describe("Endpoint identifier"),
    },
    _meta: {
      ui: {
        resourceUri: `${URI}/endpoints`,
        visibility: ["model", "app"],
      },
    },
  },
  async ({ apiId, endpointId }: { apiId: string; endpointId: string }) => {
    console.log(`🔧 [get-api-template] apiId=${apiId}, endpointId=${endpointId}`);
    const template = getAPITemplate(apiId, endpointId);
    if (!template) {
      console.log(`⚠️ [get-api-template] no template found for apiId=${apiId}, endpointId=${endpointId}`);
      return {
        content: [
          {
            type: "text" as const,
            text: "No template found for the requested API and endpoint IDs.",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Loaded template for ${template.api.name} - ${template.endpoint.name}.`,
        },
      ],
      structuredContent: { template } as Record<string, unknown>,
    };
  },
);

const app = express();
app.use(express.json());

app.post("/mcp", async (req: Request, res: Response) => {
  console.log(`🌐 [mcp] ${req.method} ${req.path}`);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  res.on("close", () => transport.close());

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const port = Number(process.env.PORT ?? 3333);
app.listen(port, () => {
  console.log(`API Explorer MCP POC listening at http://localhost:${port}`);
  console.log(`MCP endpoint: http://localhost:${port}/mcp`);
});
