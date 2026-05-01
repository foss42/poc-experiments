from fastapi import APIRouter
from ..core.task_queue import _jobs

router = APIRouter(prefix="/results", tags=["results"])


@router.get("/")
async def list_results():
    """
    List all completed eval jobs.
    Returns a flat list compatible with the frontend EvalResult type.
    (PoC: in-memory only — not persisted across restarts)
    """
    completed = []
    for job_id, job in _jobs.items():
        if job["status"] != "complete":
            continue
        # Flatten each provider result into a separate EvalResult-shaped object
        for r in job.get("result") or []:
            completed.append({
                "job_id": job_id,
                "status": "complete",
                "modality": r.get("modality", "text"),
                "provider": r.get("provider", "unknown"),
                "num_samples": r.get("num_samples", 0),
                "accuracy": r.get("accuracy", 0.0),
                "latency": r.get("latency", {}),
                "total_tokens": r.get("total_tokens", 0),
                "total_cost_usd": r.get("total_cost_usd", 0.0),
                "per_sample_results": r.get("per_sample_results", []),
            })

    return {"results": completed, "total": len(completed)}
