/**
 * APIDash Environment Variables Manager UI
 *
 * Manage API environment variables with:
 * - Global and environment-scoped variables
 * - Secret value masking
 * - Add/Edit/Delete operations
 * - Variable interpolation preview
 * SEP-1865 compatible.
 */

import { baseStyles, envVarsStyles } from '../styles.js';

export function ENV_MANAGER_UI(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>APIDash · Environment Variables</title>
  <style>
    ${baseStyles}
    ${envVarsStyles}
  </style>
</head>
<body>
  <div class="header">
    <span class="header-title">🌱 APIDash Environment Variables</span>
    <div style="margin-left:auto; display:flex; gap:8px; align-items:center;">
      <select id="envSelect" style="padding:4px 8px; font-size:11px;" onchange="loadEnv(this.value)">
        <option value="global">🌐 Global</option>
        <option value="development">🔧 Development</option>
        <option value="staging">🏗️ Staging</option>
        <option value="production">🚀 Production</option>
      </select>
      <span class="statusbar" id="connStatus">Connecting…</span>
    </div>
  </div>

  <div style="flex:1; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:10px;">
    <!-- Active Environment Panel -->
    <div class="env-panel">
      <div class="env-panel-header">
        <div style="display:flex; align-items:center; gap:8px;">
          <span id="envIcon">🌐</span>
          <span style="font-size:12px; font-weight:600;" id="envTitle">Global Environment</span>
          <span class="env-scope-badge" id="scopeBadge">GLOBAL</span>
        </div>
        <div style="display:flex; gap:6px;">
          <button class="btn-secondary" style="font-size:10px;" onclick="exportVars()">⬇️ Export</button>
          <button class="btn-secondary" style="font-size:10px;" onclick="clearAll()">🗑️ Clear All</button>
        </div>
      </div>

      <div style="overflow-x:auto;">
        <table class="env-table" id="varsTable">
          <thead>
            <tr>
              <th style="width:24px;">✓</th>
              <th>Variable</th>
              <th>Value</th>
              <th>Secret</th>
              <th style="width:60px;">Actions</th>
            </tr>
          </thead>
          <tbody id="varsBody"></tbody>
        </table>
      </div>

      <!-- Add Row -->
      <div style="padding:10px 12px; border-top:1px solid var(--border); display:flex; gap:6px; align-items:center;">
        <input type="text" id="newKey" class="env-input" style="flex:1;" placeholder="Variable name (e.g. BASE_URL)" />
        <input type="text" id="newValue" class="env-input" style="flex:1;" placeholder="Value" />
        <label style="display:flex; align-items:center; gap:4px; font-size:10px; color:var(--muted); cursor:pointer;">
          <input type="checkbox" id="newSecret" style="cursor:pointer;" /> Secret
        </label>
        <button class="btn-primary" onclick="addVariable()">+ Add</button>
      </div>
    </div>

    <!-- Preview Panel -->
    <div class="panel">
      <div class="panel-header" style="justify-content:space-between;">
        <span>🔍 Interpolation Preview</span>
        <span style="font-size:9px; color:var(--muted);">Type {{VARIABLE}} to test</span>
      </div>
      <div style="padding:10px 12px; display:flex; flex-direction:column; gap:8px;">
        <textarea id="previewInput" style="width:100%; height:50px; font-family:var(--mono); font-size:11px; padding:6px; resize:none;"
          oninput="updatePreview()"
          placeholder="https://{{BASE_URL}}/api/{{VERSION}}/users"></textarea>
        <div style="font-size:9px; color:var(--muted);">Result:</div>
        <div id="previewOutput" class="code-block" style="font-size:11px; min-height:32px;"></div>
      </div>
    </div>

    <!-- Quick Reference -->
    <div class="panel">
      <div class="panel-header">📖 Usage Reference</div>
      <div style="padding:10px 12px; font-size:11px; color:var(--text); display:flex; flex-direction:column; gap:6px;">
        <div>Use <code style="background:var(--surface2); padding:1px 4px; border-radius:2px; font-family:var(--mono);">{{VARIABLE_NAME}}</code> in URLs, headers, and body</div>
        <div>Variables are resolved at request time</div>
        <div>Secret variables are masked in logs and exports</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:4px;">
          <code style="background:var(--surface2); padding:2px 6px; border-radius:2px; font-size:10px; font-family:var(--mono);">{{BASE_URL}}</code>
          <code style="background:var(--surface2); padding:2px 6px; border-radius:2px; font-size:10px; font-family:var(--mono);">{{API_KEY}}</code>
          <code style="background:var(--surface2); padding:2px 6px; border-radius:2px; font-size:10px; font-family:var(--mono);">{{VERSION}}</code>
          <code style="background:var(--surface2); padding:2px 6px; border-radius:2px; font-size:10px; font-family:var(--mono);">{{TOKEN}}</code>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <span class="statusbar" id="footStatus"></span>
    <div style="margin-left:auto; display:flex; gap:6px;">
      <button class="btn-secondary" onclick="saveAll()">💾 Save All</button>
      <button class="btn-primary" id="addChatBtn" onclick="addToChat()">+ Add to Chat</button>
    </div>
  </div>

  <script>
    const pending = new Map();
    let nextId = 1;
    let currentEnv = 'global';
    let vars = {};
    const DEFAULT_VARS = {
      global: [
        { key: 'BASE_URL', value: 'api.example.com', secret: false, enabled: true },
        { key: 'VERSION', value: 'v1', secret: false, enabled: true },
        { key: 'API_KEY', value: 'your-api-key-here', secret: true, enabled: true },
      ],
      development: [
        { key: 'BASE_URL', value: 'localhost:8080', secret: false, enabled: true },
        { key: 'DEBUG', value: 'true', secret: false, enabled: true },
        { key: 'TOKEN', value: 'dev-token-123', secret: true, enabled: true },
      ],
      staging: [
        { key: 'BASE_URL', value: 'staging.example.com', secret: false, enabled: true },
        { key: 'VERSION', value: 'v2-beta', secret: false, enabled: true },
      ],
      production: [
        { key: 'BASE_URL', value: 'api.example.com', secret: false, enabled: true },
        { key: 'VERSION', value: 'v2', secret: false, enabled: true },
        { key: 'API_KEY', value: '••••••••••••', secret: true, enabled: true },
      ],
    };

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

    const ENV_INFO = {
      global: { icon: '🌐', title: 'Global Environment', badge: 'GLOBAL' },
      development: { icon: '🔧', title: 'Development Environment', badge: 'DEV' },
      staging: { icon: '🏗️', title: 'Staging Environment', badge: 'STAGING' },
      production: { icon: '🚀', title: 'Production Environment', badge: 'PROD' },
    };

    // Masking toggle state
    const showSecret = {};

    function loadEnv(env) {
      currentEnv = env;
      vars[env] = vars[env] || (DEFAULT_VARS[env] ? JSON.parse(JSON.stringify(DEFAULT_VARS[env])) : []);
      const info = ENV_INFO[env] || { icon: '🌱', title: env, badge: env.toUpperCase() };
      document.getElementById('envIcon').textContent = info.icon;
      document.getElementById('envTitle').textContent = info.title;
      document.getElementById('scopeBadge').textContent = info.badge;
      renderVars();
      updatePreview();
    }

    function renderVars() {
      const list = vars[currentEnv] || [];
      const tbody = document.getElementById('varsBody');
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:16px; color:var(--muted); font-size:11px;">No variables. Add one below.</td></tr>';
        return;
      }
      tbody.innerHTML = list.map((v, i) => \`
        <tr>
          <td style="text-align:center;">
            <input type="checkbox" \${v.enabled ? 'checked' : ''} onchange="vars[currentEnv][\${i}].enabled=this.checked; updatePreview();" />
          </td>
          <td>
            <input class="env-input" value="\${esc(v.key)}"
              oninput="vars[currentEnv][\${i}].key=this.value; updatePreview();" />
          </td>
          <td>
            <input class="env-input" type="\${v.secret && !showSecret[i] ? 'password' : 'text'}"
              value="\${esc(v.value)}"
              oninput="vars[currentEnv][\${i}].value=this.value; updatePreview();" />
          </td>
          <td style="text-align:center;">
            <button class="env-secret-toggle" onclick="toggleSecret(\${i})"
              title="\${v.secret ? 'Secret' : 'Visible'}">
              \${v.secret ? '🔒' : '👁️'}
            </button>
          </td>
          <td>
            <button style="background:transparent; border:none; color:var(--error); cursor:pointer; font-size:13px;" onclick="deleteVar(\${i})">🗑️</button>
          </td>
        </tr>
      \`).join('');
    }

    function toggleSecret(i) {
      showSecret[i] = !showSecret[i];
      vars[currentEnv][i].secret = !vars[currentEnv][i].secret;
      renderVars();
    }

    function deleteVar(i) {
      vars[currentEnv].splice(i, 1);
      renderVars();
      updatePreview();
    }

    function addVariable() {
      const key = document.getElementById('newKey').value.trim();
      const value = document.getElementById('newValue').value;
      const secret = document.getElementById('newSecret').checked;
      if (!key) { setFoot('⚠️ Enter a variable name', 'warning'); return; }
      if (vars[currentEnv].some(v => v.key === key)) { setFoot('⚠️ Variable already exists', 'warning'); return; }
      vars[currentEnv] = vars[currentEnv] || [];
      vars[currentEnv].push({ key, value, secret, enabled: true });
      document.getElementById('newKey').value = '';
      document.getElementById('newValue').value = '';
      document.getElementById('newSecret').checked = false;
      renderVars();
      updatePreview();
      setFoot('✅ Variable added', 'success');
    }

    function updatePreview() {
      const input = document.getElementById('previewInput').value;
      const currentVars = (vars[currentEnv] || []).filter(v => v.enabled);
      let result = input;
      currentVars.forEach(v => {
        const safeKey = v.key.replace(/[-[\\]{}()*+?.,\\\\^$|#\\s]/g, '\\\\$&');
        const regex = new RegExp('{{' + safeKey + '}}', 'g');
        result = result.replace(regex, v.secret ? '••••••' : v.value);
      });
      const el = document.getElementById('previewOutput');
      if (result !== input) {
        el.textContent = result;
        el.style.color = 'var(--success)';
      } else {
        el.textContent = result || '—';
        el.style.color = '';
      }
    }

    function clearAll() {
      if (!confirm('Clear all variables in ' + currentEnv + '?')) return;
      vars[currentEnv] = [];
      renderVars();
      updatePreview();
    }

    function exportVars() {
      const data = JSON.stringify({ env: currentEnv, variables: vars[currentEnv] }, null, 2);
      navigator.clipboard?.writeText(data).then(() => setFoot('📋 Exported to clipboard', ''));
    }

    async function saveAll() {
      setFoot('Saving…', '');
      try {
        await request('tools/call', {
          name: 'update-environment-variables',
          arguments: { env: currentEnv, variables: vars[currentEnv] }
        });
        setFoot('✅ Saved', 'success');
      } catch (e) {
        setFoot('❌ ' + (e?.message || 'Save failed'), 'error');
      }
    }

    async function addToChat() {
      setFoot('Adding to chat…', '');
      try {
        const safeVars = (vars[currentEnv] || []).map(v => ({
          ...v, value: v.secret ? '••••••' : v.value
        }));
        await request('ui/update-model-context', {
          structuredContent: { env: currentEnv, variables: safeVars }
        });
        setFoot('✅ Added to chat', 'success');
      } catch (e) {
        setFoot('❌ ' + (e?.message || 'Failed'), 'error');
      }
    }

    function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
    function setFoot(msg, type) {
      const el = document.getElementById('footStatus');
      el.textContent = msg;
      el.className = 'statusbar' + (type ? ' ' + type : '');
      if (type) setTimeout(() => { el.textContent = ''; el.className = 'statusbar'; }, 3000);
    }

    async function initialize() {
      const el = document.getElementById('connStatus');
      try {
        await request('ui/initialize', {
          protocolVersion: '2025-11-21',
          capabilities: {},
          clientInfo: { name: 'apidash-env-manager', version: '1.0.0' }
        });
        notify('ui/notifications/initialized', {});
        el.textContent = '● Connected';
        el.style.color = 'var(--success)';
      } catch (_) {
        el.textContent = '○ Standalone';
        el.style.color = 'var(--muted)';
      }
    }

    loadEnv('global');
    initialize();
    notify('ui/notifications/size-changed', { width: 650, height: 560 });
  <\/script>
</body>
</html>`;
}
