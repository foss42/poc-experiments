# GSoC 2026 PoC — Multimodal AI & Agent API Eval Framework
### Complete Build Plan for `uddalak_multimodal_ai_agent_eval`

> **Repo Target:** `foss42/gsoc-poc` → `2026/uddalak_multimodal_ai_agent_eval/`  
> **Author:** Uddalak Mukhopadhyay  
> **Project:** Multimodal AI and Agent API Eval Framework for API Dash

---

## 0. What This PoC Must Prove

The mentors approved a proposal for an end-to-end eval framework. The PoC must demonstrate **all four pillars** of the proposal — not just one — plus the **MCP Apps integration** now mandated by the updated directions. This means:

| Pillar | Must Show |
|---|---|
| Core Text Eval | Run MMLU-style benchmarks against a live AI API, display accuracy + latency |
| Multimodal Eval | Image (VQA) or Audio (ASR/WER) eval in the same UI |
| Agent Eval | Multi-turn tool-call trace visualization, Trajectory Fidelity Score |
| MCP Apps Integration | Sales Analytics MCP server tested inside the eval UI as an AI agent — as mandated by the updated directions |

The **game-changer addition**: The PoC will show that the eval UI itself can be *rendered as an MCP App inside an agent chatflow* — demonstrating the vision the org is asking candidates to explore: "explore if AI evaluation UI can be built using it to make it easy for end users to run evals from inside AI agents."

---

## 1. Repository & Folder Structure

```
2026/
└── uddalak_multimodal_ai_agent_eval/
    │
    ├── README.md                          ← Primary entry point for reviewers
    ├── DEMO.md                            ← GIF/screenshots + how to run
    │
    ├── frontend/                          ← React + TypeScript (Vite)
    │   ├── src/
    │   │   ├── components/
    │   │   │   ├── EvalConfigPanel/
    │   │   │   │   ├── EvalConfigPanel.tsx
    │   │   │   │   ├── ProviderSelector.tsx
    │   │   │   │   ├── ModelSelector.tsx
    │   │   │   │   └── ModalityToggle.tsx
    │   │   │   ├── DatasetManager/
    │   │   │   │   ├── DatasetManager.tsx
    │   │   │   │   ├── FileUploader.tsx
    │   │   │   │   └── BenchmarkPicker.tsx
    │   │   │   ├── ResultsDashboard/
    │   │   │   │   ├── ResultsDashboard.tsx
    │   │   │   │   ├── MetricsChart.tsx       ← Recharts
    │   │   │   │   ├── ComparisonTable.tsx
    │   │   │   │   └── ExportButton.tsx
    │   │   │   ├── AgentLeaderboard/
    │   │   │   │   ├── AgentLeaderboard.tsx
    │   │   │   │   ├── TrajectoryViewer.tsx   ← Tool-call trace UI
    │   │   │   │   └── LeaderboardRow.tsx
    │   │   │   └── MCPAppsPanel/
    │   │   │       ├── MCPAppsPanel.tsx        ← MCP Apps iframe host
    │   │   │       └── SalesAnalyticsTest.tsx  ← Sales Analytics MCP demo
    │   │   ├── hooks/
    │   │   │   ├── useEvalRunner.ts
    │   │   │   ├── useDataset.ts
    │   │   │   └── useResults.ts
    │   │   ├── services/
    │   │   │   ├── api.ts
    │   │   │   └── evalService.ts
    │   │   ├── types/
    │   │   │   ├── eval.types.ts
    │   │   │   ├── provider.types.ts
    │   │   │   └── dataset.types.ts
    │   │   ├── App.tsx
    │   │   └── main.tsx
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── vite.config.ts
    │
    ├── backend/                           ← Python / FastAPI
    │   ├── app/
    │   │   ├── main.py
    │   │   ├── config.py
    │   │   ├── routers/
    │   │   │   ├── eval.py
    │   │   │   ├── datasets.py
    │   │   │   └── results.py
    │   │   ├── core/
    │   │   │   ├── orchestrator.py
    │   │   │   ├── metrics.py             ← accuracy, WER, BLEU, pass@k, TFS
    │   │   │   └── task_queue.py
    │   │   ├── adapters/
    │   │   │   ├── base.py
    │   │   │   ├── openai_adapter.py
    │   │   │   ├── anthropic_adapter.py
    │   │   │   ├── gemini_adapter.py
    │   │   │   └── huggingface_adapter.py
    │   │   ├── runners/
    │   │   │   ├── text_runner.py
    │   │   │   ├── image_runner.py
    │   │   │   ├── audio_runner.py
    │   │   │   └── agent_runner.py
    │   │   ├── models/
    │   │   │   ├── eval_request.py
    │   │   │   ├── eval_response.py
    │   │   │   └── dataset.py
    │   │   └── utils/
    │   │       ├── dataset_parser.py
    │   │       ├── audio_utils.py
    │   │       └── image_utils.py
    │   ├── tests/
    │   │   ├── test_adapters/
    │   │   ├── test_runners/
    │   │   └── test_core/
    │   ├── requirements.txt
    │   └── Dockerfile
    │
    ├── mcp-server/                        ← MCP Apps Server (TypeScript)
    │   ├── src/
    │   │   ├── index.ts                   ← MCP server entry point
    │   │   ├── tools/
    │   │   │   ├── runEval.ts             ← Triggers backend eval job
    │   │   │   ├── getResults.ts          ← Fetches results for display
    │   │   │   └── renderEvalUI.ts        ← Returns MCP App HTML resource
    │   │   └── apps/
    │   │       ├── eval-dashboard.html    ← MCP App: full eval UI in iframe
    │   │       └── sales-analytics-test.html ← MCP App: Sales Analytics test
    │   ├── package.json
    │   └── tsconfig.json
    │
    ├── datasets/
    │   ├── sample_text.jsonl              ← 20 MMLU-style Q&A items
    │   ├── sample_agent.jsonl             ← 10 tool-use task examples
    │   ├── sample_image.jsonl             ← 5 VQA items (base64 images)
    │   └── README.md
    │
    ├── docs/
    │   ├── architecture.md
    │   ├── user_guide.md
    │   └── adding_a_provider.md
    │
    └── docker-compose.yml
```

---

## 2. Phase-by-Phase Build Plan

### Phase 1 — Backend Foundation (Days 1–3)

**Goal:** A running FastAPI server that can accept an eval job and return results.

#### Step 1.1 — Project Bootstrap

```bash
# In backend/
python -m venv venv && source venv/bin/activate
pip install fastapi uvicorn pydantic python-dotenv celery redis openai anthropic google-generativeai httpx pytest pytest-asyncio
```

**`backend/requirements.txt`**
```
fastapi==0.111.0
uvicorn[standard]==0.29.0
pydantic==2.7.0
python-dotenv==1.0.1
openai==1.30.0
anthropic==0.27.0
google-generativeai==0.7.0
httpx==0.27.0
celery==5.4.0
redis==5.0.4
pytest==8.2.0
pytest-asyncio==0.23.7
numpy==1.26.4
```

#### Step 1.2 — Base Adapter (`backend/app/adapters/base.py`)

```python
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

class AIProviderAdapter(ABC):
    """Abstract interface for standardized AI API interaction.
    
    All adapters must implement this contract. The eval orchestrator
    only talks to this interface — adding a new provider never touches
    the core logic.
    """
    
    @abstractmethod
    async def generate_response(
        self, 
        prompt: str, 
        schema: Optional[Dict] = None,
        images: Optional[List[str]] = None,  # base64-encoded
        tools: Optional[List[Dict]] = None,   # for agent eval
    ) -> Dict[str, Any]:
        """Returns a unified response dict:
        {
          "content": str,
          "tool_calls": list[dict] | None,
          "latency_ms": float,
          "tokens_used": int,
          "cost_usd": float
        }
        """
        pass
    
    @abstractmethod
    def get_provider_name(self) -> str:
        pass
```

#### Step 1.3 — OpenAI Adapter (`backend/app/adapters/openai_adapter.py`)

```python
import time
import asyncio
from typing import Any, Dict, List, Optional
from openai import AsyncOpenAI
from .base import AIProviderAdapter

COST_PER_1K_TOKENS = {
    "gpt-4o": {"input": 0.005, "output": 0.015},
    "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
}

class OpenAIAdapter(AIProviderAdapter):
    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = model

    def get_provider_name(self) -> str:
        return f"openai/{self.model}"

    async def generate_response(
        self,
        prompt: str,
        schema: Optional[Dict] = None,
        images: Optional[List[str]] = None,
        tools: Optional[List[Dict]] = None,
    ) -> Dict[str, Any]:
        start = time.time()
        
        # Build message content
        content = [{"type": "text", "text": prompt}]
        if images:
            for img_b64 in images:
                content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"}
                })
        
        messages = [{"role": "user", "content": content}]
        
        kwargs = {"model": self.model, "messages": messages, "max_tokens": 512}
        if tools:
            kwargs["tools"] = tools
        if schema:
            kwargs["response_format"] = {"type": "json_object"}

        response = await self.client.chat.completions.create(**kwargs)
        latency = (time.time() - start) * 1000
        
        msg = response.choices[0].message
        tool_calls = None
        if msg.tool_calls:
            tool_calls = [
                {
                    "name": tc.function.name,
                    "arguments": tc.function.arguments,
                    "call_id": tc.id
                }
                for tc in msg.tool_calls
            ]
        
        # Cost estimation
        usage = response.usage
        rates = COST_PER_1K_TOKENS.get(self.model, {"input": 0.01, "output": 0.03})
        cost = (usage.prompt_tokens / 1000 * rates["input"]) + \
               (usage.completion_tokens / 1000 * rates["output"])
        
        return {
            "content": msg.content or "",
            "tool_calls": tool_calls,
            "latency_ms": round(latency, 2),
            "tokens_used": usage.total_tokens,
            "cost_usd": round(cost, 6),
        }
```

#### Step 1.4 — Anthropic Adapter (`backend/app/adapters/anthropic_adapter.py`)

```python
import time
from typing import Any, Dict, List, Optional
import anthropic
from .base import AIProviderAdapter

class AnthropicAdapter(AIProviderAdapter):
    def __init__(self, api_key: str, model: str = "claude-3-5-haiku-20241022"):
        self.client = anthropic.AsyncAnthropic(api_key=api_key)
        self.model = model

    def get_provider_name(self) -> str:
        return f"anthropic/{self.model}"

    async def generate_response(
        self,
        prompt: str,
        schema: Optional[Dict] = None,
        images: Optional[List[str]] = None,
        tools: Optional[List[Dict]] = None,
    ) -> Dict[str, Any]:
        start = time.time()

        content = [{"type": "text", "text": prompt}]
        if images:
            for img_b64 in images:
                content.append({
                    "type": "image",
                    "source": {"type": "base64", "media_type": "image/jpeg", "data": img_b64}
                })

        kwargs = {
            "model": self.model,
            "max_tokens": 512,
            "messages": [{"role": "user", "content": content}]
        }
        if tools:
            # Convert OpenAI tool format to Anthropic tool format
            kwargs["tools"] = [
                {
                    "name": t["function"]["name"],
                    "description": t["function"].get("description", ""),
                    "input_schema": t["function"].get("parameters", {})
                }
                for t in tools
            ]

        response = await self.client.messages.create(**kwargs)
        latency = (time.time() - start) * 1000

        text_content = ""
        tool_calls = None
        for block in response.content:
            if block.type == "text":
                text_content = block.text
            elif block.type == "tool_use":
                tool_calls = tool_calls or []
                tool_calls.append({
                    "name": block.name,
                    "arguments": str(block.input),
                    "call_id": block.id
                })

        cost = (response.usage.input_tokens / 1000 * 0.00025) + \
               (response.usage.output_tokens / 1000 * 0.00125)

        return {
            "content": text_content,
            "tool_calls": tool_calls,
            "latency_ms": round(latency, 2),
            "tokens_used": response.usage.input_tokens + response.usage.output_tokens,
            "cost_usd": round(cost, 6),
        }
```

#### Step 1.5 — Metrics Engine (`backend/app/core/metrics.py`)

```python
import numpy as np
from typing import List, Optional

def calculate_accuracy(predictions: List[str], ground_truth: List[str]) -> float:
    """Exact-match accuracy for MCQ benchmarks (MMLU-style)."""
    if not predictions:
        return 0.0
    correct = sum(p.strip().upper() == g.strip().upper() 
                  for p, g in zip(predictions, ground_truth))
    return round(correct / len(predictions), 4)

def calculate_wer(reference: str, hypothesis: str) -> float:
    """Word Error Rate via dynamic programming — for ASR eval."""
    r, h = reference.lower().split(), hypothesis.lower().split()
    if not r:
        return 1.0
    d = np.zeros((len(r) + 1, len(h) + 1), dtype=np.uint16)
    for i in range(len(r) + 1):
        d[i][0] = i
    for j in range(len(h) + 1):
        d[0][j] = j
    for i in range(1, len(r) + 1):
        for j in range(1, len(h) + 1):
            if r[i-1] == h[j-1]:
                d[i][j] = d[i-1][j-1]
            else:
                d[i][j] = 1 + min(d[i-1][j-1], d[i][j-1], d[i-1][j])
    return round(d[len(r)][len(h)] / len(r), 4)

def calculate_trajectory_fidelity_score(
    actual_trace: List[dict], 
    gold_standard: List[str]
) -> float:
    """
    Trajectory Fidelity Score (TFS) — original metric from the proposal.
    Measures how well an agent's actual tool-call sequence matches the expected sequence.
    
    Returns float 0.0–1.0.
    """
    if not gold_standard:
        return 1.0
    correct = sum(
        1 for i, tool_name in enumerate(gold_standard)
        if i < len(actual_trace) 
        and actual_trace[i].get("name") == tool_name
        and actual_trace[i].get("arguments_valid", True)
    )
    return round(correct / len(gold_standard), 4)

def calculate_pass_at_k(results: List[bool], k: int = 1) -> float:
    """pass@k metric for code generation tasks."""
    if not results:
        return 0.0
    n, c = len(results), sum(results)
    if n - c < k:
        return 1.0
    from math import comb
    return round(1 - comb(n - c, k) / comb(n, k), 4)

def summarize_latencies(latencies: List[float]) -> dict:
    arr = np.array(latencies)
    return {
        "mean_ms": round(float(np.mean(arr)), 1),
        "p50_ms": round(float(np.percentile(arr, 50)), 1),
        "p95_ms": round(float(np.percentile(arr, 95)), 1),
        "p99_ms": round(float(np.percentile(arr, 99)), 1),
    }
```

#### Step 1.6 — Eval Orchestrator (`backend/app/core/orchestrator.py`)

```python
import asyncio
from typing import List, Dict, Any
from ..adapters.base import AIProviderAdapter
from .metrics import (
    calculate_accuracy, calculate_wer, 
    calculate_trajectory_fidelity_score, summarize_latencies
)

class EvalOrchestrator:
    """
    Routes eval jobs to the correct runner and aggregates results.
    Concurrent execution across providers via asyncio.gather.
    """
    
    async def run_text_eval(
        self,
        provider: AIProviderAdapter,
        dataset: List[Dict],  # [{prompt, ground_truth_answer}, ...]
    ) -> Dict[str, Any]:
        tasks = [
            provider.generate_response(item["prompt"])
            for item in dataset
        ]
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        predictions, latencies, costs, tokens = [], [], [], []
        for i, resp in enumerate(responses):
            if isinstance(resp, Exception):
                predictions.append("ERROR")
                latencies.append(0)
                costs.append(0)
                tokens.append(0)
            else:
                predictions.append(resp["content"])
                latencies.append(resp["latency_ms"])
                costs.append(resp["cost_usd"])
                tokens.append(resp["tokens_used"])
        
        ground_truth = [item["ground_truth"] for item in dataset]
        
        return {
            "provider": provider.get_provider_name(),
            "modality": "text",
            "num_samples": len(dataset),
            "accuracy": calculate_accuracy(predictions, ground_truth),
            "latency": summarize_latencies(latencies),
            "total_cost_usd": round(sum(costs), 4),
            "total_tokens": sum(tokens),
            "per_sample_results": [
                {
                    "prompt": dataset[i]["prompt"],
                    "prediction": predictions[i],
                    "ground_truth": ground_truth[i],
                    "correct": predictions[i].strip().upper() == ground_truth[i].strip().upper(),
                    "latency_ms": latencies[i],
                }
                for i in range(len(dataset))
            ]
        }
    
    async def run_agent_eval(
        self,
        provider: AIProviderAdapter,
        tasks: List[Dict],  # [{prompt, expected_tool_sequence, tools_spec}, ...]
    ) -> Dict[str, Any]:
        all_results = []
        
        for task in tasks:
            response = await provider.generate_response(
                prompt=task["prompt"],
                tools=task.get("tools_spec", [])
            )
            
            actual_trace = [
                {
                    "name": tc["name"],
                    "arguments_valid": True,  # schema validation would go here
                    "arguments": tc["arguments"]
                }
                for tc in (response.get("tool_calls") or [])
            ]
            
            tfs = calculate_trajectory_fidelity_score(
                actual_trace=actual_trace,
                gold_standard=task.get("expected_tool_sequence", [])
            )
            
            all_results.append({
                "task": task["prompt"][:80],
                "trajectory_fidelity_score": tfs,
                "actual_trace": actual_trace,
                "expected_sequence": task.get("expected_tool_sequence", []),
                "latency_ms": response["latency_ms"],
                "passed": tfs >= 0.8
            })
        
        avg_tfs = round(sum(r["trajectory_fidelity_score"] for r in all_results) / max(len(all_results), 1), 4)
        
        return {
            "provider": provider.get_provider_name(),
            "modality": "agent",
            "num_tasks": len(tasks),
            "mean_trajectory_fidelity_score": avg_tfs,
            "task_completion_rate": round(sum(r["passed"] for r in all_results) / max(len(all_results), 1), 4),
            "per_task_results": all_results
        }
    
    async def run_providers_concurrently(
        self,
        providers: List[AIProviderAdapter],
        dataset: List[Dict],
        modality: str = "text"
    ) -> List[Dict]:
        runner = self.run_text_eval if modality == "text" else self.run_agent_eval
        tasks = [runner(p, dataset) for p in providers]
        return await asyncio.gather(*tasks, return_exceptions=True)
```

#### Step 1.7 — FastAPI Routers

**`backend/app/routers/eval.py`**
```python
import asyncio
from fastapi import APIRouter, BackgroundTasks, HTTPException
from ..models.eval_request import EvalRequest
from ..models.eval_response import EvalResponse
from ..core.orchestrator import EvalOrchestrator
from ..adapters.openai_adapter import OpenAIAdapter
from ..adapters.anthropic_adapter import AnthropicAdapter
from ..config import settings

router = APIRouter(prefix="/eval", tags=["eval"])
orchestrator = EvalOrchestrator()

# In-memory job store for PoC (Redis/Celery for production)
_jobs: dict = {}

@router.post("/run")
async def run_eval(request: EvalRequest, background_tasks: BackgroundTasks):
    import uuid
    job_id = str(uuid.uuid4())[:8]
    _jobs[job_id] = {"status": "running", "result": None}
    
    background_tasks.add_task(_execute_eval, job_id, request)
    return {"job_id": job_id, "status": "running"}

@router.get("/status/{job_id}")
async def get_status(job_id: str):
    if job_id not in _jobs:
        raise HTTPException(404, "Job not found")
    return _jobs[job_id]

async def _execute_eval(job_id: str, request: EvalRequest):
    try:
        providers = _build_providers(request)
        
        if request.modality == "text":
            results = await orchestrator.run_providers_concurrently(
                providers, request.dataset, "text"
            )
        elif request.modality == "agent":
            results = await orchestrator.run_providers_concurrently(
                providers, request.dataset, "agent"
            )
        else:
            results = []
        
        _jobs[job_id] = {"status": "complete", "result": results}
    except Exception as e:
        _jobs[job_id] = {"status": "error", "error": str(e)}

def _build_providers(request: EvalRequest):
    providers = []
    for p in request.providers:
        if p.name == "openai":
            providers.append(OpenAIAdapter(
                api_key=p.api_key or settings.OPENAI_API_KEY,
                model=p.model
            ))
        elif p.name == "anthropic":
            providers.append(AnthropicAdapter(
                api_key=p.api_key or settings.ANTHROPIC_API_KEY,
                model=p.model
            ))
    return providers
```

**`backend/app/main.py`**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import eval, datasets, results

app = FastAPI(title="Multimodal AI Eval Framework", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(eval.router)
app.include_router(datasets.router)
app.include_router(results.router)

@app.get("/health")
def health():
    return {"status": "ok", "version": "0.1.0"}
```

---

### Phase 2 — Frontend (Days 4–7)

**Goal:** A working React dashboard with all four panels.

#### Step 2.1 — Bootstrap

```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install axios recharts @radix-ui/react-tabs @radix-ui/react-select lucide-react
```

#### Step 2.2 — Core Types (`frontend/src/types/eval.types.ts`)

```typescript
export type Modality = "text" | "image" | "audio" | "agent";

export interface ProviderConfig {
  name: "openai" | "anthropic" | "gemini" | "huggingface";
  model: string;
  api_key?: string;
}

export interface EvalRequest {
  providers: ProviderConfig[];
  modality: Modality;
  dataset: DatasetItem[];
}

export interface DatasetItem {
  prompt: string;
  ground_truth?: string;
  images?: string[];           // base64
  expected_tool_sequence?: string[];  // for agent eval
  tools_spec?: ToolSpec[];
}

export interface ToolSpec {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface EvalResult {
  provider: string;
  modality: Modality;
  accuracy?: number;
  mean_trajectory_fidelity_score?: number;
  task_completion_rate?: number;
  latency: { mean_ms: number; p50_ms: number; p95_ms: number };
  total_cost_usd: number;
  total_tokens: number;
  per_sample_results?: SampleResult[];
  per_task_results?: TaskResult[];
}

export interface SampleResult {
  prompt: string;
  prediction: string;
  ground_truth: string;
  correct: boolean;
  latency_ms: number;
}

export interface TaskResult {
  task: string;
  trajectory_fidelity_score: number;
  actual_trace: ToolCallTrace[];
  expected_sequence: string[];
  latency_ms: number;
  passed: boolean;
}

export interface ToolCallTrace {
  name: string;
  arguments: string;
  arguments_valid: boolean;
}
```

#### Step 2.3 — EvalConfigPanel (`frontend/src/components/EvalConfigPanel/EvalConfigPanel.tsx`)

```typescript
import { useState } from "react";
import { ProviderConfig, Modality } from "../../types/eval.types";

const PROVIDERS = [
  { id: "openai", models: ["gpt-4o-mini", "gpt-4o"] },
  { id: "anthropic", models: ["claude-3-5-haiku-20241022", "claude-3-5-sonnet-20241022"] },
];

interface Props {
  onSubmit: (providers: ProviderConfig[], modality: Modality) => void;
  loading: boolean;
}

export default function EvalConfigPanel({ onSubmit, loading }: Props) {
  const [selectedProviders, setSelectedProviders] = useState<ProviderConfig[]>([
    { name: "openai", model: "gpt-4o-mini" }
  ]);
  const [modality, setModality] = useState<Modality>("text");
  
  const addProvider = () => {
    setSelectedProviders(prev => [...prev, { name: "anthropic", model: "claude-3-5-haiku-20241022" }]);
  };

  return (
    <div className="config-panel">
      <h2>Eval Configuration</h2>
      
      {/* Modality Toggle */}
      <div className="modality-toggle">
        {(["text", "image", "audio", "agent"] as Modality[]).map(m => (
          <button
            key={m}
            className={modality === m ? "active" : ""}
            onClick={() => setModality(m)}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>
      
      {/* Provider Cards */}
      <div className="providers">
        {selectedProviders.map((p, i) => (
          <div key={i} className="provider-card">
            <select
              value={p.name}
              onChange={e => {
                const updated = [...selectedProviders];
                updated[i] = { ...p, name: e.target.value as ProviderConfig["name"] };
                setSelectedProviders(updated);
              }}
            >
              {PROVIDERS.map(pv => <option key={pv.id} value={pv.id}>{pv.id}</option>)}
            </select>
            <select
              value={p.model}
              onChange={e => {
                const updated = [...selectedProviders];
                updated[i] = { ...p, model: e.target.value };
                setSelectedProviders(updated);
              }}
            >
              {(PROVIDERS.find(pv => pv.id === p.name)?.models || []).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <input
              type="password"
              placeholder="API Key (optional)"
              onChange={e => {
                const updated = [...selectedProviders];
                updated[i] = { ...p, api_key: e.target.value };
                setSelectedProviders(updated);
              }}
            />
          </div>
        ))}
        <button onClick={addProvider}>+ Add Provider</button>
      </div>
      
      <button
        className="run-btn"
        onClick={() => onSubmit(selectedProviders, modality)}
        disabled={loading}
      >
        {loading ? "Running Eval..." : "▶ Run Eval"}
      </button>
    </div>
  );
}
```

#### Step 2.4 — TrajectoryViewer (`frontend/src/components/AgentLeaderboard/TrajectoryViewer.tsx`)

This is the **signature UI component** — a visual diff of actual vs expected tool-call sequences.

```typescript
import { TaskResult, ToolCallTrace } from "../../types/eval.types";

interface Props {
  result: TaskResult;
}

export default function TrajectoryViewer({ result }: Props) {
  const maxLen = Math.max(result.expected_sequence.length, result.actual_trace.length);

  return (
    <div className="trajectory-viewer">
      <div className="tfs-score">
        TFS: <strong>{(result.trajectory_fidelity_score * 100).toFixed(0)}%</strong>
        <span className={result.passed ? "pass" : "fail"}>
          {result.passed ? "PASS" : "FAIL"}
        </span>
      </div>

      <div className="trace-grid">
        <div className="trace-column">
          <h4>Expected Sequence</h4>
          {result.expected_sequence.map((tool, i) => (
            <div key={i} className="trace-step expected">
              <span className="step-num">{i + 1}</span>
              <span className="tool-name">{tool}</span>
            </div>
          ))}
        </div>

        <div className="trace-column">
          <h4>Actual Trace</h4>
          {result.actual_trace.map((trace, i) => {
            const isMatch = result.expected_sequence[i] === trace.name;
            return (
              <div key={i} className={`trace-step actual ${isMatch ? "match" : "mismatch"}`}>
                <span className="step-num">{i + 1}</span>
                <span className="tool-name">{trace.name}</span>
                <span className="match-icon">{isMatch ? "✓" : "✗"}</span>
              </div>
            );
          })}
          {/* Pad if actual is shorter */}
          {Array.from({ length: maxLen - result.actual_trace.length }).map((_, i) => (
            <div key={`pad-${i}`} className="trace-step missing">
              <span className="step-num">{result.actual_trace.length + i + 1}</span>
              <span className="tool-name">—</span>
            </div>
          ))}
        </div>
      </div>

      {/* Argument preview */}
      {result.actual_trace.length > 0 && (
        <details className="args-preview">
          <summary>View Tool Arguments</summary>
          <pre>{JSON.stringify(
            result.actual_trace.map(t => ({ [t.name]: JSON.parse(t.arguments || "{}") })),
            null, 2
          )}</pre>
        </details>
      )}
    </div>
  );
}
```

#### Step 2.5 — ResultsDashboard with Recharts

```typescript
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { EvalResult } from "../../types/eval.types";

interface Props {
  results: EvalResult[];
}

export default function ResultsDashboard({ results }: Props) {
  const chartData = results.map(r => ({
    name: r.provider.split("/")[1] || r.provider,
    accuracy: r.accuracy ? r.accuracy * 100 : undefined,
    tfs: r.mean_trajectory_fidelity_score ? r.mean_trajectory_fidelity_score * 100 : undefined,
    latency_p50: r.latency.p50_ms,
    cost_cents: r.total_cost_usd * 100,
  }));

  return (
    <div className="results-dashboard">
      {/* Summary Cards */}
      <div className="metric-cards">
        {results.map(r => (
          <div key={r.provider} className="metric-card">
            <div className="provider-label">{r.provider}</div>
            <div className="metric-value">
              {r.accuracy !== undefined
                ? `${(r.accuracy * 100).toFixed(1)}%`
                : `TFS: ${((r.mean_trajectory_fidelity_score || 0) * 100).toFixed(1)}%`
              }
            </div>
            <div className="metric-sub">
              {r.latency.p50_ms.toFixed(0)}ms p50 · ${r.total_cost_usd.toFixed(4)}
            </div>
          </div>
        ))}
      </div>

      {/* Accuracy / TFS Comparison */}
      <div className="chart-section">
        <h3>Performance by Provider</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
            <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
            <Legend />
            <Bar dataKey="accuracy" name="Accuracy %" fill="#4F46E5" />
            <Bar dataKey="tfs" name="Trajectory Fidelity %" fill="#10B981" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Latency Chart */}
      <div className="chart-section">
        <h3>Latency (p50 ms)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(v: number) => `${v.toFixed(0)}ms`} />
            <Bar dataKey="latency_p50" name="p50 Latency" fill="#F59E0B" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Export */}
      <button
        className="export-btn"
        onClick={() => {
          const blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `eval_results_${Date.now()}.json`;
          a.click();
        }}
      >
        Export JSON
      </button>
    </div>
  );
}
```

---

### Phase 3 — MCP Apps Integration (Days 8–10)

This is the **game-changer section** that directly addresses the updated PoC directions and sets this submission apart.

#### Step 3.1 — Understand the Architecture

From studying `ashitaprasad/sample-mcp-apps-chatflow`, MCP Apps work by:
1. An MCP server exposes **tool calls** that an AI agent can invoke
2. When triggered, those tool calls return **HTML resources** (the MCP App) that render inside an iframe in the agent's chat window
3. The iframe communicates with the host agent via a `postMessage` protocol

The proposal directive says: *"explore if AI evaluation UI can be built using it to make it easy for end users to run evals from inside AI agents."*

**The PoC demonstrates this end-to-end.** 

#### Step 3.2 — MCP Server Setup (`mcp-server/src/index.ts`)

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";

const server = new Server(
  { name: "eval-framework-mcp", version: "0.1.0" },
  { capabilities: { tools: {}, resources: {} } }
);

// ─── Tool Definitions ──────────────────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "open_eval_dashboard",
      description: "Opens the AI Eval Framework dashboard inside the chat window as an MCP App. Users can configure providers, upload datasets, and run evaluations without leaving the agent.",
      inputSchema: {
        type: "object",
        properties: {
          preset_modality: {
            type: "string",
            enum: ["text", "image", "audio", "agent"],
            description: "Pre-select the eval modality to open"
          }
        }
      }
    },
    {
      name: "test_sales_analytics_mcp",
      description: "Demonstrates MCP testing by loading the Sales Analytics MCP App server from ashitaprasad/sample-mcp-apps-chatflow and running evaluation on its tool responses.",
      inputSchema: {
        type: "object",
        properties: {
          region: { type: "string", description: "Sales region to test" },
          metric: { type: "string", enum: ["revenue", "conversion_rate", "units_sold"] }
        },
        required: ["region", "metric"]
      }
    },
    {
      name: "run_quick_eval",
      description: "Runs a quick text eval job and returns results inline in the agent chat.",
      inputSchema: {
        type: "object",
        properties: {
          provider: { type: "string", enum: ["openai", "anthropic"] },
          model: { type: "string" },
          benchmark: { type: "string", enum: ["mmlu_sample", "truthfulqa_sample"] }
        },
        required: ["provider", "benchmark"]
      }
    }
  ]
}));

// ─── Tool Handlers ─────────────────────────────────────────────────────────
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "open_eval_dashboard") {
    const htmlPath = path.join(__dirname, "apps", "eval-dashboard.html");
    const html = fs.readFileSync(htmlPath, "utf-8")
      .replace("__PRESET_MODALITY__", (args as any).preset_modality || "text");

    return {
      content: [
        {
          type: "text",
          text: "Opening the AI Eval Dashboard inside the chat. You can configure providers, upload your dataset, and run evaluations directly here."
        },
        {
          // MCP Apps resource — renders as an iframe in the host chat
          type: "resource",
          resource: {
            uri: "mcp-app://eval-dashboard",
            mimeType: "text/html",
            text: html
          }
        }
      ]
    };
  }

  if (name === "test_sales_analytics_mcp") {
    // This demonstrates the MCP testing capability from the proposal
    const { region, metric } = args as any;
    const htmlPath = path.join(__dirname, "apps", "sales-analytics-test.html");
    const html = fs.readFileSync(htmlPath, "utf-8")
      .replace("__REGION__", region)
      .replace("__METRIC__", metric);

    return {
      content: [
        {
          type: "text",
          text: `Testing Sales Analytics MCP App server for region="${region}", metric="${metric}". The eval UI below shows tool response quality scoring.`
        },
        {
          type: "resource",
          resource: {
            uri: "mcp-app://sales-analytics-test",
            mimeType: "text/html",
            text: html
          }
        }
      ]
    };
  }

  if (name === "run_quick_eval") {
    // Calls the FastAPI backend and returns results as structured text
    try {
      const response = await fetch("http://localhost:8000/eval/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providers: [{ name: (args as any).provider, model: (args as any).model || "gpt-4o-mini" }],
          modality: "text",
          dataset: getSampleDataset((args as any).benchmark)
        })
      });
      const { job_id } = await response.json();
      return {
        content: [{ type: "text", text: `Eval job started (ID: ${job_id}). Poll /eval/status/${job_id} for results.` }]
      };
    } catch (e) {
      return { content: [{ type: "text", text: `Error starting eval: ${e}` }] };
    }
  }

  return { content: [{ type: "text", text: `Unknown tool: ${name}` }] };
});

function getSampleDataset(benchmark: string) {
  // Returns inline sample dataset for quick eval
  if (benchmark === "mmlu_sample") {
    return [
      { prompt: "What is the capital of France? A) Berlin B) Paris C) Rome D) Madrid. Answer with only the letter.", ground_truth: "B" },
      { prompt: "What is 2+2? A) 3 B) 4 C) 5 D) 6. Answer with only the letter.", ground_truth: "B" },
      { prompt: "Which planet is closest to the Sun? A) Earth B) Mars C) Mercury D) Venus. Answer with only the letter.", ground_truth: "C" },
    ];
  }
  return [];
}

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Eval Framework MCP Server running on stdio");
```

#### Step 3.3 — MCP App: Eval Dashboard (`mcp-server/src/apps/eval-dashboard.html`)

The full eval UI rendered inside the agent's chat window. This is the **vision** — running evals from inside AI agents.

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>AI Eval Dashboard</title>
  <script>
    // MCP Apps handshake protocol (from ashitaprasad/sample-mcp-apps-chatflow)
    window.addEventListener("message", (event) => {
      if (event.data?.type === "mcp-apps-handshake") {
        window.mcpAppsHost = event.source;
        window.mcpAppsOrigin = event.origin;
        // Apply host theme
        if (event.data.theme) {
          document.documentElement.setAttribute("data-theme", event.data.theme);
        }
        // Send ready signal
        event.source.postMessage({ type: "mcp-apps-ready" }, event.origin);
      }
    });

    function sendToHost(toolName, args) {
      if (window.mcpAppsHost) {
        window.mcpAppsHost.postMessage({
          type: "mcp-tool-call",
          tool: toolName,
          arguments: args
        }, window.mcpAppsOrigin);
      }
    }
  </script>
  <style>
    /* Theme-aware styles */
    :root { --bg: #fff; --fg: #111; --accent: #4F46E5; --border: #e5e7eb; }
    [data-theme="dark"] { --bg: #1a1a2e; --fg: #e2e8f0; --accent: #818cf8; --border: #334155; }
    body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--fg); margin: 0; padding: 16px; font-size: 14px; }
    .panel { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    h2 { font-size: 16px; margin: 0 0 12px; }
    select, input { width: 100%; padding: 6px 8px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--fg); margin-bottom: 8px; box-sizing: border-box; }
    button { background: var(--accent); color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; width: 100%; font-size: 14px; }
    .metric { display: inline-block; background: #f0f9ff; color: #0369a1; padding: 4px 10px; border-radius: 4px; font-weight: 600; margin: 4px; }
    .status { font-size: 12px; color: #6b7280; padding: 8px; }
    #results { display: none; }
  </style>
</head>
<body>

<div class="panel">
  <h2>🧪 AI Eval Framework</h2>
  <label>Provider</label>
  <select id="provider">
    <option value="openai">OpenAI</option>
    <option value="anthropic">Anthropic</option>
  </select>
  <label>Model</label>
  <select id="model">
    <option value="gpt-4o-mini">gpt-4o-mini</option>
    <option value="gpt-4o">gpt-4o</option>
  </select>
  <label>Modality</label>
  <select id="modality" onchange="updateModality()">
    <option value="text">Text (MMLU benchmark)</option>
    <option value="agent">Agent (Tool-use tasks)</option>
  </select>
  <div id="preset" style="color: var(--accent); font-size: 12px; margin-bottom: 8px;">
    Using built-in sample dataset (3 Q&A items)
  </div>
  <button onclick="runEval()">▶ Run Eval</button>
</div>

<div id="status-panel" class="panel" style="display:none">
  <div class="status" id="status-text">Starting eval...</div>
  <div id="progress-bar" style="height:4px; background:#e5e7eb; border-radius:2px; margin-top:8px;">
    <div id="progress-fill" style="height:100%; background:var(--accent); border-radius:2px; width:0%; transition:width 0.3s;"></div>
  </div>
</div>

<div id="results" class="panel">
  <h2>Results</h2>
  <div id="results-content"></div>
</div>

<script>
  const PRESET_MODALITY = "__PRESET_MODALITY__";
  if (PRESET_MODALITY && PRESET_MODALITY !== "__PRESET_MODALITY__") {
    document.getElementById("modality").value = PRESET_MODALITY;
  }

  const SAMPLE_DATASETS = {
    text: [
      { prompt: "Capital of France? A) Berlin B) Paris C) Rome D) Madrid. Answer with letter only.", ground_truth: "B" },
      { prompt: "What is 8 × 7? A) 54 B) 56 C) 48 D) 63. Answer with letter only.", ground_truth: "B" },
      { prompt: "H2O is? A) Carbon Dioxide B) Water C) Oxygen D) Hydrogen. Answer with letter only.", ground_truth: "B" },
    ],
    agent: [
      {
        prompt: "Get the weather for London and then search for 'London events today'.",
        expected_tool_sequence: ["get_weather", "web_search"],
        tools_spec: [
          { type: "function", function: { name: "get_weather", description: "Get weather", parameters: { type: "object", properties: { city: { type: "string" } }, required: ["city"] } } },
          { type: "function", function: { name: "web_search", description: "Search the web", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } }
        ]
      }
    ]
  };

  function updateModality() {
    const m = document.getElementById("modality").value;
    const modelSel = document.getElementById("model");
    document.getElementById("preset").textContent = `Using built-in ${m} sample dataset`;
  }

  async function runEval() {
    const provider = document.getElementById("provider").value;
    const model = document.getElementById("model").value;
    const modality = document.getElementById("modality").value;

    document.getElementById("status-panel").style.display = "block";
    document.getElementById("results").style.display = "none";
    document.getElementById("status-text").textContent = "Connecting to eval backend...";
    document.getElementById("progress-fill").style.width = "20%";

    try {
      const res = await fetch("http://localhost:8000/eval/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providers: [{ name: provider, model }],
          modality,
          dataset: SAMPLE_DATASETS[modality]
        })
      });
      const { job_id } = await res.json();
      
      document.getElementById("status-text").textContent = `Job ${job_id} running...`;
      document.getElementById("progress-fill").style.width = "50%";
      
      // Poll for results
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        const statusRes = await fetch(`http://localhost:8000/eval/status/${job_id}`);
        const data = await statusRes.json();
        
        if (data.status === "complete") {
          clearInterval(poll);
          document.getElementById("progress-fill").style.width = "100%";
          showResults(data.result, modality);
        } else if (data.status === "error" || attempts > 30) {
          clearInterval(poll);
          document.getElementById("status-text").textContent = `Error: ${data.error || "Timeout"}`;
        }
      }, 1000);

    } catch (e) {
      document.getElementById("status-text").textContent = `Backend not reachable. Showing mock results.`;
      document.getElementById("progress-fill").style.width = "100%";
      showMockResults(modality);
    }
  }

  function showResults(results, modality) {
    document.getElementById("status-panel").style.display = "none";
    document.getElementById("results").style.display = "block";
    const r = Array.isArray(results) ? results[0] : results;
    
    let html = `<div class="metric">${r.provider}</div>`;
    if (modality === "text") {
      html += `<div class="metric">Accuracy: ${(r.accuracy * 100).toFixed(1)}%</div>`;
    } else {
      html += `<div class="metric">TFS: ${(r.mean_trajectory_fidelity_score * 100).toFixed(1)}%</div>`;
    }
    html += `<div class="metric">p50: ${r.latency.p50_ms.toFixed(0)}ms</div>`;
    html += `<div class="metric">Cost: $${r.total_cost_usd.toFixed(5)}</div>`;
    
    document.getElementById("results-content").innerHTML = html;
    
    // Notify host agent of completion
    sendToHost("eval_complete", {
      provider: r.provider,
      accuracy: r.accuracy,
      latency_p50: r.latency.p50_ms,
      cost_usd: r.total_cost_usd
    });
  }

  function showMockResults(modality) {
    document.getElementById("status-panel").style.display = "none";
    document.getElementById("results").style.display = "block";
    document.getElementById("results-content").innerHTML = `
      <div style="color: #6b7280; font-size: 12px; margin-bottom: 8px;">Mock results (backend offline)</div>
      <div class="metric">openai/gpt-4o-mini</div>
      <div class="metric">Accuracy: 66.7%</div>
      <div class="metric">p50: 824ms</div>
      <div class="metric">Cost: $0.000045</div>
    `;
  }
</script>
</body>
</html>
```

#### Step 3.4 — Sales Analytics MCP Test App

This is the direct fulfillment of the mandate: *"demonstrate the testing of the Sales Analytics MCP Apps server."*

The `sales-analytics-test.html` MCP App will:
1. Load the Sales Analytics MCP server's UI (from `ashitaprasad/sample-mcp-apps-chatflow`)
2. Execute a region+metric query against it
3. **Score the response** using the eval framework's quality metrics (response format validation, data completeness, chart render time)
4. Show a mini eval report inline in the agent chat

This turns the eval framework itself into a **testing tool for other MCP servers** — exactly the vision the mentors are asking candidates to explore.

---

### Phase 4 — Sample Datasets (Day 10)

#### `datasets/sample_text.jsonl`
```jsonl
{"prompt": "What is the capital of France? Answer: A) Berlin B) Paris C) Rome D) Madrid. Reply with the letter only.", "ground_truth": "B", "source": "geography"}
{"prompt": "Which element has atomic number 1? A) Helium B) Carbon C) Hydrogen D) Oxygen. Reply with the letter only.", "ground_truth": "C", "source": "chemistry"}
{"prompt": "Who wrote 'To Kill a Mockingbird'? A) Hemingway B) Fitzgerald C) Steinbeck D) Lee. Reply with the letter only.", "ground_truth": "D", "source": "literature"}
{"prompt": "What is the square root of 144? A) 10 B) 11 C) 12 D) 13. Reply with the letter only.", "ground_truth": "C", "source": "math"}
{"prompt": "In what year did World War II end? A) 1943 B) 1944 C) 1945 D) 1946. Reply with the letter only.", "ground_truth": "C", "source": "history"}
```

#### `datasets/sample_agent.jsonl`
```jsonl
{"prompt": "Check the weather in Paris and then search for 'best restaurants Paris 2025'.", "expected_tool_sequence": ["get_weather", "web_search"], "tools_spec": [{"type": "function", "function": {"name": "get_weather", "description": "Get current weather", "parameters": {"type": "object", "properties": {"city": {"type": "string"}}, "required": ["city"]}}}, {"type": "function", "function": {"name": "web_search", "description": "Search the web", "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}}}]}
{"prompt": "Look up product SKU-12345 in our database and then send an email to the procurement team with the details.", "expected_tool_sequence": ["get_product", "send_email"], "tools_spec": [{"type": "function", "function": {"name": "get_product", "description": "Look up product by SKU", "parameters": {"type": "object", "properties": {"sku": {"type": "string"}}, "required": ["sku"]}}}, {"type": "function", "function": {"name": "send_email", "description": "Send an email", "parameters": {"type": "object", "properties": {"to": {"type": "string"}, "subject": {"type": "string"}, "body": {"type": "string"}}, "required": ["to", "subject", "body"]}}}]}
```

---

### Phase 5 — Tests (Days 10–11)

#### `backend/tests/test_core/test_metrics.py`
```python
import pytest
from app.core.metrics import (
    calculate_accuracy, calculate_wer, 
    calculate_trajectory_fidelity_score, calculate_pass_at_k
)

def test_accuracy_perfect():
    assert calculate_accuracy(["A", "B", "C"], ["A", "B", "C"]) == 1.0

def test_accuracy_partial():
    result = calculate_accuracy(["A", "B", "C"], ["A", "X", "C"])
    assert result == pytest.approx(0.6667, rel=1e-3)

def test_accuracy_empty():
    assert calculate_accuracy([], []) == 0.0

def test_wer_perfect():
    assert calculate_wer("hello world", "hello world") == 0.0

def test_wer_one_substitution():
    wer = calculate_wer("hello world today", "hello earth today")
    assert wer == pytest.approx(0.3333, rel=1e-3)

def test_trajectory_fidelity_perfect():
    trace = [
        {"name": "get_weather", "arguments_valid": True},
        {"name": "web_search", "arguments_valid": True}
    ]
    gold = ["get_weather", "web_search"]
    assert calculate_trajectory_fidelity_score(trace, gold) == 1.0

def test_trajectory_fidelity_partial():
    trace = [
        {"name": "get_weather", "arguments_valid": True},
        {"name": "wrong_tool", "arguments_valid": True}
    ]
    gold = ["get_weather", "web_search"]
    assert calculate_trajectory_fidelity_score(trace, gold) == 0.5

def test_trajectory_fidelity_empty_gold():
    assert calculate_trajectory_fidelity_score([], []) == 1.0

def test_pass_at_k():
    assert calculate_pass_at_k([True, True, False, True], k=1) == 1.0
    assert calculate_pass_at_k([False, False, False], k=1) == 0.0
```

#### `backend/tests/test_adapters/test_openai_adapter.py`
```python
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.adapters.openai_adapter import OpenAIAdapter

@pytest.fixture
def adapter():
    return OpenAIAdapter(api_key="test-key", model="gpt-4o-mini")

@pytest.mark.asyncio
async def test_basic_response(adapter):
    mock_response = MagicMock()
    mock_response.choices[0].message.content = "B"
    mock_response.choices[0].message.tool_calls = None
    mock_response.usage.prompt_tokens = 50
    mock_response.usage.completion_tokens = 1
    mock_response.usage.total_tokens = 51
    
    with patch.object(adapter.client.chat.completions, "create", AsyncMock(return_value=mock_response)):
        result = await adapter.generate_response("What is 2+2? A) 3 B) 4. Answer with letter.")
    
    assert result["content"] == "B"
    assert result["tokens_used"] == 51
    assert isinstance(result["latency_ms"], float)

@pytest.mark.asyncio
async def test_tool_call_response(adapter):
    mock_tool = MagicMock()
    mock_tool.function.name = "get_weather"
    mock_tool.function.arguments = '{"city": "London"}'
    mock_tool.id = "call_123"
    
    mock_response = MagicMock()
    mock_response.choices[0].message.content = None
    mock_response.choices[0].message.tool_calls = [mock_tool]
    mock_response.usage.prompt_tokens = 80
    mock_response.usage.completion_tokens = 20
    mock_response.usage.total_tokens = 100
    
    tools = [{"type": "function", "function": {"name": "get_weather", "description": "Get weather", "parameters": {}}}]
    
    with patch.object(adapter.client.chat.completions, "create", AsyncMock(return_value=mock_response)):
        result = await adapter.generate_response("What is the weather in London?", tools=tools)
    
    assert result["tool_calls"] is not None
    assert result["tool_calls"][0]["name"] == "get_weather"
```

---

### Phase 6 — Docker & README (Day 11)

#### `docker-compose.yml`
```yaml
version: "3.9"
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    volumes:
      - ./datasets:/app/datasets
  
  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend
    environment:
      - VITE_API_URL=http://localhost:8000
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

---

## 3. The Game-Changer: MCP Apps Eval Loop

This is the **unique insight** this PoC contributes — shown nowhere else among GSoC candidates:

```
Traditional eval flow:       MCP Apps eval flow (this PoC):
─────────────────────        ──────────────────────────────────
Dev writes eval script  →    Agent chat → "test this API"
Runs locally             →   MCP server: open_eval_dashboard tool
Checks terminal output   →   Eval UI renders inside agent iframe
Manually interprets      →   Results posted back to agent context
                         →   Agent explains results in natural language
```

The PoC demonstrates that:
1. An eval framework can be triggered from *within* an AI agent conversation
2. The eval UI renders as an interactive MCP App, no terminal required
3. The Sales Analytics MCP server from `ashitaprasad/sample-mcp-apps-chatflow` can be *evaluated* (not just used) via this framework — testing its tool response correctness, latency, and data schema validity

---

## 4. PR Checklist

Before submitting the PR to `foss42/gsoc-poc`:

- [ ] Folder: `2026/uddalak_multimodal_ai_agent_eval/`
- [ ] `README.md` with architecture diagram, setup instructions, and screenshots
- [ ] Backend running with `uvicorn app.main:app --reload`
- [ ] Frontend running with `npm run dev`
- [ ] MCP server packaged with `npm run build`
- [ ] All pytest tests passing: `pytest tests/ -v`
- [ ] Sample datasets in `datasets/` folder
- [ ] `docker-compose.yml` tested end-to-end
- [ ] `DEMO.md` with GIF or screenshots of all four eval modalities
- [ ] MCP Apps demo screenshot showing eval UI rendered inside agent chat

---

## 5. What Makes This Stand Out

| What Others Will Submit | What This PoC Adds |
|---|---|
| A text eval UI with one provider | All four modalities in one framework |
| Static results table | Recharts visualizations with export |
| Basic agent eval | Trajectory Fidelity Score — original metric |
| Ignoring MCP directions | MCP server that renders the eval UI *inside* agent chat |
| Testing Sales Analytics separately | Sales Analytics MCP server is *evaluated by* the framework |
| No tests | Comprehensive pytest suite with mocks |

The **Trajectory Fidelity Score** is an original contribution from the proposal that no other candidate will have. The **eval-as-MCP-App** pattern directly addresses what the mentors are exploring: making evals accessible from inside AI agents. Both together make this PoC unmissable.
