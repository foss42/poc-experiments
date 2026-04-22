/**
 * HTML UI Generator — Produces a self-contained MCP Apps HTML interface for the API Explorer.
 *
 * Part of the API Explorer MCP Server (GSoC 2026, API Dash).
 * Mirrors the MCP Apps handshake pattern from ashitaprasad/sample-mcp-apps-chatflow.
 * All styles are inline; no external CSS dependencies.
 */

import { ApiEntry } from "./registry.js";

// ---------------------------------------------------------------------------
// Method badge colors
// ---------------------------------------------------------------------------

const METHOD_COLORS: Record<string, string> = {
  GET: "#16a34a",
  POST: "#2563eb",
  PUT: "#ea580c",
  PATCH: "#ca8a04",
  DELETE: "#dc2626",
  HEAD: "#7c3aed",
  OPTIONS: "#64748b",
};

// Auth badge colors
const AUTH_COLORS: Record<string, string> = {
  api_key: "#16a34a",
  bearer: "#2563eb",
  oauth2: "#ea580c",
  basic: "#7c3aed",
  none: "#94a3b8",
};

const AUTH_LABELS: Record<string, string> = {
  api_key: "API Key",
  bearer: "Bearer",
  oauth2: "OAuth2",
  basic: "Basic",
  none: "None",
};

// ---------------------------------------------------------------------------
// HTML generation
// ---------------------------------------------------------------------------

export function generateExplorerHTML(
  apis: ApiEntry[],
  query: string = "",
  category: string = "All",
  authFilter: string = "any"
): string {
  // Pre-filter on server side so the initial render is correct
  const filtered = apis.filter((api) => {
    if (category !== "All" && api.category !== category) return false;
    if (authFilter !== "any" && api.auth_type !== authFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      const haystack = (api.name + " " + api.description + " " + api.category + " " + api.tags.join(" ")).toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const apiDataJSON = JSON.stringify(apis).replace(/'/g, "\\'").replace(/</g, "\\x3c");
  const filteredJSON = JSON.stringify(filtered).replace(/'/g, "\\'").replace(/</g, "\\x3c");

  // Build cards HTML
  const cardsHTML = filtered
    .map((api) => {
      const authColor = AUTH_COLORS[api.auth_type] || AUTH_COLORS.none;
      const authLabel = AUTH_LABELS[api.auth_type] || api.auth_type;

      const qualityColor =
        api.quality_score > 80 ? "#16a34a" : api.quality_score > 50 ? "#ca8a04" : "#dc2626";

      const endpointsShown = api.endpoints.slice(0, 3);
      const moreCount = api.endpoints.length - 3;

      const endpointListHTML = endpointsShown
        .map((ep) => {
          const mColor = METHOD_COLORS[ep.method] || "#64748b";
          return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">' +
            '<span style="background:' + mColor + ';color:#fff;font-size:10px;font-weight:700;padding:1px 6px;border-radius:3px;min-width:40px;text-align:center;">' + ep.method + '</span>' +
            '<code style="font-size:12px;color:#475569;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(ep.path) + '</code>' +
            '<span style="font-size:11px;color:#94a3b8;flex-shrink:0;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(ep.summary) + '</span>' +
            '</div>';
        })
        .join("");

      const moreHTML =
        moreCount > 0
          ? '<div style="font-size:12px;color:#1a73e8;margin-top:2px;">+ ' + moreCount + ' more endpoint' + (moreCount > 1 ? 's' : '') + '</div>'
          : "";

      return (
        '<div class="api-card" data-id="' + api.id + '" data-category="' + escapeHtml(api.category) + '" data-auth="' + api.auth_type + '" data-search="' + escapeHtml((api.name + " " + api.description + " " + api.category + " " + api.tags.join(" ")).toLowerCase()) + '">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">' +
          '<div>' +
            '<span style="font-weight:700;font-size:15px;color:#1e293b;">' + escapeHtml(api.name) + '</span>' +
            '<span style="font-size:12px;color:#94a3b8;margin-left:8px;">' + escapeHtml(api.provider) + ' &middot; ' + escapeHtml(api.category) + '</span>' +
          '</div>' +
          '<span style="background:' + authColor + '20;color:' + authColor + ';font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;">' + authLabel + '</span>' +
        '</div>' +
        '<div style="height:4px;background:#e2e8f0;border-radius:2px;margin-bottom:8px;overflow:hidden;">' +
          '<div style="height:100%;width:' + api.quality_score + '%;background:' + qualityColor + ';border-radius:2px;"></div>' +
        '</div>' +
        '<p style="font-size:13px;color:#475569;margin:0 0 10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">' + escapeHtml(api.description) + '</p>' +
        '<div style="margin-bottom:8px;">' + endpointListHTML + moreHTML + '</div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid #f1f5f9;padding-top:8px;">' +
          '<a href="' + escapeHtml(api.docs_url) + '" target="_blank" rel="noopener" style="font-size:12px;color:#1a73e8;text-decoration:none;">View Docs &rarr;</a>' +
          '<button onclick="importAPI(\'' + api.id + '\', \'' + escapeHtml(api.name) + '\')" style="background:#1a73e8;color:#fff;border:none;padding:6px 14px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">Import</button>' +
        '</div>' +
        '</div>'
      );
    })
    .join("\n");

  // Category chips
  const allCategories = ["All", "AI & ML", "Weather", "Finance", "Developer Tools", "Maps & Geo", "Communication", "Data", "Other"];
  const chipsHTML = allCategories
    .map((cat) => {
      const isActive = cat === category;
      const bg = isActive ? "#1a73e8" : "#ffffff";
      const color = isActive ? "#ffffff" : "#475569";
      const border = isActive ? "#1a73e8" : "#cbd5e1";
      return '<button onclick="filterCategory(\'' + cat + '\')" style="background:' + bg + ';color:' + color + ';border:1px solid ' + border + ';padding:5px 14px;border-radius:20px;font-size:13px;cursor:pointer;white-space:nowrap;transition:all 0.2s;">' + escapeHtml(cat) + '</button>';
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>API Explorer</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #ffffff;
  color: #1e293b;
  min-height: 100vh;
}
.container { max-width: 780px; margin: 0 auto; padding: 0 16px 24px; }
.header {
  background: linear-gradient(135deg, #1a73e8, #0d47a1);
  padding: 24px 24px 20px;
  border-radius: 0 0 16px 16px;
  margin-bottom: 16px;
  text-align: center;
}
.header h1 { color: #fff; font-size: 22px; margin-bottom: 4px; }
.header p { color: rgba(255,255,255,0.85); font-size: 13px; }
.search-bar {
  position: relative;
  margin-bottom: 12px;
}
.search-bar input {
  width: 100%;
  padding: 10px 14px 10px 38px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.search-bar input:focus { border-color: #1a73e8; }
.search-bar svg {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
}
.chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
.filters-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.filters-row select {
  padding: 6px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  background: #fff;
}
.results-count { font-size: 13px; color: #64748b; margin-bottom: 12px; }
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 14px;
}
.api-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px;
  transition: box-shadow 0.2s, transform 0.15s;
}
.api-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  transform: translateY(-1px);
}
.empty-state {
  text-align: center;
  padding: 48px 16px;
  color: #94a3b8;
}
.empty-state .icon { font-size: 40px; margin-bottom: 12px; }
.empty-state h3 { font-size: 16px; color: #64748b; margin-bottom: 4px; }
.empty-state p { font-size: 13px; }
.status-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #16a34a;
  color: #fff;
  text-align: center;
  padding: 10px;
  font-size: 14px;
  font-weight: 600;
  transform: translateY(100%);
  transition: transform 0.3s ease;
  z-index: 100;
}
.status-bar.visible { transform: translateY(0); }
</style>
</head>
<body>

<div class="header">
  <h1>API Explorer</h1>
  <p>Discover, browse &amp; import public APIs into your API Dash workspace</p>
</div>

<div class="container">
  <div class="search-bar">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    <input id="searchInput" type="text" placeholder="Search APIs by name, description, or category..." value="${escapeHtml(query)}">
  </div>

  <div class="chips" id="categoryChips">
    ${chipsHTML}
  </div>

  <div class="filters-row">
    <select id="authFilter" onchange="filterAuth(this.value)">
      <option value="any"${authFilter === "any" ? " selected" : ""}>Any Auth</option>
      <option value="api_key"${authFilter === "api_key" ? " selected" : ""}>API Key</option>
      <option value="bearer"${authFilter === "bearer" ? " selected" : ""}>Bearer Token</option>
      <option value="oauth2"${authFilter === "oauth2" ? " selected" : ""}>OAuth2</option>
      <option value="basic"${authFilter === "basic" ? " selected" : ""}>Basic</option>
      <option value="none"${authFilter === "none" ? " selected" : ""}>None</option>
    </select>
    <span class="results-count" id="resultsCount">Showing ${filtered.length} of ${apis.length} APIs</span>
  </div>

  <div class="cards-grid" id="cardsGrid">
    ${cardsHTML || '<div class="empty-state"><div class="icon">&#128269;</div><h3>No APIs found</h3><p>Try a different search or category</p></div>'}
  </div>
</div>

<div class="status-bar" id="statusBar"></div>

<script>
(function() {
  // --- State ---
  var currentCategory = '${escapeJs(category)}';
  var currentQuery = '${escapeJs(query)}';
  var currentAuth = '${escapeJs(authFilter)}';
  var allApis = JSON.parse('${apiDataJSON}');
  var totalCount = allApis.length;
  var debounceTimer = null;

  // --- MCP Apps Handshake (JSON-RPC 2.0 via postMessage) ---
  var nextRequestId = 1;
  var pendingRequests = {};

  function sendRequest(method, params) {
    var id = nextRequestId++;
    return new Promise(function(resolve, reject) {
      pendingRequests[id] = { resolve: resolve, reject: reject };
      window.parent.postMessage({
        jsonrpc: '2.0',
        id: id,
        method: method,
        params: params || {}
      }, '*');
    });
  }

  window.addEventListener('message', function(event) {
    var msg = event.data;
    if (!msg || msg.jsonrpc !== '2.0') return;
    if (msg.id !== undefined && pendingRequests[msg.id]) {
      var pending = pendingRequests[msg.id];
      delete pendingRequests[msg.id];
      if (msg.error) { pending.reject(msg.error); }
      else { pending.resolve(msg.result); }
    }
  });

  // Initialize handshake
  sendRequest('ui/initialize', {
    protocolVersion: '2025-11-21',
    capabilities: {},
    clientInfo: { name: 'api-explorer', version: '1.0.0' }
  }).then(function() {
    // Notify initialized
    window.parent.postMessage({
      jsonrpc: '2.0',
      method: 'ui/notifications/initialized',
      params: {}
    }, '*');
  }).catch(function() {
    // Not in MCP context — standalone mode, ignore
  });

  // --- Search ---
  var searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      clearTimeout(debounceTimer);
      var val = searchInput.value;
      debounceTimer = setTimeout(function() {
        currentQuery = val;
        filterCards();
        updateContext();
      }, 350);
    });
  }

  // --- Category filter ---
  window.filterCategory = function(cat) {
    currentCategory = cat;
    updateChips();
    filterCards();
    updateContext();
  };

  // --- Auth filter ---
  window.filterAuth = function(type) {
    currentAuth = type;
    filterCards();
    updateContext();
  };

  // --- Import ---
  window.importAPI = function(apiId, apiName) {
    sendRequest('tools/call', {
      name: 'import_api',
      arguments: { api_id: apiId }
    }).catch(function() {});

    var bar = document.getElementById('statusBar');
    bar.textContent = 'Imported \"' + apiName + '\" into API Dash workspace!';
    bar.classList.add('visible');
    setTimeout(function() { bar.classList.remove('visible'); }, 3000);
  };

  // --- Update model context ---
  function updateContext() {
    sendRequest('ui/update-model-context', {
      structuredContent: {
        category: currentCategory,
        query: currentQuery,
        authFilter: currentAuth
      }
    }).catch(function() {});
  }

  // --- Client-side filtering ---
  function filterCards() {
    var cards = document.querySelectorAll('.api-card');
    var q = currentQuery.toLowerCase();
    var shown = 0;

    cards.forEach(function(card) {
      var matchCat = currentCategory === 'All' || card.getAttribute('data-category') === currentCategory;
      var matchAuth = currentAuth === 'any' || card.getAttribute('data-auth') === currentAuth;
      var matchSearch = !q || (card.getAttribute('data-search') || '').indexOf(q) !== -1;

      if (matchCat && matchAuth && matchSearch) {
        card.style.display = '';
        shown++;
      } else {
        card.style.display = 'none';
      }
    });

    var countEl = document.getElementById('resultsCount');
    if (countEl) {
      countEl.textContent = 'Showing ' + shown + ' of ' + totalCount + ' APIs';
    }

    // Empty state
    var grid = document.getElementById('cardsGrid');
    var emptyEl = grid.querySelector('.empty-state');
    if (shown === 0 && !emptyEl) {
      var div = document.createElement('div');
      div.className = 'empty-state';
      div.innerHTML = '<div class="icon">&#128269;</div><h3>No APIs found</h3><p>Try a different search or category</p>';
      grid.appendChild(div);
    } else if (shown > 0 && emptyEl) {
      emptyEl.remove();
    }
  }

  // --- Update chip styles ---
  function updateChips() {
    var container = document.getElementById('categoryChips');
    if (!container) return;
    var buttons = container.querySelectorAll('button');
    var cats = ['All', 'AI & ML', 'Weather', 'Finance', 'Developer Tools', 'Maps & Geo', 'Communication', 'Data', 'Other'];
    buttons.forEach(function(btn, i) {
      var isActive = cats[i] === currentCategory;
      btn.style.background = isActive ? '#1a73e8' : '#ffffff';
      btn.style.color = isActive ? '#ffffff' : '#475569';
      btn.style.borderColor = isActive ? '#1a73e8' : '#cbd5e1';
    });
  }
})();
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeJs(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n");
}
