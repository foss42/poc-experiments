"""Wrapper around lm-eval-harness simple_evaluate() for standard benchmarks."""

import asyncio
from typing import Any


async def run_harness_eval(
    model_type: str,
    model_args: str,
    tasks: list[str],
    num_fewshot: int = 0,
    limit: int | None = None,
    device: str = "cpu",
) -> dict[str, Any]:
    """Run lm-eval-harness evaluation in a thread pool (it's CPU/GPU-bound).

    Args:
        model_type: e.g. "hf" for HuggingFace, "hf-multimodal" for VLMs
        model_args: e.g. "pretrained=microsoft/Phi-3-vision-128k-instruct"
        tasks: list of task names, e.g. ["mmmu_val", "hellaswag"]
        num_fewshot: number of few-shot examples
        limit: max samples per task (useful for quick PoC runs)
        device: "cpu", "cuda", "mps"

    Returns:
        Dict with results, configs, task metrics
    """

    def _run():
        import lm_eval

        results = lm_eval.simple_evaluate(
            model=model_type,
            model_args=model_args,
            tasks=tasks,
            num_fewshot=num_fewshot,
            limit=limit,
            device=device,
            log_samples=False,
        )
        # Extract the clean results dict
        return {
            "results": results.get("results", {}),
            "configs": results.get("configs", {}),
            "versions": results.get("versions", {}),
            "n-shot": results.get("n-shot", {}),
        }

    return await asyncio.get_event_loop().run_in_executor(None, _run)


def list_available_tasks() -> list[str]:
    """Return multimodal-relevant tasks from lm-eval-harness."""
    # Curated list of vision-language and reasoning tasks relevant to our PoC
    return [
        # Vision-language (require hf-multimodal model type)
        "mmmu_val",
        "realworldqa",
        "scienceqa",
        # Standard text benchmarks (for comparison)
        "hellaswag",
        "arc_easy",
        "arc_challenge",
        "mmlu",
        "truthfulqa_mc2",
        "gsm8k",
    ]
