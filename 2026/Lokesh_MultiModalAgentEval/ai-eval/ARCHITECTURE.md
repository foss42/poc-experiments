# Multimodal API Eval Framework architecture (v3.0)

This document provides a comprehensive overview of the AI System Architecture. It serves as a technical walkthrough for the capabilities, subsystems, and the structural design of the standalone web-based AI Evaluation Dashboard, originally designed as a Proof of Concept (PoC) for the API Dash Google Summer of Code (GSoC) initiative.

---

## 1. Core Mission & Differential Design

The **Core Mission** is to operate a full "Capability-Aware" routing backend that dynamically evaluates AI endpoints across four core domains: **Text, Vision, Audio, and Agentic** tasks.

**The Technical Differentiator**: Instead of fighting dependency collisions and native memory bounds running benchmarks inside the same server memory pool, this framework utilizes a **Subprocess Adapter Pattern**. It wraps two massive open-source testing engines (`lmms-eval` and `inspect-ai`) isolating them gracefully, and parsing their wild schema outputs into a strict, Universal Data Contract (`EvalResult`).

---

## 2. Structural Paradigm: 4GB VRAM Hardware Limit

A primary reality dictating this architecture is the necessity of running complex models on a **strict 4GB VRAM ceiling** target (e.g., RTX 3050 laptops).

- **Sequential Processing Isolation**: All capabilities are stripped from threaded operations and are instead triggered via `subprocess.Popen` explicitly binding to `sys.executable`. This halts framework memory-bloat, ensures dependencies don't leak logic between Text and Agent frameworks, and guarantees the primary FastAPI Server won't crash if an evaluation process hits an out-of-memory error.
- **Concurrency Safety**: Processes instantly lock test operations to pseudo-random namespaces (e.g., `./temp_results/{run_id}/`).

### Inference Stack (Local)
To achieve memory limitations, we mapped logic to utilize hardware-light endpoints:
- **Vision**: `llava-phi3` (Ollama)
- **Text & Agent**: `qwen2.5:1.5b` or `phi3:mini` (Ollama)
- **Audio**: `openai/whisper-tiny` (Hugging Face via direct execution) - `< 200MB` VRAM required.

---

## 3. High-Level Folder Structure

```text
ai-eval/
├── backend/
│   ├── main.py                 # Core FastAPI, Endpoint Configs, SSE Router & Health
│   ├── schemas.py              # Single source of truth for Request & Result formats
│   ├── eval_runner.py          # TASK_REGISTRY orchestrator triggering Adapters
│   ├── engines/                # Isolated Subprocess Adapter Wrappers
│   │   ├── lmms_wrapper.py     # Adapter A: Spawns python -m lmms_eval
│   │   └── inspect_wrapper.py  # Adapter B: Spawns python -m inspect_ai
│   └── temp_results/           # Git ignored parsing ground for subprocesses
└── frontend/
    └── src/
        ├── App.tsx             # Health Checks & Primary Scaffold
        ├── lib/api.ts          # Unified TS Interfaces aligning with Python Schemas
        └── components/
            ├── ConfigPanel.tsx # Implements Capability Matrix locking forms
            ├── Results.tsx     # Renders automated Charts and Agent Trajectories
            └── LogStream.tsx   # SSE Terminal Stream Component
```

---

## 4. The Unified Data Contract

Cross-system communication strictly enforces schemas mapping frontend React state, backend endpoint validation, and Subprocess text scraping.

```python
# backend/schemas.py (Python / Pydantic)
# lib/api.ts (Typescript / Interface)

class EvalResult(BaseModel):
    run_id: str
    model: str
    modality: Literal['text', 'vision', 'audio', 'agent']
    task: str
    engine: Literal['lmms-eval', 'inspect-ai']
    metrics: Dict[str, float]
    trajectory: Optional[List[Dict[str, Any]]] 
```
*Notice `trajectory` - this dynamically arrays the Timeline step history for Agent endpoints mapping user-prompts to tools and results.*

---

## 5. Subprocess Interaction Pipeline

1. **Frontend Request**: User selects a model (`llava-phi3`). The `ConfigPanel` Capability Matrix disables all options except Vision (`pope`). Request hits `/api/evaluate`.
2. **Capability Router (`eval_runner.py`)**: The router queries `TASK_REGISTRY`. It determines `pope` requires `lmms_wrapper` (Text/Vision/Audio Adapter).
3. **Subprocess Isolation (`engines/*`)**: `eval_runner` executes the path explicitly utilizing OS-level commands natively inheriting virtual environments via `sys.executable`. Standard Output (`sys.stdout`) is captured.
4. **Server-Sent Events (SSE)**: While the evaluation completes locally, `eval_runner` pipes the `sys.stdout` lines asynchronously to a generator Queue feeding `http://localhost:8000/api/stream/{run_id}`, projecting terminal data directly to the user's browser.
5. **JSON Scraping**: When completed, the `Wrapper` scans its custom `temp_results` directory (`glob`), strips the raw output, packages the `EvalResult` schema, and emits a flagged termination payload `[EVAL_RESULT] { ... }` up to the runner.
6. **Self Decapitation**: Finally, the Wrapper issues a ruthless `shutil.rmtree` obliterating its temporary folder environment, securing the user's SSD health over multi-hour runs.
