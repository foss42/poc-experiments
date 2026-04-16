import { SHARED_STYLES } from "./shared.js";
import { APILibraryEntry } from "../data/api-library.js";

export function FEATURED_APIS_UI(featured: APILibraryEntry[]): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Featured APIs</title>
  <style>
    ${SHARED_STYLES}
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.9rem; }
    .api-card { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 1rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="panel">
      <h1>Featured APIs</h1>
      <p class="hint">Pick a source and it will be added to chat context for import.</p>
    </div>

    <div class="panel">
      <div class="grid" id="featuredGrid"></div>
      <div class="json-block" id="statusLine" style="margin-top: 1rem;">Ready.</div>
    </div>
  </div>

  <script>
    const FEATURED = ${JSON.stringify(featured)};
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

    function render() {
      const host = document.getElementById('featuredGrid');
      host.innerHTML = FEATURED.map((api) =>
        '<article class="api-card">'
        + '<div class="badge">' + api.category + '</div>'
        + '<h3>' + api.name + '</h3>'
        + '<p>' + api.description + '</p>'
        + '<button class="btn-primary" data-id="' + api.id + '">Use This Source</button>'
        + '</article>'
      ).join('');

      host.querySelectorAll('[data-id]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const api = FEATURED.find((item) => item.id === btn.dataset.id);
          if (!api) return;
          try {
            await sendRequest('ui/update-model-context', {
              structuredContent: {
                tool: 'featured-apis',
                selectedApiId: api.id,
                selectedApi: api.name,
                source: api.source,
              },
            });
            document.getElementById('statusLine').textContent =
              api.name + ' source added to chat context.';
          } catch (_) {
            document.getElementById('statusLine').textContent = 'Standalone preview mode.';
          }
        });
      });
    }

    async function initialize() {
      try {
        await sendRequest('ui/initialize', {
          protocolVersion: '2025-11-21',
          capabilities: {},
          clientInfo: { name: 'featured-apis-ui', version: '1.0.0' },
        });
        sendNotification('ui/notifications/initialized', {});
      } catch (_) {
        // Standalone preview mode.
      }
      render();
    }

    initialize();
  <\/script>
</body>
</html>`;
}
