"""LM Evaluation Harness integration service.

Wraps EleutherAI's lm-evaluation-harness `simple_evaluate()` Python API
to run standardised benchmarks (including multimodal ones like MMMU)
against models served via API endpoints or loaded locally.

Supported model types:
  - local-chat-completions : any OpenAI-compatible chat API (LM Studio, Ollama, etc.)
  - openai-chat-completions: OpenAI hosted models
  - hf-multimodal          : local HuggingFace vision-language models (needs GPU)
"""

from __future__ import annotations

import asyncio
import json
import logging
import traceback
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import BenchmarkRun, BenchmarkTaskResult

logger = logging.getLogger(__name__)

# ─── Curated task catalogue ──────────────────────────────────────────────────

AVAILABLE_TASKS: list[dict] = [
    # Knowledge
    {"name": "mmlu", "category": "knowledge", "is_multimodal": False,
     "output_type": "loglikelihood",
     "description": "Massive Multitask Language Understanding - 57 subjects"},
    {"name": "triviaqa", "category": "knowledge", "is_multimodal": False,
     "output_type": "generate_until",
     "description": "Trivia question answering over evidence documents"},
    {"name": "truthfulqa_mc2", "category": "knowledge", "is_multimodal": False,
     "output_type": "loglikelihood",
     "description": "TruthfulQA - tests model truthfulness (MC format)"},
    # Reasoning
    {"name": "hellaswag", "category": "reasoning", "is_multimodal": False,
     "output_type": "loglikelihood",
     "description": "Commonsense NLI - sentence completion (4-choice)"},
    {"name": "winogrande", "category": "reasoning", "is_multimodal": False,
     "output_type": "loglikelihood",
     "description": "Winograd schema challenge for commonsense reasoning"},
    {"name": "arc_easy", "category": "reasoning", "is_multimodal": False,
     "output_type": "loglikelihood",
     "description": "AI2 Reasoning Challenge - Easy set"},
    {"name": "arc_challenge", "category": "reasoning", "is_multimodal": False,
     "output_type": "loglikelihood",
     "description": "AI2 Reasoning Challenge - Challenge set"},
    {"name": "piqa", "category": "reasoning", "is_multimodal": False,
     "output_type": "loglikelihood",
     "description": "Physical Intuition QA - physical commonsense"},
    # Math
    {"name": "gsm8k", "category": "math", "is_multimodal": False,
     "output_type": "generate_until",
     "description": "Grade School Math 8K - multi-step arithmetic"},
    # Multimodal
    {"name": "mmmu_val", "category": "multimodal", "is_multimodal": True,
     "output_type": "loglikelihood",
     "description": "MMMU - Massive Multi-discipline Multimodal Understanding"},
]

# Model types that only support generate_until (no loglikelihood)
CHAT_ONLY_MODEL_TYPES = {"local-chat-completions", "openai-chat-completions"}


def get_available_tasks() -> list[dict]:
    """Return the curated list of available benchmark tasks."""
    return AVAILABLE_TASKS


# ─── Core runner ─────────────────────────────────────────────────────────────

def _build_model_args_string(model_config: dict, model_type: str) -> str:
    """Build the model_args comma-separated string for lm_eval.

    Args:
        model_config: Dict with keys like base_url, api_key, model_name, etc.
        model_type:   LM Harness model type identifier.
    """
    parts = []

    model_name = model_config.get("model_name", "")
    base_url = model_config.get("base_url", "")
    api_key = model_config.get("api_key", "")
    temperature = model_config.get("temperature", 0.0)
    max_tokens = model_config.get("max_tokens", 256)

    if model_type in ("local-chat-completions", "local-completions"):
        parts.append(f"model={model_name}")
        if base_url:
            # lm-eval expects the full endpoint URL for local-chat-completions
            url = base_url.rstrip("/")
            if not url.endswith("/chat/completions"):
                url = f"{url}/chat/completions"
            parts.append(f"base_url={url}")
        parts.append("tokenized_requests=False")
        parts.append(f"num_concurrent=1")
        parts.append(f"max_retries=3")
        parts.append(f"max_gen_toks={max_tokens}")
        # Don't pass tokenizer for API models
        parts.append("tokenizer_backend=None")
        parts.append("eos_string=<|eot_id|>")

    elif model_type == "openai-chat-completions":
        parts.append(f"model={model_name}")
        parts.append(f"max_gen_toks={max_tokens}")

    elif model_type == "hf-multimodal":
        parts.append(f"pretrained={model_name}")
        parts.append(f"max_gen_toks={max_tokens}")
        parts.append("trust_remote_code=True")

    else:
        # Generic fallback
        parts.append(f"model={model_name}")
        if base_url:
            parts.append(f"base_url={base_url}")

    return ",".join(parts)


def _run_evaluation_sync(
    model_type: str,
    model_args_str: str,
    tasks: list[str],
    limit: int | None,
    num_fewshot: int | None,
    apply_chat_template: bool = False,
    fewshot_as_multiturn: bool = False,
) -> dict:
    """Synchronous wrapper around lm_eval.simple_evaluate().

    This runs in a thread via asyncio.to_thread().
    Returns the raw results dict from lm-eval.
    """
    import lm_eval

    logger.info(
        f"Starting lm_eval.simple_evaluate() — "
        f"model={model_type}, args={model_args_str}, "
        f"tasks={tasks}, limit={limit}, num_fewshot={num_fewshot}, "
        f"apply_chat_template={apply_chat_template}, "
        f"fewshot_as_multiturn={fewshot_as_multiturn}"
    )

    results = lm_eval.simple_evaluate(
        model=model_type,
        model_args=model_args_str,
        tasks=tasks,
        limit=limit,
        num_fewshot=num_fewshot,
        batch_size=1,
        log_samples=False,
        apply_chat_template=apply_chat_template if apply_chat_template else None,
        fewshot_as_multiturn=fewshot_as_multiturn if fewshot_as_multiturn else None,
        # For API models we don't need a device
        device=None if "chat-completions" in model_type or "completions" in model_type else "cuda:0",
    )

    return results


def _extract_task_results(results: dict, tasks_requested: list[str]) -> list[dict]:
    """Parse the lm_eval results dict into a flat list of per-task metrics.

    The results dict has structure:
        results["results"] = {
            "task_name": {
                "acc,none": 0.85,
                "acc_stderr,none": 0.02,
                "acc_norm,none": 0.87,
                ...
                "alias": "task_name",
            }
        }
    """
    task_results = []
    raw_results = results.get("results", {})

    # Determine which tasks are multimodal from our catalogue
    multimodal_tasks = {t["name"] for t in AVAILABLE_TASKS if t["is_multimodal"]}

    for task_name, metrics in raw_results.items():
        if isinstance(metrics, str):
            continue  # skip non-dict entries

        # Check if this is a multimodal task
        is_mm = any(
            task_name.startswith(mm_task) for mm_task in multimodal_tasks
        )

        for metric_key, value in metrics.items():
            if metric_key in ("alias", "hashes"):
                continue
            if not isinstance(value, (int, float)):
                continue

            # Parse metric name — lm_eval uses "metric,filter" format
            metric_parts = metric_key.split(",")
            metric_name = metric_parts[0]

            # Skip stderr entries (we'll find them as companions)
            if "stderr" in metric_name:
                continue

            # Look for companion stderr
            stderr_key = f"{metric_name}_stderr,{metric_parts[1]}" if len(metric_parts) > 1 else f"{metric_name}_stderr"
            stderr_val = metrics.get(stderr_key)
            if stderr_val == "N/A":
                stderr_val = None

            task_results.append({
                "task_name": task_name,
                "metric_name": metric_name,
                "metric_value": float(value),
                "stderr": float(stderr_val) if stderr_val is not None else None,
                "is_multimodal": is_mm,
            })

    return task_results


# ─── Async entry point ──────────────────────────────────────────────────────

async def run_benchmark(run_id: str, session_factory) -> None:
    """Execute a benchmark evaluation run asynchronously.

    Loads the BenchmarkRun from DB, builds the lm_eval arguments,
    runs simple_evaluate() in a thread, and stores results back.
    """
    async with session_factory() as session:
        run = await session.get(BenchmarkRun, run_id)
        if not run:
            logger.error(f"Benchmark run {run_id} not found.")
            return

        from app.models import ModelConfig
        model_config = await session.get(ModelConfig, run.model_config_id)
        if not model_config:
            run.status = "failed"
            run.error_message = "Model config not found"
            await session.commit()
            return

        # Mark as running
        run.status = "running"
        await session.commit()

        # Build config dict from ModelConfig ORM object
        config_dict = {
            "model_name": model_config.model_name,
            "base_url": model_config.base_url,
            "api_key": model_config.api_key,
            "temperature": model_config.temperature,
            "max_tokens": model_config.max_tokens,
        }

        model_args_str = _build_model_args_string(config_dict, run.model_type)
        tasks = json.loads(run.tasks)

        try:
            # Run the evaluation in a background thread (it's synchronous)
            results = await asyncio.to_thread(
                _run_evaluation_sync,
                model_type=run.model_type,
                model_args_str=model_args_str,
                tasks=tasks,
                limit=run.limit,
                num_fewshot=run.num_fewshot,
                apply_chat_template=run.apply_chat_template,
                fewshot_as_multiturn=run.fewshot_as_multiturn,
            )

            if results is None:
                run.status = "failed"
                run.error_message = "simple_evaluate() returned None (not rank 0?)"
                run.completed_at = datetime.now(timezone.utc).isoformat()
                await session.commit()
                return

            # Store the full results JSON
            run.results_json = json.dumps(
                results, default=str, ensure_ascii=False
            )

            # Extract and store per-task results
            task_results = _extract_task_results(results, tasks)
            for tr in task_results:
                task_result = BenchmarkTaskResult(
                    run_id=run_id,
                    task_name=tr["task_name"],
                    metric_name=tr["metric_name"],
                    metric_value=tr["metric_value"],
                    stderr=tr["stderr"],
                    is_multimodal=tr["is_multimodal"],
                )
                session.add(task_result)

            run.status = "completed"
            run.completed_at = datetime.now(timezone.utc).isoformat()

            logger.info(
                f"Benchmark run {run_id} completed — "
                f"{len(task_results)} metric entries across {len(tasks)} tasks"
            )

        except Exception as e:
            logger.error(f"Benchmark run {run_id} failed: {e}")
            logger.error(traceback.format_exc())
            run.status = "failed"
            run.error_message = str(e)[:500]
            run.completed_at = datetime.now(timezone.utc).isoformat()

        finally:
            await session.commit()
