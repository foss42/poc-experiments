/**
 * Shared CSS styles for MCP App UIs — follows the sample-mcp-apps-chatflow pattern.
 */

export const baseStyles = `
  :root {
    --bg: #1e1e1e;
    --surface: #252526;
    --surface2: #2d2d30;
    --border: #3c3c3c;
    --text: #cccccc;
    --muted: #858585;
    --accent: #3b82f6;
    --accent-hover: #2563eb;
    --success: #10b981;
    --warning: #f59e0b;
    --error: #ef4444;
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
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: var(--font); background: var(--bg); color: var(--text); font-size: 13px; padding: 12px; }
  button {
    font: inherit; cursor: pointer; border: none; border-radius: 6px;
    padding: 8px 16px; font-size: 12px; font-weight: 500; transition: all 0.15s;
  }
  .btn-primary { background: var(--accent); color: white; }
  .btn-primary:hover { background: var(--accent-hover); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  select, input {
    background: var(--surface); color: var(--text);
    border: 1px solid var(--border); border-radius: 6px;
    padding: 8px 10px; font: inherit; font-size: 12px; width: 100%;
  }
  select:focus, input:focus { outline: none; border-color: var(--accent); }
  .label { font-size: 11px; color: var(--muted); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .mt { margin-top: 12px; }
  .metric-value { font-size: 20px; font-weight: 600; font-family: var(--mono); }
  .metric-label { font-size: 10px; color: var(--muted); text-transform: uppercase; margin-top: 2px; }
  .progress-bar { height: 6px; background: var(--surface2); border-radius: 3px; overflow: hidden; margin: 8px 0; }
  .progress-fill { height: 100%; background: var(--accent); transition: width 0.3s; border-radius: 3px; }
  .status { font-size: 11px; color: var(--muted); }
`;

export const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];
