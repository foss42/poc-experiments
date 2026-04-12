"""Multimodal AI Eval Engine — thin FastAPI orchestrator.

Wraps:
- lm-eval-harness  → image VLM benchmarks (MMMU, ScienceQA, TextVQA, ChartQA, GQA)
- lmms-eval        → audio ASR benchmarks (LibriSpeech, CommonVoice, FLEURS, VoiceBench)
- inspect-ai       → agent / tool-use benchmarks (basic_agent) with trajectory capture
- faster-whisper   → optimised ASR with INT8 quantisation and CUDA→CPU fallback

All evaluations use standardized frameworks — no custom metric logic.
Results are persisted to SQLite and survive server restarts.
"""

import json
import os
import uuid
from contextlib import asynccontextmanager
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from config import HOST, PORT, OLLAMA_BASE_URL
from db import init_db, save_result, get_result, list_results
from harness_runner import (
    run_harness_eval,
    run_harness_compare,
    run_inspect_eval,
    run_faster_whisper_eval,
    list_available_tasks,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Multimodal AI Eval Engine", version="0.6.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request Models ────────────────────────────────────────────────────────


class HarnessRequest(BaseModel):
    model_type: str = "hf-multimodal"
    model_args: str
    tasks: list[str]
    num_fewshot: int = 0
    limit: int | None = 10
    device: str = "cpu"
    harness: str = "lm-eval"
    # "huggingface" (default) or "ollama" — routes image/vision tasks to Ollama
    # via its OpenAI-compatible endpoint; ignored for inspect-ai and faster-whisper
    provider: str = "huggingface"


class HarnessCompareRequest(BaseModel):
    model_type: str = "hf-multimodal"
    models: list[str]
    tasks: list[str]
    num_fewshot: int = 0
    limit: int | None = 10
    device: str = "cpu"
    harness: str = "lm-eval"
    provider: str = "huggingface"


# ─── Helpers ───────────────────────────────────────────────────────────────


def _resolve_model_args(
    harness: str,
    provider: str,
    model_type: str,
    model_args: str,
) -> tuple[str, str]:
    """Translate provider=ollama into lmms-eval's OpenAI-compatible model spec."""
    if provider == "ollama" and harness in ("lm-eval", "lmms-eval"):
        os.environ.setdefault("OPENAI_API_KEY", "ollama")
        return "openai", f"model={model_args},base_url={OLLAMA_BASE_URL}/v1"
    return model_type, model_args


def _inspect_model_str(model_args: str) -> str:
    """Ensure inspect-ai model string has the 'ollama/' prefix."""
    if model_args.startswith("ollama/"):
        return model_args
    return f"ollama/{model_args}"


# ─── Health & Discovery ────────────────────────────────────────────────────


@app.get("/api/health")
async def health():
    ollama_ok = False
    try:
        async with httpx.AsyncClient(timeout=5) as c:
            r = await c.get(f"{OLLAMA_BASE_URL}/api/tags")
            ollama_ok = r.status_code == 200
    except Exception:
        pass

    lm_eval_ok = False
    try:
        import lm_eval  # noqa: F401
        lm_eval_ok = True
    except ImportError:
        pass

    lmms_eval_ok = False
    try:
        import lmms_eval  # noqa: F401
        lmms_eval_ok = True
    except ImportError:
        pass

    inspect_ai_ok = False
    try:
        import inspect_ai  # noqa: F401
        inspect_ai_ok = True
    except ImportError:
        pass

    faster_whisper_ok = False
    try:
        import faster_whisper  # noqa: F401
        faster_whisper_ok = True
    except ImportError:
        pass

    return {
        "status": "ok",
        "ollama": ollama_ok,
        "lm_eval": lm_eval_ok,
        "lmms_eval": lmms_eval_ok,
        "inspect_ai": inspect_ai_ok,
        "faster_whisper": faster_whisper_ok,
    }


@app.get("/api/models")
async def list_models():
    return {
        # HuggingFace VLMs for image benchmarks
        "image_vlm": [
            "pretrained=Qwen/Qwen2.5-VL-3B-Instruct",
            "pretrained=Qwen/Qwen2.5-VL-7B-Instruct",
            "pretrained=llava-hf/llava-1.5-7b-hf",
            "pretrained=llava-hf/llava-1.5-13b-hf",
            "pretrained=microsoft/Phi-3.5-vision-instruct",
            "pretrained=HuggingFaceTB/SmolVLM-500M-Instruct",
        ],
        # Ollama VLMs (used when provider="ollama" for image benchmarks)
        "ollama_vlm": [
            "llava-phi3",
            "llava:7b",
            "llava:13b",
            "minicpm-v",
            "moondream",
        ],
        # HuggingFace Whisper models for lmms-eval audio benchmarks
        "audio_asr": [
            "pretrained=openai/whisper-base",
            "pretrained=openai/whisper-small",
            "pretrained=openai/whisper-medium",
            "pretrained=openai/whisper-large-v3",
            "pretrained=facebook/wav2vec2-base-960h",
            "pretrained=nvidia/conformer-ctc-large",
        ],
        # faster-whisper model sizes (used when harness="faster-whisper")
        "faster_whisper_sizes": [
            "base", "small", "medium", "large-v2", "large-v3",
        ],
        # Ollama models for agent/tool-use benchmarks (inspect-ai)
        "agent": [
            "qwen2.5:1.5b",
            "qwen2.5:3b",
            "qwen2.5:7b",
            "llama3.2:3b",
            "llama3.2:1b",
            "mistral:7b",
        ],
    }


@app.get("/api/tasks")
async def get_tasks():
    return list_available_tasks()


# ─── Single-model eval ─────────────────────────────────────────────────────


@app.post("/api/eval/harness")
async def eval_harness(req: HarnessRequest):
    """Run a single model through a standardized benchmark."""
    try:
        if req.harness == "inspect-ai":
            result = await run_inspect_eval(
                model=_inspect_model_str(req.model_args),
                tasks=req.tasks,
                limit=req.limit,
            )
        elif req.harness == "faster-whisper":
            result = await run_faster_whisper_eval(
                model_args=req.model_args,
                tasks=req.tasks,
                limit=req.limit,
            )
        else:
            model_type, model_args = _resolve_model_args(
                req.harness, req.provider, req.model_type, req.model_args
            )
            result = await run_harness_eval(
                model_type=model_type,
                model_args=model_args,
                tasks=req.tasks,
                num_fewshot=req.num_fewshot,
                limit=req.limit,
                device=req.device,
                harness=req.harness,
            )

        eval_id = str(uuid.uuid4())[:8]
        await save_result(
            eval_id=eval_id,
            eval_type="single",
            tasks=req.tasks,
            models=[req.model_args],
            harness=req.harness,
            data=result,
        )
        return {"eval_id": eval_id, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Concurrent multi-model comparison (SSE) ──────────────────────────────


@app.post("/api/eval/harness/compare")
async def eval_harness_compare(req: HarnessCompareRequest):
    """Compare multiple models on the same benchmark concurrently, streaming results via SSE."""
    if req.harness == "inspect-ai":
        raise HTTPException(
            400,
            "Multi-model comparison is not supported for inspect-ai agent evals. "
            "Run each model individually via /api/eval/harness.",
        )
    if len(req.models) < 2:
        raise HTTPException(400, "Comparison requires at least 2 models")

    model_type, _ = _resolve_model_args(
        req.harness, req.provider, req.model_type, req.models[0]
    )
    # Translate all model args when provider=ollama
    models = req.models
    if req.provider == "ollama":
        models = [
            f"model={m},base_url={OLLAMA_BASE_URL}/v1" for m in req.models
        ]

    eval_id = str(uuid.uuid4())[:8]

    async def stream():
        yield f"data: {json.dumps({'type': 'init', 'eval_id': eval_id})}\n\n"
        async for event in run_harness_compare(
            model_type=model_type,
            models=models if req.provider == "ollama" else req.models,
            tasks=req.tasks,
            num_fewshot=req.num_fewshot,
            limit=req.limit,
            device=req.device,
            harness=req.harness,
        ):
            if event["type"] == "complete":
                await save_result(
                    eval_id=eval_id,
                    eval_type="compare",
                    tasks=req.tasks,
                    models=req.models,
                    harness=req.harness,
                    data=event,
                )
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ─── Results (persisted) ───────────────────────────────────────────────────


@app.get("/api/results")
async def get_results():
    return await list_results()


@app.get("/api/results/{eval_id}")
async def get_result_by_id(eval_id: str):
    result = await get_result(eval_id)
    if result is None:
        raise HTTPException(404, "Not found")
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
