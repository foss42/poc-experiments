/**
 * Shared Styles for UI components
 *
 * All CSS used by the API Dash MCP UI templates, extracted from the
 * individual ui/ files into a single source of truth.
 */

// ---------------------------------------------------------------------------
// Shared color palette (kept for backward-compat if needed)
// ---------------------------------------------------------------------------

export const CHART_COLORS = [
  '#0078d4', '#4ec9b0', '#ddb76f', '#f44747', '#c586c0',
  '#569cd6', '#d7ba7d', '#608b4e', '#ce9178', '#9cdcfe',
  '#b5cea8', '#d4d4d4', '#6a9955', '#dcdcaa',
];

// ---------------------------------------------------------------------------
// Base styles: variables, reset, buttons, toggles, spinner, status
// ---------------------------------------------------------------------------

export const baseStyles = `
    /* --- CSS Variables --- */
    :root {
      --bg: #1e1e1e;
      --surface: #252526;
      --surface2: #2d2d30;
      --border: #3c3c3c;
      --text: #cccccc;
      --muted: #858585;
      --accent: #0078d4;
      --accent-hover: #1c8ae6;
      --success: #4ec9b0;
      --warning: #ddb76f;
      --error: #f44747;
      --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      --mono: 'SF Mono', Consolas, monospace;
    }
    @media (prefers-color-scheme: light) {
      :root {
        --bg: #ffffff;
        --surface: #f8f8f8;
        --surface2: #f0f0f0;
        --border: #e0e0e0;
        --text: #1e1e1e;
        --muted: #666666;
      }
    }

    /* --- Reset --- */
    * { margin: 0; padding: 0; box-sizing: border-box; }

    /* --- Primary button --- */
    button.btn-primary {
      padding: 6px 14px;
      font: inherit; font-size: 11px;
      border: none; border-radius: 4px;
      cursor: pointer; font-weight: 500;
      background: var(--accent); color: white;
      transition: background 0.2s;
    }
    button.btn-primary:hover { background: var(--accent-hover); }
    button.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

    /* --- Secondary button --- */
    button.btn-secondary {
      padding: 4px 10px;
      font: inherit; font-size: 10px;
      background: var(--surface2);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 3px;
      cursor: pointer;
    }
    button.btn-secondary:hover { background: var(--border); }

    /* --- Toggle group --- */
    .toggle-group {
      display: flex;
      border: 1px solid var(--border);
      border-radius: 4px;
      overflow: hidden;
      background: var(--surface);
    }
    .toggle-btn {
      flex: 1;
      padding: 5px 12px;
      font: inherit; font-size: 10px;
      border: none;
      background: transparent;
      color: var(--text);
      cursor: pointer;
      transition: all 0.2s;
    }
    .toggle-btn:hover { background: var(--surface2); }
    .toggle-btn.active { background: var(--accent); color: white; }
    .toggle-btn:not(:last-child) { border-right: 1px solid var(--border); }

    /* --- Loading spinner --- */
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: var(--muted);
      font-size: 13px;
    }
    .loading-spinner {
      width: 20px; height: 20px;
      border: 2px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-right: 8px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* --- Status text --- */
    .status {
      font-size: 10px; color: var(--muted);
      text-align: center;
    }
    .status.success { color: var(--success); }
    .status.error   { color: var(--error); }

    /* --- Common layout --- */
    body {
      font-family: var(--font);
      background: var(--bg);
      color: var(--text);
      display: flex;
      flex-direction: column;
    }
    .header {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }
    .title {
      font-weight: 600;
      display: flex;
      align-items: center;
    }
    .subtitle {
      font-size: 10px;
      color: var(--muted);
    }
`;

// ---------------------------------------------------------------------------
// API Dash styles
// ---------------------------------------------------------------------------

/** request-executor.ts */
export const requestExecutorStyles = `
    body {
      font: 11px/1.4 var(--font);
      padding: 8px;
      gap: 8px;
      max-height: 100vh;
      overflow: hidden;
    }

    .header {
      justify-content: space-between;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .app-icon { font-size: 16px; }
    .title { font-size: 13px; font-weight: 700; }

    .status-badge {
      font-size: 9px;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-badge.idle { background: var(--surface2); color: var(--muted); }
    .status-badge.running { background: #f9731620; color: #f97316; border: 1px solid #f9731640; }
    .status-badge.success { background: #22c55e20; color: #22c55e; border: 1px solid #22c55e40; }
    .status-badge.error { background: #ef444420; color: #ef4444; border: 1px solid #ef444440; }

    .toolbar {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      flex-shrink: 0;
    }
    .env-selector {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .field-label {
      font-size: 8px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.4px;
      font-weight: 600;
    }
    .env-selector select {
      padding: 5px 8px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 4px;
      color: var(--text);
      font: inherit;
      cursor: pointer;
      min-width: 130px;
    }
    .env-selector select:focus {
      outline: none;
      border-color: var(--accent);
    }
    .toolbar-actions {
      display: flex;
      gap: 6px;
      align-items: center;
      margin-left: auto;
    }
    button.btn-primary {
      padding: 5px 16px;
      font-size: 11px;
      font-weight: 600;
      border-radius: 4px;
      letter-spacing: 0.3px;
    }

    .search-row {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-shrink: 0;
    }
    .search-row input {
      flex: 1;
      padding: 6px 10px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 4px;
      color: var(--text);
      font: inherit;
    }
    .search-row input:focus {
      outline: none;
      border-color: var(--accent);
    }
    .search-row input::placeholder { color: var(--muted); }

    .method-filters {
      display: flex;
      gap: 4px;
      flex-shrink: 0;
    }
    .method-filter {
      padding: 3px 8px;
      font: inherit;
      font-size: 9px;
      font-weight: 600;
      border: 1px solid var(--border);
      border-radius: 3px;
      background: var(--surface);
      color: var(--muted);
      cursor: pointer;
      transition: all 0.15s;
    }
    .method-filter:hover { background: var(--surface2); color: var(--text); }
    .method-filter.active { background: var(--accent); color: white; border-color: var(--accent); }

    .requests-list {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 5px;
      padding: 2px 0;
    }

    .request-card {
      padding: 9px 11px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .request-card:hover {
      border-color: var(--accent);
      background: var(--surface2);
    }
    .request-card.selected {
      border-color: var(--accent);
      background: color-mix(in srgb, var(--accent) 8%, var(--surface));
      box-shadow: 0 0 0 1px var(--accent);
    }
    .card-left {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .method-badge {
      font-size: 9px;
      font-weight: 700;
      font-family: var(--mono);
      padding: 2px 6px;
      border-radius: 3px;
      border: 1px solid;
      flex-shrink: 0;
      letter-spacing: 0.3px;
    }
    .req-name {
      font-size: 11px;
      font-weight: 600;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .selected-indicator {
      font-size: 9px;
      color: var(--accent);
      font-weight: 600;
      margin-left: auto;
      flex-shrink: 0;
    }
    .req-url {
      font-size: 9px;
      font-family: var(--mono);
      color: var(--muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .req-tags {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }
    .tag {
      font-size: 8px;
      padding: 1px 5px;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 2px;
      color: var(--muted);
    }
    .card-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
      flex-shrink: 0;
    }
    .mock-status {
      font-size: 11px;
      font-weight: 700;
      font-family: var(--mono);
    }
    .mock-time {
      font-size: 9px;
      color: var(--muted);
      font-family: var(--mono);
    }

    .status-bar {
      font-size: 9px;
      color: var(--muted);
      padding: 4px 2px;
      flex-shrink: 0;
    }
    .status-bar.error { color: var(--error); }
    .status-bar.success { color: var(--success); }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 20px;
      color: var(--muted);
      gap: 8px;
    }
    .empty-icon { font-size: 28px; opacity: 0.5; }
    .empty-text { font-size: 11px; }
`;

/** collection-browser.ts */
export const collectionBrowserStyles = `
    body {
      font: 11px/1.4 var(--font);
      padding: 10px;
      gap: 8px;
      height: 100vh;
      overflow: hidden;
    }

    .header {
      justify-content: space-between;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .app-icon { font-size: 16px; }
    .title { font-size: 13px; font-weight: 700; }
    .subtitle { font-size: 9px; color: var(--muted); margin-top: 1px; }

    .stats-row {
      display: flex;
      gap: 6px;
    }
    .stat-chip {
      font-size: 9px;
      font-weight: 600;
      padding: 3px 8px;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--muted);
    }
    .stat-chip.success { color: #22c55e; background: #22c55e10; border-color: #22c55e30; }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .method-filters {
      display: flex;
      gap: 4px;
    }
    .method-filter {
      padding: 3px 8px;
      font: inherit;
      font-size: 9px;
      font-weight: 600;
      border: 1px solid var(--border);
      border-radius: 3px;
      background: var(--surface);
      color: var(--muted);
      cursor: pointer;
      transition: all 0.15s;
    }
    .method-filter:hover { background: var(--surface2); color: var(--text); }
    .method-filter.active { background: var(--accent); color: white; border-color: var(--accent); }
    .method-filter.get.active { background: #3b82f6; border-color: #3b82f6; }
    .method-filter.post.active { background: #22c55e; border-color: #22c55e; }
    .method-filter.put.active { background: #f97316; border-color: #f97316; }
    .method-filter.delete.active { background: #ef4444; border-color: #ef4444; }

    .search-input {
      flex: 1;
      padding: 5px 10px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 4px;
      color: var(--text);
      font: inherit;
    }
    .search-input:focus { outline: none; border-color: var(--accent); }
    .search-input::placeholder { color: var(--muted); }

    .content-grid {
      flex: 1;
      display: grid;
      grid-template-columns: 3fr 2fr;
      gap: 10px;
      min-height: 0;
    }
    .table-panel,
    .chart-panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .panel-title {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--muted);
      margin-bottom: 8px;
      flex-shrink: 0;
    }

    .table-wrap {
      flex: 1;
      overflow-y: auto;
      min-height: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    thead th {
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: var(--muted);
      font-weight: 600;
      text-align: left;
      padding: 4px 6px;
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      background: var(--surface);
    }
    tbody tr {
      border-bottom: 1px solid var(--border);
      transition: background 0.1s;
    }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:hover { background: var(--surface2); }
    tbody td {
      padding: 5px 6px;
      font-size: 10px;
      vertical-align: middle;
    }
    .name-cell { font-weight: 500; max-width: 160px; }
    .url-cell {
      font-family: var(--mono);
      font-size: 9px;
      color: var(--muted);
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .time-cell {
      font-family: var(--mono);
      font-size: 9px;
      color: var(--muted);
      white-space: nowrap;
    }
    .method-badge {
      font-size: 8px;
      font-weight: 700;
      font-family: var(--mono);
      padding: 2px 5px;
      border-radius: 3px;
      border: 1px solid;
      letter-spacing: 0.3px;
    }
    .tag {
      font-size: 8px;
      padding: 1px 4px;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 2px;
      color: var(--muted);
      margin-right: 2px;
    }
    .empty-cell {
      text-align: center;
      color: var(--muted);
      padding: 24px;
      font-size: 10px;
    }

    .chart-wrap {
      flex: 1;
      position: relative;
      min-height: 0;
    }
    .chart-wrap canvas {
      width: 100% !important;
      height: 100% !important;
    }

    @media (max-width: 600px) {
      .content-grid { grid-template-columns: 1fr; }
    }
`;

/** response-viewer.ts */
export const responseViewerStyles = `
    body {
      font: 11px/1.4 var(--font);
      padding: 0;
      gap: 0;
      height: 100vh;
      overflow: hidden;
    }

    .header {
      justify-content: space-between;
      padding: 8px 12px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
      gap: 8px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .app-icon { font-size: 16px; }
    .title { font-size: 13px; font-weight: 700; }
    .subtitle {
      font-size: 9px;
      color: var(--muted);
      font-family: var(--mono);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 400px;
    }

    .btn-export {
      padding: 4px 12px;
      font: inherit;
      font-size: 10px;
      font-weight: 600;
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-export:hover { background: var(--accent-hover); }

    .status-strip {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 12px;
      background: var(--surface2);
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .status-badge {
      font-size: 10px;
      font-weight: 700;
      font-family: var(--mono);
      padding: 3px 10px;
      border-radius: 4px;
    }
    .status-badge.success { background: #22c55e20; color: #22c55e; border: 1px solid #22c55e40; }
    .status-badge.redirect { background: #f59e0b20; color: #f59e0b; border: 1px solid #f59e0b40; }
    .status-badge.error { background: #ef444420; color: #ef4444; border: 1px solid #ef444440; }

    .meta-pills {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .meta-pill {
      font-size: 9px;
      color: var(--muted);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 3px;
      padding: 2px 7px;
    }
    .meta-pill strong { color: var(--text); }

    .section-details {
      flex-shrink: 0;
      border-bottom: 1px solid var(--border);
    }
    .section-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 12px;
      cursor: pointer;
      font-size: 10px;
      font-weight: 600;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.4px;
      user-select: none;
      background: var(--surface);
    }
    .section-summary:hover { background: var(--surface2); }
    .header-count {
      font-size: 9px;
      color: var(--muted);
      font-weight: 400;
      text-transform: none;
      letter-spacing: 0;
    }

    .headers-table-wrap {
      overflow-x: auto;
      max-height: 140px;
    }
    .headers-table {
      width: 100%;
      border-collapse: collapse;
    }
    .headers-table th {
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: var(--muted);
      font-weight: 600;
      text-align: left;
      padding: 4px 12px;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
    }
    .headers-table td {
      padding: 4px 12px;
      font-size: 10px;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }
    .headers-table tr:last-child td { border-bottom: none; }
    .header-key {
      font-family: var(--mono);
      color: var(--accent);
      white-space: nowrap;
      min-width: 150px;
    }
    .header-val {
      font-family: var(--mono);
      color: var(--muted);
      word-break: break-all;
    }

    .body-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }
    .body-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 5px 12px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .section-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: var(--muted);
    }
    .copy-btn {
      font: inherit;
      font-size: 9px;
      padding: 2px 8px;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 3px;
      color: var(--muted);
      cursor: pointer;
    }
    .copy-btn:hover { background: var(--border); color: var(--text); }

    .code-wrap {
      flex: 1;
      overflow: auto;
      min-height: 0;
    }
    .code-pre {
      margin: 0;
      font-family: var(--mono);
      font-size: 11px;
      line-height: 1.5;
      min-height: 100%;
    }
    .code-pre code {
      display: block;
      padding: 12px;
      min-height: 100%;
    }

    .loading-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--bg);
      z-index: 10;
      gap: 12px;
    }
    .loading-spinner {
      width: 24px; height: 24px;
      border: 2px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .loading-text { font-size: 11px; color: var(--muted); }
    @keyframes spin { to { transform: rotate(360deg); } }

    .status-bar {
      font-size: 9px;
      color: var(--muted);
      padding: 3px 12px;
      background: var(--surface);
      border-top: 1px solid var(--border);
      flex-shrink: 0;
    }
    .status-bar.error { color: var(--error); }
    .status-bar.success { color: var(--success); }

    #viewerContent { display: flex; flex-direction: column; flex: 1; min-height: 0; }
`;

// ---------------------------------------------------------------------------
// Legacy styles (kept for backward compatibility if old imports exist)
// ---------------------------------------------------------------------------

export const indiaSalesStyles = '';
export const salesPdfReportStyles = '';
export const salesVisualizationStyles = '';
