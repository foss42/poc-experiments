from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .routers import eval, datasets, results
from .config import settings

app = FastAPI(
    title="Multimodal AI Eval Framework",
    description=(
        "GSoC 2026 PoC — End-to-end AI API evaluation across "
        "text, multimodal, agent, and MCP modalities"
    ),
    version="0.1.0",
    root_path="",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(eval.router)
app.include_router(datasets.router)
app.include_router(results.router)

# Mount static files for MCP Apps
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.1.0"}
