export function EVAL_CONFIG_UI(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Eval Configurator</title>
  <style>
    :root {
      --bg: #1e1e1e; --surface: #252526; --surface2: #2d2d30;
      --border: #3c3c3c; --text: #cccccc; --muted: #858585;
      --accent: #0078d4; --accent-hover: #1c8ae6;
      --success: #4ec9b0; --error: #f44747; --warning: #ddb76f;
      --claude: #d97706; --gemini: #2563eb;
      --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      --mono: 'SF Mono', Consolas, monospace;
    }
    @media (prefers-color-scheme: light) {
      :root {
        --bg: #ffffff; --surface: #f8f8f8; --surface2: #f0f0f0;
        --border: #e0e0e0; --text: #1e1e1e; --muted: #666666;
      }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: var(--font);
      background: var(--bg);
      color: var(--text);
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-size: 12px;
    }
    .title { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
    .section-label {
      font-size: 9px; color: var(--muted);
      text-transform: uppercase; letter-spacing: 0.4px;
      font-weight: 600; margin-bottom: 4px;
    }
    .field { display: flex; flex-direction: column; gap: 4px; }

    .provider-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .provider-card {
      border: 2px solid var(--border);
      border-radius: 6px;
      padding: 10px;
      cursor: pointer;
      transition: all 0.2s;
      background: var(--surface);
    }
    .provider-card:hover { border-color: var(--accent); }
    .provider-card.selected-claude {
      border-color: var(--claude);
      background: color-mix(in srgb, var(--claude) 10%, transparent);
    }
    .provider-card.selected-gemini {
      border-color: var(--gemini);
      background: color-mix(in srgb, var(--gemini) 10%, transparent);
    }
    .provider-name {
      font-weight: 600;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .provider-model {
      font-size: 9px;
      color: var(--muted);
      margin-top: 2px;
    }
    .provider-check {
      margin-left: auto;
      font-size: 14px;
      opacity: 0;
    }
    .provider-card.selected-claude .provider-check,
    .provider-card.selected-gemini .provider-check {
      opacity: 1;
    }

    .api-keys { display: flex; flex-direction: column; gap: 6px; }
    .api-key-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .api-key-label {
      font-size: 10px;
      font-weight: 600;
      min-width: 52px;
    }
    .api-key-label.claude { color: var(--claude); }
    .api-key-label.gemini { color: var(--gemini); }

    input[type="password"], input[type="text"], textarea {
      padding: 6px 8px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 4px;
      color: var(--text);
      font: inherit;
      font-size: 11px;
      width: 100%;
    }
    input:focus, textarea:focus {
      outline: none; border-color: var(--accent);
    }
    textarea {
      resize: vertical; min-height: 110px;
      font-family: var(--mono); font-size: 10px;
    }
    .hint {
      font-size: 9px; color: var(--muted); line-height: 1.4;
    }
    .hint code {
      background: var(--surface2); padding: 1px 4px;
      border-radius: 2px; font-family: var(--mono);
    }
    .footer {
      display: flex; align-items: center; gap: 8px;
      padding-top: 4px; border-top: 1px solid var(--border);
    }
    button.btn-primary {
      padding: 7px 16px; font: inherit; font-size: 11px;
      border: none; border-radius: 4px; cursor: pointer;
      font-weight: 500; background: var(--accent); color: white;
      transition: background 0.2s;
    }
    button.btn-primary:hover { background: var(--accent-hover); }
    button.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .status { font-size: 10px; color: var(--muted); }
    .status.running { color: var(--warning); }
    .status.success { color: var(--success); }
    .status.error { color: var(--error); }
    .spinner {
      display: inline-block; width: 10px; height: 10px;
      border: 2px solid var(--border); border-top-color: var(--accent);
      border-radius: 50%; animation: spin 0.8s linear infinite;
      margin-right: 4px; vertical-align: middle;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .hidden { display: none !important; }
  </style>
</head>
<body>

  <div class="title">AI Eval Configurator</div>

  <div class="field">
    <div class="section-label">Select Providers (choose one or both)</div>
    <div class="provider-grid">
      <div class="provider-card" id="card-claude" onclick="toggleProvider('claude')">
        <div class="provider-name">
          Claude
          <span class="provider-check">check</span>
        </div>
        <div class="provider-model">claude-sonnet-4-20250514</div>
      </div>
      <div class="provider-card" id="card-gemini" onclick="toggleProvider('gemini')">
        <div class="provider-name">
          Gemini
          <span class="provider-check">check</span>
        </div>
        <div class="provider-model">gemini-2.5-flash</div>
      </div>
    </div>
  </div>

  <div class="field">
    <div class="section-label">API Keys</div>
    <div class="api-keys">
      <div class="api-key-row" id="row-claude">
        <span class="api-key-label claude">Claude</span>
        <input type="password" id="key-claude" placeholder="sk-ant-..." />
      </div>
      <div class="api-key-row hidden" id="row-gemini">
        <span class="api-key-label gemini">Gemini</span>
        <input type="password" id="key-gemini" placeholder="AI..." />
      </div>
    </div>
  </div>

  <div class="field">
    <div class="section-label">Test Cases (JSON)</div>
    <textarea id="testCases" placeholder='[
  {"prompt": "What is 2 + 2?", "expected": "4"},
  {"prompt": "Capital of India?", "expected": "New Delhi"},
  {"prompt": "What color is the sky?", "expected": "blue"}
]'></textarea>
    <div class="hint">
      Format: <code>[{"prompt": "...", "expected": "..."}]</code>
      - pass/fail uses case-insensitive substring matching.
    </div>
  </div>

  <div class="footer">
    <button class="btn-primary" id="runBtn" onclick="runEval()">
      Run Evaluation
    </button>
    <span class="status" id="status">Select at least one provider</span>
  </div>

  <script>
    const selectedProviders = new Set();
    const pending = new Map();
    let nextId = 1;

    function sendRequest(method, params) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        window.parent.postMessage({ jsonrpc: "2.0", id, method, params }, "*");
      });
    }

    function sendNotification(method, params) {
      window.parent.postMessage({ jsonrpc: "2.0", method, params }, "*");
    }

    window.addEventListener("message", (e) => {
      const msg = e.data;
      if (!msg?.jsonrpc) return;
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      }
    });

    function toggleProvider(provider) {
      const card = document.getElementById("card-" + provider);
      const row = document.getElementById("row-" + provider);

      if (selectedProviders.has(provider)) {
        selectedProviders.delete(provider);
        card.className = "provider-card";
        row.classList.add("hidden");
      } else {
        selectedProviders.add(provider);
        card.className = "provider-card selected-" + provider;
        row.classList.remove("hidden");
      }
      updateStatus();
    }

    toggleProvider("claude");

    function updateStatus() {
      const btn = document.getElementById("runBtn");
      const status = document.getElementById("status");
      if (selectedProviders.size === 0) {
        status.textContent = "Select at least one provider";
        status.className = "status error";
        btn.disabled = true;
      } else if (selectedProviders.size === 2) {
        status.textContent = "Ready - will compare Claude vs Gemini";
        status.className = "status";
        btn.disabled = false;
      } else {
        const p = [...selectedProviders][0];
        status.textContent = "Ready - evaluating " + p.charAt(0).toUpperCase() + p.slice(1);
        status.className = "status";
        btn.disabled = false;
      }
    }

    function setStatus(msg, cls = "") {
      const el = document.getElementById("status");
      el.innerHTML = cls === "running"
        ? \`<span class="spinner"></span>\${msg}\`
        : msg;
      el.className = "status " + cls;
    }

    async function runEval() {
      if (selectedProviders.size === 0) {
        setStatus("Select at least one provider", "error");
        return;
      }

      const apiKeys = {};
      for (const p of selectedProviders) {
        const key = document.getElementById("key-" + p).value.trim();
        if (!key) {
          setStatus(\`API key required for \${p}\`, "error");
          return;
        }
        apiKeys[p] = key;
      }

      let testCases;
      try {
        testCases = JSON.parse(document.getElementById("testCases").value.trim());
        if (!Array.isArray(testCases) || testCases.length === 0) throw new Error();
      } catch {
        setStatus("Invalid JSON - check your test cases", "error");
        return;
      }

      document.getElementById("runBtn").disabled = true;
      const providerList = [...selectedProviders].join(" & ");
      setStatus(\`Running eval on \${providerList}...\`, "running");

      try {
        const result = await sendRequest("tools/call", {
          name: "run-eval",
          arguments: {
            providers: [...selectedProviders],
            apiKeys,
            testCases,
          },
        });

        const data = result.structuredContent;
        const summary = data.providers.map(p =>
          \`\${p}: \${data.providerResults[p].summary.score}%\`
        ).join(" | ");

        setStatus(\`Done - \${summary}\`, "success");

        await sendRequest("ui/update-model-context", {
          structuredContent: data,
        });

      } catch (err) {
        setStatus("Error: " + err.message, "error");
      } finally {
        document.getElementById("runBtn").disabled = false;
      }
    }

    async function initialize() {
      try {
        await sendRequest("ui/initialize", {
          protocolVersion: "2025-11-21",
          capabilities: {},
          clientInfo: { name: "eval-config", version: "1.0.0" },
        });
        sendNotification("ui/notifications/initialized", {});
      } catch {
      }
    }

    initialize();
  <\/script>
</body>
</html>`;
}
