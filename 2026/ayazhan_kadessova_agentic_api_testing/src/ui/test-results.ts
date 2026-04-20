import { SHARED_STYLES, MCP_APP_SCRIPT } from "../styles.js";

export function testResultsUI(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    ${SHARED_STYLES}

    .result-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .result-header .left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .status-code {
      font-size: 28px;
      font-weight: 700;
      font-family: var(--mono);
    }

    .status-code.ok { color: var(--success); }
    .status-code.redirect { color: var(--warning); }
    .status-code.client-error { color: var(--error); }
    .status-code.server-error { color: var(--error); }

    .timing {
      font-size: 13px;
      color: var(--text-secondary);
      font-family: var(--mono);
    }

    .assertions-list { list-style: none; padding: 0; }
    .assertions-list li {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      border-bottom: 1px solid var(--border);
      font-size: 13px;
    }
    .assertions-list li:last-child { border-bottom: none; }
    .check-pass { color: var(--success); }
    .check-fail { color: var(--error); }

    .tabs {
      display: flex;
      gap: 0;
      border-bottom: 2px solid var(--border);
      margin-bottom: 12px;
    }

    .tab {
      padding: 8px 16px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      transition: all 0.2s;
    }

    .tab.active {
      color: var(--accent);
      border-bottom-color: var(--accent);
    }

    .tab:hover { color: var(--text-primary); }
    .tab-content { display: none; }
    .tab-content.active { display: block; }

    .json-key { color: #f78c6c; }
    .json-string { color: #c3e88d; }
    .json-number { color: #f78c6c; }
    .json-boolean { color: #c792ea; }
    .json-null { color: #ff5370; }

    @media (prefers-color-scheme: light) {
      .json-key { color: #d63384; }
      .json-string { color: #0d6efd; }
      .json-number { color: #e65100; }
      .json-boolean { color: #7c4dff; }
      .json-null { color: #dc3545; }
    }
  </style>
</head>
<body>
  <div id="waiting" class="status-bar info">
    <div class="spinner"></div>
    <span>Waiting for test results...</span>
  </div>

  <div id="results" class="hidden">
    <div class="result-header">
      <div class="left">
        <span id="statusCode" class="status-code"></span>
        <div>
          <div id="statusText" style="font-weight: 500;"></div>
          <div id="testNameDisplay" style="font-size: 12px; color: var(--text-muted);"></div>
        </div>
      </div>
      <div style="text-align: right;">
        <div id="timing" class="timing"></div>
        <div id="size" class="timing"></div>
      </div>
    </div>

    <div class="card">
      <h3>Assertions</h3>
      <ul id="assertionsList" class="assertions-list"></ul>
      <div id="assertionSummary" style="margin-top: 8px; font-size: 12px;"></div>
    </div>

    <div class="tabs">
      <div class="tab active" onclick="switchTab('body')">Response Body</div>
      <div class="tab" onclick="switchTab('headers')">Headers</div>
      <div class="tab" onclick="switchTab('request')">Request</div>
    </div>

    <div id="tab-body" class="tab-content active">
      <pre id="responseBody"></pre>
    </div>

    <div id="tab-headers" class="tab-content">
      <table>
        <thead><tr><th>Header</th><th>Value</th></tr></thead>
        <tbody id="headersTable"></tbody>
      </table>
    </div>

    <div id="tab-request" class="tab-content">
      <pre id="requestDetails"></pre>
    </div>
  </div>

  <script>
    ${MCP_APP_SCRIPT}

    function syntaxHighlight(json) {
      if (typeof json !== "string") json = JSON.stringify(json, null, 2);
      return json
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"([^"]+)"\\s*:/g, '<span class="json-key">"$1"</span>:')
        .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
        .replace(/: (\\d+\\.?\\d*)/g, ': <span class="json-number">$1</span>')
        .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
        .replace(/: (null)/g, ': <span class="json-null">$1</span>');
    }

    function statusClass(code) {
      if (code >= 200 && code < 300) return "ok";
      if (code >= 300 && code < 400) return "redirect";
      if (code >= 400 && code < 500) return "client-error";
      return "server-error";
    }

    function renderResults(data) {
      const { testConfig, testResult } = data;
      document.getElementById("waiting").classList.add("hidden");
      document.getElementById("results").classList.remove("hidden");

      const sc = document.getElementById("statusCode");
      sc.textContent = testResult.statusCode;
      sc.className = "status-code " + statusClass(testResult.statusCode);

      document.getElementById("statusText").textContent = testResult.statusText || "";
      document.getElementById("testNameDisplay").textContent = testConfig?.testName || "";
      document.getElementById("timing").textContent = testResult.responseTime + " ms";

      const bodyStr = typeof testResult.body === "string"
        ? testResult.body
        : JSON.stringify(testResult.body, null, 2);
      const sizeKB = (new Blob([bodyStr]).size / 1024).toFixed(1);
      document.getElementById("size").textContent = sizeKB + " KB";

      // Assertions
      const list = document.getElementById("assertionsList");
      list.innerHTML = "";
      const assertions = testResult.assertions || [];
      let passed = 0;
      for (const a of assertions) {
        const li = document.createElement("li");
        const icon = a.passed ? "\\u2713" : "\\u2717";
        const cls = a.passed ? "check-pass" : "check-fail";
        li.innerHTML = '<span class="' + cls + '" style="font-size:16px;font-weight:700;">' + icon + '</span> ' + a.name;
        if (!a.passed && a.detail) {
          li.innerHTML += ' <span style="color:var(--text-muted);font-size:12px;">(' + a.detail + ')</span>';
        }
        list.appendChild(li);
        if (a.passed) passed++;
      }

      const summary = document.getElementById("assertionSummary");
      const allPassed = passed === assertions.length;
      summary.innerHTML = '<span class="badge ' + (allPassed ? 'badge-success' : 'badge-error') + '">'
        + passed + '/' + assertions.length + ' passed</span>';

      // Response body
      try {
        const parsed = typeof testResult.body === "string" ? JSON.parse(testResult.body) : testResult.body;
        document.getElementById("responseBody").innerHTML = syntaxHighlight(JSON.stringify(parsed, null, 2));
      } catch {
        document.getElementById("responseBody").textContent = bodyStr;
      }

      // Headers
      const tbody = document.getElementById("headersTable");
      tbody.innerHTML = "";
      for (const [k, v] of Object.entries(testResult.headers || {})) {
        const tr = document.createElement("tr");
        tr.innerHTML = '<td class="mono" style="font-weight:500;">' + k + '</td><td class="mono">' + v + '</td>';
        tbody.appendChild(tr);
      }

      // Request details
      document.getElementById("requestDetails").innerHTML = syntaxHighlight({
        method: testConfig?.method,
        url: testConfig?.url,
        headers: testConfig?.headers,
        body: testConfig?.body ? JSON.parse(testConfig.body) : undefined,
      });

      notifySize();
    }

    function switchTab(name) {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
      document.querySelector('.tab[onclick*="' + name + '"]').classList.add("active");
      document.getElementById("tab-" + name).classList.add("active");
    }

    function onToolInput(data) {
      renderResults(data);
    }
  </script>
</body>
</html>`;
}
