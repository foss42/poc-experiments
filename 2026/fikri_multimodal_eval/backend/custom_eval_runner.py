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

    Exact match is checked first; substring match handles verbose model answers
    (e.g. "I think it is a cat" matches ground truth "cat").
    """
    if ground_truth is None:
        return None
    nm = normalize(model_answer)
    ng = normalize(ground_truth)
    return nm == ng or ng in nm


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
        r.raise_for_status()
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
