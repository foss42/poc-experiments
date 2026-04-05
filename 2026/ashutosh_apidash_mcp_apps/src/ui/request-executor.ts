/**
 * Request Executor UI - MCP App 1
 *
 * Interactive API request picker with environment selection.
 * Calls app-only tool `run-request-data` to simulate HTTP execution,
 * then updates model context via ui/update-model-context.
 */

import { baseStyles, requestExecutorStyles } from '../styles.js';
import { savedRequests } from '../data/requests-data.js';
import { environments } from '../data/environments-data.js';

export function REQUEST_EXECUTOR_UI(): string {
  const requestsJSON = JSON.stringify(savedRequests);
  const environmentsJSON = JSON.stringify(environments);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Dash – Request Executor</title>
  <style>
    ${baseStyles}
    ${requestExecutorStyles}
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <span class="app-icon">⚡</span>
      <span class="title">Execute Request</span>
    </div>
    <div class="header-right">
      <span id="statusBadge" class="status-badge idle">Idle</span>
    </div>
  </div>

  <div class="toolbar">
    <div class="env-selector">
      <label class="field-label">Environment</label>
      <select id="envSelect"></select>
    </div>
    <div class="toolbar-actions">
      <button class="btn-secondary" onclick="clearSelection()">Clear</button>
      <button class="btn-primary" id="runBtn" onclick="runRequest()" disabled>
        ▶ Run
      </button>
    </div>
  </div>

  <div class="search-row">
    <input type="text" id="searchInput" placeholder="🔍  Search requests by name, URL, or tag..." />
    <div class="method-filters" id="methodFilters">
      <button class="method-filter active" data-method="ALL">All</button>
      <button class="method-filter" data-method="GET">GET</button>
      <button class="method-filter" data-method="POST">POST</button>
      <button class="method-filter" data-method="PUT">PUT</button>
      <button class="method-filter" data-method="DELETE">DELETE</button>
    </div>
  </div>

  <div class="requests-list" id="requestsList"></div>

  <div class="status-bar" id="statusBar">Select a request to get started</div>

  <script>
    const ALL_REQUESTS = ${requestsJSON};
    const ALL_ENVIRONMENTS = ${environmentsJSON};

    let selectedRequestId = null;
    let currentMethodFilter = 'ALL';
    let searchTerm = '';

    // MCP communication
    let nextId = 1;
    const pending = new Map();

    function mcpRequest(method, params) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        window.parent.postMessage({ jsonrpc: '2.0', id, method, params: params || {} }, '*');
      });
    }

    function mcpNotify(method, params) {
      window.parent.postMessage({ jsonrpc: '2.0', method, params: params || {} }, '*');
    }

    window.addEventListener('message', (e) => {
      const msg = e.data;
      if (!msg?.jsonrpc) return;
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message || 'Error')) : resolve(msg.result);
      }
    });

    // Populate environment dropdown
    function populateEnvs() {
      const sel = document.getElementById('envSelect');
      ALL_ENVIRONMENTS.forEach(env => {
        const opt = document.createElement('option');
        opt.value = env.id;
        opt.textContent = env.name;
        sel.appendChild(opt);
      });
    }

    // Method badge colors
    const METHOD_COLORS = {
      GET: '#3b82f6',
      POST: '#22c55e',
      PUT: '#f97316',
      DELETE: '#ef4444',
      PATCH: '#a855f7',
    };

    function getMethodColor(method) {
      return METHOD_COLORS[method] || '#6b7280';
    }

    function renderRequests() {
      const list = document.getElementById('requestsList');
      let filtered = ALL_REQUESTS.filter(r => {
        const matchesMethod = currentMethodFilter === 'ALL' || r.method === currentMethodFilter;
        const matchesSearch = !searchTerm ||
          r.name.toLowerCase().includes(searchTerm) ||
          r.url.toLowerCase().includes(searchTerm) ||
          r.tags.some(t => t.toLowerCase().includes(searchTerm));
        return matchesMethod && matchesSearch;
      });

      if (filtered.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">No requests found</div></div>';
        return;
      }

      list.innerHTML = filtered.map(req => {
        const isSelected = req.id === selectedRequestId;
        const methodColor = getMethodColor(req.method);
        const tags = req.tags.map(t => '<span class="tag">' + t + '</span>').join('');
        const statusColor = req.mockResponse.status < 300 ? '#22c55e' : req.mockResponse.status < 400 ? '#f59e0b' : '#ef4444';

        return \`
          <div class="request-card \${isSelected ? 'selected' : ''}" onclick="selectRequest('\${req.id}')">
            <div class="card-left">
              <div class="card-header">
                <span class="method-badge" style="background:\${methodColor}20;color:\${methodColor};border-color:\${methodColor}40">\${req.method}</span>
                <span class="req-name">\${req.name}</span>
                \${isSelected ? '<span class="selected-indicator">✓ Selected</span>' : ''}
              </div>
              <div class="req-url">\${req.url}</div>
              <div class="req-tags">\${tags}</div>
            </div>
            <div class="card-right">
              <span class="mock-status" style="color:\${statusColor}">\${req.mockResponse.status}</span>
              <span class="mock-time">\${req.mockResponse.timeMs}ms</span>
            </div>
          </div>
        \`;
      }).join('');
    }

    function selectRequest(id) {
      selectedRequestId = id;
      document.getElementById('runBtn').disabled = false;
      const req = ALL_REQUESTS.find(r => r.id === id);
      if (req) {
        setStatus('Selected: ' + req.name + ' — click ▶ Run to execute');
      }
      renderRequests();
    }

    function clearSelection() {
      selectedRequestId = null;
      document.getElementById('runBtn').disabled = true;
      setStatus('Select a request to get started');
      renderRequests();
    }

    function setStatus(msg, type = '') {
      const bar = document.getElementById('statusBar');
      bar.textContent = msg;
      bar.className = 'status-bar' + (type ? ' ' + type : '');
    }

    function setStatusBadge(label, cls) {
      const badge = document.getElementById('statusBadge');
      badge.textContent = label;
      badge.className = 'status-badge ' + cls;
    }

    async function runRequest() {
      if (!selectedRequestId) return;
      const req = ALL_REQUESTS.find(r => r.id === selectedRequestId);
      const envId = document.getElementById('envSelect').value;

      document.getElementById('runBtn').disabled = true;
      setStatusBadge('Running…', 'running');
      setStatus('⏳ Executing ' + req.method + ' ' + req.url + '...');

      let response = null;
      try {
        const toolResult = await mcpRequest('tools/call', {
          name: 'run-request-data',
          arguments: {
            requestId: req.id,
            environmentId: envId,
          }
        });
        response = toolResult.structuredContent || null;
        setStatus('✅ Request executed successfully — updating context...');
        setStatusBadge('Success', 'success');
      } catch(e) {
        setStatus('❌ Error: ' + e.message, 'error');
        setStatusBadge('Error', 'error');
        document.getElementById('runBtn').disabled = false;
        return;
      }

      try {
        await mcpRequest('ui/update-model-context', {
          structuredContent: {
            request: {
              id: req.id,
              name: req.name,
              method: req.method,
              url: req.url,
              headers: req.headers || {},
              body: req.body || null,
              tags: req.tags,
            },
            environment: ALL_ENVIRONMENTS.find(e => e.id === envId),
            response: response,
          }
        });
        setStatus('✅ Context updated — AI assistant can now analyze the response');
      } catch(e) {
        setStatus('❌ Context update failed: ' + e.message, 'error');
      } finally {
        document.getElementById('runBtn').disabled = false;
      }
    }

    // Event listeners
    document.getElementById('searchInput').addEventListener('input', (e) => {
      searchTerm = e.target.value.toLowerCase();
      renderRequests();
    });

    document.getElementById('methodFilters').addEventListener('click', (e) => {
      const btn = e.target.closest('.method-filter');
      if (!btn) return;
      currentMethodFilter = btn.dataset.method;
      document.querySelectorAll('.method-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderRequests();
    });

    // Initialize MCP handshake
    async function initialize() {
      try {
        setStatus('Connecting...');
        await mcpRequest('ui/initialize', {
          protocolVersion: '2025-11-21',
          capabilities: {},
          clientInfo: { name: 'apidash-request-executor', version: '1.0.0' }
        });
        mcpNotify('ui/notifications/initialized', {});
        setStatus('Select a request to get started');
      } catch(e) {
        setStatus('Ready (standalone mode)');
      }

      populateEnvs();
      renderRequests();

      mcpNotify('ui/notifications/size-changed', {
        width: document.body.scrollWidth,
        height: document.body.scrollHeight + 100,
      });
    }

    initialize();
  <\/script>
</body>
</html>`;
}
