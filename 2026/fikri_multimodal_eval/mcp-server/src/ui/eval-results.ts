/**
 * Eval Results MCP App — visualizes evaluation results inside the AI agent chat.
 *
 * Receives structured eval data via tool input notification and renders charts.
 * Uses Chart.js from CDN (declared in resource CSP).
 */

import { baseStyles, CHART_COLORS } from '../styles.js';

export function EVAL_RESULTS_UI(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Eval Results</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"><\/script>
  <style>
    ${baseStyles}
    .header { margin-bottom: 16px; }
    .header .title { font-size: 14px; font-weight: 600; }
    .header .subtitle { font-size: 11px; color: var(--muted); margin-top: 2px; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin-bottom: 16px; }
    .chart-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-bottom: 12px; }
    .chart-title { font-size: 11px; color: var(--muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { text-align: left; padding: 6px 8px; color: var(--muted); border-bottom: 1px solid var(--border); font-weight: 500; }
    td { padding: 6px 8px; border-bottom: 1px solid var(--surface2); }
    .mono { font-family: var(--mono); }
  </style>
</head>
<body>
  <div class="header">
    <div class="title" id="title">Evaluation Results</div>
    <div class="subtitle" id="subtitle">Waiting for data...</div>
  </div>

  <div class="summary-grid" id="summaryGrid"></div>

  <div class="chart-wrap">
    <div class="chart-title">Per-Sample Metrics</div>
    <canvas id="metricsChart" height="180"></canvas>
  </div>

  <div class="chart-wrap">
    <div class="chart-title">Latency (ms)</div>
    <canvas id="latencyChart" height="120"></canvas>
  </div>

  <div id="tableWrap"></div>

  <script>
    const COLORS = ${JSON.stringify(CHART_COLORS)};
    const pending = new Map();
    let nextId = 1;
    let metricsChartInst = null;
    let latencyChartInst = null;

    window.addEventListener('message', (event) => {
      const msg = event.data;
      // Handle tool input notification (data pushed from MCP host)
      if (msg.jsonrpc === '2.0' && msg.method === 'ui/notifications/tool-input') {
        const data = msg.params;
        renderResults(data);
      }
      // Handle RPC responses
      if (msg.jsonrpc === '2.0' && msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? reject(msg.error) : resolve(msg.result);
      }
    });

    function renderResults(data) {
      const summary = data.summary || {};
      const results = data.results || [];
      const modality = summary.modality || 'unknown';

      document.getElementById('title').textContent =
        modality === 'image' ? 'Image VQA Results' : 'Audio STT Results';
      document.getElementById('subtitle').textContent =
        summary.model + ' — ' + summary.samples + ' samples';

      // Summary cards
      const grid = document.getElementById('summaryGrid');
      grid.innerHTML = Object.entries(summary)
        .filter(([k]) => !['model', 'modality'].includes(k))
        .map(([k, v]) => \`
          <div class="card">
            <div class="metric-label">\${k.replace(/_/g, ' ')}</div>
            <div class="metric-value">\${typeof v === 'number' ? v.toFixed(4) : v}</div>
          </div>
        \`).join('');

      // Metrics bar chart
      const labels = results.map(r => '#' + r.sample_id);
      const metricKeys = modality === 'image'
        ? ['rouge_l', 'bleu']
        : ['wer', 'cer'];

      if (metricsChartInst) metricsChartInst.destroy();
      metricsChartInst = new Chart(document.getElementById('metricsChart'), {
        type: 'bar',
        data: {
          labels,
          datasets: metricKeys.map((key, i) => ({
            label: key.toUpperCase().replace('_', '-'),
            data: results.map(r => r[key]),
            backgroundColor: COLORS[i] + '99',
            borderColor: COLORS[i],
            borderWidth: 1,
          })),
        },
        options: {
          responsive: true,
          scales: {
            y: { beginAtZero: true, max: modality === 'image' ? 1 : undefined,
                 grid: { color: '#333' }, ticks: { color: '#888', font: { size: 10 } } },
            x: { grid: { display: false }, ticks: { color: '#888', font: { size: 10 } } },
          },
          plugins: { legend: { labels: { color: '#ccc', font: { size: 10 } } } },
        },
      });

      // Latency line chart
      if (latencyChartInst) latencyChartInst.destroy();
      latencyChartInst = new Chart(document.getElementById('latencyChart'), {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Latency (ms)',
            data: results.map(r => r.latency_ms),
            borderColor: COLORS[4],
            backgroundColor: COLORS[4] + '33',
            fill: true, tension: 0.3, pointRadius: 4,
          }],
        },
        options: {
          responsive: true,
          scales: {
            y: { beginAtZero: true, grid: { color: '#333' }, ticks: { color: '#888', font: { size: 10 } } },
            x: { grid: { display: false }, ticks: { color: '#888', font: { size: 10 } } },
          },
          plugins: { legend: { labels: { color: '#ccc', font: { size: 10 } } } },
        },
      });

      // Results table
      const cols = modality === 'image'
        ? ['sample_id', 'question', 'expected', 'predicted', 'rouge_l', 'bleu', 'latency_ms']
        : ['sample_id', 'reference', 'predicted', 'wer', 'cer', 'latency_ms'];

      document.getElementById('tableWrap').innerHTML = \`
        <table>
          <thead><tr>\${cols.map(c => '<th>' + c.replace(/_/g, ' ') + '</th>').join('')}</tr></thead>
          <tbody>
            \${results.map(r => '<tr>' + cols.map(c => {
              const v = r[c];
              const cls = typeof v === 'number' ? 'mono' : '';
              const display = typeof v === 'number' ? v.toFixed(c === 'latency_ms' ? 0 : 3) : (v || '');
              return '<td class="' + cls + '">' + display + '</td>';
            }).join('') + '</tr>').join('')}
          </tbody>
        </table>
      \`;
    }
  </script>
</body>
</html>`;
}
