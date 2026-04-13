import argparse
import sys
import os
import subprocess
import json
import glob
import shutil
import base64
import io
from typing import Any, Dict, List, Optional, Tuple


def _extract_base64_image(sample: Dict[str, Any]) -> Tuple[Optional[str], Optional[str]]:
    """
    Extract an image payload from lmms-eval sample records.
    Returns (base64_data, mime_type).
    """
    # Legacy path sometimes used by wrappers.
    doc = sample.get("doc", {}) or {}
    image = doc.get("image")
    if isinstance(image, str):
        if image.startswith("data:image/"):
            header, _, payload = image.partition(",")
            mime = header.replace("data:", "").replace(";base64", "")
            return payload, mime or "image/jpeg"
        return image, "image/jpeg"

    # OpenAI-style vision messages payload.
    messages = sample.get("messages", [])
    for msg in messages:
        content = msg.get("content")
        if not isinstance(content, list):
            continue
        for chunk in content:
            if not isinstance(chunk, dict) or chunk.get("type") != "image_url":
                continue
            image_url = chunk.get("image_url", {})
            if isinstance(image_url, dict):
                url = image_url.get("url", "")
            else:
                url = image_url
            if isinstance(url, str) and url.startswith("data:image/"):
                header, _, payload = url.partition(",")
                mime = header.replace("data:", "").replace(";base64", "")
                return payload, mime or "image/jpeg"
    return None, None


def _extract_prediction(sample: Dict[str, Any]) -> Optional[str]:
    for key in ("prediction", "pred", "model_answer", "answer"):
        value = sample.get(key)
        if isinstance(value, str):
            return value.strip()
    for key in ("resps", "filtered_resps"):
        value = sample.get(key)
        if isinstance(value, list) and value:
            first = value[0]
            if isinstance(first, str):
                return first.strip()
            if isinstance(first, list) and first and isinstance(first[0], str):
                return first[0].strip()
    return None


def _extract_target(sample: Dict[str, Any]) -> Optional[str]:
    doc = sample.get("doc", {}) or {}
    for key in ("target", "label", "answer", "gold"):
        value = sample.get(key)
        if isinstance(value, str):
            return value.strip()
        doc_value = doc.get(key)
        if isinstance(doc_value, str):
            return doc_value.strip()
    return None


def _extract_question(sample: Dict[str, Any]) -> Optional[str]:
    value = sample.get("input")
    if isinstance(value, str):
        return value.strip()
    doc = sample.get("doc", {}) or {}
    for key in ("question", "query", "text"):
        doc_value = doc.get(key)
        if isinstance(doc_value, str):
            return doc_value.strip()
    return None


def _extract_is_correct(sample: Dict[str, Any], prediction: Optional[str], target: Optional[str]) -> Optional[bool]:
    for key in ("is_correct", "correct", "passed", "acc", "exact_match"):
        value = sample.get(key)
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            return value >= 1
    for key in ("pope_accuracy", "accuracy"):
        value = sample.get(key)
        if isinstance(value, dict):
            score = value.get("score")
            if isinstance(score, (int, float)):
                return score >= 1
    if prediction is not None and target is not None:
        return prediction.lower() == target.lower()
    return None


def _pil_image_to_base64(image_obj: Any) -> Tuple[Optional[str], Optional[str]]:
    try:
        from PIL import Image  # Local import to avoid hard dependency at module import time.

        if isinstance(image_obj, Image.Image):
            if image_obj.mode not in ("RGB", "L"):
                image_obj = image_obj.convert("RGB")
            elif image_obj.mode == "L":
                image_obj = image_obj.convert("RGB")
            buffer = io.BytesIO()
            image_obj.save(buffer, format="JPEG")
            return base64.b64encode(buffer.getvalue()).decode("utf-8"), "image/jpeg"
    except Exception:
        return None, None
    return None, None


def _get_pope_image_by_doc_id(
    doc_id: Any,
    image_cache: Dict[int, Tuple[str, str]],
    dataset_holder: Dict[str, Any]
) -> Tuple[Optional[str], Optional[str]]:
    if not isinstance(doc_id, int):
        return None, None
    if doc_id in image_cache:
        return image_cache[doc_id]
    try:
        if "dataset" not in dataset_holder:
            from datasets import load_dataset
            dataset_holder["dataset"] = load_dataset("lmms-lab/POPE", split="test")
        dataset = dataset_holder["dataset"]
        sample = dataset[doc_id]
        image_obj = sample.get("image")
        image_b64, mime = _pil_image_to_base64(image_obj)
        if image_b64:
            image_cache[doc_id] = (image_b64, mime or "image/jpeg")
            return image_cache[doc_id]
    except Exception:
        return None, None
    return None, None

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--run_id", required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--task", required=True)
    parser.add_argument("--modality", required=True)
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()

    # Determine lmms-eval model arguments based on modality
    if args.modality in ["text", "vision"]:
        # User specified: Try to get the local testing working against ollama
        # Use openai interface targeting localhost:11434
        lmms_model = "openai"
        model_args = f"model={args.model},base_url=http://localhost:11434/v1"
    elif args.modality == "audio":
        # Use lmms-eval's built-in 'whisper' simple model for ASR tasks
        # Note: 'hf' is NOT a registered alias; the correct name is 'whisper'
        lmms_model = "whisper"
        model_args = "pretrained=openai/whisper-tiny"
    else:
        print(f"Unsupported modality {args.modality} in lmms_wrapper")
        sys.exit(1)

    # Write to a location definitively outside the uvicorn `backend/` watch folder
    output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".temp_results", args.run_id))

    # Build the lmms-eval command using sys.executable explicitly
    cmd = [
        sys.executable, "-m", "lmms_eval",
        "--model", lmms_model,
        "--model_args", model_args,
        "--tasks", args.task,
        "--output_path", output_dir,
        "--verbosity", "DEBUG"
    ]
    if args.modality == "vision":
        # Required to generate per-sample artifacts (including image-bearing records).
        cmd.append("--log_samples")

    if args.limit is not None:
        cmd.extend(["--limit", str(args.limit)])
        
    env = os.environ.copy()
    env["OPENAI_API_KEY"] = "dummy_key_for_local"
    env["HF_TOKEN"] = os.getenv("HF_TOKEN")
    env["HF_HOME"] = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".hf_cache"))
    env["HF_DATASETS_CACHE"] = env["HF_HOME"]
    env["HUGGINGFACE_HUB_CACHE"] = env["HF_HOME"]
    env["HF_HUB_ENABLE_HF_TRANSFER"] = "1"
    env["HF_HUB_DISABLE_TELEMETRY"] = "1"
    env["PYTHONUTF8"] = "1"
    env["PYTHONIOENCODING"] = "utf-8"

    print(f"Running command: {' '.join(cmd)}")

    try:
        # Run subprocess
        process = subprocess.Popen(
            cmd,
            stdout=sys.stdout,
            stderr=sys.stderr, # print directly to wrapper's stdout, which eval_runner pipes to SSE
            text=True,
            env=env
        )
        process.wait()
        
        if process.returncode != 0:
            print("lmms_eval process failed")
            sys.exit(process.returncode)

        # Parse metrics and samples.
        json_files = glob.glob(os.path.join(output_dir, "**", "*.json"), recursive=True)
        jsonl_files = glob.glob(os.path.join(output_dir, "**", "*.jsonl"), recursive=True)
        all_result_files = [*json_files, *jsonl_files]
        
        result_file = None
        for f in json_files:
            if os.path.basename(f).endswith("_results.json"):
                result_file = f
                break
        
        if not result_file:
            print(f"No result json found in {output_dir}")
            sys.exit(1)

        samples_file = next(
            (f for f in all_result_files if "samples" in os.path.basename(f).lower()),
            None
        )

        input_preview = None
        vision_samples: List[Dict[str, Any]] = []
        pope_image_cache: Dict[int, Tuple[str, str]] = {}
        pope_dataset_holder: Dict[str, Any] = {}
        if samples_file and args.modality == "vision":
            with open(samples_file, "r") as f:
                for idx, line in enumerate(f):
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        sample = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    image_b64, mime_type = _extract_base64_image(sample)
                    if not image_b64 and args.task == "pope":
                        image_b64, mime_type = _get_pope_image_by_doc_id(
                            sample.get("doc_id"), pope_image_cache, pope_dataset_holder
                        )
                    if not image_b64:
                        continue

                    prediction = _extract_prediction(sample)
                    target = _extract_target(sample)
                    question = _extract_question(sample)
                    is_correct = _extract_is_correct(sample, prediction, target)

                    if input_preview is None:
                        input_preview = image_b64

                    vision_samples.append({
                        "id": sample.get("doc_id", idx),
                        "image_base64": image_b64,
                        "image_mime_type": mime_type or "image/jpeg",
                        "prediction": prediction,
                        "target": target,
                        "question": question,
                        "is_correct": is_correct,
                    })

        with open(result_file, "r") as f:
            data = json.load(f)

        # Fallback: some tasks put sample records directly in results JSON.
        if args.modality == "vision" and not vision_samples:
            embedded_samples = data.get("samples", [])
            if isinstance(embedded_samples, list):
                for idx, sample in enumerate(embedded_samples):
                    if not isinstance(sample, dict):
                        continue
                    image_b64, mime_type = _extract_base64_image(sample)
                    if not image_b64 and args.task == "pope":
                        image_b64, mime_type = _get_pope_image_by_doc_id(
                            sample.get("doc_id"), pope_image_cache, pope_dataset_holder
                        )
                    if not image_b64:
                        continue
                    prediction = _extract_prediction(sample)
                    target = _extract_target(sample)
                    question = _extract_question(sample)
                    is_correct = _extract_is_correct(sample, prediction, target)
                    if input_preview is None:
                        input_preview = image_b64
                    vision_samples.append({
                        "id": sample.get("doc_id", idx),
                        "image_base64": image_b64,
                        "image_mime_type": mime_type or "image/jpeg",
                        "prediction": prediction,
                        "target": target,
                        "question": question,
                        "is_correct": is_correct,
                    })

        # Extract metrics
        results_info = data.get("results", {})
        task_metrics = results_info.get(args.task, {})
        
        # Build EvalResult standard structure
        eval_result = {
            "run_id": args.run_id,
            "model": args.model,
            "modality": args.modality,
            "task": args.task,
            "engine": "lmms-eval",
            "metrics": task_metrics,
            "trajectory": [],
            "input_preview": input_preview,
            "vision_samples": vision_samples
        }

        # Print standard output marker for eval_runner to capture
        print(f"[EVAL_RESULT] {json.dumps(eval_result)}")

    finally:
        keep_artifacts = os.environ.get("KEEP_LMMS_ARTIFACTS", "").lower() in {"1", "true", "yes"}
        # CRITICAL: Clean up temp directory unless explicitly debugging.
        if os.path.exists(output_dir) and not keep_artifacts:
            shutil.rmtree(output_dir, ignore_errors=True)
            print(f"Cleaned up {output_dir}")
        elif keep_artifacts:
            print(f"Keeping artifacts at {output_dir}")

if __name__ == "__main__":
    main()
