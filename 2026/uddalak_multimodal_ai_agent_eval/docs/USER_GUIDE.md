# EvalForge — Complete User Guide

> **EvalForge** is a Multimodal AI & Agent API Evaluation Framework (GSoC 2026 PoC).
> Run structured evals against real AI providers and measure accuracy, latency, and cost.

---

## 1. Starting the Application

You need **3 terminal windows** running simultaneously.

### Terminal 1 — Backend (FastAPI, port 8000)
```bash
cd backend
uv run main.py
# ✅ "Uvicorn running on http://0.0.0.0:8000"
```

### Terminal 2 — MCP Server (port 3001)
```bash
cd mcp-server
npx tsx src/index.ts
# ✅ "EvalForge MCP server running on port 3001"
```

### Terminal 3 — Frontend (React, port 8080)
```bash
cd frontend
npm run dev
# ✅ "Local: http://localhost:8080"
```

### Environment — `backend/.env`
```env
GEMINI_API_KEY=your_google_ai_key
GROQ_API_KEY=your_groq_key
```
> **Free keys**: Groq → https://console.groq.com | Gemini → https://ai.google.dev

Then open **http://localhost:8080**.

---

## 2. Application Overview

| Sidebar Item | Purpose |
|---|---|
| **Analytics** | Charts and history for completed evals (updates automatically) |
| **Forge Eval** | Configure and launch new AI evaluations |
| **MCP Apps** | Embedded MCP evaluation interfaces |

The **header** shows live stats derived from real results: jobs run, avg accuracy, and provider badges.

---

## 3. Analytics Dashboard

Lands here by default. Shows real data from completed eval jobs.

### Metric Cards
| Card | Meaning |
|---|---|
| AVG ACCURACY | Mean accuracy across all runs (0–100%) |
| AVG LATENCY | Mean response time per sample in ms |
| TOTAL TOKENS | Cumulative tokens consumed |
| TOTAL COST | Estimated USD cost |

Cards show `—` until the first eval completes.

### Charts
- **Accuracy Per Run** — area chart, one point per eval job, updates automatically when each job finishes
- **Latency by Provider** — bar chart, latest mean_ms per provider

Both charts pull from the `/results/` endpoint and refresh every time polling detects a completed job.

### Evaluation History Table
Every row = one completed provider+job pair. Shows job ID, provider, accuracy, latency, tokens.

---

## 4. The Forge — Running an Evaluation

Navigate via **Forge Eval** in sidebar.

### Step 1: Modality
Click one of three tiles:

| Tile | Use for |
|---|---|
| **TEXT** | MMLU-style Q&A exact-match accuracy — *start here* |
| **MULTIMODAL** | Image + text VQA (vision-language models) |
| **AGENT** | Tool-call trajectory fidelity score (TFS) |

### Step 2: Dataset
Select from the dropdown. Available datasets come live from the backend.
- `mmlu_sample` — 50 MMLU questions, recommended for first run

### Step 3: Providers
Each card has two dropdowns:

**PROVIDER** — pick a backend:
- **Groq (Free)** — fast, generous free tier, best for demos
- **Gemini (Google)** — requires key, free-tier rate limits apply
- **OpenAI / Anthropic** — require paid keys

**MODEL** — auto-populated per provider:
- Groq: `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, …
- Gemini: `gemini-2.0-flash`, `gemini-2.5-flash`, `gemini-1.5-pro`, …
- OpenAI: `gpt-4o-mini`, `gpt-4o`, …
- Anthropic: `claude-3-5-haiku-20241022`, `claude-3-5-sonnet-20241022`, …

Click **+ ADD PROVIDER** to compare two models in the same run.

### FORGE SUMMARY panel (right)
Confirms your selections. Click **INITIATE EVALUATION** to launch.

**What happens after launch:**
1. A progress bar appears (live %, polls every 2 seconds)
2. Backend sends prompts to the AI provider and scores responses
3. When done: green ✓ banner + Analytics updates automatically

> Typical Groq eval on `mmlu_sample` (50 items): ~25–40 seconds.

---

## 5. MCP Apps

Navigate via **MCP Apps** in sidebar.

### Eval Dashboard App
Iframe view of the eval dashboard — compatible with MCP agent chatflows.

### Sales Analytics Verifier
Manual grading tool for `sample-mcp-apps-chatflow` agent output.

**How to use:**
1. Click **Sales Analytics Verifier** card
2. In the iframe, paste agent's text response in **Agent Text Output** tab
3. Optionally paste tool-call JSON in **Tool Call Trace** tab
4. Rate each dimension (1–5):
   - **Data Fidelity** — accuracy of data used
   - **Constraint Adherence** — followed task constraints?
   - **Tool Call Accuracy (TFS)** — right tools, right order?
5. Click **SUBMIT QUALITY SCORE**

> The **CONNECTED** badge confirms the MCP postMessage channel is active.

---

## 6. Understanding Results

### Accuracy
```
accuracy = correct_predictions / total_samples
```
A prediction is **correct** when the model's response exactly matches (case-insensitive, stripped) the `ground_truth`. Trailing punctuation counts as wrong.

Expected ranges for `mmlu_sample`:
- `llama-3.3-70b-versatile` (Groq): **60–80%**
- `gemini-2.0-flash`: **70–85%** (if not rate-limited)

### Trajectory Fidelity Score (TFS)
```
TFS = correct_tool_calls_in_sequence / total_expected_tool_calls
```
Used for **agent** modality evals.

### Latency
`mean_ms` = average provider response time per dataset item.

### Cost
Estimated from token count × model price (per 1K tokens):
- Groq: ~$0.00 (free tier)
- `gemini-2.0-flash`: ~$0.0001/1K input

---

## 7. Troubleshooting

### All predictions show "ERROR"
**Cause:** Provider API error (usually 429 rate limit for Gemini free tier, or missing key)
**Fix:** Switch PROVIDER to **Groq (Free)** — no rate limits on basic usage

### Dataset dropdown empty / "Loading..."
**Cause:** Backend not running or `datasets/` folder is empty
```bash
curl http://localhost:8000/health  # should return {"status":"ok"}
ls backend/datasets/               # should show mmlu_sample.jsonl
```

### Charts not updating after eval
**Cause:** Polling already stopped; page not re-mounted
**Fix:** Click Analytics in sidebar to trigger fresh fetch

### Accuracy is 0% with Groq
**Cause:** Model responses include extra formatting that mismatches ground truth
**Fix:** Check `per_sample_results` in `/eval/status/{job_id}` to see actual responses

### MCP iframe blank
**Cause:** MCP server not running on port 3001
```bash
cd mcp-server && npx tsx src/index.ts
```

---

## 8. Quick API Reference

Base URL: `http://localhost:8000`

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Healthcheck |
| GET | `/datasets/` | List datasets |
| POST | `/eval/run` | Submit eval job |
| GET | `/eval/status/{id}` | Poll job status |
| GET | `/results/` | All completed results |

```bash
# Submit a text eval
curl -X POST http://localhost:8000/eval/run \
  -H "Content-Type: application/json" \
  -d '{
    "modality": "text",
    "providers": [{"name": "groq", "model": "llama-3.3-70b-versatile"}],
    "dataset": [{"prompt": "Capital of France? One word.", "ground_truth": "Paris"}]
  }'

# Poll status
curl http://localhost:8000/eval/status/{job_id}
```

---

*EvalForge PoC — GSoC 2026 — FastAPI + React + TypeScript MCP SDK*
