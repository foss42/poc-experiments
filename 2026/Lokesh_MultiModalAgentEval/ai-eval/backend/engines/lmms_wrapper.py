import argparse
import sys
import os
import subprocess
import json
import glob
import shutil

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

    if args.limit is not None:
        cmd.extend(["--limit", str(args.limit)])
        
    env = os.environ.copy()
    env["OPENAI_API_KEY"] = "dummy_key_for_local"
    env["HF_TOKEN"] = os.environ.get("HF_TOKEN", "")
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

        # Parse metrics
        search_path = os.path.join(output_dir, "**", "*.json")
        json_files = glob.glob(search_path, recursive=True)
        
        result_file = None
        for f in json_files:
            if "results" in os.path.basename(f):
                result_file = f
                break
        
        if not result_file:
            print(f"No result json found in {output_dir}")
            sys.exit(1)

        with open(result_file, "r") as f:
            data = json.load(f)

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
            "trajectory": []
        }

        # Print standard output marker for eval_runner to capture
        print(f"[EVAL_RESULT] {json.dumps(eval_result)}")

    finally:
        # CRITICAL: Clean up temp directory
        if os.path.exists(output_dir):
            shutil.rmtree(output_dir, ignore_errors=True)
            print(f"Cleaned up {output_dir}")

if __name__ == "__main__":
    main()
