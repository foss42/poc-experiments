/**
 * API Explorer MCP Server
 * GSoC 2026 Proof of Concept — hitarthium
 *
 * Demonstrates how API Explorer (#8) can be rendered
 * as an interactive UI directly inside an AI agent chat window
 * using the MCP Apps protocol.
 *
 * Tools:
 *   - explore_apis   : renders interactive API Explorer UI (MCP Apps)
 *   - parse_openapi  : parses an OpenAPI spec URL → JSON template
 *   - import_api     : imports an API endpoint into API Dash workspace
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ---------- Registry (hardcoded for PoC, pipeline generates this) ----------

const API_REGISTRY = [
  {
    id: "openweather-current",
    name: "OpenWeatherMap",
    provider: "OpenWeatherMap",
    category: "Weather",
    auth_type: "api_key",
    base_url: "https://api.openweathermap.org/data/2.5",
    description: "Real-time weather data for any city worldwide.",
    docs_url: "https://openweathermap.org/api",
    endpoints: [
      { method: "GET", path: "/weather", summary: "Current weather by city name" },
      { method: "GET", path: "/forecast", summary: "5-day weather forecast" },
    ],
  },
  {
    id: "github-repos",
    name: "GitHub REST API",
    provider: "GitHub",
    category: "Developer Tools",
    auth_type: "bearer",
    base_url: "https://api.github.com",
    description: "Interact with GitHub repositories, issues, pull requests, and more.",
    docs_url: "https://docs.github.com/en/rest",
    endpoints: [
      { method: "GET",  path: "/repos/{owner}/{repo}", summary: "Get repository details" },
      { method: "GET",  path: "/repos/{owner}/{repo}/issues", summary: "List issues" },
      { method: "POST", path: "/repos/{owner}/{repo}/issues", summary: "Create an issue" },
    ],
  },
  {
    id: "openai-chat",
    name: "OpenAI API",
    provider: "OpenAI",
    category: "AI & ML",
    auth_type: "bearer",
    base_url: "https://api.openai.com/v1",
    description: "Access GPT-4, DALL-E, Whisper, and other OpenAI models via REST.",
    docs_url: "https://platform.openai.com/docs",
    endpoints: [
      { method: "POST", path: "/chat/completions", summary: "Create a chat completion" },
      { method: "POST", path: "/images/generations", summary: "Generate images with DALL-E" },
      { method: "POST", path: "/embeddings", summary: "Create text embeddings" },
    ],
  },
  {
    id: "stripe-payments",
    name: "Stripe API",
    provider: "Stripe",
    category: "Finance",
    auth_type: "bearer",
    base_url: "https://api.stripe.com/v1",
    description: "Accept payments, manage subscriptions, and handle financial workflows.",
    docs_url: "https://stripe.com/docs/api",
    endpoints: [
      { method: "POST", path: "/payment_intents", summary: "Create a payment intent" },
      { method: "GET",  path: "/customers/{id}", summary: "Retrieve a customer" },
      { method: "POST", path: "/subscriptions", summary: "Create a subscription" },
    ],
  },
  {
    id: "googlemaps-places",
    name: "Google Maps Places API",
    provider: "Google",
    category: "Maps & Geo",
    auth_type: "api_key",
    base_url: "https://maps.googleapis.com/maps/api/place",
    description: "Search for places, get details, autocomplete addresses.",
    docs_url: "https://developers.google.com/maps/documentation/places",
    endpoints: [
      { method: "GET", path: "/nearbysearch/json", summary: "Find nearby places" },
      { method: "GET", path: "/details/json", summary: "Get place details" },
    ],
  },
  {
    id: "sendgrid-email",
    name: "SendGrid Email API",
    provider: "Twilio",
    category: "Communication",
    auth_type: "bearer",
    base_url: "https://api.sendgrid.com/v3",
    description: "Send transactional and marketing emails at scale.",
    docs_url: "https://docs.sendgrid.com",
    endpoints: [
      { method: "POST", path: "/mail/send", summary: "Send an email" },
      { method: "GET",  path: "/stats", summary: "Get email statistics" },
    ],
  },
];

const CATEGORIES = ["All", "AI & ML", "Weather", "Finance", "Developer Tools", "Maps & Geo", "Communication"];

// ---------- MCP Apps HTML Generator ----------

function generateExplorerHTML(category: string, query: string): string {
  const filtered = API_REGISTRY.filter((api) => {
    const matchCat  = category === "All" || api.category === category;
    const matchQuery = !query || api.name.toLowerCase().includes(query.toLowerCase()) ||
                       api.description.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQuery;
  });

  const authBadgeColor: Record<string, string> = {
    api_key: "#e8f4e8;color:#2d7a2d",
    bearer:  "#e8f0ff;color:#2d4dd4",
    oauth2:  "#fff3e0;color:#e65100",
    none:    "#f5f5f5;color:#666",
  };

  const categoryChips = CATEGORIES.map((cat) => {
    const active = cat === category;
    return `<button onclick="filterCategory('${cat}')" style="
      padding:6px 14px;border-radius:20px;border:1.5px solid ${active ? "#1a73e8" : "#ddd"};
      background:${active ? "#1a73e8" : "#fff"};color:${active ? "#fff" : "#333"};
      font-size:13px;cursor:pointer;font-family:inherit;margin:3px;
    ">${cat}</button>`;
  }).join("");

  const apiCards = filtered.map((api) => {
    const [bgColor, textColor] = (authBadgeColor[api.auth_type] || authBadgeColor["none"]).split(";color:");
    const endpoints = api.endpoints.map((ep) =>
      `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f0f0f0;">
        <span style="background:${ep.method === "GET" ? "#e3f2fd" : ep.method === "POST" ? "#e8f5e9" : "#fff3e0"};
          color:${ep.method === "GET" ? "#1565c0" : ep.method === "POST" ? "#2e7d32" : "#e65100"};
          font-size:11px;font-weight:700;padding:2px 7px;border-radius:4px;font-family:monospace;min-width:44px;text-align:center">
          ${ep.method}
        </span>
        <span style="font-family:monospace;font-size:12px;color:#555;flex:1">${ep.path}</span>
        <span style="font-size:11px;color:#888">${ep.summary}</span>
      </div>`
    ).join("");

    return `
    <div style="background:#fff;border:1.5px solid #e8e8e8;border-radius:12px;padding:16px;margin-bottom:14px;
      box-shadow:0 1px 4px rgba(0,0,0,0.06);transition:box-shadow 0.2s" 
      onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.12)'"
      onmouseout="this.style.boxShadow='0 1px 4px rgba(0,0,0,0.06)'">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px">
        <div>
          <div style="font-size:15px;font-weight:700;color:#1a1a1a">${api.name}</div>
          <div style="font-size:12px;color:#888;margin-top:2px">${api.provider} · ${api.category}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
          <span style="background:${bgColor};color:${textColor};font-size:11px;padding:3px 9px;border-radius:10px;font-weight:600">
            ${api.auth_type.replace("_", " ")}
          </span>
          <button onclick="importAPI('${api.id}')" style="
            background:#1a73e8;color:#fff;border:none;border-radius:8px;
            padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">
            + Import
          </button>
        </div>
      </div>
      <div style="font-size:13px;color:#555;margin-bottom:12px;line-height:1.5">${api.description}</div>
      <div style="background:#fafafa;border-radius:8px;padding:8px 10px">
        <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">
          Endpoints (${api.endpoints.length})
        </div>
        ${endpoints}
      </div>
      <div style="margin-top:10px">
        <a href="${api.docs_url}" target="_blank" style="font-size:12px;color:#1a73e8;text-decoration:none">
          View Docs →
        </a>
      </div>
    </div>`;
  }).join("");

  const emptyState = filtered.length === 0
    ? `<div style="text-align:center;padding:48px;color:#999">
        <div style="font-size:32px;margin-bottom:8px">🔍</div>
        <div style="font-size:15px">No APIs found for "${query || category}"</div>
        <div style="font-size:13px;margin-top:6px">Try a different category or search term</div>
       </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Explorer — API Dash</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
           background: #f8f9fa; color: #1a1a1a; padding: 0; }
    #app { max-width: 780px; margin: 0 auto; padding: 16px; }
    .header { background: linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%);
              border-radius: 12px; padding: 20px 24px; margin-bottom: 16px; color: #fff; }
    .search-bar { display: flex; gap: 10px; margin-bottom: 14px; }
    .search-bar input { flex: 1; padding: 10px 14px; border: 1.5px solid #e0e0e0;
      border-radius: 10px; font-size: 14px; font-family: inherit; outline: none;
      background: #fff; }
    .search-bar input:focus { border-color: #1a73e8; }
    .result-count { font-size: 13px; color: #666; margin-bottom: 12px; }
    #status-bar { font-size:13px; color:#2d7a2d; background:#e8f5e9;
                  border-radius:8px; padding:8px 12px; margin-top:12px;
                  display:none; }
  </style>
</head>
<body>
<div id="app">
  <div class="header">
    <div style="font-size:20px;font-weight:700;margin-bottom:4px">⚡ API Explorer</div>
    <div style="font-size:13px;opacity:0.85">Discover, browse & import public APIs into your API Dash workspace</div>
  </div>

  <div class="search-bar">
    <input type="text" id="search-input" placeholder="Search APIs..." 
           value="${query}" oninput="handleSearch(this.value)">
  </div>

  <div style="margin-bottom:14px">${categoryChips}</div>

  <div class="result-count" id="result-count">${filtered.length} API${filtered.length !== 1 ? "s" : ""} found</div>

  <div id="status-bar"></div>

  <div id="api-list">
    ${apiCards}
    ${emptyState}
  </div>
</div>

<script>
  let currentCategory = '${category}';
  let currentQuery    = '${query}';

  function filterCategory(cat) {
    currentCategory = cat;
    sendToHost({ type: 'filter', category: cat, query: currentQuery });
    window.location.reload();
  }

  function handleSearch(q) {
    currentQuery = q;
    clearTimeout(window._searchTimer);
    window._searchTimer = setTimeout(() => {
      sendToHost({ type: 'search', category: currentCategory, query: q });
    }, 350);
  }

  function importAPI(apiId) {
    const bar = document.getElementById('status-bar');
    bar.style.display = 'block';
    bar.textContent = '✅ "' + apiId + '" imported into API Dash workspace!';
    sendToHost({ type: 'import', apiId: apiId });
    setTimeout(() => { bar.style.display = 'none'; }, 3000);
  }

  function sendToHost(data) {
    if (window.parent !== window) {
      window.parent.postMessage({ source: 'mcp-app', ...data }, '*');
    }
  }

  /* MCP Apps handshake */
  function request(method, params) {
    return new Promise((resolve) => {
      const id = Math.random().toString(36).slice(2);
      const handler = (e) => {
        if (e.data && e.data.id === id) {
          window.removeEventListener('message', handler);
          resolve(e.data.result || {});
        }
      };
      window.addEventListener('message', handler);
      window.parent.postMessage({ jsonrpc: '2.0', id, method, params }, '*');
    });
  }

  function notify(method) {
    window.parent.postMessage({ jsonrpc: '2.0', method }, '*');
  }

  request('ui/initialize', { protocolVersion: '2025-11-21' }).then(() => {
    notify('ui/notifications/initialized');
  }).catch(() => {});
</script>
</body>
</html>`;
}

// ---------- Server Setup ----------

const server = new McpServer({
  name:    "api-explorer",
  version: "1.0.0",
});

// Tool 1: explore_apis — renders interactive MCP Apps UI
server.tool(
  "explore_apis",
  "Browse and import public APIs into API Dash workspace. Returns an interactive UI rendered inside the AI agent chat.",
  {
    category: z.string().optional().default("All")
      .describe("Filter by category: All, AI & ML, Weather, Finance, Developer Tools, Maps & Geo, Communication"),
    query: z.string().optional().default("")
      .describe("Search query to filter APIs by name or description"),
  },
  async ({ category, query }) => {
    const cat    = category ?? "All";
    const search = query ?? "";
    const html   = generateExplorerHTML(cat, search);

    return {
      content: [
        {
          type: "text",
          text: `API Explorer loaded with ${API_REGISTRY.filter(a => cat === "All" || a.category === cat).length} APIs. Use the interactive UI to browse, search, and import.`,
        },
      ],
      _meta: {
        ui: {
          resourceUri: "ui://api-explorer/index.html",
        },
      },
    };
  }
);

// Tool 2: parse_openapi — runs the Python pipeline on a spec URL
server.tool(
  "parse_openapi",
  "Parse an OpenAPI spec URL and generate a structured API template for the Explorer registry.",
  {
    spec_url: z.string().url().describe("URL to an OpenAPI 3.x or Swagger 2.0 spec (JSON or YAML)"),
  },
  async ({ spec_url }) => {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              message: "In the full implementation, this runs parser.py against the provided spec URL.",
              spec_url,
              instruction: "Run: python python_pipeline/parser.py <spec_url>",
              sample_output: "See python_pipeline/sample_output.json for a real example.",
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// Tool 3: import_api — simulates importing an API into API Dash workspace
server.tool(
  "import_api",
  "Import a specific API endpoint into the API Dash workspace as a pre-configured request.",
  {
    api_id:   z.string().describe("API ID from the registry (e.g. openweather-current)"),
    endpoint: z.string().optional().describe("Specific endpoint path to import (e.g. /weather)"),
  },
  async ({ api_id, endpoint }) => {
    const api = API_REGISTRY.find((a) => a.id === api_id);
    if (!api) {
      return { content: [{ type: "text", text: `API "${api_id}" not found in registry.` }] };
    }
    const ep = endpoint
      ? api.endpoints.find((e) => e.path === endpoint)
      : api.endpoints[0];

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status:      "imported",
              api:         api.name,
              endpoint:    ep?.path ?? api.endpoints[0].path,
              method:      ep?.method ?? "GET",
              base_url:    api.base_url,
              auth_type:   api.auth_type,
              message:     "Request created in API Dash workspace. Open API Dash to view and send.",
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// Resource: serve the HTML for the MCP Apps iframe
server.resource(
  "api-explorer-ui",
  "ui://api-explorer/index.html",
  async () => ({
    contents: [
      {
        uri:      "ui://api-explorer/index.html",
        mimeType: "text/html;profile=mcp-app",
        text:     generateExplorerHTML("All", ""),
      },
    ],
  })
);

// ---------- Start ----------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("API Explorer MCP Server running on stdio");
}

main().catch(console.error);