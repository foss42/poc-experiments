"""Evaluation run endpoints - start, list, status, and results."""

import asyncio
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db, async_session
from app.models import EvaluationRun, EvaluationResult, Dataset, ModelConfig
from app.schemas import EvaluationCreate, EvaluationRunResponse, EvaluationResultResponse
from app.services.eval_runner import run_evaluation, run_multimodal_evaluation

router = APIRouter(prefix="/api/evaluations", tags=["evaluations"])


@router.post("", response_model=EvaluationRunResponse)
async def start_evaluation(
    config: EvaluationCreate,
    db: AsyncSession = Depends(get_db),
):
    """Start a new evaluation run as a background task."""
    # Verify dataset exists
    dataset = await db.get(Dataset, config.dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    # Verify model config exists
    model_config = await db.get(ModelConfig, config.model_config_id)
    if not model_config:
        raise HTTPException(status_code=404, detail="Model config not found.")

    # Create evaluation run record
    run = EvaluationRun(
        dataset_id=config.dataset_id,
        model_config_id=config.model_config_id,
        total_items=dataset.item_count,
    )
    db.add(run)
    await db.flush()
    await db.refresh(run)

    # Launch evaluation in background — dispatch based on dataset type
    if dataset.is_multimodal:
        asyncio.create_task(run_multimodal_evaluation(run.id, async_session))
    else:
        asyncio.create_task(run_evaluation(run.id, async_session))

    return EvaluationRunResponse(
        id=run.id,
        dataset_id=run.dataset_id,
        model_config_id=run.model_config_id,
        status=run.status,
        hard_score=run.hard_score,
        soft_score=run.soft_score,
        gray_zone_width=run.gray_zone_width,
        avg_latency_ms=run.avg_latency_ms,
        total_items=run.total_items,
        completed_items=run.completed_items,
        created_at=run.created_at,
        completed_at=run.completed_at,
    )


@router.get("", response_model=list[EvaluationRunResponse])
async def list_evaluations(db: AsyncSession = Depends(get_db)):
    """List all evaluation runs."""
    result = await db.execute(select(EvaluationRun).order_by(EvaluationRun.created_at.desc()))
    runs = result.scalars().all()
    return [
        EvaluationRunResponse(
            id=r.id,
            dataset_id=r.dataset_id,
            model_config_id=r.model_config_id,
            status=r.status,
            hard_score=r.hard_score,
            soft_score=r.soft_score,
            gray_zone_width=r.gray_zone_width,
            avg_latency_ms=r.avg_latency_ms,
            total_items=r.total_items,
            completed_items=r.completed_items,
            created_at=r.created_at,
            completed_at=r.completed_at,
        )
        for r in runs
    ]


@router.get("/{run_id}", response_model=EvaluationRunResponse)
async def get_evaluation(run_id: str, db: AsyncSession = Depends(get_db)):
    """Get evaluation run status and metrics."""
    run = await db.get(EvaluationRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Evaluation run not found.")

    return EvaluationRunResponse(
        id=run.id,
        dataset_id=run.dataset_id,
        model_config_id=run.model_config_id,
        status=run.status,
        hard_score=run.hard_score,
        soft_score=run.soft_score,
        gray_zone_width=run.gray_zone_width,
        avg_latency_ms=run.avg_latency_ms,
        total_items=run.total_items,
        completed_items=run.completed_items,
        created_at=run.created_at,
        completed_at=run.completed_at,
    )


@router.get("/{run_id}/stream")
async def stream_evaluation(run_id: str):
    """Server-Sent Events endpoint to stream evaluation progress."""

    async def event_generator():
        while True:
            # Query the database in isolated, short-lived sessions to prevent SQLite read/write lock deadlocks
            async with async_session() as db:
                run = await db.get(EvaluationRun, run_id)
                if not run:
                    yield f"data: {json.dumps({'error': 'Not found'})}\n\n"
                    break

                data = {
                    "id": run.id,
                    "status": run.status,
                    "completed_items": run.completed_items,
                    "total_items": run.total_items,
                    "hard_score": run.hard_score,
                    "avg_latency_ms": run.avg_latency_ms,
                }
                status = run.status
                
            yield f"data: {json.dumps(data)}\n\n"

            if status in ["completed", "failed"]:
                break
            
            await asyncio.sleep(1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/{run_id}/results", response_model=list[EvaluationResultResponse])
async def get_evaluation_results(run_id: str, db: AsyncSession = Depends(get_db)):
    """Get per-item results for an evaluation run."""
    run = await db.get(EvaluationRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Evaluation run not found.")

    result = await db.execute(
        select(EvaluationResult)
        .where(EvaluationResult.run_id == run_id)
        .order_by(EvaluationResult.created_at)
    )
    results = result.scalars().all()

    return [
        EvaluationResultResponse(
            id=r.id,
            run_id=r.run_id,
            input=r.input,
            expected_output=r.expected_output,
            actual_output=r.actual_output,
            media_url=r.media_url,
            score_level=r.score_level,
            score_label=r.score_label,
            hard_score=r.hard_score,
            soft_score=r.soft_score,
            latency_ms=r.latency_ms,
        )
        for r in results
    ]


@router.delete("/{run_id}", status_code=204)
async def delete_evaluation(run_id: str, db: AsyncSession = Depends(get_db)):
    """Delete an evaluation run and all associated results."""
    run = await db.get(EvaluationRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Evaluation run not found.")

    await db.delete(run)
    await db.commit()
    return None
