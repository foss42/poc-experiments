import json
import os
from pathlib import Path
from typing import List, Dict, Any

DATA_DIR = Path("data")
JOBS_FILE = DATA_DIR / "jobs.json"

def ensure_data_dir():
    if not DATA_DIR.exists():
        DATA_DIR.mkdir(parents=True, exist_ok=True)

def save_jobs(jobs: List[Dict[str, Any]]):
    ensure_data_dir()
    with open(JOBS_FILE, "w") as f:
        json.dump(jobs, f, indent=2, default=str)

def load_jobs() -> List[Dict[str, Any]]:
    if not JOBS_FILE.exists():
        return []
    try:
        with open(JOBS_FILE, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading jobs: {e}")
        return []
