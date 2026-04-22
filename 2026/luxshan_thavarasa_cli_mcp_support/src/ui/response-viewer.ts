import { BASE_STYLES, MCP_COMMS_SCRIPT } from "../styles.js";

export function responseViewerUI(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Dash - Response Viewer</title>
  <style>
    ${BASE_STYLES}

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 200px;
      color: var(--text-muted);
      gap: 8px;
    }

    .empty-state svg {
      width: 48px;
      height: 48px;
      opacity: 0.3;
    }

    .response-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .meta-cards {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .meta-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 8px 12px;
      min-width: 120px;
    }

    .meta-card .label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin-bottom: 2px;
    }

    .meta-card .value {
      font-size: 16px;
      font-weight: 600;
    }

    .body-container {
      position: relative;
    }

    .copy-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 4px 10px;
      border-radius: var(--radius);
      cursor: pointer;
      font-size: 11px;
    }

    .copy-btn:hover { color: var(--text); border-color: var(--accent); }

    .url-display {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--text-muted);
      word-break: break-all;
    }
  </style>
</head>
<body>
  <h1>Response Viewer</h1>

  <div id="emptyState" class="empty-state">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
        d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9 9 0 013 12c0-1.47.353-2.856.978-4.082" />
    </svg>
    <span>No response yet</span>
    <span style="font-size:11px">Send a request from the Request Builder or call execute-api-request</span>
  </div>

  <div id="responseContent" style="display:none">
    <div class="response-header">
      <span id="statusBadge" class="status-badge"></span>
      <span id="methodBadge" class="method-badge"></span>
      <span id="urlDisplay" class="url-display"></span>
    </div>

    <div class="meta-cards">
      <div class="meta-card">
        <div class="label">Time</div>
        <div class="value" id="timingValue">—</div>
      </div>
      <div class="meta-card">
        <div class="label">Size</div>
        <div class="value" id="sizeValue">—</div>
      </div>
      <div class="meta-card">
        <div class="label">Content-Type</div>
        <div class="value" id="contentTypeValue" style="font-size:12px">—</div>
      </div>
    </div>

    <div class="tabs">
      <button class="tab active" data-tab="body" onclick="switchTab(this)">Body</button>
      <button class="tab" data-tab="headers" onclick="switchTab(this)">Headers</button>
    </div>

    <div id="tab-body" class="tab-content active">
      <div class="body-container">
        <button class="copy-btn" onclick="copyBody()">Copy</button>
        <div id="responseBody" class="code-block" style="max-height:400px; overflow-y:auto;"></div>
      </div>
    </div>

    <div id="tab-headers" class="tab-content">
      <table id="headersTable">
        <thead><tr><th>Header</th><th>Value</th></tr></thead>
        <tbody id="headersBody"></tbody>
      </table>
    </div>
  </div>

  <script>
    ${MCP_COMMS_SCRIPT}

    let currentBody = '';

    function switchTab(el) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      el.classList.add('active');
      document.getElementById('tab-' + el.dataset.tab).classList.add('active');
    }

    function statusClass(code) {
      if (code >= 200 && code < 300) return 'status-2xx';
      if (code >= 300 && code < 400) return 'status-3xx';
      if (code >= 400 && code < 500) return 'status-4xx';
      return 'status-5xx';
    }

    function formatSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1048576).toFixed(1) + ' MB';
    }

    function highlightJson(str) {
      try {
        const obj = typeof str === 'string' ? JSON.parse(str) : str;
        return syntaxHighlight(JSON.stringify(obj, null, 2));
      } catch {
        return escapeHtml(str);
      }
    }

    function escapeHtml(s) {
      return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function syntaxHighlight(json) {
      return json.replace(
        /("(\\\\u[a-zA-Z0-9]{4}|\\\\[^u]|[^\\\\"])*"(\\s*:)?|\\b(true|false|null)\\b|-?\\d+\\.?\\d*([eE][+-]?\\d+)?)/g,
        function(match) {
          let cls = 'tok-num';
          if (/^"/.test(match)) {
            cls = /:$/.test(match) ? 'tok-key' : 'tok-str';
          } else if (/true|false/.test(match)) {
            cls = 'tok-bool';
          } else if (/null/.test(match)) {
            cls = 'tok-null';
          }
          return '<span class="' + cls + '">' + match + '</span>';
        }
      );
    }

    function renderResponse(data) {
      document.getElementById('emptyState').style.display = 'none';
      document.getElementById('responseContent').style.display = 'block';

      const status = data.statusCode || data.status || 0;
      const badge = document.getElementById('statusBadge');
      badge.textContent = status + ' ' + (data.statusText || '');
      badge.className = 'status-badge ' + statusClass(status);

      if (data.method) {
        const mb = document.getElementById('methodBadge');
        mb.textContent = data.method;
        mb.className = 'method-badge method-' + data.method;
      }

      if (data.url) {
        document.getElementById('urlDisplay').textContent = data.url;
      }

      if (data.duration) {
        document.getElementById('timingValue').textContent = data.duration + ' ms';
      }

      const bodyStr = typeof data.body === 'string' ? data.body : JSON.stringify(data.body, null, 2);
      currentBody = bodyStr || '';
      document.getElementById('sizeValue').textContent = formatSize(new Blob([currentBody]).size);

      const contentType = data.headers?.['content-type'] || data.contentType || '';
      document.getElementById('contentTypeValue').textContent = contentType || '—';

      document.getElementById('responseBody').innerHTML = highlightJson(currentBody);

      // Render headers
      const tbody = document.getElementById('headersBody');
      tbody.innerHTML = '';
      if (data.headers) {
        Object.entries(data.headers).forEach(([k, v]) => {
          const tr = document.createElement('tr');
          tr.innerHTML = '<td style="font-weight:600; color:var(--text)">' + escapeHtml(k) +
            '</td><td style="font-family:var(--font-mono); font-size:12px">' + escapeHtml(String(v)) + '</td>';
          tbody.appendChild(tr);
        });
      }
    }

    function copyBody() {
      navigator.clipboard.writeText(currentBody).then(() => {
        const btn = document.querySelector('.copy-btn');
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
      });
    }

    // Tool result: receives structuredContent with response data
    function onToolResult(params) {
      const data = params?.structuredContent;
      if (data) renderResponse(data);
    }
  </script>
</body>
</html>`;
}
