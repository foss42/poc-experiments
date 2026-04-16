from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import random

app = FastAPI()

# THIS IS NEW: Tells Python it is allowed to talk to your React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/run_evaluation")
async def run_evaluation(dataset_name: str):
    print(f"Agent requested evaluation for: {dataset_name}")
    await asyncio.sleep(2)
    
    return {
        "status": "success",
        "dataset": dataset_name,
        "metrics": {
            "accuracy": round(random.uniform(85.0, 98.0), 1),
            "latency_ms": random.randint(100, 300),
            "pass_rate": "100%"
        }
    }