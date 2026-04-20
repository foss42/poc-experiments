import json
import os
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/datasets", tags=["datasets"])

DATASETS_DIR = os.getenv(
    "DATASETS_DIR",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "datasets"))
)

# In Docker, the path might be /app/datasets if mounted there
if not os.path.exists(DATASETS_DIR) and os.path.exists("/app/datasets"):
    DATASETS_DIR = "/app/datasets"


@router.get("/")
async def list_datasets():
    """List available sample datasets."""
    datasets = []
    if os.path.exists(DATASETS_DIR):
        for fname in sorted(os.listdir(DATASETS_DIR)):
            if fname.endswith(".jsonl"):
                fpath = os.path.join(DATASETS_DIR, fname)
                with open(fpath) as f:
                    lines = [line for line in f if line.strip()]
                datasets.append({
                    "name": fname.replace(".jsonl", ""),
                    "filename": fname,
                    "num_items": len(lines),
                })
    return {"datasets": datasets}


@router.get("/{name}")
async def get_dataset(name: str):
    """Get a dataset by name (without .jsonl extension)."""
    fpath = os.path.join(DATASETS_DIR, f"{name}.jsonl")
    if not os.path.exists(fpath):
        raise HTTPException(status_code=404, detail=f"Dataset '{name}' not found")
    items = []
    with open(fpath) as f:
        for line in f:
            if line.strip():
                items.append(json.loads(line))
    return {"name": name, "items": items}
