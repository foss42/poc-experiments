/**
 * ui/test-results.ts
 *
 * Generates the full HTML string for the MCP App UI panel.
 *
 * Architecture note — MCP Apps handshake (matching sample-mcp-apps-chatflow):
 *   1. On load, the page sends `ui/initialize` to the host via postMessage.
 *   2. The host replies with a `hostContext` message containing CSS theme vars.
 *   3. The page applies those CSS variables and sends `ui/notifications/initialized`.
 *
 * The UI renders a test-results dashboard:
 *   • Summary bar: total / passed / failed counts
 *   • One card per TestResult with colour-coded PASS / FAIL badges for each check
 *   • Collapsible raw response section per card
 *
 * CSS variables fall back to a dark theme when no host context is provided.
 */

import type { TestResult } from "../test-executor.js";

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns a self-contained HTML string for the results panel.
 * Call with no arguments to get an "awaiting results" placeholder UI.
 *
 * @param results - Array of TestResult objects (may be empty for placeholder).
 * @param baseUrl - The base URL that was tested (displayed in the header).
 */
export function TEST_RESULTS_HTML(
  results: TestResult[] = [],
  baseUrl = ""
): string {
  const total = results.length;
  const passed = results.filter((r) => r.overall === "PASS").length;
  const failed = total - passed;

  const cards =
    total === 0
      ? `<div class="placeholder">
           <div class="placeholder-icon">⚡</div>
           <p>Run <strong>execute_tests</strong> to see results here.</p>
         </div>`
      : results.map(renderCard).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>API Dash — Agentic Test Results</title>
  <style>
    /* ── CSS custom properties with dark-theme fallback ── */
    :root {
      --bg:           var(--vscode-editor-background,            #1e1e2e);
      --bg-card:      var(--vscode-editorWidget-background,      #2a2a3e);
      --bg-card-alt:  var(--vscode-editor-inactiveSelectionBackground, #25253a);
      --text:         var(--vscode-editor-foreground,            #cdd6f4);
      --text-muted:   var(--vscode-descriptionForeground,        #a6adc8);
      --border:       var(--vscode-editorGroup-border,           #313244);
      --accent:       var(--vscode-focusBorder,                  #89b4fa);
      --pass-bg:      #1e3a2e;
      --pass-fg:      #a6e3a1;
      --fail-bg:      #3a1e1e;
      --fail-fg:      #f38ba8;
      --method-get:   #a6e3a1;
      --method-post:  #89b4fa;
      --method-put:   #fab387;
      --method-patch: #f9e2af;
      --method-delete:#f38ba8;
      --radius:       8px;
      --font:         'Segoe UI', system-ui, -apple-system, sans-serif;
      --font-mono:    'Cascadia Code', 'JetBrains Mono', 'Fira Code', monospace;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--font);
      background: var(--bg);
      color: var(--text);
      padding: 16px;
      min-height: 100vh;
    }

    /* ── Header ── */
    .header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
    }
    .header-logo { font-size: 1.4rem; }
    .header-title { font-size: 1rem; font-weight: 600; color: var(--accent); }
    .header-url {
      margin-left: auto;
      font-size: 0.75rem;
      color: var(--text-muted);
      font-family: var(--font-mono);
    }

    /* ── Summary bar ── */
    .summary {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .summary-chip {
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .chip-total  { background: var(--bg-card);  color: var(--text); border: 1px solid var(--border); }
    .chip-pass   { background: var(--pass-bg);  color: var(--pass-fg); }
    .chip-fail   { background: var(--fail-bg);  color: var(--fail-fg); }

    /* ── Result cards ── */
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      margin-bottom: 10px;
      overflow: hidden;
      transition: border-color 0.15s;
    }
    .card:hover { border-color: var(--accent); }
    .card.overall-pass { border-left: 3px solid var(--pass-fg); }
    .card.overall-fail { border-left: 3px solid var(--fail-fg); }

    .card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      cursor: pointer;
      user-select: none;
    }

    .method-badge {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      background: var(--bg-card-alt);
      min-width: 52px;
      text-align: center;
    }
    .method-GET    { color: var(--method-get); }
    .method-POST   { color: var(--method-post); }
    .method-PUT    { color: var(--method-put); }
    .method-PATCH  { color: var(--method-patch); }
    .method-DELETE { color: var(--method-delete); }

    .card-path {
      font-family: var(--font-mono);
      font-size: 0.82rem;
      color: var(--text);
    }
    .card-desc {
      font-size: 0.78rem;
      color: var(--text-muted);
      flex: 1;
    }
    .overall-badge {
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 0.72rem;
      font-weight: 700;
    }
    .badge-pass { background: var(--pass-bg); color: var(--pass-fg); }
    .badge-fail { background: var(--fail-bg); color: var(--fail-fg); }
    .card-chevron { color: var(--text-muted); font-size: 0.75rem; margin-left: 4px; transition: transform 0.2s; }
    .card-chevron.open { transform: rotate(90deg); }

    /* ── Checks grid ── */
    .card-body { padding: 0 14px 12px; }
    .checks {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 10px;
    }
    .check {
      background: var(--bg-card-alt);
      border-radius: 6px;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .check-label { font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .check-value { font-size: 0.78rem; font-weight: 600; }
    .check-value.pass { color: var(--pass-fg); }
    .check-value.fail { color: var(--fail-fg); }
    .check-detail { font-size: 0.68rem; color: var(--text-muted); font-family: var(--font-mono); }

    /* ── Failure reason ── */
    .failure-reason {
      font-size: 0.75rem;
      color: var(--fail-fg);
      background: var(--fail-bg);
      border-radius: 5px;
      padding: 6px 10px;
      margin-bottom: 8px;
    }

    /* ── Raw response toggle ── */
    .raw-toggle {
      font-size: 0.72rem;
      color: var(--accent);
      cursor: pointer;
      margin-bottom: 4px;
      background: none;
      border: none;
      padding: 0;
    }
    .raw-toggle:hover { text-decoration: underline; }
    .raw-body {
      display: none;
      font-family: var(--font-mono);
      font-size: 0.72rem;
      color: var(--text-muted);
      background: var(--bg-card-alt);
      border-radius: 5px;
      padding: 8px;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .raw-body.visible { display: block; }

    /* ── Placeholder ── */
    .placeholder {
      text-align: center;
      padding: 48px 24px;
      color: var(--text-muted);
    }
    .placeholder-icon { font-size: 2.5rem; margin-bottom: 12px; }
    .placeholder p { font-size: 0.9rem; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="header">
    <span class="header-logo">⚡</span>
    <span class="header-title">API Dash — Agentic Test Results</span>
    ${baseUrl ? `<span class="header-url">${escapeHtml(baseUrl)}</span>` : ""}
  </div>

  ${
    total > 0
      ? `<div class="summary">
    <span class="summary-chip chip-total">${total} total</span>
    <span class="summary-chip chip-pass">${passed} passed</span>
    <span class="summary-chip chip-fail">${failed} failed</span>
  </div>`
      : ""
  }

  <div id="results">
    ${cards}
  </div>

  <script>
    /* ── MCP Apps handshake ── */
    window.addEventListener("message", (event) => {
      const msg = event.data;

      if (msg?.type === "hostContext") {
        // Apply CSS variables from the host theme
        const vars = msg.cssVariables ?? {};
        const root = document.documentElement;
        for (const [key, value] of Object.entries(vars)) {
          root.style.setProperty(key, value);
        }
        // Acknowledge initialisation
        event.source?.postMessage({ type: "ui/notifications/initialized" }, { targetOrigin: "*" });
      }
    });

    // Step 1: request the host context
    window.parent?.postMessage({ type: "ui/initialize" }, "*");

    /* ── Card expand/collapse ── */
    document.querySelectorAll(".card-header").forEach((header) => {
      header.addEventListener("click", () => {
        const card = header.closest(".card");
        const body = card?.querySelector(".card-body");
        const chevron = header.querySelector(".card-chevron");
        if (!body || !chevron) return;
        const isOpen = body.classList.toggle("card-body--open");
        body.style.display = isOpen ? "block" : "none";
        chevron.classList.toggle("open", isOpen);
      });
    });

    /* ── Raw response toggle ── */
    document.querySelectorAll(".raw-toggle").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const raw = btn.nextElementSibling;
        if (raw) raw.classList.toggle("visible");
        btn.textContent = raw?.classList.contains("visible")
          ? "Hide raw response ▲"
          : "Show raw response ▼";
      });
    });
  </script>
</body>
</html>`;
}

// ─── Card renderer ────────────────────────────────────────────────────────────

function renderCard(r: TestResult, index: number): string {
  const overallClass = r.overall === "PASS" ? "overall-pass" : "overall-fail";
  const badgeClass   = r.overall === "PASS" ? "badge-pass"   : "badge-fail";

  const id = `card-body-${index}`;

  return `<div class="card ${overallClass}">
  <div class="card-header" aria-controls="${id}">
    <span class="method-badge method-${r.testCase.method}">${escapeHtml(r.testCase.method)}</span>
    <span class="card-path">${escapeHtml(r.testCase.endpoint)}</span>
    <span class="card-desc">${escapeHtml(r.testCase.description)}</span>
    <span class="overall-badge ${badgeClass}">${r.overall}</span>
    <span class="card-chevron">▶</span>
  </div>
  <div class="card-body" id="${id}" style="display:none;">
    <div class="checks">
      ${renderCheck("Status", r.statusCheck, `${r.testCase.expected_status} expected / ${r.actualStatus} got`)}
      ${renderCheck("Schema", r.schemaCheck, r.testCase.expected_keys.length > 0 ? `keys: ${r.testCase.expected_keys.join(", ")}` : "no keys asserted")}
      ${renderCheck("Performance", r.performanceCheck, `${r.responseTimeMs} ms`)}
    </div>
    ${r.failureReason ? `<div class="failure-reason">✗ ${escapeHtml(r.failureReason)}</div>` : ""}
    ${r.responseBody
      ? `<button class="raw-toggle">Show raw response ▼</button>
         <div class="raw-body">${escapeHtml(r.responseBody)}</div>`
      : ""}
  </div>
</div>`;
}

function renderCheck(label: string, result: "PASS" | "FAIL", detail: string): string {
  const cls = result === "PASS" ? "pass" : "fail";
  return `<div class="check">
  <span class="check-label">${label}</span>
  <span class="check-value ${cls}">${result}</span>
  <span class="check-detail">${escapeHtml(detail)}</span>
</div>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
