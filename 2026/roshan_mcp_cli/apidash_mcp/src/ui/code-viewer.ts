import { baseStyles, codegenStyles } from '../styles.js';
import { HTTP_METHODS, CODE_GENERATORS } from '../data/api-data.js';

export function CODE_VIEWER_UI(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>APIDash · Code Viewer</title>
  <style>
    ${baseStyles}
    ${codegenStyles}
    body { padding: 12px; height: 100vh; overflow: hidden; display: flex; flex-direction: column; gap: 8px; }
    .code-output { flex: 1; display: flex; flex-direction: column; min-height: 0; }
    .code-content { flex: 1; overflow: auto; }
  </style>
</head>
<body>
  <div class="header">
    <span class="header-title">⚙️ APIDash Code Viewer</span>
    <span class="header-subtitle" id="codeSubtitle">Generated snippet</span>
    <span class="statusbar" id="connStatus" style="margin-left:auto;">Connecting…</span>
  </div>

  <div class="code-output" id="codeOutput" style="display:none;">
    <div class="code-toolbar">
      <span id="codeLangLabel" style="font-size:11px; font-weight:600; color:var(--muted);"></span>
      <div style="display:flex; gap:6px;">
        <button class="btn-secondary" style="font-size:9px; padding:3px 8px;" onclick="copyCode()">📋 Copy</button>
        <button class="btn-secondary" style="font-size:9px; padding:3px 8px;" onclick="downloadCode()">⬇️ Download</button>
      </div>
    </div>
    <pre id="codeContent" class="code-content"></pre>
  </div>

  <div class="footer">
    <span class="statusbar" id="footStatus"></span>
    <div style="margin-left:auto; display:flex; gap:6px;">
      <button class="btn-primary" id="addChatBtn" onclick="addToChat()" disabled>+ Add to Chat</button>
    </div>
  </div>

  <script>
    const pending = new Map();
    let nextId = 1;
    let currentLang = 'curl';
    let lastCode = '';
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
    });

    let lastRenderedTime = 0;
    async function fetchLatest() {
      try {
        const result = await request('tools/call', {
          name: '_get-last-response',
          arguments: {}
        });
        const state = result?.structuredContent?.lastCodeState;
        if (state && state.code && state.timestamp !== lastRenderedTime) {
          lastRenderedTime = state.timestamp;
          
          if (state.generator) {
            currentLang = state.generator;
          }

          const gens = ${JSON.stringify(CODE_GENERATORS)};
          const gen = gens.find(g => g.id === currentLang);
          lastCode = state.code;
          lastInput = state.request || null;
          
          document.getElementById('codeOutput').style.display = 'flex';
          document.getElementById('codeLangLabel').textContent = String(gen?.name || currentLang) + ' (' + String(gen?.lang || '') + ')';
          document.getElementById('codeContent').textContent = lastCode;
          document.getElementById('codeSubtitle').textContent = "Generated " + (gen?.name || currentLang) + " snippet";
          document.getElementById('addChatBtn').disabled = false;
          setFoot('✅ Fetched from backend', 'success');
        }
      } catch (e) {
      }
    }
    
    // Poll every 1s for updates
    setInterval(fetchLatest, 1000);

    function copyCode() {
      if (!lastCode) return;
      navigator.clipboard?.writeText(lastCode).then(() => setFoot('📋 Copied!', ''));
    }

    function downloadCode() {
      if (!lastCode) return;
      const gens = ${JSON.stringify(CODE_GENERATORS)};
      const gen = gens.find(g => g.id === currentLang);
      const ext = gen?.lang === 'javascript' ? 'js' : gen?.lang === 'python' ? 'py' : gen?.lang === 'bash' ? 'sh' : gen?.lang || 'txt';
      const blob = new Blob([lastCode], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'api-request.' + ext;
      a.click();
    }

    async function addToChat() {
      if (!lastCode || !lastInput) return;
      setFoot('Adding to chat…', '');
      try {
        await request('ui/update-model-context', {
          content: [{
            type: "text",
            text: "Here is the raw generated code snippet. You can use it, explain it, or format it as needed."
          }],
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
          clientInfo: { name: 'apidash-code-viewer', version: '1.0.0' }
        });
        notify('ui/notifications/initialized', {});
        el.textContent = '● Connected';
        el.style.color = 'var(--success)';
        
        // Fetch once immediately
        await fetchLatest();
      } catch (_) {
        el.textContent = '○ Standalone';
        el.style.color = 'var(--muted)';
      }
    }

    initialize();
    notify('ui/notifications/size-changed', { width: 650, height: 450 });
  </script>
</body>
</html>`;
}
