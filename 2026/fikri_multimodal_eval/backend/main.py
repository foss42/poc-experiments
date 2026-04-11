"""Multimodal AI Eval Engine — thin FastAPI orchestrator.

Wraps:
- lm-eval-harness for standard benchmarks
- Multi-provider vision models (Ollama, LM Studio, HuggingFace, OpenAI) + rouge/bleu
- Whisper + jiwer for audio STT evaluation
"""

import json
import uuid
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from config import (
    HOST,
    PORT,
    OLLAMA_BASE_URL,
    LMSTUDIO_BASE_URL,
    SUPPORTED_VLM_PROVIDERS,
    HF_TOKEN,
    OPENAI_API_KEY,
)
from harness_runner import run_harness_eval, list_available_tasks
from multimodal_runner import (
    run_image_eval,
    run_audio_eval,
    run_multi_provider_image_eval,
)

app = FastAPI(title="Multimodal AI Eval Engine", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

results_store: dict[str, dict[str, Any]] = {}


# ─── Request Models ────────────────────────────────────────────────────────


class HarnessRequest(BaseModel):
    model_type: str = "hf"
    model_args: str
    tasks: list[str]
    num_fewshot: int = 0
    limit: int | None = 10
    device: str = "cpu"


class ImageEvalRequest(BaseModel):
    model: str = "llava"
    dataset: str | None = None
    provider: str = "ollama"


class MultiProviderImageRequest(BaseModel):
    providers: list[dict[str, str]]
    dataset: str | None = None


class AudioEvalRequest(BaseModel):
    model: str = "base"
    dataset: str | None = None


# ─── Endpoints ─────────────────────────────────────────────────────────────


@app.get("/api/health")
async def health():
    ollama_ok = False
    try:
        async with httpx.AsyncClient(timeout=5) as c:
            r = await c.get(f"{OLLAMA_BASE_URL}/api/tags")
            ollama_ok = r.status_code == 200
    except Exception:
        pass

    lmstudio_ok = False
    try:
        async with httpx.AsyncClient(timeout=5) as c:
            r = await c.get(f"{LMSTUDIO_BASE_URL.replace('/v1', '')}/models")
            lmstudio_ok = r.status_code == 200
    except Exception:
        pass

    whisper_ok = False
    try:
        import faster_whisper

        whisper_ok = True
    except ImportError:
        pass

    return {
        "status": "ok",
        "providers": {
            "ollama": ollama_ok,
            "lmstudio": lmstudio_ok,
            "huggingface": bool(HF_TOKEN),
            "openai": bool(OPENAI_API_KEY),
        },
        "whisper": whisper_ok,
    }


@app.get("/api/providers")
async def list_providers():
    return {"providers": SUPPORTED_VLM_PROVIDERS}


@app.get("/api/models")
async def list_models():
    ollama_models = []
    try:
        async with httpx.AsyncClient(timeout=5) as c:
            r = await c.get(f"{OLLAMA_BASE_URL}/api/tags")
            ollama_models = [
                {"name": m["name"], "size_mb": round(m.get("size", 0) / 1e6, 1)}
                for m in r.json().get("models", [])
            ]
    except Exception:
        pass

    lmstudio_models = []
    try:
        async with httpx.AsyncClient(timeout=5) as c:
            r = await c.get(f"{LMSTUDIO_BASE_URL}/models")
            if r.status_code == 200:
                lmstudio_models = [
                    {
                        "name": m["id"],
                        "type": "vision"
                        if "vision" in m.get("id", "").lower()
                        else "text",
                    }
                    for m in r.json().get("data", [])
                ]
    except Exception:
        pass

    return {
        "ollama": ollama_models,
        "lmstudio": lmstudio_models,
        "huggingface": SUPPORTED_VLM_PROVIDERS["huggingface"]["models"],
        "openai": SUPPORTED_VLM_PROVIDERS["openai"]["models"],
        "whisper": ["tiny", "base", "small", "medium", "large"],
        "providers": list(SUPPORTED_VLM_PROVIDERS.keys()),
    }


@app.get("/api/tasks")
async def get_tasks():
    return {"harness_tasks": list_available_tasks()}


# ─── lm-eval-harness benchmarks ───────────────────────────────────────────


@app.post("/api/eval/harness")
async def eval_harness(req: HarnessRequest):
    """Run lm-eval-harness benchmark (non-streaming, returns results)."""
    try:
        results = await run_harness_eval(
            model_type=req.model_type,
            model_args=req.model_args,
            tasks=req.tasks,
            num_fewshot=req.num_fewshot,
            limit=req.limit,
            device=req.device,
        )
        eval_id = str(uuid.uuid4())[:8]
        results_store[eval_id] = results
        return {"eval_id": eval_id, **results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Image eval (SSE streaming) ───────────────────────────────────────────


@app.post("/api/eval/image")
async def eval_image(req: ImageEvalRequest):
    """Stream image VQA evaluation results via SSE for a single provider."""
    eval_id = str(uuid.uuid4())[:8]

    async def stream():
        yield f"data: {json.dumps({'type': 'init', 'eval_id': eval_id})}\n\n"
        async for event in run_image_eval(req.model, req.dataset, req.provider):
            if event["type"] == "complete":
                results_store[eval_id] = event
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/api/eval/image/compare")
async def compare_image_providers(req: MultiProviderImageRequest):
    """Compare multiple vision models side-by-side with SSE streaming."""
    if not req.providers:
        raise HTTPException(400, "At least one provider required")

    eval_id = str(uuid.uuid4())[:8]

    async def stream():
        yield f"data: {json.dumps({'type': 'init', 'eval_id': eval_id, 'comparison': True})}\n\n"
        async for event in run_multi_provider_image_eval(req.providers, req.dataset):
            if event["type"] == "complete":
                results_store[eval_id] = event
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ─── Audio eval (SSE streaming) ───────────────────────────────────────────


@app.post("/api/eval/audio")
async def eval_audio(req: AudioEvalRequest):
    """Stream audio STT evaluation results via SSE."""
    eval_id = str(uuid.uuid4())[:8]

    async def stream():
        yield f"data: {json.dumps({'type': 'init', 'eval_id': eval_id})}\n\n"
        async for event in run_audio_eval(req.model, req.dataset):
            if event["type"] == "complete":
                results_store[eval_id] = event
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ─── Results ───────────────────────────────────────────────────────────────


@app.get("/api/results")
async def list_results():
    return {
        eid: r.get("summary", r.get("results", {})) for eid, r in results_store.items()
    }


@app.get("/api/results/{eval_id}")
async def get_result(eval_id: str):
    if eval_id not in results_store:
        raise HTTPException(404, "Not found")
    return results_store[eval_id]


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
