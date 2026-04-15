/**
 * APIDash HTTP Response Viewer UI
 *
 * Displays structured HTTP response data including:
 * - Status code with color coding
 * - Response headers table
 * - Formatted body (JSON/HTML/Text)
 * - Performance metrics
 * SEP-1865 compatible.
 */

import { baseStyles } from '../styles.js';

export function RESPONSE_VIEWER_UI(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>APIDash · Response Viewer</title>
  <style>
    ${baseStyles}
    body { padding: 0; gap: 0; height: 100vh; overflow: hidden; }
    .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .status-bar {
      padding: 8px 12px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center; gap: 12px; flex-shrink: 0;
    }
    .status-code {
      font-size: 22px; font-weight: 800; font-family: var(--mono);
    }
    .status-2xx { color: var(--success); }
    .status-3xx { color: var(--warning); }
    .status-4xx, .status-5xx { color: var(--error); }
    .meta-chip {
      background: var(--surface2); border: 1px solid var(--border);
      border-radius: 3px; padding: 2px 8px; font-size: 10px; color: var(--muted);
      font-family: var(--mono);
    }
    .method-chip {
      font-size: 11px; font-weight: 700; font-family: var(--mono); padding: 2px 8px;
      border-radius: 3px;
    }
    .body-view { flex: 1; overflow: auto; }
    .json-view {
      font-family: var(--mono); font-size: 11px;
      padding: 12px; white-space: pre-wrap; word-break: break-all;
      color: var(--text); line-height: 1.6;
    }
    .headers-view { padding: 0; }
    .headers-table { width: 100%; border-collapse: collapse; }
    .headers-table th {
      padding: 6px 12px; font-size: 9px; color: var(--muted);
      text-transform: uppercase; letter-spacing: 0.4px; font-weight: 600;
      background: var(--surface2); border-bottom: 1px solid var(--border);
      text-align: left;
    }
    .headers-table td {
      padding: 6px 12px; border-bottom: 1px solid var(--border);
      font-family: var(--mono); font-size: 11px; vertical-align: top;
    }
    .headers-table .hdr-name { color: var(--accent); }
    .loading-state {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 12px; color: var(--muted);
    }
    .loading-icon { font-size: 36px; opacity: 0.5; }
    .loading-text { font-size: 12px; }
    .poll-dot { display: inline-block; animation: blink 1.2s infinite; }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
    .view-toggle { display: flex; gap: 6px; margin-left: auto; }
  </style>
</head>
<body>
  <div class="header">
    <span class="header-title">📨 APIDash Response Viewer</span>
    <span class="header-subtitle">HTTP response details</span>
  </div>

  <div id="loadingState" class="loading-state">
    <div class="loading-icon">📭</div>
    <div class="loading-text">Waiting for response data… <span class="poll-dot">●</span></div>
    <div style="font-size:10px; color:var(--muted);">Use the HTTP Send Request tool to populate this viewer</div>
  </div>

  <div id="responseView" class="main" style="display:none;">
    <div class="status-bar">
      <span id="statusCode" class="status-code"></span>
      <span id="statusText" style="font-size:13px; font-weight:500;"></span>
      <span id="methodChip" class="method-chip"></span>
      <span id="durationChip" class="meta-chip"></span>
      <span id="sizeChip" class="meta-chip"></span>
      <div class="view-toggle">
        <div class="toggle-group">
          <button class="toggle-btn active" onclick="switchView(this,'body')">Body</button>
          <button class="toggle-btn" onclick="switchView(this,'headers')">Headers</button>
          <button class="toggle-btn" onclick="switchView(this,'raw')">Raw</button>
        </div>
      </div>
    </div>

    <div id="view-body" class="body-view">
      <div id="jsonBody" class="json-view"></div>
    </div>
    <div id="view-headers" class="body-view" style="display:none;">
      <div class="headers-view">
        <table class="headers-table">
          <thead>
            <tr><th>Header</th><th>Value</th></tr>
          </thead>
          <tbody id="headersBody"></tbody>
        </table>
      </div>
    </div>
    <div id="view-raw" class="body-view" style="display:none;">
      <div id="rawBody" class="json-view" style="color:var(--muted);"></div>
    </div>
  </div>

  <div class="footer">
    <button class="btn-secondary" onclick="copyBody()">📋 Copy Body</button>
    <button class="btn-secondary" onclick="copyAll()">📋 Copy All</button>
    <button class="btn-secondary" onclick="downloadJSON()">💾 Save JSON</button>
    <span class="statusbar" id="copyStatus" style="margin-left:auto;"></span>
  </div>

  <script>
    const pending = new Map();
    let nextId = 1;
    let currentData = null;

    function request(method, params) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        window.parent.postMessage({ jsonrpc: '2.0', id, method, params }, '*');
      });
    }

    window.addEventListener('message', (e) => {
      const msg = e.data;
      if (!msg?.jsonrpc) return;
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? reject(msg.error) : resolve(msg.result);
        return;
      }
      if (msg.method === 'ui/notifications/tool-input') {
        const sc = msg.params?.structuredContent || msg.params?.arguments;
        if (sc?.response) {
          currentData = sc.response;
          renderResponse(sc.response);
        } else if (sc?.status) {
          currentData = sc;
          renderResponse(sc);
        }
      }
      
      // Auto dark/light mode detection
      if (msg.method === 'ui/notifications/host-context-changed') {
        const theme = msg.params?.theme || 'dark';
        document.body.className = theme; 
      }
    });

    // ─── Fetch latest response dynamically via MCP ───────────
    let lastRenderedTime = 0;
    async function fetchLatest() {
      try {
        const result = await request('tools/call', {
          name: '_get-last-response',
          arguments: {}
        });
        const sc = result?.structuredContent;
        if (sc && sc.status && sc.timestamp !== lastRenderedTime) {
          lastRenderedTime = sc.timestamp;
          currentData = sc;
          renderResponse(sc);
        } else if (!sc) {
           document.querySelector('.loading-text').innerHTML = "No structuredContent returned from tool.<br><small>" + JSON.stringify(result) + "</small>";
        }
      } catch (e) {
        document.querySelector('.loading-text').innerHTML = "MCP Error: " + (e.message || String(e)) + "<br>If polling failed natively, make sure tools/call is supported by your client!";
      }
    }

    // Poll every 1s for updates
    setInterval(fetchLatest, 1000);
    // Fetch immediately on load
    setTimeout(fetchLatest, 100);

    function switchView(btn, name) {
      document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ['body','headers','raw'].forEach(v => {
        document.getElementById('view-' + v).style.display = v === name ? '' : 'none';
      });
    }

    function renderResponse(data) {
      document.getElementById('loadingState').style.display = 'none';
      document.getElementById('responseView').style.display = '';

      // Status
      const code = data.status || 0;
      const codeEl = document.getElementById('statusCode');
      codeEl.textContent = code;
      const cls = code >= 500 ? 'status-5xx' : code >= 400 ? 'status-4xx' : code >= 300 ? 'status-3xx' : 'status-2xx';
      codeEl.className = 'status-code ' + cls;
      document.getElementById('statusText').textContent = data.statusText || '';

      // Method chip
      const method = data.method || '';
      const methodEl = document.getElementById('methodChip');
      methodEl.textContent = method;
      const methodColors = { GET:'var(--get)', POST:'var(--post)', PUT:'var(--put)', PATCH:'var(--patch)', DELETE:'var(--delete)' };
      methodEl.style.color = methodColors[method] || 'var(--text)';
      methodEl.style.background = 'rgba(0,120,212,0.1)';

      // Meta chips
      if (data.duration) document.getElementById('durationChip').textContent = data.duration + 'ms';
      if (data.body) {
        const size = (new Blob([data.body]).size / 1024).toFixed(1);
        document.getElementById('sizeChip').textContent = size + ' KB';
      }

      // Body
      let bodyText = '';
      if (typeof data.body === 'object') {
        bodyText = JSON.stringify(data.body, null, 2);
      } else {
        bodyText = data.body || '';
      }

      // Try to pretty-print JSON
      try {
        const parsed = JSON.parse(bodyText);
        bodyText = JSON.stringify(parsed, null, 2);
      } catch (_) {}

      document.getElementById('jsonBody').textContent = bodyText;
      document.getElementById('rawBody').textContent = JSON.stringify(data, null, 2);

      // Headers
      const headersEl = document.getElementById('headersBody');
      if (data.headers) {
        headersEl.innerHTML = Object.entries(data.headers)
          .map(([k, v]) => \`<tr><td class="hdr-name">\${esc(k)}</td><td>\${esc(String(v))}</td></tr>\`)
          .join('');
      }
    }

    function esc(s) {
      return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function copyBody() {
      if (!currentData) return;
      const text = typeof currentData.body === 'object'
        ? JSON.stringify(currentData.body, null, 2)
        : (currentData.body || '');
      navigator.clipboard?.writeText(text).then(() => {
        const el = document.getElementById('copyStatus');
        el.textContent = '✅ Copied!';
        el.className = 'statusbar success';
        setTimeout(() => { el.textContent = ''; }, 2000);
      });
    }

    function copyAll() {
      if (!currentData) return;
      navigator.clipboard?.writeText(JSON.stringify(currentData, null, 2)).then(() => {
        const el = document.getElementById('copyStatus');
        el.textContent = '✅ Copied!';
        el.className = 'statusbar success';
        setTimeout(() => { el.textContent = ''; }, 2000);
      });
    }

    async function downloadJSON() {
      if (!currentData) return;
      const text = typeof currentData.body === 'object' 
        ? JSON.stringify(currentData.body, null, 2) 
        : (currentData.body || '');
        
      try {
        await request('ui/download-file', {
          filename: \`apidash_response_\${Date.now()}.json\`,
          mimeType: 'application/json',
          content: btoa(text)
        });
      } catch(e) {
        console.error('Download failed', e);
      }
    }

    async function initialize() {
      try {
        await request('ui/initialize', {
          protocolVersion: '2025-11-21',
          capabilities: {},
          clientInfo: { name: 'apidash-response-viewer', version: '1.0.0' }
        });
        window.parent.postMessage({ jsonrpc: '2.0', method: 'ui/notifications/initialized' }, '*');
      } catch (_) {}
    }

    initialize();
    window.parent.postMessage({ jsonrpc: '2.0', method: 'ui/notifications/size-changed', params: { width: 600, height: 500 } }, '*');
  <\/script>
</body>
</html>`;
}
