/**
 * Eval Configuration MCP App — lets users configure and trigger evals from inside AI agents.
 *
 * Follows the sample-mcp-apps-chatflow pattern:
 * - Server generates full HTML with embedded data
 * - UI calls tools via postMessage JSON-RPC
 * - On submit, calls run-eval tool which hits the Python backend
 */

import { baseStyles } from '../styles.js';

export function EVAL_CONFIG_UI(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Multimodal Eval Config</title>
  <style>
    ${baseStyles}
    .header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
    .header .title { font-size: 14px; font-weight: 600; }
    .header .badge { font-size: 10px; padding: 2px 8px; background: var(--accent); color: white; border-radius: 10px; }
    .modality-tabs { display: flex; gap: 6px; margin-bottom: 14px; }
    .modality-tab {
      padding: 8px 16px; border-radius: 8px; font-size: 12px; font-weight: 500;
      background: var(--surface); border: 1px solid var(--border); color: var(--muted);
      transition: all 0.15s;
    }
    .modality-tab.active { background: var(--accent); color: white; border-color: var(--accent); }
    .modality-tab:hover:not(.active) { border-color: var(--accent); color: var(--text); }
    .toggle-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .toggle { position: relative; width: 40px; height: 20px; }
    .toggle input { opacity: 0; width: 0; height: 0; }
    .toggle-slider { position: absolute; cursor: pointer; inset: 0; background: var(--surface); border-radius: 20px; transition: 0.2s; }
    .toggle-slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background: var(--muted); border-radius: 50%; transition: 0.2s; }
    .toggle input:checked + .toggle-slider { background: var(--accent); }
    .toggle input:checked + .toggle-slider:before { transform: translateX(20px); background: white; }
    .provider-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
    .provider-row select, .provider-row input { flex: 1; }
    .remove-btn { padding: 4px 8px; background: transparent; color: var(--muted); border: none; cursor: pointer; border-radius: 4px; }
    .remove-btn:hover { color: #ef4444; }
    .add-btn { font-size: 11px; color: var(--accent); background: transparent; border: none; cursor: pointer; padding: 4px 0; }
    .add-btn:hover { text-decoration: underline; }
    .hint { font-size: 10px; color: var(--muted); margin-top: 4px; }
    .footer { margin-top: 16px; display: flex; justify-content: space-between; align-items: center; }
  </style>
</head>
<body>
  <div class="header">
    <span class="title">Multimodal AI Evaluation</span>
    <span class="badge">Local + Cloud</span>
  </div>

  <div class="modality-tabs">
    <button class="modality-tab active" data-mod="image" onclick="selectModality('image')">Image VQA</button>
    <button class="modality-tab" data-mod="audio" onclick="selectModality('audio')">Audio STT</button>
  </div>

  <div id="imageConfig">
    <div class="toggle-row">
      <label class="toggle">
        <input type="checkbox" id="compareMode" onchange="toggleCompare()">
        <span class="toggle-slider"></span>
      </label>
      <span style="font-size: 12px; color: var(--text);">Compare multiple models</span>
    </div>

    <div id="singleModelConfig">
      <div class="card">
        <div class="label">Provider</div>
        <select id="imageProvider" onchange="updateModelOptions()">
          <option value="ollama">Ollama (local)</option>
          <option value="lmstudio">LM Studio (local)</option>
          <option value="huggingface">HuggingFace (cloud)</option>
          <option value="openai">OpenAI (cloud)</option>
        </select>
        <div class="label mt">Model</div>
        <select id="imageModelOllama">
          <option value="llava">llava (default)</option>
          <option value="llava:13b">llava:13b</option>
          <option value="bakllava">bakllava</option>
          <option value="moondream">moondream</option>
        </select>
        <input type="text" id="imageModelLMStudio" style="display:none" placeholder="model-name from LM Studio" value="">
        <input type="text" id="imageModelHF" style="display:none" placeholder="HuggingFaceTB/SmolVLM-256M-Instruct" value="HuggingFaceTB/SmolVLM-256M-Instruct">
        <select id="imageModelOpenAI" style="display:none">
          <option value="gpt-4o">gpt-4o</option>
          <option value="gpt-4o-mini">gpt-4o-mini</option>
          <option value="gpt-4-turbo">gpt-4-turbo</option>
        </select>
        <div class="label mt">Dataset</div>
        <select id="imageDataset">
          <option value="sample">Built-in sample (5 VQA pairs)</option>
        </select>
      </div>
    </div>

    <div id="compareConfig" style="display:none">
      <div class="card">
        <div class="label">Models to Compare (up to 4)</div>
        <div id="providerRows"></div>
        <button class="add-btn" onclick="addProviderRow()">+ Add another model</button>
        <div class="hint">Compare ROUGE-L, BLEU, and latency across providers</div>
      </div>
    </div>
  </div>

  <div id="audioConfig" style="display:none">
    <div class="card">
      <div class="label">Whisper Model Size</div>
      <select id="audioModel">
        <option value="tiny">tiny (fastest)</option>
        <option value="base" selected>base (recommended)</option>
        <option value="small">small</option>
        <option value="medium">medium</option>
      </select>
      <div class="label mt">Dataset</div>
      <select id="audioDataset">
        <option value="sample">Built-in sample (4 utterances)</option>
      </select>
    </div>
  </div>

  <div class="footer">
    <span class="status" id="status">Ready</span>
    <button class="btn-primary" id="runBtn" onclick="runEval()">Run Evaluation</button>
  </div>

  <script>
    let currentModality = 'image';
    let compareMode = false;
    let providerCount = 2;
    const pending = new Map();
    let nextId = 1;

    function selectModality(mod) {
      currentModality = mod;
      document.querySelectorAll('.modality-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.mod === mod);
      });
      document.getElementById('imageConfig').style.display = mod === 'image' ? '' : 'none';
      document.getElementById('audioConfig').style.display = mod === 'audio' ? '' : 'none';
    }

    function toggleCompare() {
      compareMode = document.getElementById('compareMode').checked;
      document.getElementById('singleModelConfig').style.display = compareMode ? 'none' : '';
      document.getElementById('compareConfig').style.display = compareMode ? '' : 'none';
      if (compareMode && document.getElementById('providerRows').children.length === 0) {
        addProviderRow('ollama', 'llava');
        addProviderRow('ollama', 'moondream');
      }
    }

    function updateModelOptions() {
      const provider = document.getElementById('imageProvider').value;
      document.getElementById('imageModelOllama').style.display = provider === 'ollama' ? '' : 'none';
      document.getElementById('imageModelLMStudio').style.display = provider === 'lmstudio' ? '' : 'none';
      document.getElementById('imageModelHF').style.display = provider === 'huggingface' ? '' : 'none';
      document.getElementById('imageModelOpenAI').style.display = provider === 'openai' ? '' : 'none';
    }

    function getSelectedModel() {
      const provider = document.getElementById('imageProvider').value;
      if (provider === 'ollama') return document.getElementById('imageModelOllama').value;
      if (provider === 'lmstudio') return document.getElementById('imageModelLMStudio').value || 'local-model';
      if (provider === 'huggingface') return document.getElementById('imageModelHF').value;
      if (provider === 'openai') return document.getElementById('imageModelOpenAI').value;
      return 'llava';
    }

    function addProviderRow(provider = 'ollama', model = 'llava') {
      if (providerCount >= 4) return;
      providerCount++;
      const row = document.createElement('div');
      row.className = 'provider-row';
      row.innerHTML = \`
                <select onchange="updateRowModel(this)">
                  <option value="ollama" ${provider === 'ollama' ? 'selected' : ''}>Ollama</option>
                  <option value="lmstudio" ${provider === 'lmstudio' ? 'selected' : ''}>LM Studio</option>
                  <option value="huggingface" ${provider === 'huggingface' ? 'selected' : ''}>HuggingFace</option>
                  <option value="openai" ${provider === 'openai' ? 'selected' : ''}>OpenAI</option>
                </select>
        <input type="text" value="\${model}" placeholder="model name">
        <button class="remove-btn" onclick="removeProviderRow(this)">×</button>
      \`;
      document.getElementById('providerRows').appendChild(row);
    }

    function removeProviderRow(btn) {
      if (document.getElementById('providerRows').children.length > 1) {
        btn.parentElement.remove();
        providerCount--;
      }
    }

    function updateRowModel(select) {
      const input = select.nextElementSibling;
      if (select.value === 'ollama') {
        input.placeholder = 'llava, moondream, minicpm-v...';
      } else if (select.value === 'lmstudio') {
        input.placeholder = 'model-name (from LM Studio)';
      } else if (select.value === 'huggingface') {
        input.placeholder = 'HuggingFaceTB/SmolVLM-256M-Instruct';
      } else if (select.value === 'openai') {
        input.placeholder = 'gpt-4o, gpt-4o-mini...';
      }
    }

    function request(method, params) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        window.parent.postMessage({ jsonrpc: '2.0', id, method, params }, '*');
      });
    }

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.jsonrpc === '2.0' && msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? reject(msg.error) : resolve(msg.result);
      }
    });

    async function runEval() {
      const btn = document.getElementById('runBtn');
      const status = document.getElementById('status');
      btn.disabled = true;
      status.textContent = 'Starting evaluation...';

      try {
        let result;
        if (currentModality === 'image' && compareMode) {
          const rows = document.getElementById('providerRows').children;
          const providers = Array.from(rows).map(row => ({
            provider: row.querySelector('select').value,
            model: row.querySelector('input').value,
          }));
          result = await request('tools/call', {
            name: 'compare-vision-models',
            arguments: { providers },
          });
        } else {
          const model = currentModality === 'image'
            ? getSelectedModel()
            : document.getElementById('audioModel').value;
          const provider = currentModality === 'image'
            ? document.getElementById('imageProvider').value
            : 'whisper';
          result = await request('tools/call', {
            name: 'run-multimodal-eval',
            arguments: { modality: currentModality, model, provider },
          });
        }

        status.textContent = 'Evaluation complete!';

        await request('ui/update-model-context', {
          content: [{
            type: 'resource',
            resource: {
              uri: 'eval://results/' + currentModality,
              mimeType: 'application/json',
              text: JSON.stringify(result),
            },
          }],
        });

        status.textContent = 'Done — results added to conversation.';
      } catch (err) {
        status.textContent = 'Error: ' + (err.message || JSON.stringify(err));
      } finally {
        btn.disabled = false;
      }
    }
  </script>
</body>
</html>`;
}