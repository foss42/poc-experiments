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
import shutil
import uuid
from contextlib import asynccontextmanager
from pathlib import Path as _Path
from typing import Any

import httpx
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
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
from custom_eval_runner import run_custom_eval as _run_custom_eval

_SESSION_DIR = _Path("/tmp/custom_eval")
_MAX_FILE_BYTES = 10 * 1024 * 1024   # 10 MB
_MAX_IMAGES = 20


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
    # "huggingface" | "ollama" | "openrouter"
    provider: str = "huggingface"
    openrouter_api_key: str | None = None


class HarnessCompareRequest(BaseModel):
    model_type: str = "hf-multimodal"
    models: list[str]
    tasks: list[str]
    num_fewshot: int = 0
    limit: int | None = 10
    device: str = "cpu"
    harness: str = "lm-eval"
    provider: str = "huggingface"
    openrouter_api_key: str | None = None


class CustomEvalStreamRequest(BaseModel):
    session_id: str
    provider: str
    model: str
    openrouter_api_key: str | None = None


# ─── Helpers ───────────────────────────────────────────────────────────────


_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


def _resolve_model_args(
    harness: str,
    provider: str,
    model_type: str,
    model_args: str,
    openrouter_api_key: str | None = None,
) -> tuple[str, str, str]:
    """Translate provider into (effective_harness, model_type, model_args).

    For OpenRouter + lm-eval image benchmarks we switch to lmms-eval + gpt4v
    because lm-eval's openai-chat-completions doesn't have MULTIMODAL=True.
    lmms-eval's gpt4v model supports vision tasks via any OpenAI-compatible API.
    """
    if provider == "ollama" and harness in ("lm-eval", "lmms-eval"):
        os.environ.setdefault("OPENAI_API_KEY", "ollama")
        return harness, "openai-chat-completions", f"model={model_args},base_url={OLLAMA_BASE_URL}/v1"
    if provider == "openrouter" and harness in ("lm-eval", "lmms-eval"):
        key = openrouter_api_key or os.getenv("OPENROUTER_API_KEY", "")
        os.environ["OPENAI_API_KEY"] = key
        os.environ["OPENAI_API_BASE"] = _OPENROUTER_BASE_URL
        # lm-eval's openai-chat-completions lacks MULTIMODAL support for vision tasks.
        # lmms-eval's gpt4v model uses OPENAI_API_BASE + OPENAI_API_KEY env vars and
        # fully supports image benchmarks (MMMU, ScienceQA, TextVQA, …) via any
        # OpenAI-compatible endpoint (including OpenRouter).
        effective_harness = "lmms-eval" if harness == "lm-eval" else harness
        return effective_harness, "gpt4v", f"model={model_args}"
    return harness, model_type, model_args


def _inspect_model_str(provider: str, model_args: str, openrouter_api_key: str | None = None) -> str:
    """Build inspect-ai model string for ollama or openrouter providers."""
    if provider == "openrouter":
        key = openrouter_api_key or os.getenv("OPENROUTER_API_KEY", "")
        # inspect-ai reads OPENROUTER_API_KEY env var automatically
        os.environ["OPENROUTER_API_KEY"] = key
        if model_args.startswith("openrouter/"):
            return model_args
        return f"openrouter/{model_args}"
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
    except Exception:
        pass

    lmms_eval_ok = False
    try:
        import lmms_eval  # noqa: F401
        lmms_eval_ok = True
    except Exception:
        pass

    inspect_ai_ok = False
    try:
        import inspect_ai  # noqa: F401
        inspect_ai_ok = True
    except Exception:
        pass

    faster_whisper_ok = False
    try:
        import faster_whisper  # noqa: F401
        faster_whisper_ok = True
    except Exception:
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
        # OpenRouter models (text + vision via OpenAI-compatible API)
        "openrouter": [
            "openai/gpt-4o-mini",
            "openai/gpt-4o",
            "anthropic/claude-3-haiku",
            "anthropic/claude-3.5-sonnet",
            "meta-llama/llama-3.1-8b-instruct",
            "meta-llama/llama-3.2-11b-vision-instruct",
            "google/gemma-3-4b-it",
            "google/gemini-flash-1.5",
            "mistralai/mistral-7b-instruct",
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
                model=_inspect_model_str(req.provider, req.model_args, req.openrouter_api_key),
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
            effective_harness, model_type, model_args = _resolve_model_args(
                req.harness, req.provider, req.model_type, req.model_args, req.openrouter_api_key
            )
            result = await run_harness_eval(
                model_type=model_type,
                model_args=model_args,
                tasks=req.tasks,
                num_fewshot=req.num_fewshot,
                limit=req.limit,
                device=req.device,
                harness=effective_harness,
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


# ─── Single-model eval with SSE progress stream ────────────────────────────

import asyncio as _asyncio
import time as _time


@app.post("/api/eval/harness/stream")
async def eval_harness_stream(req: HarnessRequest):
    """Same as /api/eval/harness but streams heartbeat events so the client
    can show progress instead of hanging on a silent long-running request."""

    async def _stream():
        yield f"data: {json.dumps({'type': 'started', 'message': 'Evaluation started…'})}\n\n"

        try:
            if req.harness == "inspect-ai":
                task = _asyncio.create_task(
                    run_inspect_eval(
                        model=_inspect_model_str(req.provider, req.model_args, req.openrouter_api_key),
                        tasks=req.tasks,
                        limit=req.limit,
                    )
                )
            elif req.harness == "faster-whisper":
                task = _asyncio.create_task(
                    run_faster_whisper_eval(
                        model_args=req.model_args,
                        tasks=req.tasks,
                        limit=req.limit,
                    )
                )
            else:
                effective_harness, model_type, model_args = _resolve_model_args(
                    req.harness, req.provider, req.model_type, req.model_args, req.openrouter_api_key
                )
                task = _asyncio.create_task(
                    run_harness_eval(
                        model_type=model_type,
                        model_args=model_args,
                        tasks=req.tasks,
                        num_fewshot=req.num_fewshot,
                        limit=req.limit,
                        device=req.device,
                        harness=effective_harness,
                    )
                )

            start = _time.time()
            while not task.done():
                await _asyncio.sleep(2)
                elapsed = int(_time.time() - start)
                yield f"data: {json.dumps({'type': 'progress', 'message': f'Running… {elapsed}s elapsed', 'elapsed': elapsed})}\n\n"

            result = task.result()

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'detail': str(e)})}\n\n"
            return

        eval_id = str(uuid.uuid4())[:8]
        await save_result(
            eval_id=eval_id,
            eval_type="single",
            tasks=req.tasks,
            models=[req.model_args],
            harness=req.harness,
            data=result,
        )
        yield f"data: {json.dumps({'type': 'complete', 'eval_id': eval_id, **result})}\n\n"

    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


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

    effective_harness, model_type, _ = _resolve_model_args(
        req.harness, req.provider, req.model_type, req.models[0], req.openrouter_api_key
    )
    # Translate all model args for remote providers
    models = req.models
    if req.provider == "ollama":
        models = [f"model={m},base_url={OLLAMA_BASE_URL}/v1" for m in req.models]
    elif req.provider == "openrouter":
        # gpt4v uses OPENAI_API_BASE env var; model arg is just model=<name>
        models = [f"model={m}" for m in req.models]

    eval_id = str(uuid.uuid4())[:8]

    async def stream():
        yield f"data: {json.dumps({'type': 'init', 'eval_id': eval_id})}\n\n"
        async for event in run_harness_compare(
            model_type=model_type,
            models=models,
            tasks=req.tasks,
            num_fewshot=req.num_fewshot,
            limit=req.limit,
            device=req.device,
            harness=effective_harness,
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


# ─── Custom dataset eval ───────────────────────────────────────────────────


@app.post("/api/custom-eval/upload")
async def custom_eval_upload(
    files: list[UploadFile] = File(..., alias="files[]"),
    manifest: str = Form(...),
):
    """Accept image files + JSON manifest, save to a session directory."""
    if len(files) > _MAX_IMAGES:
        raise HTTPException(400, f"Too many files — maximum is {_MAX_IMAGES}")

    session_id = str(uuid.uuid4())[:8]
    sdir = _SESSION_DIR / session_id
    sdir.mkdir(parents=True, exist_ok=True)

    for upload in files:
        content = await upload.read()
        if len(content) > _MAX_FILE_BYTES:
            shutil.rmtree(sdir, ignore_errors=True)
            raise HTTPException(400, f"File too large: {upload.filename}")
        (sdir / upload.filename).write_bytes(content)

    (sdir / "manifest.json").write_text(manifest)
    samples = json.loads(manifest)
    return {"session_id": session_id, "count": len(samples)}


@app.post("/api/custom-eval/stream")
async def custom_eval_stream(req: CustomEvalStreamRequest):
    """Stream per-sample results as SSE events."""
    sdir = _SESSION_DIR / req.session_id
    if not sdir.exists():
        raise HTTPException(404, "Session not found — upload images first")

    manifest_path = sdir / "manifest.json"
    if not manifest_path.exists():
        raise HTTPException(404, "Manifest not found in session")
    samples = json.loads(manifest_path.read_text())

    async def _stream():
        eval_id = str(uuid.uuid4())[:8]
        all_results: list[dict] = []

        async for event in _run_custom_eval(
            session_id=req.session_id,
            samples=samples,
            provider=req.provider,
            model=req.model,
            openrouter_api_key=req.openrouter_api_key,
        ):
            if event["type"] == "sample":
                all_results.append(event)
            elif event["type"] == "complete":
                event = {**event, "eval_id": eval_id, "results": all_results}
                await save_result(
                    eval_id=eval_id,
                    eval_type="custom",
                    tasks=["custom"],
                    models=[req.model],
                    harness="custom",
                    data=event,
                )
                shutil.rmtree(sdir, ignore_errors=True)
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ─── Results (persisted) ───────────────────────────────────────────────────


@app.get("/api/results")
async def get_results(limit: int = 20, offset: int = 0):
    """Return paginated results. Response: {total: int, results: [...]}"""
    return await list_results(limit=limit, offset=offset)


@app.get("/api/results/{eval_id}")
async def get_result_by_id(eval_id: str):
    result = await get_result(eval_id)
    if result is None:
        raise HTTPException(404, "Not found")
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
