export function EVAL_REPORT_HTML(results: Record<string, Record<string, number>>, dataset: string): string {
  const rows = Object.entries(results)
    .map(([model, scores]) => `
      <tr>
        <td>${model}</td>
        <td>${scores.accuracy ?? "—"}</td>
        <td>${scores.latency ?? "—"}</td>
        <td>${scores.cost ?? "—"}</td>
        <td>${scores.f1 ?? "—"}</td>
      </tr>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: var(--vscode-font-family, sans-serif); }
  body { padding: 16px; color: var(--vscode-foreground, #111); background: transparent; }
  h3 { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
  .sub { font-size: 12px; color: var(--vscode-descriptionForeground, #6b7280); margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #3b82f6; color: white; padding: 8px 10px; text-align: left; font-weight: 500; }
  th:first-child { border-radius: 6px 0 0 0; }
  th:last-child  { border-radius: 0 6px 0 0; }
  td { padding: 8px 10px; border-bottom: 1px solid var(--vscode-widget-border, #e5e7eb); }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: var(--vscode-list-hoverBackground, #f9fafb); }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 500; }
  .badge-green { background: #dcfce7; color: #16a34a; }
  .footer { margin-top: 12px; font-size: 11px; color: var(--vscode-descriptionForeground, #9ca3af); }
</style>
</head>
<body>
<h3>Evaluation Results</h3>
<div class="sub">Dataset: <b>${dataset}</b> &nbsp;·&nbsp; Generated on ${new Date().toLocaleDateString()}</div>
<table>
  <thead>
    <tr>
      <th>Model</th>
      <th>Accuracy</th>
      <th>Latency (s)</th>
      <th>Cost/Token</th>
      <th>F1 Score</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">PoC — Rana Awais Ahmad · GSoC 2026 · AI Evaluation Framework</div>

<script>
window.addEventListener('message', (e) => {
  if (e.data?.jsonrpc !== '2.0') return;
  if (e.data.id !== undefined) {
    window.parent.postMessage({ jsonrpc: '2.0', id: e.data.id, result: {} }, '*');
  }
});
let reqId = 0;
window.parent.postMessage({ jsonrpc: '2.0', id: ++reqId, method: 'ui/initialize', params: { protocolVersion: '2025-11-21' } }, '*');
setTimeout(() => {
  window.parent.postMessage({ jsonrpc: '2.0', method: 'ui/notifications/initialized', params: {} }, '*');
}, 300);
</script>
</body>
</html>`;
}
