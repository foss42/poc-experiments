import { BASE_STYLES, MCP_COMMS_SCRIPT } from "../styles.js";
import { SAMPLE_REQUESTS } from "../data/sample-requests.js";

export function requestBuilderUI(): string {
  const presetOptions = SAMPLE_REQUESTS.map(
    (r) =>
      `<option value="${r.name}">${r.name} — ${r.method} ${r.url}</option>`
  ).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Dash - Request Builder</title>
  <style>
    ${BASE_STYLES}

    .url-bar {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }

    .url-bar select {
      width: 100px;
      font-weight: 600;
    }

    .url-bar input {
      flex: 1;
    }

    .preset-bar {
      margin-bottom: 16px;
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .preset-bar select {
      flex: 1;
    }

    .tab-content {
      display: none;
      padding: 12px 0;
    }

    .tab-content.active {
      display: block;
    }

    .kv-section {
      margin-bottom: 8px;
    }

    .add-row-btn {
      background: none;
      border: 1px dashed var(--border);
      color: var(--text-muted);
      padding: 6px 12px;
      border-radius: var(--radius);
      cursor: pointer;
      font-size: 12px;
      width: 100%;
      margin-top: 8px;
    }

    .add-row-btn:hover {
      border-color: var(--accent);
      color: var(--accent);
    }

    .status-line {
      margin-top: 16px;
      padding: 8px 12px;
      border-radius: var(--radius);
      font-size: 12px;
      display: none;
    }

    .status-line.visible { display: flex; align-items: center; gap: 8px; }
    .status-line.loading { background: rgba(55,148,255,0.1); color: var(--info); }
    .status-line.success { background: rgba(78,201,176,0.1); color: var(--success); }
    .status-line.error { background: rgba(241,76,76,0.1); color: var(--error); }
  </style>
</head>
<body>
  <h1>API Request Builder</h1>

  <div class="preset-bar">
    <label style="white-space:nowrap; color:var(--text-muted)">Preset:</label>
    <select id="presetSelect">
      <option value="">— Select a preset —</option>
      ${presetOptions}
    </select>
    <button class="btn btn-secondary" onclick="loadPreset()">Load</button>
  </div>

  <div class="url-bar">
    <select id="methodSelect">
      <option value="GET">GET</option>
      <option value="POST">POST</option>
      <option value="PUT">PUT</option>
      <option value="PATCH">PATCH</option>
      <option value="DELETE">DELETE</option>
      <option value="HEAD">HEAD</option>
    </select>
    <input type="text" id="urlInput" placeholder="https://api.apidash.dev/..." />
    <button class="btn btn-primary" id="sendBtn" onclick="sendRequest_()">Send</button>
  </div>

  <div class="tabs">
    <button class="tab active" data-tab="params" onclick="switchTab(this)">Params</button>
    <button class="tab" data-tab="headers" onclick="switchTab(this)">Headers</button>
    <button class="tab" data-tab="body" onclick="switchTab(this)">Body</button>
  </div>

  <div id="tab-params" class="tab-content active">
    <div id="paramsRows" class="kv-section"></div>
    <button class="add-row-btn" onclick="addKvRow('paramsRows')">+ Add Parameter</button>
  </div>

  <div id="tab-headers" class="tab-content">
    <div id="headersRows" class="kv-section"></div>
    <button class="add-row-btn" onclick="addKvRow('headersRows')">+ Add Header</button>
  </div>

  <div id="tab-body" class="tab-content">
    <textarea id="bodyInput" placeholder='{"key": "value"}' rows="6"></textarea>
  </div>

  <div id="statusLine" class="status-line"></div>

  <script>
    ${MCP_COMMS_SCRIPT}

    // ─── Tab switching ──────────────────────────
    function switchTab(el) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      el.classList.add('active');
      document.getElementById('tab-' + el.dataset.tab).classList.add('active');
    }

    // ─── Key-value row management ───────────────
    function addKvRow(containerId, key, value) {
      const container = document.getElementById(containerId);
      const row = document.createElement('div');
      row.className = 'kv-row';
      row.innerHTML =
        '<input type="text" placeholder="Key" value="' + (key || '') + '" />' +
        '<input type="text" placeholder="Value" value="' + (value || '') + '" />' +
        '<button class="kv-remove" onclick="this.parentElement.remove()">\\u00d7</button>';
      container.appendChild(row);
    }

    function getKvData(containerId) {
      const rows = document.querySelectorAll('#' + containerId + ' .kv-row');
      const result = {};
      rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        const k = inputs[0].value.trim();
        const v = inputs[1].value.trim();
        if (k) result[k] = v;
      });
      return result;
    }

    // ─── Preset loading ─────────────────────────
    const presets = ${JSON.stringify(SAMPLE_REQUESTS)};

    function loadPreset() {
      const name = document.getElementById('presetSelect').value;
      const preset = presets.find(p => p.name === name);
      if (!preset) return;

      document.getElementById('methodSelect').value = preset.method;
      document.getElementById('urlInput').value = preset.url;
      document.getElementById('bodyInput').value = preset.body || '';

      // Clear and repopulate params
      document.getElementById('paramsRows').innerHTML = '';
      if (preset.queryParams) {
        Object.entries(preset.queryParams).forEach(([k, v]) => addKvRow('paramsRows', k, v));
      }

      // Clear and repopulate headers
      document.getElementById('headersRows').innerHTML = '';
      if (preset.headers) {
        Object.entries(preset.headers).forEach(([k, v]) => addKvRow('headersRows', k, v));
      }
    }

    // ─── Send request ───────────────────────────
    function setStatus(cls, msg) {
      const el = document.getElementById('statusLine');
      el.className = 'status-line visible ' + cls;
      el.innerHTML = cls === 'loading' ? '<div class="spinner"></div> ' + msg : msg;
    }

    async function sendRequest_() {
      const method = document.getElementById('methodSelect').value;
      const url = document.getElementById('urlInput').value.trim();
      if (!url) { setStatus('error', 'Please enter a URL'); return; }

      const queryParams = getKvData('paramsRows');
      const headers = getKvData('headersRows');
      const body = document.getElementById('bodyInput').value.trim();

      const args = { method, url };
      if (Object.keys(queryParams).length > 0) args.queryParams = queryParams;
      if (Object.keys(headers).length > 0) args.headers = headers;
      if (body && method !== 'GET') args.body = body;

      setStatus('loading', 'Sending request...');
      document.getElementById('sendBtn').disabled = true;

      try {
        const result = await sendRequest('tools/call', {
          name: 'execute-api-request',
          arguments: args
        });
        setStatus('success', 'Request completed — check the response viewer');

        sendRequest('ui/update-model-context', {
          structuredContent: { request: args, response: result }
        }).catch(function() {});
      } catch (err) {
        setStatus('error', 'Error: ' + (err.message || JSON.stringify(err)));
      } finally {
        document.getElementById('sendBtn').disabled = false;
      }
    }

    // ─── Populate form from data ────────────────
    function populateForm(data) {
      if (!data) return;
      if (data.method) document.getElementById('methodSelect').value = data.method;
      if (data.url) document.getElementById('urlInput').value = data.url;
      if (data.body) document.getElementById('bodyInput').value =
        typeof data.body === 'string' ? data.body : JSON.stringify(data.body, null, 2);
      if (data.queryParams) {
        document.getElementById('paramsRows').innerHTML = '';
        Object.entries(data.queryParams).forEach(([k, v]) => addKvRow('paramsRows', k, v));
      }
      if (data.headers) {
        document.getElementById('headersRows').innerHTML = '';
        Object.entries(data.headers).forEach(([k, v]) => addKvRow('headersRows', k, v));
      }
    }

    // Tool input: receives tool call arguments before execution
    function onToolInput(params) {
      populateForm(params?.arguments);
    }

    // Tool result: receives structuredContent after execution (resolved presets)
    function onToolResult(params) {
      populateForm(params?.structuredContent);
    }

    // Start with one empty row each
    addKvRow('paramsRows');
    addKvRow('headersRows');
  </script>
</body>
</html>`;
}
