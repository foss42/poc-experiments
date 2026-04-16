"""Custom dataset evaluation — inference loop and scoring.

Bypasses lm-eval entirely. Encodes images as base64 data URIs,
calls the target provider API directly (Ollama / OpenRouter / HuggingFace),
and scores answers against optional ground truth.
"""

import asyncio
import base64
import os
import re
from pathlib import Path
from typing import AsyncGenerator

import httpx

SESSION_DIR = Path("/tmp/custom_eval")


def make_thumbnail(image_path: Path, size: int = 80) -> str | None:
    """Return a base64 JPEG data-URI thumbnail (80×80), or None on error."""
    try:
        import io
        from PIL import Image as PILImage
        with PILImage.open(image_path) as img:
            img = img.convert("RGB")
            img.thumbnail((size, size), PILImage.LANCZOS)
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=72)
        return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()
    except Exception:
        return None


def encode_image(image_path: Path) -> str:
    """Return a data URI (base64-encoded) for the given image file.

    .jpg and .jpeg both map to MIME type image/jpeg per the spec.
    Raises ValueError if the file has no extension.
    """
    suffix = image_path.suffix.lower().lstrip(".")
    if not suffix:
        raise ValueError(
            f"Cannot determine image type for file with no extension: {image_path}"
        )
    mime = "jpeg" if suffix in ("jpg", "jpeg") else suffix
    data = base64.b64encode(image_path.read_bytes()).decode()
    return f"data:image/{mime};base64,{data}"


def normalize(text: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace."""
    text = text.lower()
    text = re.sub(r"[^\w\s]", "", text)
    return " ".join(text.split())


def score(model_answer: str, ground_truth: str | None) -> bool | None:
    """Return True/False if ground_truth is provided, None otherwise.

    Tries three increasingly lenient strategies:
    1. Exact match after normalization.
    2. Whole-phrase word-boundary match: ground truth appears as a complete
       phrase in the model answer (uses \\b so "cat" does NOT match inside
       "identification").
    3. Soft word overlap: ≥ 50 % of ground-truth words appear individually as
       whole words in the model answer — handles abbreviation expansion
       ("id" → "identification"), verbose answers, and different word order.
    """
    if ground_truth is None:
        return None
    nm = normalize(model_answer)
    ng = normalize(ground_truth)
    if nm == ng:
        return True
    if re.search(r"\b" + re.escape(ng) + r"\b", nm):
        return True
    # Soft word-level overlap
    gt_words = set(ng.split())
    model_words = set(nm.split())
    if gt_words:
        overlap_ratio = len(gt_words & model_words) / len(gt_words)
        if overlap_ratio >= 0.5:
            return True
    return False


async def call_model(
    provider: str,
    model: str,
    image_data_uri: str,
    question: str,
    choices: list[str] | None = None,
) -> str:
    """Dispatch to the correct provider and return the model's text answer."""
    prompt = question
    if choices:
        prompt = f"{question}\nChoices: {', '.join(choices)}"

    if provider == "ollama":
        return await _call_ollama(model, image_data_uri, prompt)
    if provider == "openrouter":
        return await _call_openrouter(model, image_data_uri, prompt)
    if provider == "huggingface":
        return await _call_huggingface(model, image_data_uri, prompt)
    raise ValueError(f"Unknown provider: {provider}")


async def _call_ollama(model: str, image_data_uri: str, prompt: str) -> str:
    ollama_base = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
    # Ollama expects raw base64, not the full data URI
    b64 = image_data_uri.split(",", 1)[1] if "," in image_data_uri else image_data_uri
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt, "images": [b64]}],
        "stream": False,
    }
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(f"{ollama_base}/api/chat", json=payload)
        r.raise_for_status()
        return r.json()["message"]["content"].strip()


async def _call_openrouter(model: str, image_data_uri: str, prompt: str) -> str:
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        raise ValueError("OPENAI_API_KEY env var is required for the openrouter provider")
    base_url = os.getenv("OPENAI_API_BASE", "https://openrouter.ai/api/v1")
    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": image_data_uri}},
                    {"type": "text", "text": prompt},
                ],
            }
        ],
    }
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(
            f"{base_url}/chat/completions",
            json=payload,
            headers={"Authorization": f"Bearer {api_key}"},
        )
        if r.status_code >= 400:
            try:
                body = r.json()
                detail = body.get("error", {}).get("message", r.text[:300])
            except Exception:
                detail = r.text[:300]
            raise RuntimeError(f"OpenRouter {r.status_code}: {detail}")
        return r.json()["choices"][0]["message"]["content"].strip()


async def _call_huggingface(model: str, image_data_uri: str, prompt: str) -> str:
    import io
    from PIL import Image

    b64 = image_data_uri.split(",", 1)[1] if "," in image_data_uri else image_data_uri
    image_bytes = base64.b64decode(b64)
    image = Image.open(io.BytesIO(image_bytes))

    loop = asyncio.get_running_loop()

    def _run() -> list:
        from transformers import pipeline as hf_pipeline
        pipe = hf_pipeline("visual-question-answering", model=model)
        return pipe(image, question=prompt)

    result = await loop.run_in_executor(None, _run)
    return result[0]["answer"] if result else ""


async def run_custom_eval_compare(
    session_id: str,
    samples: list[dict],
    provider: str,
    models: list[str],
    openrouter_api_key: str | None = None,
) -> AsyncGenerator[dict, None]:
    """Run every model over all samples sequentially, streaming per-model events.

    Yields: started → (model_started → (sample|sample_error)×N → model_complete)×M → complete
    """
    has_ground_truth = any(s.get("answer") for s in samples)
    total_models = len(models)
    sdir = SESSION_DIR / session_id

    yield {"type": "started", "total": len(samples) * total_models, "total_models": total_models}

    all_model_results: dict[str, list[dict]] = {}

    # Set OpenRouter env once for all models
    _prev_key = os.environ.get("OPENAI_API_KEY")
    _prev_base = os.environ.get("OPENAI_API_BASE")
    if provider == "openrouter" and openrouter_api_key:
        os.environ["OPENAI_API_KEY"] = openrouter_api_key
        os.environ["OPENAI_API_BASE"] = "https://openrouter.ai/api/v1"

    try:
        for model_index, model in enumerate(models):
            yield {
                "type": "model_started",
                "model": model,
                "model_index": model_index,
                "total_models": total_models,
            }

            correct_count = 0
            model_results: list[dict] = []

            for i, sample in enumerate(samples):
                image_path = sdir / sample["filename"]
                thumbnail = make_thumbnail(image_path)
                try:
                    image_uri = encode_image(image_path)
                    answer = await call_model(
                        provider, model, image_uri,
                        sample["question"], sample.get("choices"),
                    )
                    is_correct = score(answer, sample.get("answer"))
                    if is_correct is True:
                        correct_count += 1
                    event = {
                        "type": "sample",
                        "model": model,
                        "model_index": model_index,
                        "index": i,
                        "total": len(samples),
                        "filename": sample["filename"],
                        "question": sample["question"],
                        "model_answer": answer,
                        "correct": is_correct,
                        **({"thumbnail": thumbnail} if thumbnail else {}),
                    }
                except Exception as e:
                    event = {
                        "type": "sample_error",
                        "model": model,
                        "model_index": model_index,
                        "index": i,
                        "total": len(samples),
                        "filename": sample["filename"],
                        "question": sample["question"],
                        "detail": str(e),
                        **({"thumbnail": thumbnail} if thumbnail else {}),
                    }
                model_results.append(event)
                yield event

            model_complete: dict = {
                "type": "model_complete",
                "model": model,
                "model_index": model_index,
                "results": model_results,
            }
            if has_ground_truth and samples:
                model_complete["accuracy"] = round(correct_count / len(samples), 4)
            all_model_results[model] = model_results
            yield model_complete

    finally:
        if provider == "openrouter" and openrouter_api_key:
            if _prev_key is None:
                os.environ.pop("OPENAI_API_KEY", None)
            else:
                os.environ["OPENAI_API_KEY"] = _prev_key
            if _prev_base is None:
                os.environ.pop("OPENAI_API_BASE", None)
            else:
                os.environ["OPENAI_API_BASE"] = _prev_base

    yield {"type": "complete", "comparison": all_model_results}


async def run_custom_eval(
    session_id: str,
    samples: list[dict],
    provider: str,
    model: str,
    openrouter_api_key: str | None = None,
) -> AsyncGenerator[dict, None]:
    """Iterate samples, call the model, score, and yield SSE-ready dicts.

    Yields: started → (sample | sample_error) × N → complete

    Errors count as wrong answers in accuracy (denominator = total samples).
    """
    _prev_key = os.environ.get("OPENAI_API_KEY")
    _prev_base = os.environ.get("OPENAI_API_BASE")
    if provider == "openrouter" and openrouter_api_key:
        os.environ["OPENAI_API_KEY"] = openrouter_api_key
        os.environ["OPENAI_API_BASE"] = "https://openrouter.ai/api/v1"

    sdir = SESSION_DIR / session_id
    has_ground_truth = any(s.get("answer") for s in samples)

    try:
        yield {"type": "started", "total": len(samples)}

        correct_count = 0
        for i, sample in enumerate(samples):
            image_path = sdir / sample["filename"]
            thumbnail = make_thumbnail(image_path)
            try:
                image_uri = encode_image(image_path)
                answer = await call_model(
                    provider,
                    model,
                    image_uri,
                    sample["question"],
                    sample.get("choices"),
                )
                is_correct = score(answer, sample.get("answer"))
                if is_correct is True:
                    correct_count += 1
                sample_event: dict = {
                    "type": "sample",
                    "index": i,
                    "total": len(samples),
                    "filename": sample["filename"],
                    "question": sample["question"],
                    "model_answer": answer,
                    "correct": is_correct,
                }
                if thumbnail:
                    sample_event["thumbnail"] = thumbnail
                yield sample_event
            except Exception as e:
                err_event: dict = {
                    "type": "sample_error",
                    "index": i,
                    "total": len(samples),
                    "filename": sample["filename"],
                    "question": sample["question"],
                    "detail": str(e),
                }
                if thumbnail:
                    err_event["thumbnail"] = thumbnail
                yield err_event

        complete: dict = {"type": "complete"}
        if has_ground_truth and samples:
            complete["accuracy"] = round(correct_count / len(samples), 4)
        yield complete

    finally:
        if provider == "openrouter" and openrouter_api_key:
            if _prev_key is None:
                os.environ.pop("OPENAI_API_KEY", None)
            else:
                os.environ["OPENAI_API_KEY"] = _prev_key
            if _prev_base is None:
                os.environ.pop("OPENAI_API_BASE", None)
            else:
                os.environ["OPENAI_API_BASE"] = _prev_base
