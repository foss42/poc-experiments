export const SHARED_STYLES = `
  :root {
    --bg-primary: #1e1e2e;
    --bg-secondary: #2a2a3e;
    --bg-tertiary: #363650;
    --text-primary: #e0e0e0;
    --text-secondary: #a0a0b0;
    --text-muted: #707080;
    --accent: #7c6ff0;
    --accent-hover: #6a5cd8;
    --success: #4caf50;
    --error: #f44336;
    --warning: #ff9800;
    --info: #2196f3;
    --border: #3a3a50;
    --radius: 8px;
    --font: 'Segoe UI', system-ui, -apple-system, sans-serif;
    --mono: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  }

  @media (prefers-color-scheme: light) {
    :root {
      --bg-primary: #ffffff;
      --bg-secondary: #f5f5f8;
      --bg-tertiary: #eeeef2;
      --text-primary: #1a1a2e;
      --text-secondary: #555570;
      --text-muted: #888898;
      --border: #d0d0e0;
    }
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: var(--font);
    background: var(--bg-primary);
    color: var(--text-primary);
    line-height: 1.5;
    padding: 16px;
  }

  h2 {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 12px;
    color: var(--text-primary);
  }

  h3 {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--text-secondary);
  }

  label {
    display: block;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: 4px;
  }

  input, select, textarea {
    width: 100%;
    padding: 8px 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-primary);
    font-family: var(--font);
    font-size: 13px;
    outline: none;
    transition: border-color 0.2s;
  }

  input:focus, select:focus, textarea:focus {
    border-color: var(--accent);
  }

  textarea {
    font-family: var(--mono);
    font-size: 12px;
    resize: vertical;
    min-height: 80px;
  }

  button {
    padding: 8px 16px;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: var(--radius);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  button:hover { background: var(--accent-hover); }
  button:disabled { opacity: 0.5; cursor: not-allowed; }

  .btn-success { background: var(--success); }
  .btn-error { background: var(--error); }
  .btn-secondary {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border);
  }

  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .badge-success { background: #1b5e2033; color: var(--success); }
  .badge-error { background: #b7160033; color: var(--error); }
  .badge-warning { background: #e6510033; color: var(--warning); }
  .badge-info { background: #0d47a133; color: var(--info); }

  .card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
    margin-bottom: 12px;
  }

  .row {
    display: flex;
    gap: 12px;
    align-items: flex-end;
  }

  .col { flex: 1; }

  .mono {
    font-family: var(--mono);
    font-size: 12px;
  }

  pre {
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px;
    overflow-x: auto;
    font-family: var(--mono);
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  th, td {
    text-align: left;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
  }

  th {
    font-weight: 600;
    color: var(--text-secondary);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .status-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: var(--radius);
    font-size: 13px;
    font-weight: 500;
  }

  .status-bar.success { background: #1b5e2022; color: var(--success); }
  .status-bar.error { background: #b7160022; color: var(--error); }
  .status-bar.info { background: #0d47a122; color: var(--info); }

  .hidden { display: none; }

  .spinner {
    width: 16px; height: 16px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
`;

export const MCP_APP_SCRIPT = `
  let _requestId = 0;
  const _pending = new Map();

  window.addEventListener("message", (event) => {
    const msg = event.data;
    if (!msg || !msg.jsonrpc) return;

    if (msg.id && _pending.has(msg.id)) {
      const { resolve, reject } = _pending.get(msg.id);
      _pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
      return;
    }

    if (msg.method) {
      handleNotification(msg);
    }
  });

  function sendRequest(method, params) {
    return new Promise((resolve, reject) => {
      const id = String(++_requestId);
      _pending.set(id, { resolve, reject });
      window.parent.postMessage({ jsonrpc: "2.0", id, method, params }, "*");
    });
  }

  function sendNotification(method, params) {
    window.parent.postMessage({ jsonrpc: "2.0", method, params }, "*");
  }

  function notifySize() {
    const height = document.documentElement.scrollHeight;
    sendNotification("ui/notifications/size-changed", { height });
  }

  async function initialize() {
    await sendRequest("ui/initialize", {});
    sendNotification("ui/notifications/initialized", {});
    notifySize();
    new ResizeObserver(() => notifySize()).observe(document.body);
  }

  function handleNotification(msg) {
    if (msg.method === "ui/notifications/tool-input") {
      const sc = msg.params?.structuredContent || msg.params?.arguments;
      if (sc && typeof onToolInput === "function") {
        onToolInput(sc);
      }
    }
  }

  initialize();
`;
