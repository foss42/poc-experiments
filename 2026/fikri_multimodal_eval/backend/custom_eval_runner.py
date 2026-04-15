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
    """
    suffix = image_path.suffix.lower().lstrip(".")
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
