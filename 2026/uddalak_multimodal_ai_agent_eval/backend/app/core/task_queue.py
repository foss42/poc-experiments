"""
JSON-persistent job store for PoC.
Ensures history survives backend restarts.
"""
from typing import Dict, Any, Optional
import json
from .persistence import save_jobs, load_jobs

# Initialize in-memory store from persistence
_jobs: Dict[str, Dict[str, Any]] = {
    j["job_id"]: j for j in load_jobs()
} if isinstance(load_jobs(), list) else {}

def _persist():
    save_jobs(list(_jobs.values()))

def create_job(job_id: str) -> None:
    """Initialize a job as 'running'."""
    _jobs[job_id] = {"job_id": job_id, "status": "running", "result": None, "error": None}
    _persist()

def complete_job(job_id: str, result: Any) -> None:
    """Mark a job as complete with results."""
    _jobs[job_id]["status"] = "complete"
    _jobs[job_id]["result"] = result
    _jobs[job_id]["error"] = None
    _persist()

def fail_job(job_id: str, error: str) -> None:
    """Mark a job as failed with error message."""
    _jobs[job_id]["status"] = "error"
    _jobs[job_id]["result"] = None
    _jobs[job_id]["error"] = error
    _persist()

def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    """Get job status and result. Returns None if not found."""
    return _jobs.get(job_id)

def get_all_jobs() -> list:
    """Return all jobs for history view."""
    # Return chronologically (assuming job_id or creation logic handles this, 
    # but for PoC just return list)
    return list(_jobs.values())

def job_exists(job_id: str) -> bool:
    return job_id in _jobs
