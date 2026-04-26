/**
 * APIDash Collections Explorer UI
 *
 * Browse and manage API request collections with:
 * - Searchable sidebar list
 * - Request detail view with full metadata
 * - Quick-copy and quick-send actions
 * SEP-1865 compatible.
 */

import { baseStyles, collectionsStyles } from '../styles.js';
import { getMcpWorkspaceData } from '@apidash/mcp-core';

export function COLLECTIONS_EXPLORER_UI(): string {
  const workspaceData = getMcpWorkspaceData();
  const sampleData = JSON.stringify(workspaceData.requests);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>APIDash · Collections</title>
  <style>
    ${baseStyles}
    ${collectionsStyles}
  </style>
</head>
<body>
  <div class="header">
    <span class="header-title">📁 APIDash Collections</span>
    <span class="statusbar" id="connStatus" style="margin-left:auto;">Connecting…</span>
  </div>

  <div class="main">
    <!-- Sidebar -->
    <div class="sidebar">
      <div class="sidebar-header">
        <span>📋</span> Requests
        <span id="reqCount" style="margin-left:auto; font-size:10px; color:var(--muted);"></span>
      </div>
      <div class="sidebar-search">
        <input type="text" placeholder="🔍 Search…" id="searchInput" oninput="filterRequests(this.value)" />
      </div>
      <div class="req-list" id="reqList"></div>
    </div>

    <!-- Detail Pane -->
    <div class="detail-pane">
      <div class="header" style="background:var(--surface2); border-bottom:1px solid var(--border); padding:8px 12px;">
        <div id="selectedMethod" class="badge" style="display:none;"></div>
        <span id="selectedName" style="font-weight:600; font-size:12px;"></span>
        <div style="margin-left:auto; display:flex; gap:6px;">
          <button class="btn-secondary" id="copyUrlBtn" onclick="copySelectedUrl()" style="display:none;">📋 URL</button>
          <button class="btn-secondary" id="copyCurlBtn" onclick="copySelectedCurl()" style="display:none;">📋 cURL</button>
          <button class="btn-primary" id="loadBtn" onclick="loadSelected()" style="display:none;">Load in Builder →</button>
        </div>
      </div>

      <div id="emptyState" class="empty-state">
        <div class="empty-icon">📂</div>
        <div class="empty-text">Select a request to view details</div>
      </div>

      <div id="detailContent" class="detail-content" style="display:none;">
        <!-- URL Card -->
        <div class="panel">
          <div class="panel-header">🔗 Endpoint</div>
          <div style="padding:10px 12px;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span id="detailMethodBadge" class="badge"></span>
              <code id="detailUrl" style="font-family:var(--mono); font-size:11px; word-break:break-all;"></code>
            </div>
          </div>
        </div>

        <!-- Description Card -->
        <div class="panel" id="descPanel">
          <div class="panel-header">📝 Description</div>
          <div style="padding:10px 12px; font-size:12px; color:var(--text);" id="detailDesc"></div>
        </div>

        <!-- Body Card (if present) -->
        <div class="panel" id="bodyPanel" style="display:none;">
          <div class="panel-header">📤 Request Body</div>
          <div style="padding:10px 12px;">
            <div style="font-size:9px; color:var(--muted); margin-bottom:6px;">Content-Type: <span id="detailContentType"></span></div>
            <pre id="detailBody" class="code-block" style="margin:0;"></pre>
          </div>
        </div>

        <!-- Headers Card -->
        <div class="panel" id="headersPanel" style="display:none;">
          <div class="panel-header">📋 Headers</div>
          <div style="padding:10px 12px;" id="detailHeaders"></div>
        </div>

        <!-- cURL Preview -->
        <div class="panel">
          <div class="panel-header" style="justify-content:space-between;">
            <span>🐚 cURL Preview</span>
            <button class="btn-secondary" style="font-size:9px; padding:2px 8px;" onclick="copySelectedCurl()">Copy</button>
          </div>
          <pre id="detailCurl" class="code-block" style="margin:8px; font-size:10px;"></pre>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <span class="statusbar" id="footerStatus"></span>
    <div style="margin-left:auto; display:flex; gap:6px; align-items:center;">
      <button class="btn-secondary" onclick="addToChat()" id="addChatBtn" disabled>+ Add to Chat</button>
    </div>
  </div>

  <script>
    const REQUESTS = ${sampleData};
    const pending = new Map();
    let nextId = 1;
    let selected = null;

    function request(method, params) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        window.parent.postMessage({ jsonrpc: '2.0', id, method, params }, '*');
      });
    }
    function notify(method, params) {
      window.parent.postMessage({ jsonrpc: '2.0', method, params }, '*');
    }

    window.addEventListener('message', e => {
      const msg = e.data;
      if (!msg?.jsonrpc) return;
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? reject(msg.error) : resolve(msg.result);
      }
    });

    const METHOD_CLASSES = {
      GET:'badge-get', POST:'badge-post', PUT:'badge-put',
      PATCH:'badge-patch', DELETE:'badge-delete', HEAD:'badge-head'
    };

    function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;'); }

    function renderList(items) {
      const container = document.getElementById('reqList');
      document.getElementById('reqCount').textContent = items.length + ' items';
      if (!items.length) {
        container.innerHTML = '<div style="padding:12px; color:var(--muted); font-size:11px; text-align:center;">No requests found</div>';
        return;
      }
      container.innerHTML = items.map(req => \`
        <div class="req-item \${selected?.id === req.id ? 'active' : ''}" onclick="selectRequest('\${req.id}')">
          <span class="badge \${METHOD_CLASSES[req.method] || ''}" style="flex-shrink:0;">\${req.method}</span>
          <div style="min-width:0;">
            <div class="req-name">\${esc(req.name)}</div>
            <div class="req-url">\${esc(req.url)}</div>
          </div>
        </div>
      \`).join('');
    }

    function filterRequests(term) {
      const t = term.toLowerCase();
      const filtered = REQUESTS.filter(r =>
        r.name.toLowerCase().includes(t) ||
        r.url.toLowerCase().includes(t) ||
        r.method.toLowerCase().includes(t)
      );
      renderList(filtered);
    }

    function selectRequest(id) {
      selected = REQUESTS.find(r => r.id === id);
      if (!selected) return;
      renderList(REQUESTS.filter(r => {
        const t = (document.getElementById('searchInput').value || '').toLowerCase();
        return !t || r.name.toLowerCase().includes(t) || r.url.toLowerCase().includes(t) || r.method.toLowerCase().includes(t);
      }));

      // Show detail
      document.getElementById('emptyState').style.display = 'none';
      document.getElementById('detailContent').style.display = '';
      document.getElementById('selectedName').textContent = selected.name;

      const methodBadge = document.getElementById('selectedMethod');
      methodBadge.style.display = 'inline-flex';
      methodBadge.textContent = selected.method;
      methodBadge.className = 'badge ' + (METHOD_CLASSES[selected.method] || '');

      // Detail fields
      document.getElementById('detailMethodBadge').textContent = selected.method;
      document.getElementById('detailMethodBadge').className = 'badge ' + (METHOD_CLASSES[selected.method] || '');
      document.getElementById('detailUrl').textContent = selected.url;
      document.getElementById('detailDesc').textContent = selected.description || 'No description';

      // Body
      const bodyPanel = document.getElementById('bodyPanel');
      if (selected.body) {
        bodyPanel.style.display = '';
        document.getElementById('detailContentType').textContent = selected.contentType || 'application/json';
        document.getElementById('detailBody').textContent = selected.body;
      } else {
        bodyPanel.style.display = 'none';
      }

      // cURL
      const curlParts = [\`curl -X \${selected.method} '\${selected.url}'\`];
      if (selected.contentType) curlParts.push(\`  -H 'Content-Type: \${selected.contentType}'\`);
      if (selected.body) curlParts.push(\`  --data '\${selected.body.replace(/\\n/g, ' ')}'\`);
      document.getElementById('detailCurl').textContent = curlParts.join(' \\\\\\n');

      // Buttons
      document.getElementById('copyUrlBtn').style.display = '';
      document.getElementById('copyCurlBtn').style.display = '';
      document.getElementById('loadBtn').style.display = '';
      document.getElementById('addChatBtn').disabled = false;
    }

    function copySelectedUrl() {
      if (!selected) return;
      navigator.clipboard?.writeText(selected.url).then(() => setStatus('📋 URL copied!'));
    }

    function copySelectedCurl() {
      if (!selected) return;
      const cur = document.getElementById('detailCurl').textContent;
      navigator.clipboard?.writeText(cur).then(() => setStatus('📋 cURL copied!'));
    }

    async function loadSelected() {
      if (!selected) return;
      setStatus('Loading…');
      try {
        await request('ui/update-model-context', {
          structuredContent: { action: 'load-request', request: selected }
        });
        setStatus('✅ Loaded in builder');
      } catch (e) {
        setStatus('❌ ' + (e?.message || 'Failed'));
      }
    }

    async function addToChat() {
      if (!selected) return;
      setStatus('Adding to chat…');
      try {
        await request('ui/update-model-context', {
          structuredContent: { selectedRequest: selected }
        });
        setStatus('✅ Added to chat');
      } catch (e) {
        setStatus('❌ ' + (e?.message || 'Failed'));
      }
    }

    function setStatus(msg) {
      document.getElementById('footerStatus').textContent = msg;
      setTimeout(() => { document.getElementById('footerStatus').textContent = ''; }, 3000);
    }

    async function initialize() {
      const el = document.getElementById('connStatus');
      try {
        await request('ui/initialize', {
          protocolVersion: '2025-11-21',
          capabilities: {},
          clientInfo: { name: 'apidash-collections', version: '1.0.0' }
        });
        notify('ui/notifications/initialized', {});
        el.textContent = '● Connected';
        el.style.color = 'var(--success)';
      } catch (_) {
        el.textContent = '○ Standalone';
        el.style.color = 'var(--muted)';
      }
    }

    renderList(REQUESTS);
    initialize();
    notify('ui/notifications/size-changed', { width: 700, height: 520 });
  <\/script>
</body>
</html>`;
}
