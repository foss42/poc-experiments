"""Wrappers around lm-eval-harness, lmms-eval, inspect-ai, and faster-whisper."""

import ast
import asyncio
import operator
from typing import Any, AsyncIterator


# ─── lm-eval / lmms-eval ──────────────────────────────────────────────────────

async def run_harness_eval(
    model_type: str,
    model_args: str,
    tasks: list[str],
    num_fewshot: int = 0,
    limit: int | None = None,
    device: str = "cpu",
    harness: str = "lm-eval",
) -> dict[str, Any]:
    """Run a single-model evaluation via lm-eval-harness or lmms-eval."""

    def _run():
        if harness == "lmms-eval":
            import lmms_eval
            results = lmms_eval.simple_evaluate(
                model=model_type,
                model_args=model_args,
                tasks=tasks,
                num_fewshot=num_fewshot,
                limit=limit,
                log_samples=False,
            )
        else:
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
        return {
            "results": results.get("results", {}),
            "configs": results.get("configs", {}),
            "versions": results.get("versions", {}),
            "n-shot": results.get("n-shot", {}),
        }

    return await asyncio.get_event_loop().run_in_executor(None, _run)


async def run_harness_compare(
    model_type: str,
    models: list[str],
    tasks: list[str],
    num_fewshot: int = 0,
    limit: int | None = None,
    device: str = "cpu",
    harness: str = "lm-eval",
) -> AsyncIterator[dict[str, Any]]:
    """Run the same benchmark concurrently across all models, streaming results as each finishes.

    All models are evaluated in parallel (thread pool). Results are yielded in
    completion order — whichever model finishes first appears first.
    """
    yield {
        "type": "start",
        "total": len(models),
        "models": models,
        "tasks": tasks,
        "harness": harness,
        "mode": "concurrent",
    }

    task_map: dict[asyncio.Task, str] = {
        asyncio.create_task(
            run_harness_eval(model_type, model_args, tasks, num_fewshot, limit, device, harness)
        ): model_args
        for model_args in models
    }

    comparison: dict[str, dict] = {}
    pending = set(task_map.keys())
    completed = 0

    while pending:
        done, pending = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
        for task in done:
            model_args = task_map[task]
            try:
                result = task.result()
                comparison[model_args] = result
                yield {
                    "type": "model_complete",
                    "model": model_args,
                    "index": completed,
                    "result": result,
                }
            except Exception as e:
                yield {
                    "type": "model_error",
                    "model": model_args,
                    "index": completed,
                    "error": str(e),
                }
            completed += 1

    yield {"type": "complete", "comparison": comparison, "tasks": tasks}


# ─── inspect-ai (agent / tool-use eval) ───────────────────────────────────────

def _safe_math(expression: str) -> str:
    """AST-based safe math evaluator — no eval(), no builtins exposure."""
    _OPS: dict = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.Pow: operator.pow,
        ast.FloorDiv: operator.floordiv,
        ast.Mod: operator.mod,
        ast.USub: operator.neg,
        ast.UAdd: operator.pos,
    }

    def _ev(node: ast.AST) -> float:
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return float(node.value)
        if isinstance(node, ast.BinOp) and type(node.op) in _OPS:
            return _OPS[type(node.op)](_ev(node.left), _ev(node.right))
        if isinstance(node, ast.UnaryOp) and type(node.op) in _OPS:
            return _OPS[type(node.op)](_ev(node.operand))
        raise ValueError(f"Unsupported expression node: {ast.dump(node)}")

    result = _ev(ast.parse(expression, mode="eval").body)
    # Return as int string when result is a whole number
    return str(int(result)) if result == int(result) else str(result)


# Built-in inspect-ai task definitions (loaded lazily inside the executor thread)
def _build_inspect_tasks() -> dict:
    from inspect_ai import Task
    from inspect_ai.dataset import Sample
    from inspect_ai.solver import generate, system_message, use_tools
    from inspect_ai.scorer import includes
    from inspect_ai.tool import tool

    @tool
    def calculator():
        async def execute(expression: str) -> str:
            """Evaluate a math expression and return the result.

            Args:
                expression: A mathematical expression, e.g. '1234 * 5678'.
            """
            try:
                return _safe_math(expression)
            except Exception as exc:
                return f"Error: {exc}"

        return execute

    return {
        "basic_agent": Task(
            dataset=[
                Sample(input="What is 1234 * 5678?", target="7006652"),
                Sample(input="What is 144 divided by 12?", target="12"),
                Sample(input="What is 2 to the power of 10?", target="1024"),
            ],
            solver=[
                system_message(
                    "You are a math agent. Always use the calculator tool for every "
                    "computation — never attempt mental arithmetic."
                ),
                use_tools(calculator()),
                generate(),
            ],
            scorer=includes(),
        ),
    }


async def run_inspect_eval(
    model: str,
    tasks: list[str],
    limit: int | None = 5,
) -> dict[str, Any]:
    """Run agent/tool-use evaluation via inspect-ai.

    Args:
        model: inspect-ai model string, e.g. "ollama/qwen2.5:1.5b".
        tasks: list of task names from the built-in inspect-ai task registry.
        limit: max samples per task.
    """

    def _run() -> dict[str, Any]:
        from inspect_ai import eval as _inspect_eval

        task_registry = _build_inspect_tasks()

        unknown = [t for t in tasks if t not in task_registry]
        if unknown:
            raise ValueError(
                f"Unknown inspect-ai task(s): {unknown}. "
                f"Available: {list(task_registry)}"
            )

        task_objs = [task_registry[t] for t in tasks]
        logs = _inspect_eval(task_objs, model=model, limit=limit)

        all_results: dict[str, dict] = {}
        all_trajectory: list[dict] = []

        for task_name, log in zip(tasks, logs):
            # Extract scalar metrics
            metrics: dict[str, float] = {}
            if log.results and log.results.scores:
                for mn, mv in log.results.scores[0].metrics.items():
                    metrics[mn] = round(float(mv.value), 4)
            all_results[task_name] = metrics

            # Capture step-by-step trajectory from the first sample (PoC)
            if not all_trajectory and log.samples:
                for msg in log.samples[0].messages:
                    content = msg.content
                    if isinstance(content, list):
                        content = " ".join(
                            c.text if hasattr(c, "text") else str(c) for c in content
                        )
                    all_trajectory.append(
                        {"role": str(msg.role), "content": str(content)}
                    )

        return {
            "results": all_results,
            "trajectory": all_trajectory,
            "configs": {},
            "versions": {},
            "n-shot": {},
            "engine": "inspect-ai",
        }

    return await asyncio.get_event_loop().run_in_executor(None, _run)


# ─── faster-whisper (optimised audio ASR) ─────────────────────────────────────

def _strip_whisper_prefix(model_args: str) -> str:
    """Normalize model_args to a bare faster-whisper model size."""
    for prefix in (
        "pretrained=openai/whisper-",
        "pretrained=openai/",
        "pretrained=",
        "openai/whisper-",
        "openai/",
    ):
        if model_args.startswith(prefix):
            return model_args[len(prefix):]
    return model_args


async def run_faster_whisper_eval(
    model_args: str,
    tasks: list[str],
    limit: int | None = 10,
) -> dict[str, Any]:
    """Run ASR evaluation with faster-whisper (CTranslate2/INT8).

    Supports automatic CUDA→CPU fallback and avoids torchcodec by decoding
    audio with soundfile directly.

    Args:
        model_args: Model size string (base/small/medium/large-v3) or a
                    HuggingFace pretrained= argument — the prefix is stripped.
        tasks: List of task names: "librispeech" or "librispeech_other".
        limit: Max audio samples to evaluate.
    """

    def _run() -> dict[str, Any]:
        import io
        import numpy as np
        import soundfile as sf
        import jiwer
        from datasets import load_dataset, Audio
        from faster_whisper import WhisperModel

        model_size = _strip_whisper_prefix(model_args)

        # CUDA→CPU fallback
        device = "cpu"
        compute_type = "int8"
        try:
            import torch

            if torch.cuda.is_available():
                free_vram_gb = torch.cuda.mem_get_info()[0] / 1024 ** 3
                if free_vram_gb > 0.5:
                    device = "cuda"
                    compute_type = "int8_float16"
        except Exception:
            pass

        whisper = WhisperModel(model_size, device=device, compute_type=compute_type)

        _TASK_CONFIG = {
            "librispeech": ("clean", "test"),
            "librispeech_other": ("other", "test"),
        }

        task_results: dict[str, dict] = {}

        for task_name in tasks:
            if task_name not in _TASK_CONFIG:
                raise ValueError(
                    f"faster-whisper does not support task {task_name!r}. "
                    f"Supported: {list(_TASK_CONFIG)}"
                )

            config, split = _TASK_CONFIG[task_name]
            ds = load_dataset("librispeech_asr", config, split=split, streaming=True)
            # Bypass torchcodec — decode with soundfile instead
            ds = ds.cast_column("audio", Audio(decode=False))

            refs: list[str] = []
            hyps: list[str] = []

            for i, sample in enumerate(ds):
                if limit is not None and i >= limit:
                    break
                audio_bytes = sample["audio"]["bytes"]
                arr, _ = sf.read(io.BytesIO(audio_bytes))
                if arr.ndim > 1:
                    arr = arr.mean(axis=1)
                arr = arr.astype(np.float32)

                ref = sample["text"].lower().strip()
                segs, _ = whisper.transcribe(arr, beam_size=1)
                hyp = " ".join(s.text for s in segs).lower().strip()
                refs.append(ref)
                hyps.append(hyp)

            wer = round(jiwer.wer(refs, hyps), 4)
            task_results[task_name] = {
                "wer,none": wer,
                "accuracy,none": round(1.0 - wer, 4),
            }

        return {
            "results": task_results,
            "configs": {},
            "versions": {},
            "n-shot": {},
            "engine": "faster-whisper",
            "device": device,
        }

    return await asyncio.get_event_loop().run_in_executor(None, _run)


# ─── Task catalogue ────────────────────────────────────────────────────────────

def list_available_tasks() -> dict[str, list[str]]:
    return {
        "lm-eval": [
            "mmmu_val", "mmmu_pro",
            "scienceqa_img", "textvqa", "chartqa", "gqa", "realworldqa",
            "hellaswag", "arc_easy", "arc_challenge", "mmlu", "gsm8k",
        ],
        "lmms-eval": [
            "librispeech", "librispeech_other",
            "common_voice_15_en", "common_voice_15_ar", "common_voice_15_fr",
            "fleurs_en_us", "fleurs_ar_eg",
            "voicebench",
            "mmbench_en", "seedbench",
        ],
        "inspect-ai": [
            "basic_agent",
        ],
        "faster-whisper": [
            "librispeech", "librispeech_other",
        ],
    }
