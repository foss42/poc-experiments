"""Multimodal evaluation runner for image (Ollama, LM Studio, HuggingFace, OpenAI VLMs) and audio (Whisper STT).

Uses existing libraries for metrics — not a custom eval engine.
- Image: Multiple providers with OpenAI-compatible API + rouge-score/nltk
- Audio: openai-whisper + jiwer for WER/CER
"""

import asyncio
import base64
import json
import tempfile
import time
from pathlib import Path
from typing import Any, AsyncIterator

import httpx
from jiwer import wer, cer
from rouge_score.rouge_scorer import RougeScorer
from nltk.translate.bleu_score import sentence_bleu, SmoothingFunction

from config import (
    OLLAMA_BASE_URL,
    LMSTUDIO_BASE_URL,
    WHISPER_MODEL,
    HF_TOKEN,
    HF_INFERENCE_URL,
    OPENAI_API_KEY,
)

SAMPLE_DIR = Path(__file__).parent / "sample_data"


# ─── Image Evaluation (Multi-Provider Vision Models) ────────────────────────


async def run_image_eval(
    model: str,
    dataset_path: str | None = None,
    provider: str = "ollama",
) -> AsyncIterator[dict[str, Any]]:
    """Evaluate a vision model on image VQA using multi-provider support."""
    dataset = _load_json(dataset_path or str(SAMPLE_DIR / "image_vqa.json"))
    base_dir = Path(dataset_path).parent if dataset_path else SAMPLE_DIR
    total = len(dataset)
    scorer = RougeScorer(["rougeL"], use_stemmer=True)
    smooth = SmoothingFunction().method1

    yield {
        "type": "start",
        "total": total,
        "modality": "image",
        "model": model,
        "provider": provider,
    }

    results = []
    for i, sample in enumerate(dataset):
        img_path = base_dir / sample["image"]
        img_b64 = base64.b64encode(img_path.read_bytes()).decode()

        start = time.perf_counter()
        predicted = await _vision_inference(
            provider, model, img_b64, sample["question"]
        )
        latency = round((time.perf_counter() - start) * 1000, 1)

        expected = sample["expected_answer"]
        rouge_l = scorer.score(expected, predicted)["rougeL"].fmeasure
        bleu = sentence_bleu(
            [expected.lower().split()],
            predicted.lower().split(),
            smoothing_function=smooth,
        )

        result = {
            "sample_id": i,
            "image": sample["image"],
            "question": sample["question"],
            "expected": expected,
            "predicted": predicted,
            "rouge_l": round(rouge_l, 4),
            "bleu": round(bleu, 4),
            "latency_ms": latency,
            "provider": provider,
        }
        results.append(result)
        yield {"type": "progress", "current": i + 1, "total": total, "result": result}

    yield {
        "type": "complete",
        "summary": {
            "model": model,
            "modality": "image",
            "samples": total,
            "avg_rouge_l": round(sum(r["rouge_l"] for r in results) / total, 4),
            "avg_bleu": round(sum(r["bleu"] for r in results) / total, 4),
            "avg_latency_ms": round(sum(r["latency_ms"] for r in results) / total, 1),
            "provider": provider,
        },
        "results": results,
    }


async def run_multi_provider_image_eval(
    providers: list[dict[str, str]],
    dataset_path: str | None = None,
) -> AsyncIterator[dict[str, Any]]:
    """Run image eval on multiple providers/models for side-by-side comparison."""
    dataset = _load_json(dataset_path or str(SAMPLE_DIR / "image_vqa.json"))
    base_dir = Path(dataset_path).parent if dataset_path else SAMPLE_DIR
    total = len(dataset)
    scorer = RougeScorer(["rougeL"], use_stemmer=True)
    smooth = SmoothingFunction().method1

    provider_keys = [f"{p['provider']}:{p['model']}" for p in providers]
    yield {
        "type": "start",
        "total": total,
        "modality": "image",
        "providers": provider_keys,
    }

    all_results: dict[str, list] = {pk: [] for pk in provider_keys}

    for i, sample in enumerate(dataset):
        img_path = base_dir / sample["image"]
        img_b64 = base64.b64encode(img_path.read_bytes()).decode()
        expected = sample["expected_answer"]

        sample_results = {}
        for p in providers:
            provider, model = p["provider"], p["model"]
            key = f"{provider}:{model}"

            start = time.perf_counter()
            predicted = await _vision_inference(
                provider, model, img_b64, sample["question"]
            )
            latency = round((time.perf_counter() - start) * 1000, 1)

            rouge_l = scorer.score(expected, predicted)["rougeL"].fmeasure
            bleu = sentence_bleu(
                [expected.lower().split()],
                predicted.lower().split(),
                smoothing_function=smooth,
            )

            result = {
                "sample_id": i,
                "image": sample["image"],
                "question": sample["question"],
                "expected": expected,
                "predicted": predicted,
                "rouge_l": round(rouge_l, 4),
                "bleu": round(bleu, 4),
                "latency_ms": latency,
                "provider": provider,
                "model": model,
            }
            all_results[key].append(result)
            sample_results[key] = result

        yield {
            "type": "progress",
            "current": i + 1,
            "total": total,
            "results": sample_results,
        }

    summaries = {}
    for key, results in all_results.items():
        summaries[key] = {
            "model": results[0]["model"],
            "provider": results[0]["provider"],
            "samples": total,
            "avg_rouge_l": round(sum(r["rouge_l"] for r in results) / total, 4),
            "avg_bleu": round(sum(r["bleu"] for r in results) / total, 4),
            "avg_latency_ms": round(sum(r["latency_ms"] for r in results) / total, 1),
        }

    yield {
        "type": "complete",
        "comparison": True,
        "summaries": summaries,
        "results": all_results,
    }


async def _vision_inference(
    provider: str, model: str, image_b64: str, prompt: str
) -> str:
    """Route vision inference to the appropriate provider."""
    if provider == "ollama":
        return await _ollama_vision(model, image_b64, prompt)
    elif provider == "lmstudio":
        return await _lmstudio_vision(model, image_b64, prompt)
    elif provider == "huggingface":
        return await _huggingface_vision(model, image_b64, prompt)
    elif provider == "openai":
        return await _openai_vision(model, image_b64, prompt)
    else:
        raise ValueError(
            f"Unknown provider: {provider}. Supported: ollama, lmstudio, huggingface, openai"
        )


async def _ollama_vision(model: str, image_b64: str, prompt: str) -> str:
    """Call Ollama API for vision models."""
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "images": [image_b64],
                "stream": False,
            },
        )
        resp.raise_for_status()
        return resp.json().get("response", "").strip()


async def _lmstudio_vision(model: str, image_b64: str, prompt: str) -> str:
    """Call LM Studio OpenAI-compatible API for vision models."""
    async with httpx.AsyncClient(timeout=120) as client:
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"},
                        },
                    ],
                }
            ],
            "max_tokens": 512,
            "temperature": 0.1,
        }
        resp = await client.post(
            f"{LMSTUDIO_BASE_URL}/chat/completions",
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()


async def _huggingface_vision(model: str, image_b64: str, prompt: str) -> str:
    """Call HuggingFace Inference API for vision-language models."""
    if not HF_TOKEN:
        raise ValueError("HF_TOKEN environment variable required for HuggingFace VLMs")

    image_bytes = base64.b64decode(image_b64)

    async with httpx.AsyncClient(timeout=120) as client:
        url = f"{HF_INFERENCE_URL}/{model}"
        headers = {"Authorization": f"Bearer {HF_TOKEN}"}

        resp = await client.post(
            url,
            headers=headers,
            content=image_bytes,
            params={"task": "image-to-text"},
        )

        if resp.status_code == 503:
            await asyncio.sleep(5)
            resp = await client.post(url, headers=headers, content=image_bytes)

        if not resp.ok:
            error_detail = resp.text[:200] if resp.text else "Unknown error"
            raise RuntimeError(f"HF API error {resp.status_code}: {error_detail}")

        data = resp.json()
        if isinstance(data, list) and len(data) > 0:
            if "generated_text" in data[0]:
                return data[0]["generated_text"].strip()
            return str(data[0]).strip()
        elif isinstance(data, dict) and "generated_text" in data:
            return data["generated_text"].strip()
        return str(data).strip()


async def _openai_vision(model: str, image_b64: str, prompt: str) -> str:
    """Call OpenAI API for GPT-4 Vision models."""
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY environment variable required for OpenAI")

    async with httpx.AsyncClient(timeout=120) as client:
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"},
                        },
                    ],
                }
            ],
            "max_tokens": 512,
        }
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()


# ─── Audio Evaluation (Whisper STT + jiwer) ────────────────────────────────


async def run_audio_eval(
    model: str | None = None, dataset_path: str | None = None
) -> AsyncIterator[dict[str, Any]]:
    """Evaluate Whisper STT accuracy using jiwer WER/CER metrics."""
    whisper_model_name = model or WHISPER_MODEL
    dataset = _load_json(dataset_path or str(SAMPLE_DIR / "audio_stt.json"))
    base_dir = Path(dataset_path).parent if dataset_path else SAMPLE_DIR
    total = len(dataset)

    # Load faster-whisper model once (in thread pool — it's heavy)
    from faster_whisper import WhisperModel

    whisper_model = await asyncio.get_event_loop().run_in_executor(
        None,
        lambda: WhisperModel(whisper_model_name, device="cpu", compute_type="int8"),
    )

    yield {
        "type": "start",
        "total": total,
        "modality": "audio",
        "model": whisper_model_name,
    }

    results = []
    for i, sample in enumerate(dataset):
        audio_path = str(base_dir / sample["audio"])

        start = time.perf_counter()
        segments, _info = await asyncio.get_event_loop().run_in_executor(
            None, lambda: whisper_model.transcribe(audio_path)
        )
        predicted_parts = await asyncio.get_event_loop().run_in_executor(
            None, lambda: [seg.text for seg in segments]
        )
        latency = round((time.perf_counter() - start) * 1000, 1)

        predicted = " ".join(predicted_parts).strip()
        reference = sample["reference"]

        sample_wer = wer(reference.lower(), predicted.lower()) if predicted else 1.0
        sample_cer = cer(reference.lower(), predicted.lower()) if predicted else 1.0

        result = {
            "sample_id": i,
            "audio": sample["audio"],
            "reference": reference,
            "predicted": predicted,
            "wer": round(sample_wer, 4),
            "cer": round(sample_cer, 4),
            "latency_ms": latency,
        }
        results.append(result)
        yield {"type": "progress", "current": i + 1, "total": total, "result": result}

    yield {
        "type": "complete",
        "summary": {
            "model": whisper_model_name,
            "modality": "audio",
            "samples": total,
            "avg_wer": round(sum(r["wer"] for r in results) / total, 4),
            "avg_cer": round(sum(r["cer"] for r in results) / total, 4),
            "avg_latency_ms": round(sum(r["latency_ms"] for r in results) / total, 1),
        },
        "results": results,
    }


# ─── Helpers ───────────────────────────────────────────────────────────────


def _load_json(path: str) -> list[dict]:
    return json.loads(Path(path).read_text())
