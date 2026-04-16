import { SHARED_STYLES } from "./shared.js";
import { APILibraryEntry } from "../data/api-library.js";

export function DISCOVERY_UI(initialResults: APILibraryEntry[], categories: string[]): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>API Discovery</title>
  <style>
    ${SHARED_STYLES}
    .layout { display: grid; grid-template-columns: 340px 1fr; gap: 1rem; }
    .cards { display: grid; gap: 0.8rem; }
    .card { display: grid; gap: 0.55rem; }
    .card-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .card-actions button { padding-inline: 1rem; }
    @media (max-width: 860px) { .layout { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="panel">
      <h1>API Discovery</h1>
      <p class="hint">Search an API, then add the source or jump to its endpoints.</p>
    </div>

    <div class="layout">
      <section class="panel">
        <div class="form-grid">
          <div class="form-group full">
            <label for="query">Query</label>
            <input id="query" placeholder="payments, weather, github..." />
          </div>
          <div class="form-group full">
            <label for="category">Category</label>
            <select id="category">
              <option value="">All</option>
              ${categories.map((c) => `<option value="${c}">${c}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="button-group">
          <button class="btn-primary" id="searchBtn">Search</button>
          <span class="status-badge status-idle" id="statusBadge">Ready</span>
        </div>
      </section>

      <section class="panel">
        <h2>Results</h2>
        <div class="cards" id="resultCards"></div>
      </section>
    </div>
  </div>

  <script>
    const INITIAL_RESULTS = ${JSON.stringify(initialResults)};
    let currentResults = INITIAL_RESULTS;
    const pending = new Map();
    let nextId = 1;

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

    function setStatus(text, mode) {
      const badge = document.getElementById('statusBadge');
      badge.textContent = text;
      badge.className = 'status-badge status-' + mode;
    }

    function renderResults(results) {
      const host = document.getElementById('resultCards');
      if (!results.length) {
        host.innerHTML = '<div class="empty-state">No APIs found for this search.</div>';
        return;
      }
      host.innerHTML = results.map((api) =>
        '<article class="card">'
        + '<div class="badge">' + api.category + '</div>'
        + '<h3>' + api.name + '</h3>'
        + '<p>' + api.description + '</p>'
        + '<div class="card-actions">'
        + '<button class="btn-secondary" data-use-id="' + api.id + '">Use Source</button>'
        + '<button class="btn-primary" data-browse-id="' + api.id + '">Browse Endpoints</button>'
        + '</div>'
        + '</article>'
      ).join('');

      host.querySelectorAll('[data-use-id]').forEach((el) => {
        el.addEventListener('click', async () => {
          const api = currentResults.find((item) => item.id === el.dataset.useId);
          if (!api) return;
          try {
            await sendRequest('ui/update-model-context', {
              structuredContent: {
                tool: 'discover-apis',
                selectedApi: api.name,
                selectedApiId: api.id,
                source: api.source,
                category: api.category,
              },
            });
            setStatus('Context updated', 'done');
          } catch (_) {
            setStatus('Standalone mode', 'idle');
          }
        });
      });

      host.querySelectorAll('[data-browse-id]').forEach((btn) => {
        btn.addEventListener('click', async (event) => {
          event.stopPropagation();
          const api = currentResults.find((item) => item.id === btn.dataset.browseId);
          if (!api) return;
          try {
            await sendRequest('ui/update-model-context', {
              structuredContent: {
                tool: 'browse-api-endpoints',
                selectedApi: api.name,
                selectedApiId: api.id,
                category: api.category,
                browseHint: 'Open the endpoint explorer filtered to this API.',
              },
            });
            setStatus('Endpoint browse context added.', 'done');
          } catch (_) {
            setStatus('Standalone mode', 'idle');
          }
        });
      });
    }

    async function runSearch() {
      const query = document.getElementById('query').value.trim();
      const category = document.getElementById('category').value;
      setStatus('Searching', 'working');
      try {
        const result = await sendRequest('tools/call', {
          name: 'execute-discover-apis',
          arguments: { query, category: category || undefined },
        });
        currentResults = result?.structuredContent?.results || [];
        renderResults(currentResults);
        setStatus('Done', 'done');
      } catch (_) {
        setStatus('Error', 'error');
      }
    }

    async function initialize() {
      try {
        await sendRequest('ui/initialize', {
          protocolVersion: '2025-11-21',
          capabilities: {},
          clientInfo: { name: 'discovery-ui', version: '1.0.0' },
        });
        sendNotification('ui/notifications/initialized', {});
      } catch (_) {
        // Standalone preview mode.
      }
      renderResults(currentResults);
    }

    document.getElementById('searchBtn').addEventListener('click', runSearch);
    initialize();
  <\/script>
</body>
</html>`;
}
