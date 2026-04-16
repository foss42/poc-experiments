import uuid
from fastapi import APIRouter, BackgroundTasks, HTTPException
from ..models.eval_request import EvalRequest
from ..core.orchestrator import EvalOrchestrator
from ..core.task_queue import create_job, complete_job, fail_job, get_job, job_exists
from ..adapters.openai_adapter import OpenAIAdapter
from ..adapters.anthropic_adapter import AnthropicAdapter
from ..adapters.gemini_adapter import GeminiAdapter
from ..adapters.groq_adapter import GroqAdapter
from ..config import settings

router = APIRouter(prefix="/eval", tags=["eval"])
orchestrator = EvalOrchestrator()


@router.post("/run")
async def run_eval(request: EvalRequest, background_tasks: BackgroundTasks):
    """Submit an eval job. Returns job_id immediately; job runs in background."""
    job_id = str(uuid.uuid4())[:8]
    create_job(job_id)
    background_tasks.add_task(_execute_eval, job_id, request)
    return {"job_id": job_id, "status": "running"}


@router.get("/status/{job_id}")
async def get_status(job_id: str):
    """Poll eval job status. Returns {status, result} when complete."""
    if not job_exists(job_id):
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    return get_job(job_id)


async def _execute_eval(job_id: str, request: EvalRequest) -> None:
    """Background task — runs eval and updates job store."""
    try:
        providers = _build_providers(request)
        if not providers:
            fail_job(job_id, "No valid providers configured. Check API keys in .env (GEMINI_API_KEY or GROQ_API_KEY).")
            return

        dataset = [item.model_dump() for item in request.dataset]
        results = await orchestrator.run_providers_concurrently(
            providers=providers,
            dataset=dataset,
            modality=request.modality,
        )
        complete_job(job_id, results)
    except Exception as e:
        fail_job(job_id, str(e))


def _build_providers(request: EvalRequest) -> list:
    """Build adapter instances from request provider configs.

    Priority order: gemini > groq > openai > anthropic
    """
    providers = []
    for p in request.providers:
        api_key = p.api_key
        name = p.name.lower()

        if name == "gemini":
            key = api_key or settings.GEMINI_API_KEY
            if key:
                providers.append(GeminiAdapter(api_key=key, model=p.model or "gemini-2.0-flash"))

        elif name == "groq":
            key = api_key or settings.GROQ_API_KEY
            if key:
                providers.append(GroqAdapter(api_key=key, model=p.model or "llama-3.3-70b-versatile"))

        elif name == "openai":
            key = api_key or settings.OPENAI_API_KEY
            if key:
                providers.append(OpenAIAdapter(api_key=key, model=p.model or "gpt-4o-mini"))

        elif name == "anthropic":
            key = api_key or settings.ANTHROPIC_API_KEY
            if key:
                providers.append(AnthropicAdapter(api_key=key, model=p.model or "claude-3-haiku-20240307"))

    return providers
