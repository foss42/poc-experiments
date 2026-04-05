/**
 * Response Viewer UI - MCP App 3
 *
 * Shows status badge, timing, size, syntax-highlighted JSON body,
 * collapsible headers, and Export JSON button using ui/download-file.
 * Receives data via ui/notifications/tool-input.
 */

import { baseStyles, responseViewerStyles } from '../styles.js';

export function RESPONSE_VIEWER_UI(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Dash – Response Viewer</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/atom-one-dark.min.css" media="(prefers-color-scheme: dark)">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github.min.css" media="(prefers-color-scheme: light)">
  <script src="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js"><\/script>
  <style>
    ${baseStyles}
    ${responseViewerStyles}
  </style>
</head>
<body>

  <!-- Loading state -->
  <div class="loading-overlay" id="loadingOverlay">
    <div class="loading-spinner"></div>
    <div class="loading-text">Waiting for response data...</div>
  </div>

  <!-- Main viewer (hidden until data arrives) -->
  <div id="viewerContent" style="display:none;flex-direction:column;height:100%;">

    <div class="header">
      <div class="header-left">
        <span class="app-icon">👁</span>
        <div>
          <div class="title">Response Viewer</div>
          <div class="subtitle" id="reqInfo"></div>
        </div>
      </div>
      <div class="header-right">
        <button class="btn-export" id="exportBtn" onclick="exportJson()">⬇ Export JSON</button>
      </div>
    </div>

    <!-- Status strip -->
    <div class="status-strip">
      <span class="status-badge" id="statusBadge">—</span>
      <div class="meta-pills">
        <span class="meta-pill" title="Response time">⏱ <strong id="timeVal">—</strong></span>
        <span class="meta-pill" title="Response size">📦 <strong id="sizeVal">—</strong></span>
        <span class="meta-pill" title="Content type" id="contentTypePill">📄 —</span>
      </div>
    </div>

    <!-- Headers collapsible -->
    <details class="section-details" id="headersSection">
      <summary class="section-summary">
        <span>Response Headers</span>
        <span class="header-count" id="headerCount">0 headers</span>
      </summary>
      <div class="headers-table-wrap">
        <table class="headers-table" id="headersTable">
          <thead><tr><th>Header</th><th>Value</th></tr></thead>
          <tbody id="headersBody"></tbody>
        </table>
      </div>
    </details>

    <!-- Body display -->
    <div class="body-section">
      <div class="body-header">
        <span class="section-label">Response Body</span>
        <button class="copy-btn" onclick="copyBody()" id="copyBtn">Copy</button>
      </div>
      <div class="code-wrap">
        <pre class="code-pre"><code class="language-json" id="bodyCode">// No body</code></pre>
      </div>
    </div>

  </div>

  <div class="status-bar" id="statusBar"></div>

  <script type="module">
    // MCP communication
    let nextId = 1;
    const pending = new Map();
    let responseData = null;

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
        msg.error ? reject(msg.error) : resolve(msg.result);
        return;
      }

      if (msg.method === 'ui/notifications/tool-input' ||
          msg.method === 'ui/notifications/tool-result') {
        const sc = msg.params?.structuredContent || msg.params?.arguments;
        if (sc && (sc.response || sc.status)) {
          loadResponse(sc);
        }
      }
    });

    function formatBytes(b) {
      if (!b) return '0 B';
      if (b < 1024) return b + ' B';
      if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
      return (b / 1048576).toFixed(1) + ' MB';
    }

    function setStatus(msg, cls = '') {
      const bar = document.getElementById('statusBar');
      bar.textContent = msg;
      bar.className = 'status-bar' + (cls ? ' ' + cls : '');
    }

    function loadResponse(data) {
      responseData = data;
      const resp = data.response || data;

      document.getElementById('loadingOverlay').style.display = 'none';
      const viewer = document.getElementById('viewerContent');
      viewer.style.display = 'flex';

      // Request info
      if (data.request) {
        document.getElementById('reqInfo').textContent =
          data.request.method + '  ' + (data.request.url.length > 70 ? data.request.url.substring(0, 67) + '…' : data.request.url);
      }

      // Status badge
      const status = resp.status || 0;
      const statusEl = document.getElementById('statusBadge');
      statusEl.textContent = status + ' ' + (resp.statusText || '');
      if (status >= 200 && status < 300) {
        statusEl.className = 'status-badge success';
      } else if (status >= 300 && status < 400) {
        statusEl.className = 'status-badge redirect';
      } else {
        statusEl.className = 'status-badge error';
      }

      // Meta
      document.getElementById('timeVal').textContent = (resp.timeMs || 0) + ' ms';
      document.getElementById('sizeVal').textContent = formatBytes(resp.sizeBytes || 0);
      const ct = (resp.headers || {})['content-type'] || '—';
      document.getElementById('contentTypePill').innerHTML = '📄 <strong>' + ct.split(';')[0] + '</strong>';

      // Headers
      const headers = resp.headers || {};
      const headerEntries = Object.entries(headers);
      document.getElementById('headerCount').textContent = headerEntries.length + ' headers';
      document.getElementById('headersBody').innerHTML = headerEntries.map(([k, v]) =>
        '<tr><td class="header-key">' + k + '</td><td class="header-val">' + v + '</td></tr>'
      ).join('');

      // Body
      let bodyText = '';
      try {
        bodyText = typeof resp.body === 'string' ? resp.body : JSON.stringify(resp.body, null, 2);
      } catch(e) {
        bodyText = String(resp.body || '');
      }

      const codeEl = document.getElementById('bodyCode');
      codeEl.textContent = bodyText;
      if (window.hljs) {
        window.hljs.highlightElement(codeEl);
      }

      mcpNotify('ui/notifications/size-changed', {
        width: document.body.scrollWidth,
        height: Math.min(document.body.scrollHeight + 80, 900),
      });
    }

    window.copyBody = async function() {
      const code = document.getElementById('bodyCode').textContent;
      try {
        await navigator.clipboard.writeText(code);
        const btn = document.getElementById('copyBtn');
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Copy', 1500);
      } catch(e) {
        setStatus('Copy failed', 'error');
      }
    };

    window.exportJson = async function() {
      if (!responseData) return;
      const json = JSON.stringify(responseData, null, 2);
      const b64 = btoa(unescape(encodeURIComponent(json)));
      const fname = 'api-response-' + Date.now() + '.json';

      try {
        setStatus('Exporting...');
        const result = await mcpRequest('ui/download-file', {
          contents: [{
            type: 'resource',
            resource: {
              uri: 'file:///' + fname,
              mimeType: 'application/json',
              blob: b64,
            }
          }]
        });
        if (result?.isError) {
          setStatus('Export cancelled', 'error');
        } else {
          setStatus('✅ JSON exported!', 'success');
        }
      } catch(err) {
        setStatus('❌ Export failed: ' + err.message, 'error');
      }
    };

    // Initialize MCP handshake
    async function initialize() {
      try {
        await mcpRequest('ui/initialize', {
          protocolVersion: '2025-11-21',
          capabilities: {},
          clientInfo: { name: 'apidash-response-viewer', version: '1.0.0' }
        });
        mcpNotify('ui/notifications/initialized', {});
      } catch(e) {
        // standalone mode
      }

      mcpNotify('ui/notifications/size-changed', {
        width: document.body.scrollWidth,
        height: document.body.scrollHeight + 80,
      });
    }

    initialize();
  <\/script>
</body>
</html>`;
}
