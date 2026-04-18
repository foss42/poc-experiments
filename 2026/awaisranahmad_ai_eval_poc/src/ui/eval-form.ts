export function EVAL_FORM_HTML(): string {
  const models = [
    { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI" },
    { id: "claude-3-5-sonnet", name: "Claude Sonnet 4.5", provider: "Anthropic" },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "Google" },
    { id: "llama-3-70b", name: "LLaMA 3 70B", provider: "Meta" },
  ];

  const modelCards = models
    .map(
      (m) => `
    <div class="model-card" id="card-${m.id}" onclick="toggleModel('${m.id}')">
      <input type="checkbox" id="${m.id}" value="${m.id}" style="display:none"/>
      <div class="model-name">${m.name}</div>
      <div class="model-provider">${m.provider}</div>
    </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: var(--vscode-font-family, sans-serif); }
  body { background: transparent; color: var(--vscode-foreground, #1f2937); padding: 16px; }
  h3 { font-size: 14px; font-weight: 600; margin-bottom: 12px; color: var(--vscode-foreground, #111); }
  .section { margin-bottom: 16px; }
  label { font-size: 12px; font-weight: 600; color: var(--vscode-descriptionForeground, #6b7280); display: block; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
  .model-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .model-card { border: 1px solid var(--vscode-widget-border, #d1d5db); border-radius: 8px; padding: 10px 12px; cursor: pointer; transition: all 0.15s; }
  .model-card:hover { border-color: #3b82f6; }
  .model-card.selected { border-color: #3b82f6; background: #eff6ff; }
  .model-name { font-size: 13px; font-weight: 500; }
  .model-provider { font-size: 11px; color: var(--vscode-descriptionForeground, #9ca3af); margin-top: 2px; }
  select { width: 100%; padding: 8px 10px; border: 1px solid var(--vscode-widget-border, #d1d5db); border-radius: 6px; font-size: 13px; background: var(--vscode-input-background, #fff); color: var(--vscode-input-foreground, #111); }
  .metric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .metric-btn { padding: 8px; border: 1px solid var(--vscode-widget-border, #d1d5db); border-radius: 6px; font-size: 12px; cursor: pointer; text-align: center; background: transparent; color: var(--vscode-foreground, #111); transition: all 0.15s; }
  .metric-btn.selected { background: #3b82f6; color: white; border-color: #3b82f6; }
  .btn-row { display: flex; gap: 8px; margin-top: 16px; }
  .btn-submit { flex: 1; padding: 10px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; }
  .btn-submit:hover { background: #2563eb; }
  .btn-reset { padding: 10px 16px; border: 1px solid var(--vscode-widget-border, #d1d5db); border-radius: 8px; font-size: 13px; cursor: pointer; background: transparent; color: var(--vscode-foreground, #111); }
  .status { font-size: 12px; color: #16a34a; margin-top: 8px; min-height: 18px; }
</style>
</head>
<body>
<h3>AI Model Evaluation Config</h3>

<div class="section">
  <label>Select Models</label>
  <div class="model-grid">${modelCards}</div>
</div>

<div class="section">
  <label>Benchmark Dataset</label>
  <select id="dataset">
    <option value="mmlu">MMLU — General Knowledge</option>
    <option value="hellaswag">HellaSwag — Common Sense Reasoning</option>
    <option value="gsm8k">GSM8K — Math Reasoning</option>
    <option value="humaneval">HumanEval — Code Generation</option>
    <option value="truthfulqa">TruthfulQA — Truthfulness</option>
  </select>
</div>

<div class="section">
  <label>Metrics</label>
  <div class="metric-grid">
    <button class="metric-btn selected" id="m-accuracy"   onclick="toggleMetric('accuracy')">Accuracy</button>
    <button class="metric-btn selected" id="m-latency"    onclick="toggleMetric('latency')">Latency (s)</button>
    <button class="metric-btn"          id="m-cost"       onclick="toggleMetric('cost')">Cost / Token</button>
    <button class="metric-btn"          id="m-f1"         onclick="toggleMetric('f1')">F1 Score</button>
  </div>
</div>

<div class="btn-row">
  <button class="btn-reset" onclick="resetForm()">Reset</button>
  <button class="btn-submit" onclick="submitConfig()">▶ Run Evaluation</button>
</div>
<div class="status" id="status"></div>

<script>
const selectedModels = new Set();
const selectedMetrics = new Set(['accuracy', 'latency']);

function toggleModel(id) {
  const card = document.getElementById('card-' + id);
  if (selectedModels.has(id)) { selectedModels.delete(id); card.classList.remove('selected'); }
  else { selectedModels.add(id); card.classList.add('selected'); }
}

function toggleMetric(id) {
  const btn = document.getElementById('m-' + id);
  if (selectedMetrics.has(id)) { selectedMetrics.delete(id); btn.classList.remove('selected'); }
  else { selectedMetrics.add(id); btn.classList.add('selected'); }
}

function resetForm() {
  selectedModels.clear();
  selectedMetrics.clear();
  selectedMetrics.add('accuracy'); selectedMetrics.add('latency');
  document.querySelectorAll('.model-card').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('.metric-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('m-accuracy').classList.add('selected');
  document.getElementById('m-latency').classList.add('selected');
  document.getElementById('status').textContent = '';
}

async function submitConfig() {
  if (selectedModels.size === 0) { document.getElementById('status').textContent = '⚠️ Select at least one model.'; return; }
  const dataset = document.getElementById('dataset').value;
  document.getElementById('status').textContent = '⏳ Fetching evaluation data...';
  try {
    const result = await sendRequest('tools/call', {
      name: 'get-eval-data',
      arguments: { models: Array.from(selectedModels), dataset, metrics: Array.from(selectedMetrics) }
    });
    await sendRequest('ui/update-model-context', {
      content: [{ type: 'text', text: JSON.stringify(result.structuredContent || result, null, 2) }]
    });
    document.getElementById('status').textContent = '✅ Context updated successfully.';
  } catch(e) {
    document.getElementById('status').textContent = '❌ Error: ' + e;
  }
}

// MCP Apps postMessage RPC setup
let requestId = 0;
const pending = {};
window.addEventListener('message', (e) => {
  const msg = e.data;
  if (msg?.jsonrpc !== '2.0') return;
  if (msg.id !== undefined && pending[msg.id]) { pending[msg.id](msg); delete pending[msg.id]; }
});
function sendRequest(method, params) {
  return new Promise((res, rej) => {
    const id = ++requestId;
    pending[id] = (msg) => msg.error ? rej(msg.error) : res(msg.result);
    window.parent.postMessage({ jsonrpc: '2.0', id, method, params }, '*');
  });
}
sendRequest('ui/initialize', { protocolVersion: '2025-11-21' }).then(() => {
  window.parent.postMessage({ jsonrpc: '2.0', method: 'ui/notifications/initialized', params: {} }, '*');
});
</script>
</body>
</html>`;
}
