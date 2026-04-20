export function EVAL_RESULTS_UI(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Eval Results</title>
  <style>
    :root {
      --bg: #1e1e1e; --surface: #252526; --surface2: #2d2d30;
      --border: #3c3c3c; --text: #cccccc; --muted: #858585;
      --accent: #0078d4; --success: #4ec9b0; --error: #f44747;
      --warning: #ddb76f; --claude: #d97706; --gemini: #2563eb;
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
      font-family: var(--font); background: var(--bg);
      color: var(--text); padding: 12px;
      display: flex; flex-direction: column; gap: 10px;
      font-size: 12px;
    }
    .header {
      display: flex; align-items: center;
      justify-content: space-between;
    }
    .title { font-size: 13px; font-weight: 600; }

    .score-section {
      display: grid;
      gap: 8px;
    }
    .score-section.two-providers {
      grid-template-columns: 1fr 1fr;
    }
    .score-card {
      background: var(--surface);
      border: 2px solid var(--border);
      border-radius: 8px;
      padding: 12px;
    }
    .score-card.claude { border-color: var(--claude); }
    .score-card.gemini { border-color: var(--gemini); }
    .score-provider {
      font-size: 11px; font-weight: 600;
      margin-bottom: 8px;
      display: flex; align-items: center; gap: 6px;
    }
    .score-provider.claude { color: var(--claude); }
    .score-provider.gemini { color: var(--gemini); }
    .score-number {
      font-size: 28px; font-weight: 700; margin-bottom: 4px;
    }
    .score-number.high { color: var(--success); }
    .score-number.mid { color: var(--warning); }
    .score-number.low { color: var(--error); }
    .score-detail { font-size: 10px; color: var(--muted); margin-bottom: 6px; }
    .score-bar-wrap {
      background: var(--surface2); border-radius: 4px;
      height: 5px; overflow: hidden;
    }
    .score-bar {
      height: 100%; border-radius: 4px;
      transition: width 0.8s ease;
    }
    .score-bar.high { background: var(--success); }
    .score-bar.mid { background: var(--warning); }
    .score-bar.low { background: var(--error); }

    .winner-banner {
      background: color-mix(in srgb, var(--success) 15%, transparent);
      border: 1px solid var(--success);
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 11px;
      color: var(--success);
      text-align: center;
      font-weight: 600;
    }

    .table-wrap { overflow-x: auto; }
    table {
      width: 100%; border-collapse: collapse; font-size: 11px;
    }
    th {
      text-align: left; padding: 6px 8px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      font-size: 9px; color: var(--muted);
      text-transform: uppercase; letter-spacing: 0.4px;
      font-weight: 600; white-space: nowrap;
    }
    th.claude { color: var(--claude); }
    th.gemini { color: var(--gemini); }
    td {
      padding: 8px; border-bottom: 1px solid var(--border);
      vertical-align: top; line-height: 1.4;
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: var(--surface); }
    .badge {
      display: inline-block; padding: 2px 7px;
      border-radius: 10px; font-size: 10px; font-weight: 600;
    }
    .badge.pass {
      background: color-mix(in srgb, var(--success) 20%, transparent);
      color: var(--success);
    }
    .badge.fail {
      background: color-mix(in srgb, var(--error) 20%, transparent);
      color: var(--error);
    }
    .mono { font-family: var(--mono); font-size: 10px; }
    .error-text { color: var(--error); font-size: 10px; }
    .waiting {
      display: flex; align-items: center; justify-content: center;
      height: 120px; color: var(--muted); font-size: 12px;
      flex-direction: column; gap: 8px;
    }
    .spinner {
      width: 20px; height: 20px;
      border: 2px solid var(--border); border-top-color: var(--accent);
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .agree { background: color-mix(in srgb, var(--success) 8%, transparent); }
    .disagree { background: color-mix(in srgb, var(--warning) 8%, transparent); }
  </style>
</head>
<body>

  <div class="header">
    <div class="title">Eval Results</div>
  </div>

  <div id="waiting" class="waiting">
    <div class="spinner"></div>
    <span>Waiting for evaluation results...</span>
  </div>

  <div id="content" style="display:none; flex-direction:column; gap:10px;">

    <div class="score-section" id="scoreSection"></div>

    <div class="winner-banner" id="winnerBanner" style="display:none;"></div>

    <div class="table-wrap">
      <table>
        <thead id="tableHead"></thead>
        <tbody id="resultsBody"></tbody>
      </table>
    </div>

  </div>

  <script>
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
        msg.error ? reject(msg.error) : resolve(msg.result);
        return;
      }
      if (
        msg.method === "ui/notifications/tool-input" ||
        msg.method === "ui/notifications/tool-result"
      ) {
        const sc = msg.params?.structuredContent || msg.params?.arguments;
        if (sc?.providerResults || sc?.provider) renderResults(normalizeResults(sc));
      }
    });

    function normalizeResults(data) {
      if (data?.providerResults && data?.providers) return data;
      if (data?.provider && data?.results && data?.summary) {
        return {
          providers: [data.provider],
          providerResults: {
            [data.provider]: {
              results: data.results,
              summary: data.summary,
            },
          },
          testCases: (data.results || []).map(r => ({
            prompt: r.prompt,
            expected: r.expected,
          })),
        };
      }
      return data;
    }

    function esc(str) {
      const d = document.createElement("div");
      d.textContent = str ?? "";
      return d.innerHTML;
    }

    function scoreClass(score) {
      if (score >= 70) return "high";
      if (score >= 40) return "mid";
      return "low";
    }

    function providerLabel(p) {
      return p.charAt(0).toUpperCase() + p.slice(1);
    }

    function renderResults(data) {
      document.getElementById("waiting").style.display = "none";
      const content = document.getElementById("content");
      content.style.display = "flex";

      const { providers, providerResults, testCases } = data;
      const isTwoProviders = providers.length === 2;

      const scoreSection = document.getElementById("scoreSection");
      scoreSection.classList.toggle("two-providers", isTwoProviders);

      scoreSection.innerHTML = providers.map(p => {
        const s = providerResults[p].summary;
        const cls = scoreClass(s.score);
        return \`
          <div class="score-card \${p}">
            <div class="score-provider \${p}">
              \${providerLabel(p)}
            </div>
            <div class="score-number \${cls}">\${s.score}%</div>
            <div class="score-detail">\${s.passed} of \${s.total} passed</div>
            <div class="score-bar-wrap">
              <div class="score-bar \${cls}" style="width:\${s.score}%"></div>
            </div>
          </div>
        \`;
      }).join("");

      if (isTwoProviders) {
        const scores = providers.map(p => ({
          p, score: providerResults[p].summary.score,
        }));
        const banner = document.getElementById("winnerBanner");
        banner.style.display = "block";
        if (scores[0].score === scores[1].score) {
          banner.textContent = "Tie";
        } else {
          const winner = scores.reduce((a, b) => a.score > b.score ? a : b);
          banner.textContent = \`Winner: \${providerLabel(winner.p)} with \${winner.score}%\`;
        }
      } else {
        document.getElementById("winnerBanner").style.display = "none";
      }

      const head = document.getElementById("tableHead");
      if (isTwoProviders) {
        head.innerHTML = \`<tr>
          <th style="width:28px">#</th>
          <th>Prompt</th>
          <th>Expected</th>
          <th class="claude">Claude</th>
          <th class="gemini">Gemini</th>
          <th style="width:60px">Match?</th>
        </tr>\`;
      } else {
        const p = providers[0];
        head.innerHTML = \`<tr>
          <th style="width:28px">#</th>
          <th style="width:60px">Result</th>
          <th>Prompt</th>
          <th>Expected</th>
          <th>\${providerLabel(p)} Response</th>
        </tr>\`;
      }

      const tbody = document.getElementById("resultsBody");

      if (isTwoProviders) {
        const [p1, p2] = providers;
        tbody.innerHTML = testCases.map((tc, i) => {
          const r1 = providerResults[p1].results[i];
          const r2 = providerResults[p2].results[i];
          const agree = r1.passed === r2.passed;
          const rowClass = agree ? "agree" : "disagree";
          return \`
            <tr class="\${rowClass}">
              <td style="color:var(--muted)">\${i + 1}</td>
              <td class="mono">\${esc(tc.prompt)}</td>
              <td class="mono">\${esc(tc.expected)}</td>
              <td>
                <span class="badge \${r1.passed ? "pass" : "fail"}">
                  \${r1.passed ? "PASS" : "FAIL"}
                </span>
                <div class="mono" style="margin-top:4px; font-size:9px; color:var(--muted)">
                  \${r1.error ? \`<span class="error-text">\${esc(r1.error)}</span>\` : esc(r1.actual?.slice(0, 80)) + (r1.actual?.length > 80 ? "..." : "")}
                </div>
              </td>
              <td>
                <span class="badge \${r2.passed ? "pass" : "fail"}">
                  \${r2.passed ? "PASS" : "FAIL"}
                </span>
                <div class="mono" style="margin-top:4px; font-size:9px; color:var(--muted)">
                  \${r2.error ? \`<span class="error-text">\${esc(r2.error)}</span>\` : esc(r2.actual?.slice(0, 80)) + (r2.actual?.length > 80 ? "..." : "")}
                </div>
              </td>
              <td style="text-align:center">
                \${agree ? "Yes" : "No"}
              </td>
            </tr>
          \`;
        }).join("");
      } else {
        const p = providers[0];
        tbody.innerHTML = providerResults[p].results.map((r, i) => \`
          <tr>
            <td style="color:var(--muted)">\${i + 1}</td>
            <td><span class="badge \${r.passed ? "pass" : "fail"}">\${r.passed ? "PASS" : "FAIL"}</span></td>
            <td class="mono">\${esc(r.prompt)}</td>
            <td class="mono">\${esc(r.expected)}</td>
            <td class="mono">
              \${r.error
                ? \`<span class="error-text">Error: \${esc(r.error)}</span>\`
                : esc(r.actual)
              }
            </td>
          </tr>
        \`).join("");
      }
    }

    async function initialize() {
      try {
        await sendRequest("ui/initialize", {
          protocolVersion: "2025-11-21",
          capabilities: {},
          clientInfo: { name: "eval-results", version: "1.0.0" },
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
