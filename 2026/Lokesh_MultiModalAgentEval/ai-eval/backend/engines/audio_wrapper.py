import argparse
import json
import io
import numpy as np
import soundfile as sf
import jiwer
import torch
from datasets import load_dataset, Audio
from faster_whisper import WhisperModel


def run_audio_eval(model_size: str, limit: int, run_id: str):

    for prefix in ("openai/whisper-", "whisper-"):
        if model_size.startswith(prefix):
            model_size = model_size[len(prefix):]
            break

    if torch.cuda.is_available():
        free_vram_gb = torch.cuda.mem_get_info()[0] / 1024**3
        device = "cuda" if free_vram_gb > 0.5 else "cpu"
        compute_type = "int8_float16" if device == "cuda" else "int8"
        print(f"[audio_eval] Device: {device} | Free VRAM: {free_vram_gb:.2f}GB")
    else:
        device = "cpu"
        compute_type = "int8"
        print("[audio_eval] Device: cpu")

    print(f"[audio_eval] Loading whisper-{model_size}...")
    model = WhisperModel(model_size, device=device, compute_type=compute_type)

    print(f"[audio_eval] Streaming LibriSpeech test-clean (limit={limit})...")
    ds = load_dataset(
        "librispeech_asr",
        "clean",
        split="test",
        streaming=True,
    )
    # Bypass torchcodec entirely — broken DLL on Windows
    ds = ds.cast_column("audio", Audio(decode=False))

    references = []
    hypotheses = []

    for i, sample in enumerate(ds):
        if i >= limit:
            break

        # Manual decode with soundfile — no torchcodec needed
        audio_bytes = sample["audio"]["bytes"]
        audio_array, sample_rate = sf.read(io.BytesIO(audio_bytes))
        if audio_array.ndim > 1:
            audio_array = audio_array.mean(axis=1)
        audio_array = audio_array.astype(np.float32)

        reference = sample["text"].lower().strip()
        segments, _ = model.transcribe(audio_array, beam_size=1)
        hypothesis = " ".join(s.text for s in segments).lower().strip()

        references.append(reference)
        hypotheses.append(hypothesis)

        print(f"[audio_eval] {i+1}/{limit} | REF: {reference[:60]}")
        print(f"[audio_eval] {i+1}/{limit} | HYP: {hypothesis[:60]}")

    wer_score = jiwer.wer(references, hypotheses)
    accuracy = round(1 - wer_score, 4)
    wer_score = round(wer_score, 4)

    assert 0.0 <= wer_score <= 2.0, f"Suspicious WER value: {wer_score}"

    print(f"[audio_eval] WER: {wer_score} | Accuracy: {accuracy}")

    result = {
        "run_id": run_id,
        "model": f"whisper-{model_size}",
        "modality": "audio",
        "task": "librispeech",
        "engine": "faster-whisper",
        "metrics": {
            "accuracy": accuracy,
            "wer": wer_score,
        },
        "trajectory": []
    }

    print(f"[EVAL_RESULT] {json.dumps(result)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="base")
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--run_id", required=True)
    parser.add_argument("--task", default="librispeech")
    parser.add_argument("--modality", default="audio")
    args = parser.parse_args()
    run_audio_eval(args.model, args.limit, args.run_id)