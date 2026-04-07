import { SHARED_STYLES } from "./shared.js";
import { getAPISummaryList } from "../data/api-search.js";

export function API_SEARCH_UI(
  apis = getAPISummaryList(),
  categories: string[] = [],
): string {
  const methods = ["", "get", "post", "put", "patch", "delete"];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Endpoint Explorer</title>
  <style>
    ${SHARED_STYLES}
    .layout { display: grid; grid-template-columns: 320px 1fr; gap: 1rem; }
    .results { display: grid; gap: 0.8rem; }
    .item { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 0.9rem; display: grid; gap: 0.55rem; }
    .path { font-family: "Consolas", monospace; color: var(--muted); font-size: 0.88rem; }
    .method { text-transform: uppercase; font-weight: 700; font-size: 0.78rem; }
    .actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }
    .status-line { margin-top: 0.8rem; }
    .empty-state { min-height: 180px; display: grid; place-items: center; text-align: center; }
    @media (max-width: 860px) { .layout { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="panel">
      <h1>Endpoint Explorer</h1>
      <p class="hint">Choose an API, browse endpoints, or search for a template.</p>
    </div>

    <div class="layout">
      <section class="panel">
        <div class="form-grid">
          <div class="form-group full">
            <label for="apiId">API</label>
            <select id="apiId">
              <option value="">All APIs</option>
              ${apis
                .map((api: { id: string; name: string; category: string }) => `<option value="${api.id}">${api.name}</option>`)
                .join("")}
            </select>
          </div>
          <div class="form-group full">
            <label for="category">Category</label>
            <select id="category">
              <option value="">All</option>
              ${categories.map((c) => `<option value="${c}">${c}</option>`).join("")}
            </select>
          </div>
          <div class="form-group full">
            <label for="method">HTTP Method</label>
            <select id="method">
              ${methods
                .map((method) => {
                  if (!method) {
                    return '<option value="">All methods</option>';
                  }
                  return `<option value="${method}">${method.toUpperCase()}</option>`;
                })
                .join("")}
            </select>
          </div>
          <div class="form-group full">
            <label for="query">Query</label>
            <input id="query" placeholder="payments, repos, weather, sms" />
          </div>
        </div>
        <div class="button-group">
          <button class="btn-secondary" id="browseBtn">Browse Endpoints</button>
          <button class="btn-primary" id="searchBtn">Search Endpoints</button>
        </div>
        <div class="json-block status-line" id="statusLine">Ready.</div>
      </section>

      <section class="panel">
        <h2>Endpoint Results</h2>
        <div class="results" id="resultsHost">
          <div class="empty-state">Pick a filter and click Browse or Search.</div>
        </div>
      </section>
    </div>
  </div>

  <script>
    const pending = new Map();
    let nextId = 1;
    let currentResults = [];

    function filtersFromForm() {
      const apiId = document.getElementById('apiId').value;
      const category = document.getElementById('category').value;
      const method = document.getElementById('method').value;
      return {
        apiId: apiId || undefined,
        category: category || undefined,
        method: method || undefined,
      };
    }

    function setStatus(message) {
      document.getElementById('statusLine').textContent = message;
    }

    function sendRequest(method, params) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        window.parent.postMessage({ jsonrpc: '2.0', id, method, params: params || {} }, '*');
      });
    }

    function sendNotification(method, params) {
      window.parent.postMessage({ jsonrpc: '2.0', method, params: params || {} }, '*');
    }

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (!msg || msg.jsonrpc !== '2.0') return;
      if (msg.id !== undefined && pending.has(msg.id)) {
        const entry = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) entry.reject(new Error(msg.error.message || 'Request failed'));
        else entry.resolve(msg.result);
      }
    });

    function render(results) {
      const host = document.getElementById('resultsHost');
      if (!results.length) {
        host.innerHTML = '<div class="empty-state">No matches found.</div>';
        return;
      }
      host.innerHTML = results.map((item) =>
        '<article class="item">'
        + '<div class="badge">' + item.api.category + ' · ' + item.api.name + '</div>'
        + '<div class="method">' + item.endpoint.method + '</div>'
        + '<h3>' + item.endpoint.name + '</h3>'
        + '<div class="path">' + item.endpoint.path + '</div>'
        + '<p>' + item.endpoint.description + '</p>'
        + '<div class="actions">'
        + '<button class="btn-secondary" data-context-id="' + item.endpoint.id + '">Add Endpoint</button>'
        + '<button class="btn-primary" data-template-id="' + item.endpoint.id + '">Get Template</button>'
        + '</div>'
        + '</article>'
      ).join('');

      host.querySelectorAll('[data-context-id]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const selected = currentResults.find((item) => item.endpoint.id === btn.dataset.contextId);
          if (!selected) return;
          try {
            await sendRequest('ui/update-model-context', {
              structuredContent: {
                tool: 'browse-api-endpoints',
                selectedApiId: selected.api.id,
                selectedApi: selected.api.name,
                selectedEndpointId: selected.endpoint.id,
                selectedEndpoint: {
                  name: selected.endpoint.name,
                  method: selected.endpoint.method,
                  path: selected.endpoint.path,
                },
              },
            });
            setStatus('Endpoint added to chat context.');
          } catch (_) {
            setStatus('Standalone preview mode.');
          }
        });
      });

      host.querySelectorAll('[data-template-id]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const selected = currentResults.find((item) => item.endpoint.id === btn.dataset.templateId);
          if (!selected) return;
          try {
            const templateResult = await sendRequest('tools/call', {
              name: 'execute-get-api-template',
              arguments: {
                apiId: selected.api.id,
                endpointId: selected.endpoint.id,
              },
            });
            const template = templateResult?.structuredContent?.template;
            await sendRequest('ui/update-model-context', {
              structuredContent: {
                tool: 'get-api-template',
                template,
              },
            });
            setStatus('Template loaded and added to chat context.');
          } catch (_) {
            setStatus('Unable to load template in this mode.');
          }
        });
      });
    }

    async function runBrowse() {
      setStatus('Browsing endpoints...');
      const filters = filtersFromForm();
      const result = await sendRequest('tools/call', {
        name: 'execute-browse-api-endpoints',
        arguments: filters,
      });
      currentResults = result?.structuredContent?.endpoints || [];
      render(currentResults);
      setStatus('Endpoint browse completed.');
    }

    async function runSearch() {
      const query = document.getElementById('query').value.trim();
      if (!query) {
        setStatus('Enter a query to search endpoint templates.');
        return;
      }

      setStatus('Searching endpoint templates...');
      const filters = filtersFromForm();
      const result = await sendRequest('tools/call', {
        name: 'execute-search-api-endpoints',
        arguments: { query, ...filters },
      });
      currentResults = result?.structuredContent?.endpoints || [];
      render(currentResults);
      setStatus('Endpoint search completed.');
    }

    async function initialize() {
      try {
        await sendRequest('ui/initialize', {
          protocolVersion: '2025-11-21',
          capabilities: {},
          clientInfo: { name: 'endpoint-explorer-ui', version: '1.0.0' },
        });
        sendNotification('ui/notifications/initialized', {});
      } catch (_) {
        // Standalone preview mode.
      }
    }

    document.getElementById('searchBtn').addEventListener('click', runSearch);
    document.getElementById('browseBtn').addEventListener('click', runBrowse);
    initialize();
  <\/script>
</body>
</html>`;
}
