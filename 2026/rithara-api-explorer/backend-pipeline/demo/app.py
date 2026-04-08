import os
import sys
import json
import time
import asyncio
import logging
import traceback
from datetime import datetime
from flask import Flask, Response, render_template_string, request, jsonify
import httpx

# Add parent directory to sys.path to import pipeline modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import pipeline modules (Phases 1-6)
try:
    from pipeline.fetcher import download_spec, RAW_DIR
    from pipeline.parser import parse
    from pipeline.enricher import run_enrichment, APIEnricher
    from pipeline.template_generator import generate
    from pipeline.validator import validate
    from pipeline.publisher import publish
    PIPELINE_AVAILABLE = True
except ImportError as e:
    PIPELINE_AVAILABLE = False
    IMPORT_ERROR = str(e)

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Demo Configuration ---

DEMO_APIS = {
    "stripe.com": {
        "name": "Stripe",
        "url": "https://api.apis.guru/v2/specs/stripe.com/2022-11-15/openapi.json",
        "type": "openapi"
    },
    "weatherbit.io": {
        "name": "Weatherbit",
        "url": "https://api.apis.guru/v2/specs/weatherbit.io/2.0.0/swagger.json",
        "type": "openapi"
    },
    "twilio.com:api": {
        "name": "Twilio",
        "url": "https://api.apis.guru/v2/specs/twilio.com/api/1.42.0/openapi.json",
        "type": "openapi"
    }
}

# --- HTML Template (Vanilla JS + CSS) ---

HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Dash Marketplace — Pipeline Demo</title>
    <!-- Prism.js for JSON Highlighting -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/themes/prism-tomorrow.min.css" rel="stylesheet" />
    <style>
        :root {
            --bg-dark: #0f1117;
            --card-bg: #1e2130;
            --accent: #4f8ef7;
            --text-main: #e2e8f0;
            --text-muted: #94a3b8;
            --success: #10b981;
            --error: #ef4444;
            --warning: #f59e0b;
        }

        body {
            background-color: var(--bg-dark);
            color: var(--text-main);
            font-family: 'Inter', -apple-system, sans-serif;
            margin: 0;
            padding: 2rem;
            line-height: 1.5;
        }

        .container {
            max-width: 900px;
            margin: 0 auto;
        }

        header {
            text-align: center;
            margin-bottom: 3rem;
        }

        h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
            background: linear-gradient(to right, #60a5fa, #a78bfa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .subtitle {
            color: var(--text-muted);
            font-size: 1.1rem;
        }

        .controls {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            align-items: stretch;
            margin-bottom: 3rem;
            background: var(--card-bg);
            padding: 1.5rem;
            border-radius: 1rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        select, button {
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            font-size: 1rem;
            border: 1px solid #334155;
            background: #0f172a;
            color: white;
            cursor: pointer;
            transition: all 0.2s;
        }

        button.run {
            background: var(--accent);
            border: none;
            font-weight: 600;
        }

        button.run:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }

        button.run:disabled {
            background: #334155;
            cursor: not-allowed;
            transform: none;
        }

        .pipeline-flow {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }

        .phase-card {
            background: var(--card-bg);
            border-radius: 1rem;
            padding: 1.5rem;
            border: 1px solid transparent;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }

        .phase-card.active {
            border-color: var(--accent);
            box-shadow: 0 0 20px rgba(79, 142, 247, 0.15);
            animation: pulse-border 2s infinite;
        }

        @keyframes pulse-border {
            0% { border-color: var(--accent); }
            50% { border-color: #93c5fd; }
            100% { border-color: var(--accent); }
        }

        .phase-card.done { border-color: var(--success); }
        .phase-card.failed { border-color: var(--error); }
        .phase-card.skipped { border-color: #334155; opacity: 0.6; }

        .phase-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 1rem;
        }

        .phase-title-group h3 {
            margin: 0;
            font-size: 1.25rem;
        }

        .phase-desc {
            color: var(--text-muted);
            font-size: 0.9rem;
            margin-top: 0.25rem;
        }

        .status-badge {
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            background: #334155;
        }

        .status-running { background: var(--accent); color: white; }
        .status-done { background: var(--success); color: white; }
        .status-failed { background: var(--error); color: white; }

        .output-panel {
            margin-top: 1rem;
            border-top: 1px solid #334155;
            padding-top: 1rem;
            display: none;
        }

        .output-panel.visible { display: block; }

        pre, pre code {
            white-space: pre-wrap !important;
            word-break: break-all !important;
            overflow-wrap: break-word !important;
        }

        pre {
            border-radius: 0.5rem !important;
            margin: 0 !important;
            font-size: 0.85rem !important;
            overflow-x: hidden !important;
        }

        #final-result {
            margin-top: 4rem;
            padding: 2rem;
            background: #111827;
            border-radius: 1.5rem;
            border: 2px dashed #334155;
            display: none;
        }

        #final-result.visible { display: block; }

        .mock-card {
            background: var(--card-bg);
            border-radius: 1rem;
            padding: 1.5rem;
            margin-top: 1.5rem;
            border: 1px solid #334155;
        }

        .method-badge {
            background: var(--success);
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            font-weight: bold;
            font-size: 0.9rem;
            margin-right: 0.5rem;
        }

        .url-display {
            font-family: monospace;
            word-break: break-all;
            color: #93c5fd;
        }

        .placeholder {
            color: var(--warning);
            font-weight: bold;
        }

        .error-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            display: none;
        }

        .error-modal {
            background: var(--card-bg);
            padding: 2rem;
            border-radius: 1rem;
            max-width: 500px;
            border: 1px solid var(--error);
        }

        .summary-stats {
            display: flex;
            gap: 2rem;
            margin-bottom: 2rem;
            color: var(--text-muted);
        }

        .stat-item span { color: white; font-weight: bold; }
    </style>
</head>
<body>
    <div class="error-overlay" id="err-overlay">
        <div class="error-modal">
            <h2 style="color: var(--error); margin-top: 0;">⚠️ Missing Modules</h2>
            <p id="err-message"></p>
            <button onclick="location.reload()" style="width: 100%">Retry</button>
        </div>
    </div>

    <div class="container">
        <header>
            <h1>API Dash Marketplace</h1>
            <p class="subtitle">Watch how a raw API spec becomes an importable template</p>
        </header>

        <div class="controls">
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                <label style="font-size: 0.8rem; color: var(--text-muted);">Select API</label>
                <select id="api-select">
                    {% for id, api in apis.items() %}
                        <option value="{{ id }}">{{ api.name }}</option>
                    {% endfor %}
                </select>
            </div>
            <div style="display: flex; gap: 1rem; align-self: flex-end;">
                <button id="run-btn" class="run">▶ Run Pipeline</button>
                <button id="reset-btn" style="background: transparent;">Reset</button>
            </div>
        </div>

        <div class="summary-stats" id="main-stats" style="display: none;">
            <div class="stat-item">Phase: <span id="current-phase-num">0</span>/6</div>
            <div class="stat-item">Status: <span id="main-status-text">Idle</span></div>
            <div class="stat-item">Time: <span id="elapsed-time">0.0s</span></div>
        </div>

        <div class="pipeline-flow">
            <!-- Phase 1 -->
            <div class="phase-card" id="card-1">
                <div class="phase-header">
                    <div class="phase-title-group">
                        <h3>Phase 1 — Fetcher</h3>
                        <div class="phase-desc">
                            Downloads raw API specifications.
                            <div style="font-size: 0.8rem; margin-top: 0.5rem; color: var(--accent);">
                                <b>How it works:</b> Uses <code>httpx</code> to fetch from <i>apis.guru</i>. It compares ETag/Hash against a <code>snapshot.json</code> to ensure we only download specs that have changed.
                            </div>
                        </div>
                    </div>
                    <div class="status-badge" id="badge-1">Waiting</div>
                </div>
                <div class="output-panel" id="panel-1">
                    <pre><code class="language-json" id="code-1"></code></pre>
                </div>
            </div>

            <!-- Phase 2 -->
            <div class="phase-card" id="card-2">
                <div class="phase-header">
                    <div class="phase-title-group">
                        <h3>Phase 2 — Parser</h3>
                        <div class="phase-desc">
                            Normalizes complex specs into a clean model.
                            <div style="font-size: 0.8rem; margin-top: 0.5rem; color: var(--accent);">
                                <b>How it works:</b> Uses <code>prance</code> for OpenAPI resolution. It handles $ref pointers, flattens parameters, and converts both OpenAPI 2/3 and raw HTML into a standard <code>ParsedAPI</code> Pydantic object.
                            </div>
                        </div>
                    </div>
                    <div class="status-badge" id="badge-2">Waiting</div>
                </div>
                <div class="output-panel" id="panel-2">
                    <pre><code class="language-json" id="code-2"></code></pre>
                </div>
            </div>

            <!-- Phase 3 -->
            <div class="phase-card" id="card-3">
                <div class="phase-header">
                    <div class="phase-title-group">
                        <h3>Phase 3 — Enricher</h3>
                        <div class="phase-desc">
                            Adds AI-ready metadata and branding.
                            <div style="font-size: 0.8rem; margin-top: 0.5rem; color: var(--accent);">
                                <b>How it works:</b> Maps APIs to categories using a <code>category_map.yaml</code>. It detects auth schemes and searches for high-quality SVG/PNG logos using provider domains and the Clearbit API fallback.
                            </div>
                        </div>
                    </div>
                    <div class="status-badge" id="badge-3">Waiting</div>
                </div>
                <div class="output-panel" id="panel-3">
                    <pre><code class="language-json" id="code-3"></code></pre>
                </div>
            </div>

            <!-- Phase 4 -->
            <div class="phase-card" id="card-4">
                <div class="phase-header">
                    <div class="phase-title-group">
                        <h3>Phase 4 — Template Generator</h3>
                        <div class="phase-desc">
                            Transmutes endpoints into API Dash templates.
                            <div style="font-size: 0.8rem; margin-top: 0.5rem; color: var(--accent);">
                                <b>How it works:</b> Converts spec examples into live request bodies. It automatically injects orange <code>{{placeholders}}</code> for security tokens and base URLs to make the templates "import & run" ready.
                            </div>
                        </div>
                    </div>
                    <div class="status-badge" id="badge-4">Waiting</div>
                </div>
                <div class="output-panel" id="panel-4">
                    <pre><code class="language-json" id="code-4"></code></pre>
                </div>
            </div>

            <!-- Phase 5 -->
            <div class="phase-card" id="card-5">
                <div class="phase-header">
                    <div class="phase-title-group">
                        <h3>Phase 5 — Validator</h3>
                        <div class="phase-desc">
                            Quality control and security gate.
                            <div style="font-size: 0.8rem; margin-top: 0.5rem; color: var(--accent);">
                                <b>How it works:</b> Scans for accidental hardcoded API keys/secrets. It validates the final templates against a strict <code>JSON Schema</code> to ensure compatibility with the Flutter app client.
                            </div>
                        </div>
                    </div>
                    <div class="status-badge" id="badge-5">Waiting</div>
                </div>
                <div class="output-panel" id="panel-5">
                    <pre><code class="language-json" id="code-5"></code></pre>
                </div>
            </div>

            <!-- Phase 6 -->
            <div class="phase-card" id="card-6">
                <div class="phase-header">
                    <div class="phase-title-group">
                        <h3>Phase 6 — Publisher</h3>
                        <div class="phase-desc">
                            Deploys the data to the Marketplace.
                            <div style="font-size: 0.8rem; margin-top: 0.5rem; color: var(--accent);">
                                <b>How it works:</b> Performs an atomic write to update the master <code>index.json</code>. It writes endpoint-specific template files and updates the <code>snapshot.json</code> to mark the API as sync-complete.
                            </div>
                        </div>
                    </div>
                    <div class="status-badge" id="badge-6">Waiting</div>
                </div>
                <div class="output-panel" id="panel-6">
                    <pre><code class="language-json" id="code-6"></code></pre>
                </div>
            </div>
        </div>

        <div id="final-result">
            <h2 style="margin-top: 0; display: flex; align-items: center; gap: 0.5rem;">
                <span style="color: var(--success)">✓</span> Pipeline Complete
            </h2>
            <p style="color: var(--text-muted)">This is how the first endpoint looks in API Dash:</p>
            
            <div class="mock-card">
                <div style="margin-bottom: 1rem;">
                    <span class="method-badge" id="mock-method">GET</span>
                    <span class="url-display" id="mock-url">https://api.example.com/...</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 0.5rem 0; font-size: 0.8rem; color: var(--text-muted);">HEADERS</h4>
                        <div id="mock-headers" style="font-size: 0.85rem; font-family: monospace;"></div>
                    </div>
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 0.5rem 0; font-size: 0.8rem; color: var(--text-muted);">NOTES</h4>
                        <p id="mock-notes" style="font-size: 0.85rem; margin: 0; color: var(--text-muted);"></p>
                    </div>
                </div>
            </div>
            <p style="text-align: right; margin-top: 1rem; color: var(--text-muted); font-size: 0.8rem;">
                Completed in <span id="final-duration">0.0</span>s
            </p>
        </div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/prism.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/components/prism-json.min.js"></script>
    <script>
        const API_SELECT = document.getElementById('api-select');
        const RUN_BTN = document.getElementById('run-btn');
        const RESET_BTN = document.getElementById('reset-btn');
        const FINAL_AREA = document.getElementById('final-result');
        const PIPELINE_AVAILABLE = {{ 'true' if pipeline_available else 'false' }};
        const IMPORT_ERROR = "{{ import_error | default('') }}";

        if (!PIPELINE_AVAILABLE) {
            document.getElementById('err-overlay').style.display = 'flex';
            document.getElementById('err-message').innerText = IMPORT_ERROR;
            RUN_BTN.disabled = true;
        }


        {% raw %}
        let eventSource = null;
        let startTime = null;
        let timerInterval = null;

        RUN_BTN.addEventListener('click', () => {
            resetUI();
            const apiId = API_SELECT.value;
            RUN_BTN.disabled = true;
            startTime = Date.now();
            
            document.getElementById('main-stats').style.display = 'flex';
            document.getElementById('main-status-text').innerText = 'Running...';
            
            timerInterval = setInterval(() => {
                const elapsed = (Date.now() - startTime) / 1000;
                document.getElementById('elapsed-time').innerText = elapsed.toFixed(1) + 's';
            }, 100);

            eventSource = new EventSource(`/run?api_id=${apiId}`);

            eventSource.onmessage = (e) => {
                const data = JSON.parse(e.data);
                
                if (data.status === 'running') {
                    updatePhase(data.phase, 'running');
                } else if (data.status === 'done') {
                    updatePhase(data.phase, 'done', data.output);
                } else if (data.status === 'failed') {
                    updatePhase(data.phase, 'failed', data.output);
                    stopPipeline('Failed');
                } else if (data.status === 'complete') {
                    stopPipeline('Complete');
                    showFinalResult(data.mock);
                }
            };

            eventSource.onerror = (e) => {
                console.error("SSE Error:", e);
                stopPipeline('Error');
            };
        });

        RESET_BTN.addEventListener('click', resetUI);

        function updatePhase(phase, status, output = null) {
            const card = document.getElementById(`card-${phase}`);
            const badge = document.getElementById(`badge-${phase}`);
            const panel = document.getElementById(`panel-${phase}`);
            const code = document.getElementById(`code-${phase}`);

            document.getElementById('current-phase-num').innerText = phase;

            card.className = `phase-card ${status}`;
            if (status === 'running') card.classList.add('active');
            
            badge.innerText = status.charAt(0) + status.slice(1);
            badge.className = `status-badge status-${status}`;

            if (output) {
                panel.classList.add('visible');
                code.innerText = JSON.stringify(output, null, 2);
                Prism.highlightElement(code);
            }
        }

        function stopPipeline(status) {
            if (eventSource) eventSource.close();
            clearInterval(timerInterval);
            RUN_BTN.disabled = false;
            document.getElementById('main-status-text').innerText = status;
        }

        function showFinalResult(mock) {
            FINAL_AREA.classList.add('visible');
            document.getElementById('final-duration').innerText = document.getElementById('elapsed-time').innerText.replace('s', '');
            
            const methodBadge = document.getElementById('mock-method');
            methodBadge.innerText = mock.method;
            methodBadge.style.background = getMethodColor(mock.method);
            
            // Highlight placeholders in URL
            const urlHtml = mock.url.replace(/\{\{([^}]+)\}\}/g, '<span class="placeholder">{{$1}}</span>');
            document.getElementById('mock-url').innerHTML = urlHtml;
            
            document.getElementById('mock-notes').innerText = mock.notes;
            
            let headersHtml = '';
            for (const [k, v] of Object.entries(mock.headers)) {
                headersHtml += `<div><span style="color: var(--text-muted)">${k}:</span> ${v}</div>`;
            }
            document.getElementById('mock-headers').innerHTML = headersHtml || 'None';

            FINAL_AREA.scrollIntoView({ behavior: 'smooth' });
        }

        function resetUI() {
            if (eventSource) eventSource.close();
            clearInterval(timerInterval);
            RUN_BTN.disabled = false;
            FINAL_AREA.classList.remove('visible');
            document.getElementById('main-stats').style.display = 'none';

            for (let i = 1; i <= 6; i++) {
                const card = document.getElementById(`card-${i}`);
                const badge = document.getElementById(`badge-${i}`);
                const panel = document.getElementById(`panel-${i}`);
                card.className = 'phase-card';
                badge.innerText = 'Waiting';
                badge.className = 'status-badge';
                panel.classList.remove('visible');
            }
        }

        function getMethodColor(m) {
            const colors = {
                'GET': '#10b981',
                'POST': '#4f8ef7',
                'PUT': '#f59e0b',
                'DELETE': '#ef4444',
                'PATCH': '#8b5cf6'
            };
            return colors[m] || '#64748b';
        }
        {% endraw %}
    </script>
</body>
</html>
"""

@app.route('/')
def index():
    return render_template_string(
        HTML_TEMPLATE, 
        apis=DEMO_APIS, 
        pipeline_available=PIPELINE_AVAILABLE,
        import_error=IMPORT_ERROR if not PIPELINE_AVAILABLE else ""
    )

@app.route('/run')
def run():
    api_id = request.args.get('api_id', 'stripe.com')
    api_config = DEMO_APIS.get(api_id)
    
    if not api_config:
        return jsonify({"error": "Invalid API ID"}), 400

    def event_stream():
        try:
            # --- Phase 1: Fetcher ---
            yield f"data: {json.dumps({'phase': 1, 'status': 'running'})}\n\n"
            time.sleep(1) # Visual delay
            
            async def do_fetch():
                async with httpx.AsyncClient() as client:
                    success = await download_spec(
                        client, 
                        api_id, 
                        api_config['url'], 
                        api_config['type']
                    )
                    return success

            # Run async logic in thread
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            success = loop.run_until_complete(do_fetch())
            
            if not success:
                res = {'phase': 1, 'status': 'failed', 'output': {'error': 'Download failed'}}
                yield f"data: {json.dumps(res)}\n\n"
                return

            ext = "json" if api_config['type'] == "openapi" else "html"
            safe_api_id = api_id.replace(":", "_").replace("/", "_").replace("\\", "_")
            file_path = os.path.join(RAW_DIR, f"{safe_api_id}.{ext}")
            size_kb = os.path.getsize(file_path) / 1024

            res1 = {
                'phase': 1, 
                'status': 'done', 
                'output': {
                    'api_id': api_id,
                    'source_url': api_config['url'],
                    'file_saved': file_path,
                    'size_kb': round(size_kb, 2),
                    'timestamp': datetime.now().isoformat()
                }
            }
            yield f"data: {json.dumps(res1)}\n\n"

            # --- Phase 2: Parser ---
            yield f"data: {json.dumps({'phase': 2, 'status': 'running'})}\n\n"
            time.sleep(1.5)
            
            parsed_api = parse(api_id, api_config['type'])
            
            res2 = {
                'phase': 2, 
                'status': 'done', 
                'output': {
                    'api_id': parsed_api.api_id,
                    'title': parsed_api.title,
                    'base_url': parsed_api.base_url,
                    'version': parsed_api.version,
                    'endpoint_count': len(parsed_api.endpoints),
                    'preview_endpoints': [
                        {"method": e.method, "path": e.path, "summary": e.summary}
                        for e in parsed_api.endpoints[:3]
                    ]
                }
            }
            yield f"data: {json.dumps(res2)}\n\n"

            # --- Phase 3: Enricher ---
            yield f"data: {json.dumps({'phase': 3, 'status': 'running'})}\n\n"
            time.sleep(1.5)
            
            enriched = loop.run_until_complete(run_enrichment(api_id))
            
            res3 = {
                'phase': 3, 
                'status': 'done', 
                'output': {
                    'categories': enriched.categories,
                    'auth_type': enriched.auth_type,
                    'auth_placeholders': enriched.auth_placeholders,
                    'logo_url': enriched.logo_url,
                    'description_preview': (enriched.description[:100] + "...") if enriched.description else None
                }
            }
            yield f"data: {json.dumps(res3)}\n\n"

            # --- Phase 4: Template Generator ---
            yield f"data: {json.dumps({'phase': 4, 'status': 'running'})}\n\n"
            time.sleep(1.5)
            
            generated = generate(enriched)
            
            res4 = {
                'phase': 4, 
                'status': 'done', 
                'output': {
                    'api_id': generated.api_id,
                    'endpoint_count': generated.endpoint_count,
                    'preview_templates': [
                        {
                            "id": t.id,
                            "method": t.method,
                            "url": t.url,
                            "auth_placeholders": t.auth_placeholders
                        }
                        for t in generated.templates[:2]
                    ]
                }
            }
            yield f"data: {json.dumps(res4)}\n\n"

            # --- Phase 5: Validator ---
            yield f"data: {json.dumps({'phase': 5, 'status': 'running'})}\n\n"
            time.sleep(1)
            
            val_result = validate(generated, enriched)
            
            res5 = {
                'phase': 5, 
                'status': 'done', 
                'output': {
                    'passed': val_result.passed,
                    'valid_count': len(val_result.valid_templates),
                    'rejected_ids': val_result.rejected_templates,
                    'warning_count': len(val_result.warnings),
                    'warnings_preview': val_result.warnings[:2]
                }
            }
            yield f"data: {json.dumps(res5)}\n\n"

            # --- Phase 6: Publisher ---
            yield f"data: {json.dumps({'phase': 6, 'status': 'running'})}\n\n"
            time.sleep(1)
            
            success = publish(val_result, enriched)
            
            res6 = {
                'phase': 6, 
                'status': 'done' if success else 'failed', 
                'output': {
                    'success': success,
                    'output_folder': f"marketplace/apis/{api_id}/",
                    'index_updated': True
                }
            }
            yield f"data: {json.dumps(res6)}\n\n"

            # --- Final Complete Event ---
            if success and val_result.valid_templates:
                first_t = val_result.valid_templates[0]
                final_res = {
                    'status': 'complete',
                    'mock': {
                        'method': first_t.method,
                        'url': first_t.url,
                        'headers': first_t.headers,
                        'notes': first_t.notes
                    }
                }
                yield f"data: {json.dumps(final_res)}\n\n"
            else:
                err_complete = {'status': 'complete', 'error': 'No valid templates published'}
                yield f"data: {json.dumps(err_complete)}\n\n"

        except Exception as e:
            logger.error(f"Pipeline error: {str(e)}")
            logger.error(traceback.format_exc())
            err_res = {'status': 'failed', 'phase': 'current', 'output': {'error': str(e)}}
            yield f"data: {json.dumps(err_res)}\n\n"
        finally:
            loop.close()

    return Response(event_stream(), mimetype='text/event-stream')

if __name__ == '__main__':
    # Add setup instructions to README logic
    print("=" * 60)
    print("API Dash Marketplace — Visual Demo")
    print("=" * 60)
    print("1. Ensure 'flask' and 'httpx' are installed: pip install flask httpx")
    print("2. Run this script: python demo/app.py")
    print("3. Open http://localhost:5000 in your browser")
    print("=" * 60)
    
    app.run(debug=True, port=5000, threaded=True)

# HOW TO RUN THIS DEMO:
# 1. cd into the apidash-marketplace root folder
# 2. pip install flask httpx
# 3. python demo/app.py
# 4. Open http://localhost:5000 in your browser
# 5. Select an API from the dropdown and click "Run Pipeline"
