"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.schemas import HealthResponse
from app.routers import datasets, models, evaluations


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup/shutdown lifecycle."""
    await init_db()
    yield


app = FastAPI(
    title="AI Evaluation Framework",
    description="Evaluate AI models via API using datasets and produce metrics.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS - allow Flutter web app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(datasets.router)
app.include_router(models.router)
app.include_router(evaluations.router)


@app.get("/api/health", response_model=HealthResponse, tags=["health"])
async def health_check():
    """Health check endpoint."""
    return HealthResponse()


@app.post("/api/reset", tags=["admin"])
async def reset_data():
    """Wipe all database records and uploaded datasets to start fresh."""
    import os
    import shutil
    from app.database import engine, Base
    
    # 1. Drop and recreate all database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        
    # 2. Delete all files in the datasets directory
    datasets_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "datasets")
    if os.path.exists(datasets_dir):
        for filename in os.listdir(datasets_dir):
            file_path = os.path.join(datasets_dir, filename)
            try:
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path)
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)
            except Exception as e:
                print(f"Failed to delete {file_path}. Reason: {e}")
                
    return {"status": "success", "message": "All data has been reset"}
