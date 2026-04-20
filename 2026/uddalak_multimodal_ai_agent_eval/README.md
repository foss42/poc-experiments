<div align="center">

# EvalForge

### Multimodal AI & Agent API Evaluation Framework
#### GSoC 2026 Proof of Concept — API Dash

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![MCP](https://img.shields.io/badge/MCP-SDK-7C3AED?style=flat-square)](https://modelcontextprotocol.io)
[![License](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](LICENSE)

**Run structured evals against real AI providers. Measure accuracy, latency, and cost — from your browser or directly inside an AI agent chat.**

[Quick Start](#-quick-start) · [Features](#-features) · [Architecture](#-architecture) · [API Reference](#-api-reference) · [Contributing](#-contributing)

---

<!-- SYSTEM ARCHITECTURE DIAGRAM PLACEHOLDER -->
<!-- Replace with: architecture diagram exported from Eraser/draw.io -->
<!-- Recommended: full-width banner image showing the 5-layer system diagram -->
<!-- File: docs/diagrams/system-architecture.png -->


</div>

---

## What Is EvalForge?

EvalForge is an end-to-end evaluation framework for AI APIs — text, image, audio, and agentic systems — built as a GSoC 2026 proof of concept for [API Dash](https://github.com/foss42/apidash).

Today, running LLM benchmarks requires CLI tools, complex local setup, and deep ML expertise. EvalForge makes it as simple as clicking **Run Eval**:

```
Traditional workflow              EvalForge
────────────────────              ─────────
$ pip install lm-eval             → Open http://localhost:5173
$ lm_eval --model openai ...      → Select provider + dataset
$ parse JSON output manually      → Click "Initiate Evaluation"
$ write comparison scripts        → Compare providers side-by-side
                                  → Export results as JSON
```

The **game-changer**: EvalForge's eval UI is itself an **MCP App** — it renders inside any AI agent chat window. No terminal. No setup. Just ask your agent to run an eval.

---

## Features

### Four eval modalities in one framework

| Modality | What it evaluates | Metric |
|---|---|---|
| **Text** | MMLU-style Q&A, benchmarks (MMLU, TruthfulQA, HellaSwag) | Exact-match accuracy, pass@k |
| **Multimodal** | Vision QA (VQA v2, MMMU), image captioning (COCO) | Accuracy, BLEU, CIDEr |
| **Audio** | Speech-to-text (ASR), speech classification | Word Error Rate (WER), CER |
| **Agent** | Multi-turn tool-call sequences, task completion | Trajectory Fidelity Score (TFS) |

### Trajectory Fidelity Score — an original metric

TFS measures how faithfully an agent follows an expected tool-call sequence:

```
TFS = correct_tool_calls_in_sequence / total_expected_tool_calls   →   0.0 – 1.0
```

A task **passes** at TFS ≥ 0.8. The `TrajectoryViewer` component renders a live diff of actual vs. expected tool sequences, with per-step match/mismatch highlighting.

### MCP Apps integration — eval from inside agent chat

EvalForge exposes an MCP server with three tools:

| Tool | What it does |
|---|---|
| `open_eval_dashboard` | Renders the full eval UI as an iframe inside any agent chat |
| `test_sales_analytics_mcp` | Evaluates the Sales Analytics MCP App server from `ashitaprasad/sample-mcp-apps-chatflow` |
| `run_quick_eval` | Fires an inline eval job and returns results as structured text |

### Provider support

| Provider | Text | Image | Audio | Agent |
|---|---|---|---|---|
| OpenAI | `gpt-4o-mini`, `gpt-4o` | `gpt-4o` | `whisper-1` | Function calling |
| Anthropic | `claude-3-5-haiku`, `claude-3-5-sonnet` | `claude-3-5-sonnet` | — | Tool use |
| Google Gemini | `gemini-2.0-flash`, `gemini-1.5-pro` | `gemini-1.5-pro` | — | — |
| Groq (free) | `llama-3.3-70b`, `llama-3.1-8b` | — | `whisper-large` | — |
| HuggingFace | Any HF Inference API model | — | — | — |

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- API key for at least one provider (Groq has a generous free tier — [get one here](https://console.groq.com))

### 1. Clone and configure

```bash
git clone https://github.com/uddalak2005/gsoc-poc
cd 2026/uddalak_multimodal_ai_agent_eval
```

Create `backend/.env`:

```env
GROQ_API_KEY=your_groq_key        # Free — https://console.groq.com
GEMINI_API_KEY=your_google_key    # Free tier — https://ai.google.dev
OPENAI_API_KEY=                   # Optional
ANTHROPIC_API_KEY=                # Optional
```

### 2. Start all three services

Open **three terminal windows**:

```bash
# Terminal 1 — FastAPI backend (port 8000)
cd backend
uv run main.py
# ✅ Uvicorn running on http://0.0.0.0:8000
```

```bash
# Terminal 2 — MCP server (port 3001)
cd mcp-server
npx tsx src/index.ts
# ✅ EvalForge MCP server running on port 3001
```

```bash
# Terminal 3 — React frontend (port 5173)
cd frontend
npm install && npm run dev
# ✅ Local: http://localhost:5173
```

Open **http://localhost:5173** and run your first eval.

### Or use Docker Compose

```bash
OPENAI_API_KEY=sk-... GROQ_API_KEY=gsk_... docker-compose up
```

---

## Architecture


<img width="1841" height="2054" alt="diagram-export-20-04-2026-19_44_55" src="https://github.com/user-attachments/assets/f264f53b-165c-491d-b39d-9f0c3d735679" />

> **See [`docs/architecture.md`](docs/architecture.md)** for the full written breakdown.

### System layers


### Backend — FastAPI + provider adapter pattern

All providers implement a single interface. Adding a new provider never touches the orchestrator:

```python
class AIProviderAdapter(ABC):
    @abstractmethod
    async def generate_response(
        self,
        prompt: str,
        images: Optional[List[str]] = None,   # base64, for multimodal
        tools: Optional[List[Dict]] = None,    # for agent eval
    ) -> Dict[str, Any]:
        # Returns: {content, tool_calls, latency_ms, tokens_used, cost_usd}
        ...
```

The `EvalOrchestrator` runs all providers concurrently via `asyncio.gather`, so a 2-provider comparison takes no longer than the slowest single provider.

### Frontend — React + Recharts

```
src/
├── components/
│   ├── EvalConfigPanel/      # Provider, model, modality selection
│   ├── DatasetManager/       # JSONL upload + benchmark picker
│   ├── ResultsDashboard/     # Recharts bar charts, comparison table
│   ├── AgentLeaderboard/     # TFS leaderboard + TrajectoryViewer diff
│   └── MCPAppsPanel/         # iframe host + Sales Analytics tester
├── hooks/
│   ├── useEvalRunner.ts      # polling loop, job state
│   ├── useDataset.ts         # dataset fetch + parse
│   └── useResults.ts         # results aggregation
└── services/
    ├── api.ts                # Axios client
    └── evalService.ts        # eval job lifecycle
```

### MCP server — TypeScript + MCP SDK

```
mcp-server/src/
├── index.ts                  # Server entry point, tool registry
├── tools/
│   ├── runEval.ts            # Triggers FastAPI eval job
│   ├── getResults.ts         # Fetches and formats results
│   └── renderEvalUI.ts       # Returns HTML resource (MCP App)
└── apps/
    ├── eval-dashboard.html   # Full eval UI as MCP App
    └── sales-analytics-test.html  # Sales Analytics MCP tester
```

---

## Proposal Diagrams

The GSoC proposal includes three architecture diagrams that map the full implementation vision:

<!-- PROPOSAL DIAGRAM 1 PLACEHOLDER -->
<!-- Original image: https://github.com/user-attachments/assets/4ec45620-5b19-4003-814e-46bf1eefa6d7 -->
<!-- Caption: Three-layer architecture overview (Frontend · Backend · Providers) -->

**Diagram 1 — Architecture overview**

<img width="1640" height="1340" alt="image" src="https://github.com/user-attachments/assets/4ec45620-5b19-4003-814e-46bf1eefa6d7" />


**Diagram 2 — Backend adapter pattern and async eval pipeline**

<img width="1900" height="1534" alt="image" src="https://github.com/user-attachments/assets/381315ec-b5e4-4e11-b515-e058b2f4696e" />

<!-- PROPOSAL DIAGRAM 3 PLACEHOLDER -->
<!-- Original image: https://github.com/user-attachments/assets/9c6d807e-0264-4d82-bc3d-5c22febdde44 -->
<!-- Caption: 14-week implementation timeline by phase -->

<img width="1880" height="1234" alt="image" src="https://github.com/user-attachments/assets/9c6d807e-0264-4d82-bc3d-5c22febdde44" />

<img width="1900" height="1534" alt="image" src="https://github.com/user-attachments/assets/381315ec-b5e4-4e11-b515-e058b2f4696e" />

---

## UML Sequence Diagram

<!-- UML SEQUENCE DIAGRAM PLACEHOLDER -->
<!-- Replace with Eraser-exported sequence diagram PNG -->
<!-- Shows: three flows — MCP Apps path, direct frontend path, shared backend execution -->
<!-- File: docs/diagrams/uml-sequence-diagram.png -->

<img width="2301" height="2004" alt="diagram-export-20-04-2026-19_45_13" src="https://github.com/user-attachments/assets/cd6e521b-029c-4379-9b00-959b62dfd809" />


The sequence diagram covers:
- **Flow 1** — Eval triggered from inside an AI agent chat via MCP tools
- **Flow 2** — Developer uses the React dashboard directly
- **Flow 3** — Shared backend execution block (entry-point agnostic): orchestrator → runners → adapters → metrics → results

---

## Running an Evaluation

### Via the React UI

1. Navigate to **Forge Eval** in the sidebar
2. Select a **modality** tile: Text / Multimodal / Agent
3. Choose a **dataset** from the dropdown (`mmlu_sample` recommended for first run)
4. Configure one or more **providers** with model and API key
5. Click **Initiate Evaluation**

A live progress bar polls every 2 seconds. When complete, the **Analytics** dashboard updates automatically with charts and history.

### Via the MCP server (inside an agent chat)

Connect the MCP server to any compatible agent and try:

```
"Run a quick text eval on llama-3.3-70b using the MMLU sample dataset"
"Open the eval dashboard so I can compare gpt-4o-mini vs claude-haiku"
"Test the Sales Analytics MCP App server and score its tool responses"
```

The eval UI renders as an interactive iframe inside the chat window. Results are posted back into the agent context automatically.

### Via the REST API directly

```bash
# Submit an eval job
curl -X POST http://localhost:8000/eval/run \
  -H "Content-Type: application/json" \
  -d '{
    "modality": "text",
    "providers": [
      {"name": "groq", "model": "llama-3.3-70b-versatile"},
      {"name": "openai", "model": "gpt-4o-mini"}
    ],
    "dataset": [
      {"prompt": "Capital of France? A) Berlin B) Paris. Answer with letter.", "ground_truth": "B"},
      {"prompt": "What is 8 × 7? A) 54 B) 56. Answer with letter.", "ground_truth": "B"}
    ]
  }'
# → {"job_id": "a3f7c2b1", "status": "running"}

# Poll for results
curl http://localhost:8000/eval/status/a3f7c2b1
# → {"status": "complete", "result": [...]}
```

---

## Understanding Results

### Accuracy (text / multimodal)

Exact-match scoring, case-insensitive, whitespace-stripped:

```
accuracy = correct_predictions / total_samples
```

Expected ranges for `mmlu_sample` (50 questions):

| Model | Typical accuracy |
|---|---|
| `llama-3.3-70b-versatile` (Groq) | 60–80% |
| `gemini-2.0-flash` | 70–85% |
| `gpt-4o` | 80–90% |

### Trajectory Fidelity Score (agent)

```
TFS = steps where actual_trace[i].name == gold_standard[i]  /  len(gold_standard)
```

A task passes at TFS ≥ 0.8. The `TrajectoryViewer` shows a step-by-step diff:

```
Step   Expected          Actual            Match
────   ────────────      ──────────────    ─────
  1    get_weather   →   get_weather        ✓
  2    web_search    →   send_email         ✗   ← mismatch
  3    send_email    →   —                  ✗   ← missing

TFS: 0.33  ·  FAIL
```

### Latency

All latency stats (mean, p50, p95, p99) are measured end-to-end from request dispatch to response received, in milliseconds.

### Cost

Estimated from token counts × published per-1K-token rates. Groq free tier = $0.00.

---

## API Reference

Base URL: `http://localhost:8000`

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Server health check |
| `GET` | `/datasets/` | List available datasets |
| `POST` | `/eval/run` | Submit an eval job (async) |
| `GET` | `/eval/status/{job_id}` | Poll job status and results |
| `GET` | `/results/` | All completed results (for Analytics dashboard) |

Full OpenAPI spec auto-generated at **http://localhost:8000/docs**.

---

## Project Structure

```
uddalak_multimodal_ai_agent_eval/
│
├── frontend/                     # React + TypeScript (Vite)
│   └── src/
│       ├── components/           # EvalConfigPanel, ResultsDashboard, TrajectoryViewer, ...
│       ├── hooks/                # useEvalRunner, useDataset, useResults
│       ├── services/             # Axios client + evalService
│       └── types/                # eval.types.ts, provider.types.ts
│
├── backend/                      # Python / FastAPI
│   └── app/
│       ├── routers/              # /eval, /datasets, /results
│       ├── core/                 # EvalOrchestrator, metrics.py, task_queue.py
│       ├── adapters/             # base.py + openai/anthropic/gemini/hf adapters
│       ├── runners/              # text, image, audio, agent runners
│       └── models/               # Pydantic schemas
│
├── mcp-server/                   # MCP Apps server (TypeScript)
│   └── src/
│       ├── tools/                # runEval, getResults, renderEvalUI
│       └── apps/                 # eval-dashboard.html, sales-analytics-test.html
│
├── datasets/                     # Sample JSONL datasets
│   ├── sample_text.jsonl         # 20 MMLU-style Q&A items
│   ├── sample_agent.jsonl        # 10 tool-use task examples
│   └── sample_image.jsonl        # 5 VQA items (base64 images)
│
├── docs/
│   ├── architecture.md
│   ├── user_guide.md
│   ├── adding_a_provider.md
│   └── diagrams/                 # All diagram exports live here
│
├── docker-compose.yml
└── README.md                     # You are here
```

---

## Metrics Reference

All metrics live in `backend/app/core/metrics.py`.

| Function | Description | Used for |
|---|---|---|
| `calculate_accuracy(predictions, ground_truth)` | Exact-match accuracy | Text, multimodal |
| `calculate_wer(reference, hypothesis)` | Word Error Rate via DP | Audio / ASR |
| `calculate_trajectory_fidelity_score(trace, gold)` | TFS 0.0–1.0 | Agent eval |
| `calculate_pass_at_k(results, k)` | pass@k combinatorial | Code generation |
| `summarize_latencies(latencies)` | mean, p50, p95, p99 | All modalities |

---

## Tests

```bash
cd backend
pytest tests/ -v
```

```
tests/test_core/test_metrics.py
  ✓ test_accuracy_perfect
  ✓ test_accuracy_partial
  ✓ test_accuracy_empty
  ✓ test_wer_perfect
  ✓ test_wer_one_substitution
  ✓ test_trajectory_fidelity_perfect
  ✓ test_trajectory_fidelity_partial
  ✓ test_trajectory_fidelity_empty_gold
  ✓ test_pass_at_k

tests/test_adapters/test_openai_adapter.py
  ✓ test_basic_response
  ✓ test_tool_call_response

11 passed in 0.42s
```

---

## Troubleshooting

**All predictions show `ERROR`**
Provider returned a non-2xx response — usually a 429 rate limit (Gemini free tier) or a missing API key. Switch to **Groq (Free)** to rule out key issues.

**Dataset dropdown empty**
Backend is not running or `datasets/` folder is missing. Check:
```bash
curl http://localhost:8000/health     # should return {"status":"ok"}
ls backend/datasets/                  # should show *.jsonl files
```

**Analytics charts not updating**
Click **Analytics** in the sidebar to re-mount and trigger a fresh fetch from `/results/`.

**MCP iframe blank**
MCP server is not running on port 3001.
```bash
cd mcp-server && npx tsx src/index.ts
```

**Accuracy is 0% with Groq**
Model is adding formatting that breaks exact-match scoring. Inspect raw responses via:
```bash
curl http://localhost:8000/eval/status/{job_id} | jq '.result[0].per_sample_results[0]'
```

---

## Roadmap

The PoC proves the four pillars. The full GSoC project builds them out:

- **Phase 1** (Weeks 1–5) — Core text eval, provider adapters, results dashboard
- **Phase 2** (Weeks 6–9) — Multimodal: VQA, ASR, BLEU/CIDEr metrics, waveform viz
- **Phase 3** (Weeks 10–13) — Agent leaderboard, context retention scoring, async task queue
- **Phase 4** (Week 14) — Playwright E2E tests, user guide, final PR

---

## Contributing

This repo is the GSoC 2026 PoC submission for `foss42/gsoc-poc`. To add a new provider:

1. Create `backend/app/adapters/your_provider_adapter.py`
2. Implement `AIProviderAdapter` — only `generate_response()` and `get_provider_name()` are required
3. Register the adapter in `backend/app/routers/eval.py` inside `_build_providers()`
4. Add the provider + model options to `frontend/src/components/EvalConfigPanel/EvalConfigPanel.tsx`
5. Write tests in `backend/tests/test_adapters/test_your_provider_adapter.py`

See [`docs/adding_a_provider.md`](docs/adding_a_provider.md) for the full walkthrough.

---

## Author

**Uddalak Mukhopadhyay** — GSoC 2026 Applicant, API Dash

- GitHub: [@uddalak2005](https://github.com/uddalak2005)
- LinkedIn: [uddalak-mukhopadhyay](https://www.linkedin.com/in/uddalak-mukhopadhyay/)
- Discord: `uddalak_mukhopadhyay` (API Dash server)
- Email: uddalakmukhopadhyay@gmail.com
- Portfolio: [uddalakmukhopadhyay.netlify.app](https://uddalakmukhopadhyay.netlify.app)

---

<div align="center">

Built for [API Dash](https://github.com/foss42/apidash) · GSoC 2026 · MIT License

</div>
