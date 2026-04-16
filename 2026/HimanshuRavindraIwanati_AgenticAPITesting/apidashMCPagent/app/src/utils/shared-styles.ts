/**
 * utils/shared-styles.ts
 * Design tokens and reusable CSS for all MCP App HTML resources.
 * Ensures visual consistency across test-review, healing-diff,
 * execution-monitor, and report-viewer MCP Apps.
 *
 * Uses light-dark() fallbacks so apps adapt across host themes.
 * CSS variables are overridden by applyHostContext() at runtime
 * with the actual host theme tokens.
 *
 * Follows the pattern from:
 * https://dev.to/ashita/a-practical-guide-to-building-mcp-apps-1bfm
 */

export function getSharedStyles(): string {
  return `
<style id="mcp-shared-styles">
  /* ── Design Tokens ────────────────────────────────────────────────────── */
  :root {
    /* Backgrounds — overridden by hostContext at runtime */
    --color-background-primary:   #1e1e2e;
    --color-background-secondary: #181825;
    --color-background-card:      #313244;

    /* Text */
    --color-text-primary:   #cdd6f4;
    --color-text-secondary: #a6adc8;
    --color-text-muted:     #6c7086;

    /* Accent & Semantic */
    --color-accent-primary: #89b4fa;
    --color-success:        #a6e3a1;
    --color-warning:        #f9e2af;
    --color-danger:         #f38ba8;
    --color-purple:         #cba6f7;

    /* Borders */
    --color-border: #45475a;

    /* Severity colours */
    --color-severity-cosmetic:      #6c7086;
    --color-severity-compatible:    #a6e3a1;
    --color-severity-breaking:      #f38ba8;
    --color-severity-architectural: #cba6f7;

    /* Typography */
    --font-family-base: 'Segoe UI', system-ui, -apple-system, sans-serif;
    --font-family-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    --font-size-xs:  11px;
    --font-size-sm:  12px;
    --font-size-base: 13px;
    --font-size-md:  14px;
    --font-size-lg:  15px;
    --font-weight-normal:   400;
    --font-weight-medium:   500;
    --font-weight-semibold: 600;
    --font-weight-bold:     700;
    --line-height-base: 1.5;
    --line-height-code: 1.6;

    /* Spacing */
    --space-1: 4px;
    --space-2: 8px;
    --space-3: 12px;
    --space-4: 16px;
    --space-5: 20px;
    --space-6: 24px;

    /* Border radius */
    --radius-sm: 4px;
    --radius-md: 6px;
    --radius-lg: 8px;
    --radius-full: 9999px;
  }

  /* ── Reset ────────────────────────────────────────────────────────────── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* ── Base ─────────────────────────────────────────────────────────────── */
  body {
    font-family: var(--font-family-base);
    background: var(--color-background-primary);
    color: var(--color-text-primary);
    font-size: var(--font-size-base);
    line-height: var(--line-height-base);
    padding: var(--space-4);
  }

  /* ── Reusable Components ──────────────────────────────────────────────── */

  /* Badge */
  .badge {
    display: inline-block;
    padding: 2px var(--space-2);
    border-radius: var(--radius-full);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;
  }

  /* Card */
  .card {
    background: var(--color-background-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }
  .card-header {
    background: var(--color-background-card);
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    border-bottom: 1px solid var(--color-border);
  }
  .card-body { padding: var(--space-3); }

  /* Table */
  .mcp-table {
    width: 100%;
    border-collapse: collapse;
    background: var(--color-background-secondary);
    border-radius: var(--radius-lg);
    overflow: hidden;
    border: 1px solid var(--color-border);
  }
  .mcp-table th {
    background: var(--color-background-card);
    padding: var(--space-2) var(--space-3);
    text-align: left;
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    border-bottom: 1px solid var(--color-border);
  }
  .mcp-table td {
    padding: 10px var(--space-3);
    border-bottom: 1px solid var(--color-border);
    vertical-align: middle;
  }
  .mcp-table tr:last-child td { border-bottom: none; }

  /* Button */
  .btn {
    padding: 7px 18px;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-semibold);
    border: none;
    transition: opacity 0.15s;
  }
  .btn:hover { opacity: 0.85; }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-primary { background: var(--color-accent-primary); color: var(--color-background-primary); }
  .btn-success { background: var(--color-success); color: var(--color-background-primary); }
  .btn-danger  { background: var(--color-background-card); color: var(--color-danger); border: 1px solid var(--color-danger); }
  .btn-ghost   { background: var(--color-background-card); color: var(--color-text-secondary); border: 1px solid var(--color-border); font-size: var(--font-size-sm); }

  /* Code / Endpoint tag */
  .code-tag {
    background: var(--color-background-card);
    border: 1px solid var(--color-border);
    padding: 2px var(--space-2);
    border-radius: var(--radius-sm);
    font-family: var(--font-family-mono);
    font-size: var(--font-size-xs);
    color: var(--color-accent-primary);
    white-space: nowrap;
  }

  /* Status bar */
  .status-bar {
    margin-top: var(--space-3);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    display: none;
  }
  .status-bar.success {
    background: #a6e3a120;
    border: 1px solid #a6e3a140;
    color: var(--color-success);
    display: block;
  }
  .status-bar.error {
    background: #f38ba820;
    border: 1px solid #f38ba840;
    color: var(--color-danger);
    display: block;
  }

  /* Toggle switch */
  .toggle-switch { position: relative; display: inline-block; width: 36px; height: 20px; }
  .toggle-switch input { opacity: 0; width: 0; height: 0; }
  .toggle-slider {
    position: absolute; cursor: pointer;
    inset: 0;
    background: var(--color-border);
    border-radius: var(--radius-full);
    transition: 0.2s;
  }
  .toggle-slider::before {
    content: "";
    position: absolute;
    height: 14px; width: 14px;
    left: 3px; bottom: 3px;
    background: white;
    border-radius: 50%;
    transition: 0.2s;
  }
  .toggle-switch input:checked + .toggle-slider { background: var(--color-accent-primary); }
  .toggle-switch input:checked + .toggle-slider::before { transform: translateX(16px); }

  /* Divider */
  .divider { border: none; border-top: 1px solid var(--color-border); margin: var(--space-4) 0; }

  /* Header row */
  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: var(--space-4);
    padding-bottom: var(--space-3);
    border-bottom: 1px solid var(--color-border);
  }
  .page-header h2 { font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); }
  .page-header p  { color: var(--color-text-muted); font-size: var(--font-size-xs); margin-top: 2px; }
</style>
`.trim();
}
