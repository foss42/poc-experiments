export const BASE_STYLES = `
  :root {
    --bg: #1e1e1e;
    --surface: #252526;
    --surface-hover: #2a2d2e;
    --border: #3c3c3c;
    --text: #cccccc;
    --text-muted: #858585;
    --accent: #0078d4;
    --accent-hover: #1a8cff;
    --success: #4ec9b0;
    --error: #f14c4c;
    --warning: #cca700;
    --info: #3794ff;
    --font-mono: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
    --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --radius: 4px;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--font-sans);
    background: var(--bg);
    color: var(--text);
    font-size: 13px;
    line-height: 1.5;
    padding: 16px;
  }

  h1, h2, h3 { color: #e0e0e0; font-weight: 600; }
  h1 { font-size: 18px; margin-bottom: 16px; }
  h2 { font-size: 15px; margin-bottom: 12px; }
  h3 { font-size: 13px; margin-bottom: 8px; }

  input, select, textarea {
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 6px 10px;
    font-size: 13px;
    font-family: var(--font-sans);
    outline: none;
    transition: border-color 0.15s;
  }
  input:focus, select:focus, textarea:focus { border-color: var(--accent); }
  textarea { font-family: var(--font-mono); resize: vertical; min-height: 80px; }
  select { cursor: pointer; }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border: none;
    border-radius: var(--radius);
    font-size: 13px;
    font-family: var(--font-sans);
    cursor: pointer;
    transition: background 0.15s, opacity 0.15s;
  }
  .btn-primary { background: var(--accent); color: #fff; }
  .btn-primary:hover { background: var(--accent-hover); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-secondary { background: var(--surface); color: var(--text); border: 1px solid var(--border); }
  .btn-secondary:hover { background: var(--surface-hover); }

  .status-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
  }
  .status-2xx { background: rgba(78, 201, 176, 0.15); color: var(--success); }
  .status-3xx { background: rgba(55, 148, 255, 0.15); color: var(--info); }
  .status-4xx { background: rgba(204, 167, 0, 0.15); color: var(--warning); }
  .status-5xx { background: rgba(241, 76, 76, 0.15); color: var(--error); }

  .method-badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
  }
  .method-GET { background: rgba(78, 201, 176, 0.2); color: var(--success); }
  .method-POST { background: rgba(55, 148, 255, 0.2); color: var(--info); }
  .method-PUT { background: rgba(204, 167, 0, 0.2); color: var(--warning); }
  .method-PATCH { background: rgba(204, 167, 0, 0.2); color: var(--warning); }
  .method-DELETE { background: rgba(241, 76, 76, 0.2); color: var(--error); }

  .tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border); margin-bottom: 12px; }
  .tab {
    padding: 8px 16px;
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 13px;
    border-bottom: 2px solid transparent;
    transition: color 0.15s, border-color 0.15s;
  }
  .tab:hover { color: var(--text); }
  .tab.active { color: var(--text); border-bottom-color: var(--accent); }

  .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px; }

  .code-block {
    background: #1a1a1a;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px;
    font-family: var(--font-mono);
    font-size: 12px;
    line-height: 1.6;
    overflow-x: auto;
    white-space: pre;
    color: var(--text);
  }

  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid var(--border); font-size: 12px; }
  th { color: var(--text-muted); font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }

  .kv-row { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
  .kv-row input { flex: 1; }
  .kv-remove {
    background: none; border: none; color: var(--text-muted);
    cursor: pointer; font-size: 16px; padding: 2px 6px; border-radius: var(--radius);
  }
  .kv-remove:hover { color: var(--error); background: rgba(241,76,76,0.1); }

  .spinner {
    width: 16px; height: 16px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .tok-key { color: #9cdcfe; }
  .tok-str { color: #ce9178; }
  .tok-num { color: #b5cea8; }
  .tok-bool { color: #569cd6; }
  .tok-null { color: #569cd6; }
  .tok-comment { color: #6a9955; }
`;

export const MCP_COMMS_SCRIPT = `
  let _reqId = 0;
  const _pending = new Map();

  function sendRequest(method, params) {
    const id = ++_reqId;
    return new Promise((resolve, reject) => {
      _pending.set(id, { resolve, reject });
      window.parent.postMessage({ jsonrpc: '2.0', id, method, params }, '*');
    });
  }

  function sendNotification(method, params) {
    window.parent.postMessage({ jsonrpc: '2.0', method, params }, '*');
  }

  window.addEventListener('message', (e) => {
    const msg = e.data;
    if (!msg || msg.jsonrpc !== '2.0') return;

    // Response to a pending request
    if (msg.id !== undefined && _pending.has(msg.id)) {
      const { resolve, reject } = _pending.get(msg.id);
      _pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
      return;
    }

    // Requests from host that need a response
    if (msg.id !== undefined) {
      if (msg.method === 'ping') {
        window.parent.postMessage({ jsonrpc: '2.0', id: msg.id, result: {} }, '*');
      } else if (msg.method === 'ui/resource-teardown') {
        window.parent.postMessage({ jsonrpc: '2.0', id: msg.id, result: {} }, '*');
      }
      return;
    }

    // Notifications from host
    if (msg.method === 'ui/notifications/tool-input') {
      if (typeof onToolInput === 'function') onToolInput(msg.params);
    } else if (msg.method === 'ui/notifications/tool-result') {
      if (typeof onToolResult === 'function') onToolResult(msg.params);
    } else if (msg.method === 'ui/notifications/tool-input-partial') {
      if (typeof onToolInputPartial === 'function') onToolInputPartial(msg.params);
    } else if (msg.method === 'ui/notifications/tool-cancelled') {
      if (typeof onToolCancelled === 'function') onToolCancelled(msg.params);
    } else if (msg.method === 'ui/notifications/host-context-changed') {
      if (typeof onHostContextChanged === 'function') onHostContextChanged(msg.params);
    }
  });

  (async () => {
    try {
      const result = await sendRequest('ui/initialize', {
        appInfo: { name: 'API Dash MCP App', version: '1.0.0' },
        appCapabilities: {},
        protocolVersion: '2026-01-26'
      });
      // Apply host style variables if provided
      if (result && result.hostContext && result.hostContext.styles && result.hostContext.styles.variables) {
        var vars = result.hostContext.styles.variables;
        for (var key in vars) {
          if (vars[key]) document.documentElement.style.setProperty(key, vars[key]);
        }
      }
      sendNotification('ui/notifications/initialized');
      // Auto-resize: notify host of size changes
      var ro = new ResizeObserver(function() {
        sendNotification('ui/notifications/size-changed', {
          width: Math.ceil(window.innerWidth),
          height: Math.ceil(document.documentElement.getBoundingClientRect().height)
        });
      });
      ro.observe(document.documentElement);
      ro.observe(document.body);
    } catch (_) {}
  })();
`;
