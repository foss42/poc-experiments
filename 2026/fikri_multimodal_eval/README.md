# Multimodal AI Evaluation Framework — GSoC 2026 PoC

**Applicant:** Ahmed Fikri ([@Fikri-20](https://github.com/Fikri-20))
**Idea:** #2 — Multimodal AI and Agent API Eval Framework (350 hrs)

---

## What This Demonstrates

A focused proof-of-concept for evaluating **local AI models** across **image** and **audio** modalities, with three complementary interfaces:

| Layer | What | Tech |
|-------|------|------|
| **Eval Backend** | Orchestrates existing eval frameworks | Python, FastAPI, lm-eval-harness, Whisper, jiwer |
| **Web Dashboard** | Standalone UI for running & viewing evals | React, TypeScript, Tailwind CSS, Recharts |
| **MCP Apps Server** | Eval UI inside AI agent chat windows | TypeScript, MCP SDK, Express |

### Key Differentiators

- **Actually multimodal** — evaluates image VQA (Ollama vision models, HuggingFace VLMs) and audio STT (local Whisper), not just text
- **Local-first** — prioritizes local models via Ollama and Whisper, no cloud API keys required for core flow
- **Multi-provider comparison** — compare up to 4 vision models side-by-side (Ollama + HuggingFace VLMs) with ROUGE-L, BLEU, and latency metrics
- **lm-eval-harness integration** — wraps EleutherAI's framework for standard benchmarks (MMLU, HellaSwag, etc.)
- **MCP Apps integration** — follows the [sample-mcp-apps-chatflow](https://github.com/ashitaprasad/sample-mcp-apps-chatflow) architecture so evaluations can be triggered from inside AI agents
- **Lean codebase** — ~30 files total, each with a clear purpose

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    User Interfaces                        │
│                                                          │
│   ┌─────────────────┐     ┌────────────────────────┐    │
│   │  React Dashboard │     │  MCP Apps (Agent Chat) │    │
│   │  localhost:5173  │     │  localhost:3000/mcp     │    │
│   └────────┬────────┘     └───────────┬────────────┘    │
│            │                          │                  │
└────────────┼──────────────────────────┼──────────────────┘
             │         REST + SSE       │
             ▼                          ▼
┌──────────────────────────────────────────────────────────┐
│              Python Backend (localhost:8000)               │
│                                                          │
│   ┌─────────────────┐  ┌──────────┐  ┌──────────────┐  │
│   │  lm-eval-harness │  │  Ollama  │  │ Local Whisper│  │
│   │  (text + VLM     │  │  Vision  │  │    STT       │  │
│   │   benchmarks)    │  │  API     │  │  + jiwer     │  │
│   └─────────────────┘  └──────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────────┘
             │                          │
             ▼                          ▼
    Local HF Models              Ollama + Whisper
```

---

## Quick Start

### 1. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Generate sample test data (images + audio)
pip install Pillow gTTS
python sample_data/generate_samples.py

# Start the backend
python main.py
```

The backend runs at `http://localhost:8000`. Needs:
- **Ollama** running locally with a vision model (`ollama pull llava`)
- **Whisper** installs automatically via pip
- **HuggingFace** (optional) — set `HF_TOKEN` environment variable for VLM comparison

### 2. React Dashboard

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`. Features:
- **Image VQA** tab — select an Ollama/HuggingFace vision model, run evaluation, see BLEU/ROUGE-L per sample with charts
- **Model Comparison** — toggle "Compare models" to run side-by-side comparison of up to 4 vision models
- **Audio STT** tab — select Whisper model size, run evaluation, see WER/CER per sample
- **lm-eval-harness** tab — run standard benchmarks on HuggingFace models
- Live SSE progress streaming for image/audio evals
- Past results browser

### 3. MCP Apps Server

```bash
cd mcp-server
npm install
npm run dev
```

Runs at `http://localhost:3000`. Test with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector http://localhost:3000/mcp
```

**MCP Tools exposed:**
| Tool | Description |
|------|-------------|
| `select-eval-config` | Opens interactive eval config UI (modality, model, dataset picker) |
| `run-multimodal-eval` | Executes eval against Python backend, returns structured results |
| `show-eval-results` | Renders results with Chart.js visualizations (bar charts, latency, tables) |

This follows the exact pattern from [sample-mcp-apps-chatflow](https://github.com/ashitaprasad/sample-mcp-apps-chatflow) — the eval UI renders as an interactive MCP App inside the AI agent's chat window.

---

## Evaluation Details

### Image VQA (Multi-Provider Vision Models)
- **Providers:**
  - **Ollama**: Local vision models (llava, bakllava, moondream, minicpm-v) — *no API key needed*
  - **LM Studio**: Local OpenAI-compatible server — *no API key needed*
  - **HuggingFace**: Cloud VLMs via Inference API (SmolVLM, BLIP-2, Kosmos-2) — *requires HF_TOKEN*
  - **OpenAI**: GPT-4 Vision models (gpt-4o, gpt-4o-mini, gpt-4-turbo) — *requires OPENAI_API_KEY*
- **Single Model Evaluation**: Run one model with ROUGE-L and BLEU metrics
- **Multi-Provider Comparison**: Compare up to 4 models side-by-side across different providers
- Metrics: **ROUGE-L** and **BLEU** (via `rouge-score` and `nltk`) comparing predicted vs expected answers
- Sample dataset: 5 shape/text recognition VQA pairs

### Audio STT (Local Whisper)
- Transcribes audio files using OpenAI Whisper running locally
- Metrics: **WER** and **CER** (via `jiwer`) comparing transcription vs reference
- Sample dataset: 4 spoken sentences

### Standard Benchmarks (lm-eval-harness)
- Wraps `lm_eval.simple_evaluate()` for HuggingFace models
- Supports: MMLU, HellaSwag, ARC, TruthfulQA, GSM8K, and multimodal tasks (MMMU, RealWorldQA)
- Results returned as structured JSON for the dashboard

---

## File Structure

```
├── backend/
│   ├── main.py               # FastAPI app — routes + CORS
│   ├── config.py              # Environment configuration
│   ├── harness_runner.py      # lm-eval-harness wrapper
│   ├── multimodal_runner.py   # Image (Ollama) + Audio (Whisper) eval orchestrator
│   ├── requirements.txt
│   └── sample_data/           # Sample VQA + STT datasets + generator
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Main app with tab navigation
│   │   ├── components/
│   │   │   ├── Header.tsx     # Navigation header
│   │   │   ├── StatusBar.tsx  # Provider health indicators
│   │   │   ├── EvalPanel.tsx  # Evaluation configuration + runner
│   │   │   ├── ProgressView.tsx # Live SSE progress + Recharts visualization
│   │   │   └── ResultsPanel.tsx # Past results browser
│   │   ├── hooks/useSSE.ts    # SSE streaming hook
│   │   └── types.ts
│   └── package.json
└── mcp-server/
    ├── src/
    │   ├── index.ts           # MCP server — tools + resources + Express transport
    │   ├── styles.ts          # Shared CSS for MCP App UIs
    │   └── ui/
    │       ├── eval-config.ts # Config form MCP App (modality/model picker)
    │       └── eval-results.ts # Results visualization MCP App (Chart.js)
    └── package.json
```

---

## Why This Approach

1. **Use existing tools, don't reinvent** — lm-eval-harness for benchmarks, jiwer for WER/CER, rouge-score for text similarity. The backend orchestrates, it doesn't rebuild.
2. **Local models are first-class** — Ollama for vision, Whisper for audio. No API keys needed for the core flow. HuggingFace VLMs available for comparison when `HF_TOKEN` is set.
3. **Multi-provider comparison** — Compare Ollama and HuggingFace models side-by-side with the same dataset and metrics, enabling direct performance/cost tradeoff analysis.
4. **MCP Apps for agent integration** — Following the mentor-recommended architecture, the eval UI works both standalone (React dashboard) and embedded in AI agent conversations (MCP Apps).
5. **Focused scope** — Image + Audio only. Done well, not spread thin.
