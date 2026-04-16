/**
 * APIDash Code Generator UI
 *
 * Generates code snippets for API requests in 12+ languages:
 * - Interactive request configuration
 * - Language selector grid with icons
 * - Syntax-highlighted output
 * - Copy to clipboard support
 * SEP-1865 compatible.
 */

import { baseStyles, codegenStyles } from '../styles.js';
import { HTTP_METHODS, CODE_GENERATORS } from '../data/api-data.js';

export function CODE_GENERATOR_UI(): string {
  const methodOptions = HTTP_METHODS
    .map(m => `<option value="${m}">${m}</option>`)
    .join('');

  const langCards = CODE_GENERATORS
    .map(g => `
      <div class="lang-card ${g.id === 'curl' ? 'selected' : ''}"
           id="lang-${g.id}" onclick="selectLang('${g.id}')">
        <span class="lang-icon">${g.icon}</span>
        <span class="lang-name">${g.name}</span>
      </div>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>APIDash · Code Generator</title>
  <style>
    ${baseStyles}
    ${codegenStyles}
  </style>
</head>
<body>
  <div class="header">
    <span class="header-title">⚙️ APIDash Code Generator</span>
    <span class="header-subtitle">Generate code for any language</span>
    <span class="statusbar" id="connStatus" style="margin-left:auto;">Connecting…</span>
  </div>

  <div style="flex:1; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:10px;">
    <!-- Request Input -->
    <div class="panel">
      <div class="panel-header">🔗 Request Details</div>
      <div style="padding:10px 12px; display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; gap:6px;">
          <select id="codeMethod" style="padding:6px 8px; font-size:11px; font-weight:700; min-width:90px;">
            ${methodOptions}
          </select>
          <input type="text" id="codeUrl" style="flex:1; padding:6px 10px; font-size:11px; font-family:var(--mono);"
            placeholder="https://api.example.com/endpoint"
            value="https://jsonplaceholder.typicode.com/posts/1" />
        </div>
        <div style="display:flex; gap:8px;">
          <div style="flex:1;">
            <div class="section-label">Headers (JSON)</div>
            <textarea id="codeHeaders" style="width:100%; height:50px; padding:6px; font-size:10px; font-family:var(--mono); resize:none;"
              placeholder='{"Authorization": "Bearer token"}'></textarea>
          </div>
          <div style="flex:1;">
            <div class="section-label">Body (JSON/Text)</div>
            <textarea id="codeBody" style="width:100%; height:50px; padding:6px; font-size:10px; font-family:var(--mono); resize:none;"
              placeholder='{"key": "value"}'></textarea>
          </div>
        </div>
        <div style="text-align:right;">
          <button class="btn-primary" onclick="generateCode()">⚡ Generate</button>
        </div>
      </div>
    </div>

    <!-- Language Selector -->
    <div class="panel">
      <div class="panel-header">🌐 Target Language</div>
      <div style="padding:10px 12px;">
        <div class="lang-grid">
          ${langCards}
        </div>
      </div>
    </div>

        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <span class="statusbar" id="footStatus"></span>
    <div style="margin-left:auto; display:flex; gap:6px;">
      <button class="btn-secondary" onclick="loadFromBuilder()">← From Builder</button>
      <button class="btn-primary" id="addChatBtn" onclick="addToChat()" disabled>+ Add to Chat</button>
    </div>
  </div>

  <script>
    const pending = new Map();
    let nextId = 1;
    let currentLang = 'curl';
    let lastInput = null;

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
        return;
      }
      // Handle pre-populated data from builder
      if (msg.method === 'ui/notifications/tool-input') {
        const sc = msg.params?.structuredContent;
        if (sc?.request) {
          const req = sc.request;
          if (req.method) document.getElementById('codeMethod').value = req.method;
          if (req.url) document.getElementById('codeUrl').value = req.url;
          if (req.headers) document.getElementById('codeHeaders').value = JSON.stringify(req.headers, null, 2);
          if (req.body) document.getElementById('codeBody').value = req.body;
          generateCode();
        }
      }
    });

    function selectLang(id) {
      document.querySelectorAll('.lang-card').forEach(c => c.classList.remove('selected'));
      document.getElementById('lang-' + id)?.classList.add('selected');
      currentLang = id;
      if (lastInput) generateCode();
    }

    function getGenerator() {
      const gens = ${JSON.stringify(CODE_GENERATORS)};
      return gens.find(g => g.id === currentLang);
    }

    async function generateCode() {
      const method = document.getElementById('codeMethod').value;
      const url = document.getElementById('codeUrl').value.trim();
      if (!url) { setFoot('⚠️ Enter a URL', 'warning'); return; }

      let headers = {};
      const headersStr = document.getElementById('codeHeaders').value.trim();
      if (headersStr) {
        try { headers = JSON.parse(headersStr); }
        catch (e) { setFoot('❌ Invalid headers JSON', 'error'); return; }
      }

      const body = document.getElementById('codeBody').value.trim() || undefined;
      lastInput = { method, url, headers, body };

      setFoot('Generating & Syncing…', '');

      try {
        await request('tools/call', {
          name: 'generate-code-snippet',
          arguments: { method, url, headers, body, generator: currentLang }
        });

        const poll = await request('tools/call', { name: '_get-last-response', arguments: {} });
        const code = poll?.structuredContent?.lastCodeState?.code || "Code unavailable";

        await request('ui/update-model-context', {
          content: [{
            type: "text",
            text: "Please display this generated code snippet using the apidash_mcp_server 'generate-code-snippet' tool so I can view it."
          }],
          structuredContent: {
            language: currentLang,
            request: { method, url, headers, body },
            code: code,
          }
        });
        
        setFoot('✅ Added snippet to chat context!', 'success');
        document.getElementById('addChatBtn').disabled = true;
      } catch (e) {
        setFoot('❌ ' + (e?.message || 'Generation failed'), 'error');
      }
    }

    async function addToChat() {
      await generateCode();
    }

    async function loadFromBuilder() {
      setFoot('Loading from builder…', '');
      try {
        const result = await request('tools/call', {
          name: 'get-builder-state',
          arguments: {}
        });
        const sc = result?.structuredContent;
        if (sc?.method) document.getElementById('codeMethod').value = sc.method;
        if (sc?.url) document.getElementById('codeUrl').value = sc.url;
        if (sc?.headers) document.getElementById('codeHeaders').value = JSON.stringify(sc.headers, null, 2);
        if (sc?.body) document.getElementById('codeBody').value = sc.body;
        setFoot('✅ Loaded', 'success');
        await generateCode();
      } catch (e) {
        setFoot('❌ Nothing loaded in builder', 'error');
      }
    }

    async function addToChat() {
      if (!lastCode || !lastInput) return;
      setFoot('Adding to chat…', '');
      try {
        await request('ui/update-model-context', {
          structuredContent: {
            language: currentLang,
            code: lastCode,
            request: lastInput,
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
          clientInfo: { name: 'apidash-codegen', version: '1.0.0' }
        });
        notify('ui/notifications/initialized', {});
        el.textContent = '● Connected';
        el.style.color = 'var(--success)';
        await generateCode();
      } catch (_) {
        el.textContent = '○ Standalone';
        el.style.color = 'var(--muted)';
      }
    }

    initialize();
    notify('ui/notifications/size-changed', { width: 650, height: 580 });
  <\/script>
</body>
</html>`;
}
