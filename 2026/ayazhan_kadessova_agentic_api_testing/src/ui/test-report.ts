import { SHARED_STYLES, MCP_APP_SCRIPT } from "../styles.js";

export function testReportUI(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    ${SHARED_STYLES}

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }

    .stat-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px;
      text-align: center;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      font-family: var(--mono);
    }

    .stat-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .chart-container {
      margin-bottom: 16px;
    }

    .bar-chart {
      display: flex;
      align-items: flex-end;
      gap: 6px;
      height: 180px;
      padding: 0 4px;
      border-bottom: 1px solid var(--border);
    }

    .bar-group {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
      justify-content: flex-end;
    }

    .bar {
      width: 100%;
      max-width: 48px;
      border-radius: 4px 4px 0 0;
      min-height: 2px;
      transition: height 0.3s;
    }

    .bar.pass { background: rgba(76, 175, 80, 0.7); }
    .bar.fail { background: rgba(244, 67, 54, 0.7); }

    .bar-value {
      font-size: 10px;
      font-family: var(--mono);
      color: var(--text-secondary);
      margin-bottom: 4px;
    }

    .bar-label {
      font-size: 9px;
      color: var(--text-muted);
      text-align: center;
      margin-top: 6px;
      max-width: 70px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .result-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      font-size: 13px;
    }

    .result-row:last-child { border-bottom: none; }

    .result-icon {
      font-size: 16px;
      font-weight: 700;
      width: 20px;
      text-align: center;
    }

    .result-name { flex: 1; font-weight: 500; }
    .result-status { font-family: var(--mono); font-size: 12px; }
    .result-time { font-family: var(--mono); font-size: 12px; color: var(--text-muted); width: 80px; text-align: right; }
  </style>
</head>
<body>
  <div id="waiting" class="status-bar info">
    <div class="spinner"></div>
    <span>Waiting for test report data...</span>
  </div>

  <div id="report" class="hidden">
    <h2 id="reportTitle">Test Report</h2>
    <p id="reportMeta" style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;"></p>

    <div id="pipelineBadge" class="hidden" style="margin-bottom: 12px;">
      <span class="badge badge-info" id="pipelineLabel"></span>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div id="totalTests" class="stat-value" style="color: var(--info);">0</div>
        <div class="stat-label">Total Tests</div>
      </div>
      <div class="stat-card">
        <div id="passedTests" class="stat-value" style="color: var(--success);">0</div>
        <div class="stat-label">Passed</div>
      </div>
      <div class="stat-card">
        <div id="failedTests" class="stat-value" style="color: var(--error);">0</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat-card">
        <div id="avgTime" class="stat-value" style="color: var(--warning);">0</div>
        <div class="stat-label">Avg Time (ms)</div>
      </div>
    </div>

    <div id="kpiSection" class="hidden">
      <h3 style="margin-bottom: 8px;">Quality KPIs</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <div id="kpiPassRate" class="stat-value" style="color: var(--success);">0%</div>
          <div class="stat-label">Pass Rate</div>
        </div>
        <div class="stat-card">
          <div id="kpiDensity" class="stat-value" style="color: var(--accent);">0</div>
          <div class="stat-label">Assertions/Test</div>
        </div>
        <div class="stat-card">
          <div id="kpiCoverage" class="stat-value" style="color: var(--info);">0</div>
          <div class="stat-label">Endpoints Covered</div>
        </div>
        <div class="stat-card">
          <div id="kpiAvgTime" class="stat-value" style="color: var(--warning);">0ms</div>
          <div class="stat-label">Avg Response</div>
        </div>
      </div>
    </div>

    <div class="card" style="padding: 0; overflow: hidden;">
      <div style="padding: 12px 12px 4px;">
        <h3>Test Results</h3>
      </div>
      <div id="resultsList"></div>
    </div>

    <div class="card">
      <h3>Response Time Distribution</h3>
      <div class="chart-container">
        <div id="barChart" class="bar-chart"></div>
      </div>
    </div>

    <div style="margin-top: 16px; display: flex; gap: 8px;">
      <button onclick="downloadReport()">Download JSON Report</button>
    </div>
  </div>
  <script>
    ${MCP_APP_SCRIPT}

    let reportData = null;

    function renderReport(data) {
      reportData = data;
      document.getElementById("waiting").classList.add("hidden");
      document.getElementById("report").classList.remove("hidden");

      const results = data.results || [];
      const passed = results.filter(r => r.passed);
      const failed = results.filter(r => !r.passed);
      const times = results.map(r => r.responseTime || 0);
      const maxTime = Math.max(...times, 1);
      const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

      document.getElementById("reportTitle").textContent = data.planName || "Test Report";
      document.getElementById("reportMeta").textContent =
        "Completed at " + new Date().toLocaleString() +
        " | " + results.length + " tests executed";

      document.getElementById("totalTests").textContent = results.length;
      document.getElementById("passedTests").textContent = passed.length;
      document.getElementById("failedTests").textContent = failed.length;
      document.getElementById("avgTime").textContent = avg;

      // Results list (render first — most important)
      const list = document.getElementById("resultsList");
      list.innerHTML = "";
      for (const r of results) {
        const div = document.createElement("div");
        div.className = "result-row";
        const icon = r.passed ? "\\u2713" : "\\u2717";
        const iconColor = r.passed ? "var(--success)" : "var(--error)";
        div.innerHTML =
          '<div class="result-icon" style="color:' + iconColor + ';">' + icon + '</div>' +
          '<div class="result-name">' + (r.testName || "Test") + '</div>' +
          '<div class="result-status">' +
            '<span class="badge ' + (r.passed ? 'badge-success' : 'badge-error') + '">' +
              r.statusCode +
            '</span>' +
          '</div>' +
          '<div class="result-time">' + (r.responseTime || 0) + ' ms</div>';
        list.appendChild(div);
      }

      // Pure CSS bar chart (no CDN dependency)
      const chart = document.getElementById("barChart");
      chart.innerHTML = "";
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const time = r.responseTime || 0;
        const pct = Math.max((time / maxTime) * 100, 2);
        const cls = r.passed ? "pass" : "fail";
        // Extract short label from test name (e.g. "Happy path" from "GET /posts - Happy path")
        const parts = (r.testName || "Test").split(" - ");
        const shortLabel = parts.length > 1 ? parts[parts.length - 1] : parts[0];

        const group = document.createElement("div");
        group.className = "bar-group";
        group.innerHTML =
          '<div class="bar-value">' + time + 'ms</div>' +
          '<div class="bar ' + cls + '" style="height:' + pct + '%;"></div>' +
          '<div class="bar-label" title="' + (r.testName || "") + '">' + shortLabel + '</div>';
        chart.appendChild(group);
      }

      // KPI section
      if (data.kpis) {
        document.getElementById("kpiSection").classList.remove("hidden");
        document.getElementById("kpiPassRate").textContent = data.kpis.passRate + "%";
        document.getElementById("kpiDensity").textContent = data.kpis.assertionDensity;
        document.getElementById("kpiCoverage").textContent = data.kpis.endpointCoverage;
        document.getElementById("kpiAvgTime").textContent = data.kpis.avgResponseTime + "ms";
      }

      // Pipeline metadata badge
      if (data.pipelineMetadata) {
        const pm = data.pipelineMetadata;
        document.getElementById("pipelineBadge").classList.remove("hidden");
        document.getElementById("pipelineLabel").textContent =
          pm.agentsUsed.join(" \\u2192 ") + " | " +
          pm.generatorCount + " generated \\u2192 " +
          pm.criticApproved + " approved \\u2192 " +
          pm.reducerFinal + " final";
      }

      notifySize();
    }

    async function downloadReport() {
      if (!reportData) return;
      const json = JSON.stringify(reportData, null, 2);
      const b64 = btoa(unescape(encodeURIComponent(json)));
      await sendRequest("ui/download-file", {
        contents: [{
          type: "resource",
          resource: {
            uri: "file:///test-report.json",
            mimeType: "application/json",
            blob: b64,
          },
        }],
      });
    }

    function onToolInput(data) {
      renderReport(data);
    }
  </script>
</body>
</html>`;
}
