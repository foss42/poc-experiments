/**
 * APIDash GraphQL Explorer UI
 *
 * Interactive GraphQL query builder with:
 * - Endpoint URL input
 * - Query editor with sample
 * - Variables JSON editor
 * - Response viewer with formatting
 * - Headers support
 * SEP-1865 compatible.
 */

import { baseStyles, graphqlStyles } from '../styles.js';
import { GRAPHQL_SAMPLE_QUERY, GRAPHQL_SAMPLE_ENDPOINT } from '../data/api-data.js';

export function GRAPHQL_EXPLORER_UI(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>APIDash · GraphQL Explorer</title>
  <style>
    ${baseStyles}
    ${graphqlStyles}
  </style>
</head>
<body>
  <div class="header">
    <span class="header-title">⬡ APIDash GraphQL Explorer</span>
    <span class="statusbar" id="connStatus" style="margin-left:auto;">Connecting…</span>
  </div>

  <div class="main">
    <!-- Endpoint Row -->
    <div class="endpoint-row">
      <code style="font-size:11px; color:var(--muted); white-space:nowrap;">POST</code>
      <input type="text" id="endpointUrl" class="gql-url"
        value="${GRAPHQL_SAMPLE_ENDPOINT}"
        placeholder="https://api.example.com/graphql" />
      <div class="gql-run-toolbar">
        <button class="btn-secondary" onclick="loadSample()">Sample</button>
        <button class="btn-primary" id="runBtn" onclick="runQuery()">▶ Run</button>
      </div>
    </div>

    <!-- Editor Panes -->
    <div class="editor-panes">
      <!-- Query Editor -->
      <div class="editor-pane">
        <div class="editor-label">
          <span>📝 Query / Mutation</span>
          <button class="btn-secondary" style="font-size:9px; padding:2px 6px;" onclick="clearQuery()">Clear</button>
        </div>
        <textarea id="queryEditor" class="gql-textarea"
          placeholder="query { ... }"
          spellcheck="false">${GRAPHQL_SAMPLE_QUERY}</textarea>
      </div>

      <!-- Result Viewer -->
      <div class="editor-pane">
        <div class="editor-label">
          <span>📨 Response</span>
          <span id="respStatus" style="font-size:10px;"></span>
        </div>
        <div id="resultBox" class="result-box" style="color:var(--muted);">Run a query to see results…</div>
      </div>

      <!-- Variables -->
      <div class="editor-pane">
        <div class="editor-label">
          <span>{ } Variables</span>
          <span style="font-size:9px; color:var(--muted);">JSON</span>
        </div>
        <textarea id="variablesEditor" class="gql-textarea"
          placeholder='{ "id": 1 }'
          spellcheck="false"></textarea>
      </div>

      <!-- Headers -->
      <div class="editor-pane">
        <div class="editor-label">
          <span>🔑 Headers</span>
          <button class="btn-secondary" style="font-size:9px; padding:2px 6px;" onclick="addHeaderRow()">+ Add</button>
        </div>
        <div id="headersEditor" style="padding:8px; overflow-y:auto; flex:1;">
          <div id="headerRows"></div>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <button class="btn-secondary" onclick="formatQuery()">🎨 Format</button>
    <button class="btn-secondary" onclick="copyQuery()">📋 Copy Query</button>
    <div style="margin-left:auto; display:flex; gap:6px; align-items:center;">
      <span class="statusbar" id="footStatus"></span>
      <button class="btn-primary" id="addChatBtn" onclick="addToChat()" disabled>+ Add to Chat</button>
    </div>
  </div>

  <script>
    const pending = new Map();
    let nextId = 1;
    let lastResult = null;
    let headerRows = [];

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

    function renderHeaderRows() {
      const container = document.getElementById('headerRows');
      container.innerHTML = headerRows.map((row, i) => \`
        <div style="display:grid; grid-template-columns:1fr 1fr auto; gap:4px; margin-bottom:4px;">
          <input style="padding:4px 6px; font-size:10px; font-family:var(--mono);"
            placeholder="Header" value="\${esc(row.key)}" oninput="headerRows[\${i}].key=this.value" />
          <input style="padding:4px 6px; font-size:10px; font-family:var(--mono);"
            placeholder="Value" value="\${esc(row.value)}" oninput="headerRows[\${i}].value=this.value" />
          <button style="padding:2px 6px; background:transparent; border:none; color:var(--error); cursor:pointer;" onclick="delHeaderRow(\${i})">✕</button>
        </div>
      \`).join('');
    }
    function addHeaderRow() { headerRows.push({key:'',value:''}); renderHeaderRows(); }
    function delHeaderRow(i) { headerRows.splice(i,1); renderHeaderRows(); }

    function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }

    async function runQuery() {
      const url = document.getElementById('endpointUrl').value.trim();
      const query = document.getElementById('queryEditor').value.trim();
      if (!url) { setFoot('⚠️ Enter a GraphQL endpoint URL', 'warning'); return; }
      if (!query) { setFoot('⚠️ Enter a query', 'warning'); return; }

      const btn = document.getElementById('runBtn');
      btn.disabled = true;
      btn.textContent = '⟳ Running…';
      setFoot('', '');

      // Parse variables
      let variables = {};
      const varStr = document.getElementById('variablesEditor').value.trim();
      if (varStr) {
        try { variables = JSON.parse(varStr); }
        catch (e) { setFoot('❌ Invalid variables JSON: ' + e.message, 'error'); btn.disabled = false; btn.textContent = '▶ Run'; return; }
      }

      // Build headers
      const headers = { 'Content-Type': 'application/json' };
      headerRows.filter(r => r.key).forEach(r => { headers[r.key] = r.value; });

      const resultEl = document.getElementById('resultBox');
      resultEl.style.color = 'var(--muted)';
      resultEl.textContent = 'Running query…';

      try {
        const result = await request('tools/call', {
          name: 'graphql-execute-query',
          arguments: { url, query, variables, headers }
        });

        const sc = result?.structuredContent;
        lastResult = sc;
        document.getElementById('addChatBtn').disabled = false;

        const status = sc?.status || sc?.statusCode;
        const statusEl = document.getElementById('respStatus');
        if (status) {
          statusEl.textContent = status;
          const isOk = status >= 200 && status < 300;
          statusEl.style.color = isOk ? 'var(--success)' : 'var(--error)';
        }

        const data = sc?.data || sc?.response || result;
        if (data?.errors) {
          resultEl.style.color = 'var(--error)';
          resultEl.textContent = JSON.stringify(data.errors, null, 2);
          setFoot('❌ GraphQL errors', 'error');
        } else {
          resultEl.style.color = '';
          resultEl.textContent = JSON.stringify(data, null, 2);
          setFoot('✅ Query completed', 'success');
        }
      } catch (e) {
        resultEl.style.color = 'var(--error)';
        resultEl.textContent = 'Error: ' + (e?.message || String(e));
        setFoot('❌ Request failed', 'error');
      }

      btn.disabled = false;
      btn.textContent = '▶ Run';
    }

    function loadSample() {
      document.getElementById('endpointUrl').value = '${GRAPHQL_SAMPLE_ENDPOINT}';
      document.getElementById('queryEditor').value = \`${GRAPHQL_SAMPLE_QUERY}\`;
      document.getElementById('variablesEditor').value = '';
    }

    function clearQuery() {
      document.getElementById('queryEditor').value = '';
    }

    function formatQuery() {
      // Simple formatting - just normalize whitespace
      const q = document.getElementById('queryEditor').value;
      // Basic prettification
      document.getElementById('queryEditor').value = q.replace(/\\{/g, ' {\\n  ').replace(/\\}/g, '\\n}').replace(/,\\s*/g, '\\n  ').trim();
    }

    function copyQuery() {
      const q = document.getElementById('queryEditor').value;
      navigator.clipboard?.writeText(q).then(() => setFoot('📋 Copied!', ''));
    }

    async function addToChat() {
      if (!lastResult) return;
      setFoot('Adding to chat…', '');
      try {
        await request('ui/update-model-context', {
          structuredContent: {
            graphqlQuery: document.getElementById('queryEditor').value,
            graphqlEndpoint: document.getElementById('endpointUrl').value,
            graphqlResult: lastResult,
          }
        });
        setFoot('✅ Added to chat', 'success');
        document.getElementById('addChatBtn').disabled = true;
      } catch (e) {
        setFoot('❌ ' + (e?.message || 'Failed'), 'error');
      }
    }

    function setFoot(msg, type) {
      const el = document.getElementById('footStatus');
      el.textContent = msg;
      el.className = 'statusbar' + (type ? ' ' + type : '');
    }

    async function initialize() {
      const el = document.getElementById('connStatus');
      try {
        await request('ui/initialize', {
          protocolVersion: '2025-11-21',
          capabilities: {},
          clientInfo: { name: 'apidash-graphql-explorer', version: '1.0.0' }
        });
        notify('ui/notifications/initialized', {});
        el.textContent = '● Connected';
        el.style.color = 'var(--success)';
      } catch (_) {
        el.textContent = '○ Standalone';
        el.style.color = 'var(--muted)';
      }
    }

    initialize();
    notify('ui/notifications/size-changed', { width: 700, height: 500 });
  <\/script>
</body>
</html>`;
}
