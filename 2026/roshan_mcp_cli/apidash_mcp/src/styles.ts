/**
 * Shared Styles for APIDash MCP UI components
 *
 * All CSS used by the APIDash MCP UI templates.
 * Follows SPE-1865 styling conventions from the chatflow sample.
 */

// ---------------------------------------------------------------------------
// Shared color palette
// ---------------------------------------------------------------------------

export const METHOD_COLORS: Record<string, string> = {
  GET: '#4ec9b0',
  POST: '#ddb76f',
  PUT: '#569cd6',
  PATCH: '#c586c0',
  DELETE: '#f44747',
  HEAD: '#9cdcfe',
  OPTIONS: '#b5cea8',
  CONNECT: '#d4d4d4',
  TRACE: '#6a9955',
};

export const STATUS_COLORS: Record<string, string> = {
  '2': '#4ec9b0',  // 2xx success
  '3': '#ddb76f',  // 3xx redirect
  '4': '#f44747',  // 4xx client error
  '5': '#f44747',  // 5xx server error
};

// ---------------------------------------------------------------------------
// Base styles: variables, reset, buttons, toggles, spinner, status
// ---------------------------------------------------------------------------

export const baseStyles = `
    /* --- CSS Variables --- */
    :root {
      --bg: #1e1e1e;
      --surface: #252526;
      --surface2: #2d2d30;
      --surface3: #3c3c3c;
      --border: #3c3c3c;
      --border2: #4a4a4f;
      --text: #cccccc;
      --text2: #e0e0e0;
      --muted: #858585;
      --accent: #0078d4;
      --accent-hover: #1c8ae6;
      --accent-dim: rgba(0,120,212,0.15);
      --success: #4ec9b0;
      --warning: #ddb76f;
      --error: #f44747;
      --get: #4ec9b0;
      --post: #ddb76f;
      --put: #569cd6;
      --patch: #c586c0;
      --delete: #f44747;
      --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      --mono: 'SF Mono', Consolas, 'Courier New', monospace;
      --radius: 4px;
      --radius-lg: 6px;
    }
    @media (prefers-color-scheme: light) {
      :root {
        --bg: #ffffff;
        --surface: #f8f8f8;
        --surface2: #f0f0f0;
        --surface3: #e8e8e8;
        --border: #e0e0e0;
        --border2: #d0d0d0;
        --text: #1e1e1e;
        --text2: #111111;
        --muted: #666666;
        --accent-dim: rgba(0,120,212,0.1);
      }
    }

    /* --- Reset --- */
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    /* --- Primary button --- */
    .btn-primary {
      padding: 6px 14px;
      font: inherit; font-size: 11px;
      border: none; border-radius: var(--radius);
      cursor: pointer; font-weight: 500;
      background: var(--accent); color: white;
      transition: background 0.15s, transform 0.1s;
      display: inline-flex; align-items: center; gap: 4px;
    }
    .btn-primary:hover { background: var(--accent-hover); }
    .btn-primary:active { transform: scale(0.97); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

    /* --- Secondary button --- */
    .btn-secondary {
      padding: 5px 11px;
      font: inherit; font-size: 11px;
      background: var(--surface2);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      display: inline-flex; align-items: center; gap: 4px;
    }
    .btn-secondary:hover { background: var(--border); border-color: var(--border2); }
    .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

    /* --- Danger button --- */
    .btn-danger {
      padding: 5px 11px;
      font: inherit; font-size: 11px;
      background: rgba(244,71,71,0.15);
      color: var(--error);
      border: 1px solid rgba(244,71,71,0.3);
      border-radius: var(--radius);
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-danger:hover { background: rgba(244,71,71,0.25); }

    /* --- Toggle group --- */
    .toggle-group {
      display: flex;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      background: var(--surface);
    }
    .toggle-btn {
      flex: 1;
      padding: 5px 10px;
      font: inherit; font-size: 10px;
      border: none;
      background: transparent;
      color: var(--text);
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
    }
    .toggle-btn:hover { background: var(--surface2); }
    .toggle-btn.active { background: var(--accent); color: white; }
    .toggle-btn:not(:last-child) { border-right: 1px solid var(--border); }

    /* --- Input / select --- */
    input, select, textarea {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--text);
      font: inherit;
      outline: none;
      transition: border-color 0.15s;
    }
    input:focus, select:focus, textarea:focus {
      border-color: var(--accent);
    }
    input::placeholder, textarea::placeholder { color: var(--muted); }

    /* --- Badge --- */
    .badge {
      display: inline-flex; align-items: center;
      padding: 1px 6px;
      font-size: 9px; font-weight: 700;
      border-radius: 3px;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }
    .badge-get    { background: rgba(78,201,176,0.15); color: var(--get); border: 1px solid rgba(78,201,176,0.3); }
    .badge-post   { background: rgba(221,183,111,0.15); color: var(--post); border: 1px solid rgba(221,183,111,0.3); }
    .badge-put    { background: rgba(86,156,214,0.15); color: var(--put); border: 1px solid rgba(86,156,214,0.3); }
    .badge-patch  { background: rgba(197,134,192,0.15); color: var(--patch); border: 1px solid rgba(197,134,192,0.3); }
    .badge-delete { background: rgba(244,71,71,0.15); color: var(--delete); border: 1px solid rgba(244,71,71,0.3); }
    .badge-head   { background: rgba(156,220,254,0.15); color: #9cdcfe; border: 1px solid rgba(156,220,254,0.3); }
    .badge-options { background: rgba(181,206,168,0.15); color: #b5cea8; border: 1px solid rgba(181,206,168,0.3); }

    /* --- Status badge --- */
    .status-2xx { color: var(--success); }
    .status-3xx { color: var(--warning); }
    .status-4xx, .status-5xx { color: var(--error); }

    /* --- Loading spinner --- */
    .loading {
      display: flex; align-items: center; justify-content: center;
      height: 100px; color: var(--muted); font-size: 12px; gap: 8px;
    }
    .spinner {
      width: 16px; height: 16px;
      border: 2px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* --- Status bar --- */
    .statusbar {
      font-size: 10px; color: var(--muted);
      display: flex; align-items: center; gap: 4px;
    }
    .statusbar.success { color: var(--success); }
    .statusbar.error   { color: var(--error); }
    .statusbar.warning { color: var(--warning); }

    /* --- Scrollbars --- */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--border2); }

    /* --- Code block --- */
    .code-block {
      font-family: var(--mono);
      font-size: 11px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 8px;
      overflow: auto;
      white-space: pre;
      color: var(--text);
    }

    /* --- Tab system --- */
    .tabs { display: flex; border-bottom: 1px solid var(--border); gap: 0; }
    .tab {
      padding: 6px 12px;
      font: inherit; font-size: 11px;
      background: transparent; border: none;
      color: var(--muted); cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.15s; margin-bottom: -1px;
    }
    .tab:hover { color: var(--text); }
    .tab.active { color: var(--accent); border-bottom-color: var(--accent); }

    /* --- Panel --- */
    .panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
    }
    .panel-header {
      padding: 8px 12px;
      border-bottom: 1px solid var(--border);
      font-size: 11px; font-weight: 600; color: var(--muted);
      text-transform: uppercase; letter-spacing: 0.4px;
      display: flex; align-items: center; gap: 6px;
    }

    /* --- Table --- */
    .data-table { width: 100%; border-collapse: collapse; font-size: 11px; }
    .data-table th {
      padding: 6px 8px; text-align: left;
      color: var(--muted); font-weight: 600;
      font-size: 9px; text-transform: uppercase; letter-spacing: 0.3px;
      border-bottom: 1px solid var(--border);
      background: var(--surface2);
    }
    .data-table td {
      padding: 6px 8px;
      border-bottom: 1px solid var(--border);
      font-family: var(--mono);
      vertical-align: top;
    }
    .data-table tr:last-child td { border-bottom: none; }
    .data-table tr:hover td { background: var(--accent-dim); }

    /* --- Common layout --- */
    body {
      font-family: var(--font);
      background: var(--bg);
      color: var(--text);
      display: flex;
      flex-direction: column;
      font-size: 12px;
      line-height: 1.4;
    }
    .header {
      display: flex; align-items: center;
      padding: 8px 12px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      gap: 8px; flex-shrink: 0;
    }
    .header-title {
      font-weight: 700; font-size: 12px;
      display: flex; align-items: center; gap: 6px;
    }
    .header-subtitle {
      font-size: 10px; color: var(--muted);
    }
    .footer {
      display: flex; align-items: center;
      gap: 8px; padding: 8px 12px;
      border-top: 1px solid var(--border);
      background: var(--surface);
      flex-shrink: 0;
    }
    .section-label {
      font-size: 9px; color: var(--muted);
      text-transform: uppercase; letter-spacing: 0.4px;
      font-weight: 600; margin-bottom: 3px;
    }
`;

/** HTTP Request Builder styles */
export const requestBuilderStyles = `
    body {
      padding: 0; gap: 0; height: 100vh; overflow: hidden;
    }
    .main {
      flex: 1; display: flex; flex-direction: column; overflow: hidden; padding: 10px; gap: 8px;
    }
    .url-row {
      display: flex; gap: 6px; align-items: stretch;
    }
    .method-select {
      padding: 6px 8px; font-size: 11px; font-weight: 700;
      border-radius: var(--radius); min-width: 90px; cursor: pointer;
    }
    .url-input {
      flex: 1; padding: 6px 10px; font-size: 11px; font-family: var(--mono);
    }
    .send-btn {
      padding: 6px 16px; font-size: 11px; font-weight: 700;
      background: var(--accent); color: white; border: none;
      border-radius: var(--radius); cursor: pointer; white-space: nowrap;
      transition: background 0.15s; display: flex; align-items: center; gap: 6px;
    }
    .send-btn:hover { background: var(--accent-hover); }
    .send-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .panes {
      flex: 1; display: grid; grid-template-columns: 1fr 1fr;
      gap: 8px; min-height: 0;
    }
    .pane {
      display: flex; flex-direction: column;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius-lg); overflow: hidden; min-height: 0;
    }
    .pane-content { flex: 1; overflow-y: auto; padding: 8px; }
    .param-row {
      display: grid; grid-template-columns: 1fr 1fr auto;
      gap: 4px; margin-bottom: 4px; align-items: center;
    }
    .param-input {
      padding: 4px 6px; font-size: 11px; font-family: var(--mono);
      width: 100%;
    }
    .param-del {
      padding: 3px 6px; font-size: 11px;
      background: transparent; border: none;
      color: var(--error); cursor: pointer;
    }
    .add-row-btn {
      margin-top: 4px; padding: 3px 8px; font-size: 10px;
      background: transparent; border: 1px dashed var(--border);
      color: var(--muted); border-radius: var(--radius);
      cursor: pointer; width: 100%; transition: all 0.15s;
    }
    .add-row-btn:hover { border-color: var(--accent); color: var(--accent); }
    .body-type-tabs { display: flex; gap: 0; padding: 6px 8px 0; }
    .body-tab {
      padding: 4px 10px; font-size: 10px; font-weight: 500;
      background: transparent; border: 1px solid var(--border);
      border-bottom: none; color: var(--muted); cursor: pointer;
      border-radius: 3px 3px 0 0; margin-right: 2px;
    }
    .body-tab.active { background: var(--surface2); color: var(--text); border-bottom-color: var(--surface2); }
    .body-textarea {
      width: 100%; padding: 8px; font-family: var(--mono); font-size: 11px;
      resize: none; height: 100%; min-height: 80px;
    }
    .response-meta {
      display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
      padding: 6px 8px; background: var(--surface2); border-bottom: 1px solid var(--border);
    }
    .response-status { font-size: 12px; font-weight: 700; }
    .response-meta-item { font-size: 10px; color: var(--muted); }
    .response-body {
      font-family: var(--mono); font-size: 11px; white-space: pre-wrap;
      word-break: break-all; padding: 8px;
    }
    @media (max-width: 600px) {
      .panes { grid-template-columns: 1fr; }
    }
`;

/** HTTP Tester Tool (send request + response) styles */
export const httpTesterStyles = `
    body { padding: 12px; gap: 10px; overflow-y: auto; }
    .request-card, .response-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius-lg); overflow: hidden;
    }
    .card-header {
      padding: 8px 12px; background: var(--surface2); border-bottom: 1px solid var(--border);
      display: flex; align-items: center; gap: 8px;
      font-size: 11px; font-weight: 600;
    }
    .field-group { padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; }
    .field-row { display: flex; flex-direction: column; gap: 3px; }
    .field-row label { font-size: 9px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.4px; font-weight: 600; }
    .field-input { padding: 6px 8px; font-size: 12px; font-family: var(--mono); width: 100%; }
    .field-select { padding: 6px 8px; font-size: 12px; width: 100%; }
    .field-textarea { padding: 6px 8px; font-size: 11px; font-family: var(--mono); width: 100%; resize: vertical; min-height: 60px; }
    .inline-row { display: flex; gap: 8px; }
    .inline-row > * { flex: 1; }
    .action-bar { display: flex; gap: 8px; justify-content: flex-end; padding: 8px 12px; border-top: 1px solid var(--border); }
    .resp-status-bar {
      padding: 8px 12px; display: flex; gap: 12px; align-items: center;
      background: var(--surface2); border-bottom: 1px solid var(--border);
    }
    .resp-body { padding: 10px 12px; font-family: var(--mono); font-size: 11px; white-space: pre-wrap; word-break: break-all; overflow: auto; max-height: 300px; }
    .headers-grid { display: grid; grid-template-columns: auto 1fr; gap: 0; }
    .hdr-key { padding: 3px 8px 3px 12px; font-family: var(--mono); font-size: 10px; color: var(--muted); border-bottom: 1px solid var(--border); }
    .hdr-val { padding: 3px 12px 3px 8px; font-family: var(--mono); font-size: 10px; color: var(--text); border-bottom: 1px solid var(--border); word-break: break-all; }
`;

/** Collections Explorer styles */
export const collectionsStyles = `
    body { gap: 0; height: 100vh; overflow: hidden; }
    .main { flex: 1; display: flex; overflow: hidden; }
    .sidebar {
      width: 200px; min-width: 200px; border-right: 1px solid var(--border);
      display: flex; flex-direction: column; overflow: hidden;
    }
    .sidebar-header {
      padding: 8px 10px; font-size: 11px; font-weight: 600;
      border-bottom: 1px solid var(--border); background: var(--surface2);
      display: flex; align-items: center; gap: 6px;
    }
    .sidebar-search { padding: 6px 8px; border-bottom: 1px solid var(--border); }
    .sidebar-search input { width: 100%; padding: 4px 6px; font-size: 11px; }
    .req-list { flex: 1; overflow-y: auto; }
    .req-item {
      padding: 7px 10px; cursor: pointer; display: flex; align-items: center; gap: 6px;
      border-bottom: 1px solid var(--border); transition: background 0.1s;
    }
    .req-item:hover { background: var(--surface2); }
    .req-item.active { background: var(--accent-dim); border-left: 2px solid var(--accent); }
    .req-name { font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .req-url { font-size: 9px; color: var(--muted); font-family: var(--mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .detail-pane {
      flex: 1; display: flex; flex-direction: column; overflow: hidden;
    }
    .detail-content { flex: 1; overflow-y: auto; padding: 12px; gap: 10px; display: flex; flex-direction: column; }
    .empty-state {
      flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 8px; color: var(--muted);
    }
    .empty-icon { font-size: 32px; opacity: 0.5; }
    .empty-text { font-size: 12px; }
`;

/** GraphQL Explorer styles */
export const graphqlStyles = `
    body { gap: 0; height: 100vh; overflow: hidden; }
    .main { flex: 1; display: flex; flex-direction: column; padding: 10px; gap: 8px; overflow: hidden; }
    .endpoint-row { display: flex; gap: 6px; align-items: center; }
    .gql-url { flex: 1; padding: 6px 10px; font-size: 11px; font-family: var(--mono); }
    .editor-panes { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; flex: 1; min-height: 0; overflow: hidden; }
    .editor-pane {
      display: flex; flex-direction: column;
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg);
      overflow: hidden;
    }
    .editor-label {
      padding: 6px 10px; font-size: 10px; font-weight: 600; color: var(--muted);
      text-transform: uppercase; letter-spacing: 0.4px;
      border-bottom: 1px solid var(--border); background: var(--surface2);
      display: flex; align-items: center; justify-content: space-between;
    }
    .gql-textarea {
      flex: 1; padding: 8px; font-family: var(--mono); font-size: 11px;
      resize: none; background: var(--surface); border: none;
      color: var(--text); outline: none;
    }
    .result-box {
      flex: 1; font-family: var(--mono); font-size: 11px;
      white-space: pre-wrap; word-break: break-all;
      padding: 8px; overflow-y: auto; color: var(--text);
    }
    .gql-run-toolbar {
      display: flex; gap: 8px; align-items: center; flex-shrink: 0;
    }
    @media (max-width: 600px) {
      .editor-panes { grid-template-columns: 1fr; }
    }
`;

/** Environment Variables styles */
export const envVarsStyles = `
    body { padding: 12px; gap: 10px; overflow-y: auto; }
    .env-table { width: 100%; border-collapse: collapse; }
    .env-table th, .env-table td { padding: 6px 8px; text-align: left; border-bottom: 1px solid var(--border); }
    .env-table th { font-size: 9px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.4px; font-weight: 600; background: var(--surface2); }
    .env-input { width: 100%; padding: 4px 6px; font-family: var(--mono); font-size: 11px; }
    .env-secret-toggle { padding: 2px 6px; font-size: 9px; cursor: pointer; background: var(--surface2); border: 1px solid var(--border); border-radius: 2px; color: var(--muted); }
    .env-actions { display: flex; gap: 6px; margin-top: 8px; }
    .env-panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; margin-bottom: 8px; }
    .env-panel-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--surface2); border-bottom: 1px solid var(--border); }
    .env-scope-badge { font-size: 9px; padding: 2px 6px; border-radius: 2px; background: var(--accent-dim); color: var(--accent); font-weight: 600; }
`;

/** Code Generator styles */
export const codegenStyles = `
    body { padding: 12px; gap: 10px; overflow-y: auto; max-height: 100vh; }
    .lang-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
      gap: 6px;
    }
    .lang-card {
      padding: 8px 10px; background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); cursor: pointer; transition: all 0.15s;
      display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center;
    }
    .lang-card:hover { border-color: var(--accent); background: var(--surface2); }
    .lang-card.selected { border-color: var(--accent); background: var(--accent-dim); }
    .lang-icon { font-size: 20px; }
    .lang-name { font-size: 10px; font-weight: 500; }
    .code-output {
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg);
      overflow: hidden;
    }
    .code-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 6px 10px; background: var(--surface2); border-bottom: 1px solid var(--border);
    }
    .code-content {
      font-family: var(--mono); font-size: 11px; white-space: pre;
      padding: 10px; overflow: auto; max-height: 300px;
      color: var(--text); overflow-x: auto;
    }
`;

/** History Viewer styles */
export const historyStyles = `
    body { gap: 0; height: 100vh; overflow: hidden; }
    .main { flex: 1; display: flex; overflow: hidden; }
    .history-list { width: 220px; min-width: 220px; border-right: 1px solid var(--border); overflow-y: auto; }
    .history-item {
      padding: 8px 10px; cursor: pointer; border-bottom: 1px solid var(--border);
      transition: background 0.1s; display: flex; flex-direction: column; gap: 2px;
    }
    .history-item:hover { background: var(--surface2); }
    .history-item.active { background: var(--accent-dim); border-left: 2px solid var(--accent); }
    .hist-url { font-size: 10px; font-family: var(--mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .hist-time { font-size: 9px; color: var(--muted); }
    .hist-detail { flex: 1; overflow-y: auto; padding: 12px; gap: 10px; display: flex; flex-direction: column; }
`;
