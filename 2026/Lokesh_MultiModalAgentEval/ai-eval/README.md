# AI Evaluation Dashboard
### Multimodal Eval & Agent Eval

A capability aware evaluation dashboard that benchmarks local AI models across **Text, Vision, Audio, and Agent** tasks through a unified backend with real-time SSE log streaming.

---

## What This Is

Most eval frameworks do diff things, one library for text, vision, another for agents etc. This project wraps major open source evaluation frameworks behind a single FastAPI router that:

- Detects model capabilities and prevents mismatched evaluations
- Routes each task to the correct engine automatically
- Streams live evaluation logs to the frontend via SSE
- Normalizes all results into a single unified JSON schema

---
## Demo Videos
https://drive.google.com/file/d/1ii6Yns5Dpk60_efnfcY4It2U1k9zngIy/view?usp=sharing
### Text
* https://drive.google.com/file/d/1orlIrFCEDQWisusVhsHQaNHFMHlZ0UZu/view?usp=sharing
### Vision test (llava-Pope)
* https://drive.google.com/file/d/1XPGyHfNg3MBGxacspEFHRhSHMKUX0gXV/view?usp=sharing
### Audio test (Whisper Tiny-Libri Speech)
* https://drive.google.com/file/d/1l6dBimZgg1g4dX-TlX11l1LmfwKNXaGs/view?usp=sharing
### Agent rool call test (Qwen 2.5 1.5b)
* https://drive.google.com/file/d/1udKRfhB0Wy0jpskueMDXSjuFzj8nTi39/view?usp=sharing
## Architecture

```
React Frontend (TypeScript + Vite)
        │
        │  HTTP + SSE
        ▼
FastAPI Router (eval_runner.py)
        │
        ├── TASK_REGISTRY lookup
        ├── Capability validation
        ├── subprocess.Popen (process isolation)
        │
        ├─── lmms-eval ──────► Text (MMLU_PRO) + Vision (POPE)
        │         └──────────────────────────► Ollama (local inference)
        │
        ├─── faster-whisper ─► Audio (LibriSpeech ASR)
        │         └──────────────────────────► HuggingFace (whisper-tiny/base)
        │                                      CTranslate2 — no Ollama involved
        │
        └─── inspect-ai ─────► Agent (Calculator tool use)
                  └──────────────────────────► Ollama (local inference)
```

### Why subprocess.Popen?
Each engine runs in an isolated subprocess. If a benchmark crashes mid-run, the FastAPI server stays alive. stdout is piped back to the SSE queue so the frontend receives live logs from the actual evaluation process.

---

## Hardware Requirements

Developed and tested on:
- **GPU:** NVIDIA RTX 3050 with 4GB VRAM
- **RAM:** 16GB System RAM
- **OS:** Windows 11

All models selected to fit within the 4GB VRAM ceiling.

---

## Model Stack

| Modality | Model | Size | Via | Benchmark |
|---|---|---|---|---|
| Vision | llava-phi3 | ~3.7GB | Ollama | POPE |
| Text | qwen2.5:1.5b | ~1GB | Ollama | MMLU_PRO |
| Agent | qwen2.5:1.5b | ~1GB | Ollama | Calculator tool use |
| Audio | whisper-tiny / base | ~150MB / 300MB | faster-whisper (HuggingFace) | LibriSpeech ASR |

---

## Engine Stack

| Engine | Tasks | Why |
|---|---|---|
| lmms-eval (source) | MMLU_PRO, POPE | Unified generative + vision eval |
| faster-whisper | LibriSpeech | Lightweight CTranslate2 backend, no PyTorch audio pipeline |
| inspect-ai | Agent calculator task | Purpose-built for tool use + trajectory capture |

> **lm-harness is not used.** Loglikelihood tasks (HellaSwag, ARC, MMLU) require token-level logprobs that Ollama's OpenAI-compatible endpoint does not expose. Multiple choice benchmarks via lmms-eval hit a hardcoded assert. This is a fundamental limitation, not a configuration issue.

---

## Key Engineering Decisions

### Audio Without Heavy Dependencies
faster-whisper uses CTranslate2 (not PyTorch) for inference — 4x faster than HuggingFace transformers whisper, uses ~200MB VRAM vs ~500MB+. torch is still installed for lmms-eval but is not the audio inference engine.

---

## Installation

### Prerequisites
- Python 3.12
- [Ollama](https://ollama.ai) installed and running
- NVIDIA GPU with CUDA 12.1+ (CPU fallback available for audio)

### 1. Pull Models via Ollama
```powershell
ollama pull llava-phi3      # vision + text
ollama pull qwen2.5:1.5b    # text + agent
```

### 2. Clone and Set Up Backend
```powershell
git clone <your-repo>
cd ai-eval/backend

python -m venv venv
venv\Scripts\activate
```

### 3. Install lmms-eval FROM SOURCE (do not pip install)
```powershell
git clone https://github.com/EvolvingLMMs-Lab/lmms-eval.git
cd lmms-eval
pip install -e .
cd ..
```

# Then install the:
```bash
 pip install -r requirements.txt
 ```

# CUDA 12.1 build install torch separately:
```bash
 pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
 ```

### 5. Set Environment Variables
```powershell
$env:OPENAI_API_KEY = "dummy_key_for_local"
$env:HF_TOKEN = "your_huggingface_token"
$env:HF_HOME = "L:\example_dir\ai-eval\.hf_cache"
$env:HF_HUB_ENABLE_HF_TRANSFER = "1"
```
Note: If the hugging cache is saved inside /backend then everytime it starts downloading files, the server auto reloads because of uvicorn main:app --reload
Even if you add the cache inside backend folder, adding that path in .gitignore would probable fix the reload problem
### 6. Start the Backend
```powershell
uvicorn main:app --reload
```

### 7. Start the Frontend
```powershell
cd ../frontend
npm install
npm run dev
```

---

## Task Registry

```python
TASK_REGISTRY = {
    "MMLU_PRO":         {"engine": "lmms_eval",     "modality": "text"},
    "pope":          {"engine": "lmms_eval",      "modality": "vision"},
    "librispeech":   {"engine": "audio_wrapper",  "modality": "audio"},
    "basic_agent":   {"engine": "inspect_ai",     "modality": "agent"},
}
```

---

## Model Capability Map

```typescript
const MODEL_CAPABILITIES = {
  "llava-phi3":    { text: true,  vision: true,  audio: false, agent: false },
  "qwen2.5:1.5b": { text: true,  vision: false, audio: false, agent: true  },
  "whisper-tiny":  { text: false, vision: false, audio: true,  agent: false },
  "whisper-base":  { text: false, vision: false, audio: true,  agent: false },
}
```

The frontend uses this map to disable incompatible task/model combinations before the user runs an eval.

---

## Unified Result Schema

Every engine normalizes its output to this schema:

```json
{
  "run_id": "uuid-string",
  "model": "llava-phi3",
  "modality": "vision",
  "task": "pope",
  "engine": "lmms-eval",
  "metrics": {
    "accuracy": 0.60,
    "f1": 0.50
  },
  "metadata": {
    "limit": 5,
    "device": "cuda",
    "dataset": "lmms-lab/POPE"
  },
  "trajectory": []
}
```

Agent evals populate `trajectory` with the full step-by-step tool call sequence.

---

## Confirmed Benchmark Results

| Task | Model | Metric | Score |
|---|---|---|---|
| MMLU_PRO (5-shot) | qwen2.5:1.5b | exact_match (flexible) | 0.33 |
| POPE | llava-phi3 | accuracy | 0.60 |
| LibriSpeech ASR | whisper-tiny | WER / Accuracy | 0.16 / 0.84 |

> whisper-base achieves ~0.04 WER (~96% accuracy) on LibriSpeech test-clean.

---

## Known Limitations

| Limitation | Reason | Status |
|---|---|---|
| No HellaSwag / ARC / MMLU | Ollama doesn't expose logprobs — loglikelihood tasks impossible | By design |
| moondream returns empty responses | Ollama vision API compatibility bug | Use llava-phi3 instead |
| lmms-eval pip install broken | Missing YAML task files | Install from source |

---

## Engine Adapter Files

```
backend/
├── engines/
│   ├── lmms_wrapper.py       # Vision + Text via lmms-eval subprocess
│   ├── audio_wrapper.py      # Audio via faster-whisper + LibriSpeech
│   └── inspect_wrapper.py    # Agent via inspect-ai + calculator tool
├── schemas.py                # Unified EvalRequest + EvalResult Pydantic models
├── eval_runner.py            # Capability router + SSE streaming
└── main.py                   # FastAPI app + /health endpoint
```

---

## Health Check

```
GET /health
```

Returns Ollama status and loaded models:
```json
{"ollama": "up", "models": ["llava-phi3", "qwen2.5:1.5b"]}
```

The frontend shows a red banner if Ollama is unreachable.

---
