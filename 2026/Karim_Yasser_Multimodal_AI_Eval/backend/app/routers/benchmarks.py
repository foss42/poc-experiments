"""Benchmark evaluation endpoints — run LM Evaluation Harness benchmarks."""

import asyncio
import importlib.util
import json
import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db, async_session
from app.models import BenchmarkRun, BenchmarkTaskResult, ModelConfig
from app.schemas import (
    AvailableTask,
    BenchmarkCreate,
    BenchmarkRunResponse,
    BenchmarkTaskResultResponse,
)
from app.services.harness_runner import get_available_tasks, run_benchmark, CHAT_ONLY_MODEL_TYPES

router = APIRouter(prefix="/api/benchmarks", tags=["benchmarks"])


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _run_to_response(run: BenchmarkRun) -> BenchmarkRunResponse:
    return BenchmarkRunResponse(
        id=run.id,
        model_config_id=run.model_config_id,
        model_type=run.model_type,
        tasks=json.loads(run.tasks),
        status=run.status,
        limit=run.limit,
        num_fewshot=run.num_fewshot,
        apply_chat_template=run.apply_chat_template,
        fewshot_as_multiturn=run.fewshot_as_multiturn,
        results_json=run.results_json,
        error_message=run.error_message,
        created_at=run.created_at,
        completed_at=run.completed_at,
    )


# ─── Available Tasks ─────────────────────────────────────────────────────────

@router.get("/tasks", response_model=list[AvailableTask])
async def list_tasks():
    """Return the curated list of available benchmark tasks."""
    return [AvailableTask(**t) for t in get_available_tasks()]


# ─── Benchmark CRUD ──────────────────────────────────────────────────────────

@router.post("", response_model=BenchmarkRunResponse)
async def start_benchmark(
    config: BenchmarkCreate,
    db: AsyncSession = Depends(get_db),
):
    """Start a new benchmark evaluation run as a background task."""
    # Verify model config exists
    model_config = await db.get(ModelConfig, config.model_config_id)
    if not model_config:
        raise HTTPException(status_code=404, detail="Model config not found.")

    # Validate requested tasks against our catalogue
    available = {t["name"] for t in get_available_tasks()}
    invalid = [t for t in config.tasks if t not in available]
    if invalid:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown tasks: {invalid}. Available: {sorted(available)}",
        )

    # Check if multimodal tasks require a vision-capable model type
    multimodal_tasks = {t["name"] for t in get_available_tasks() if t["is_multimodal"]}
    has_mm = any(t in multimodal_tasks for t in config.tasks)
    if has_mm and config.model_type not in ("hf-multimodal", "local-chat-completions", "openai-chat-completions"):
        raise HTTPException(
            status_code=422,
            detail=(
                f"Multimodal tasks require model_type 'hf-multimodal', "
                f"'local-chat-completions', or 'openai-chat-completions'. "
                f"Got: {config.model_type}"
            ),
        )

    provider = (model_config.provider or "").strip().lower()
    base_url = (model_config.base_url or "").strip().lower()

    if config.model_type == "local-chat-completions" and (
        provider == "huggingface" or "router.huggingface.co" in base_url
    ):
        resolved_hf_key = (model_config.api_key or "").strip() or os.getenv("HF_TOKEN", "").strip()
        if not resolved_hf_key:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Hugging Face Router requires an API token. Set model api_key, or configure HF_TOKEN "
                    "via Settings -> hf_token (or environment variable)."
                ),
            )

    if config.model_type == "hf-multimodal" and (
        provider == "huggingface" or "router.huggingface.co" in base_url
    ):
        raise HTTPException(
            status_code=422,
            detail=(
                "model_type 'hf-multimodal' is for local Hugging Face model loading, not deployed HF Router inference. "
                "Use model_type 'local-chat-completions' for Hugging Face Router/OpenAI-compatible APIs."
            ),
        )

    # Local HF multimodal models require heavyweight local ML deps.
    if config.model_type == "hf-multimodal":
        required = ("torch", "torchvision", "accelerate")
        missing = [pkg for pkg in required if importlib.util.find_spec(pkg) is None]
        if missing:
            raise HTTPException(
                status_code=422,
                detail=(
                    "model_type 'hf-multimodal' requires local dependencies not found in backend environment: "
                    f"{missing}. "
                    "Install them for local GPU-capable execution, or switch model_type "
                    "to 'local-chat-completions' for OpenAI-compatible API endpoints "
                    "(including Hugging Face Router)."
                ),
            )

    # Check if chat-only model types have loglikelihood tasks
    if config.model_type in CHAT_ONLY_MODEL_TYPES:
        all_tasks = get_available_tasks()
        task_map = {t["name"]: t for t in all_tasks}
        ll_tasks = [t for t in config.tasks
                    if task_map.get(t, {}).get("output_type") == "loglikelihood"]
        if ll_tasks:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Tasks {ll_tasks} require loglikelihood scoring which is "
                    f"not supported by '{config.model_type}'. "
                    f"Use only generate_until tasks (e.g. gsm8k, triviaqa) "
                    f"with chat completion APIs, or switch to 'hf-multimodal' "
                    f"model type for local model loading."
                ),
            )

    # Create the run record
    run = BenchmarkRun(
        model_config_id=config.model_config_id,
        model_type=config.model_type,
        tasks=json.dumps(config.tasks),
        limit=config.limit,
        num_fewshot=config.num_fewshot,
        apply_chat_template=config.apply_chat_template,
        fewshot_as_multiturn=config.fewshot_as_multiturn,
    )
    db.add(run)
    await db.flush()
    await db.refresh(run)

    # Launch in background
    asyncio.create_task(run_benchmark(run.id, async_session))

    return _run_to_response(run)


@router.get("", response_model=list[BenchmarkRunResponse])
async def list_benchmarks(db: AsyncSession = Depends(get_db)):
    """List all benchmark evaluation runs."""
    result = await db.execute(
        select(BenchmarkRun).order_by(BenchmarkRun.created_at.desc())
    )
    runs = result.scalars().all()
    return [_run_to_response(r) for r in runs]


@router.get("/{run_id}", response_model=BenchmarkRunResponse)
async def get_benchmark(run_id: str, db: AsyncSession = Depends(get_db)):
    """Get a benchmark run status and metadata."""
    run = await db.get(BenchmarkRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Benchmark run not found.")
    return _run_to_response(run)


@router.get("/{run_id}/stream")
async def stream_benchmark(run_id: str):
    """SSE endpoint to stream benchmark run progress."""

    async def event_generator():
        while True:
            async with async_session() as db:
                run = await db.get(BenchmarkRun, run_id)
                if not run:
                    yield f"data: {json.dumps({'error': 'Not found'})}\n\n"
                    break

                data = {
                    "id": run.id,
                    "model_config_id": run.model_config_id,
                    "model_type": run.model_type,
                    "tasks": json.loads(run.tasks),
                    "status": run.status,
                    "limit": run.limit,
                    "num_fewshot": run.num_fewshot,
                    "apply_chat_template": run.apply_chat_template,
                    "fewshot_as_multiturn": run.fewshot_as_multiturn,
                    "results_json": run.results_json,
                    "error_message": run.error_message,
                    "created_at": run.created_at,
                    "completed_at": run.completed_at,
                }
                status = run.status

            yield f"data: {json.dumps(data)}\n\n"

            if status in ("completed", "failed"):
                break

            await asyncio.sleep(1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/{run_id}/results", response_model=list[BenchmarkTaskResultResponse])
async def get_benchmark_results(run_id: str, db: AsyncSession = Depends(get_db)):
    """Get per-task metric results for a benchmark run."""
    run = await db.get(BenchmarkRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Benchmark run not found.")

    result = await db.execute(
        select(BenchmarkTaskResult)
        .where(BenchmarkTaskResult.run_id == run_id)
        .order_by(BenchmarkTaskResult.task_name, BenchmarkTaskResult.metric_name)
    )
    results = result.scalars().all()

    return [
        BenchmarkTaskResultResponse(
            id=r.id,
            run_id=r.run_id,
            task_name=r.task_name,
            metric_name=r.metric_name,
            metric_value=r.metric_value,
            stderr=r.stderr,
            is_multimodal=r.is_multimodal,
        )
        for r in results
    ]
