from inspect_ai import task, Task
from inspect_ai.dataset import Sample
from inspect_ai.solver import generate, system_message, use_tools
from inspect_ai.scorer import exact, includes, match
import argparse
import sys
import os
import subprocess
import glob
import json
import shutil
from inspect_ai.tool import tool

# Mock dataset for the basic_agent task
dataset=[
            Sample(input="What is 1234 * 5678?", target="7006652"),
            Sample(input="What is 144 divided by 12?", target="12"),
            Sample(input="What is 2 to the power of 10?", target="1024"),
]

# We must name the task identically to what the router requests ("basic_agent")
@tool
def calculator():
    async def execute(expression: str) -> str:
        """Evaluate a math expression and return the numeric result.

        Args:
            expression: A mathematical expression to evaluate, e.g. '1234 * 5678' or '144 / 12'.
        """
        try:
            result = eval(expression, {"__builtins__": {}}, {})
            return str(result)
        except Exception as e:
            return f"Error: {e}"
    return execute

@task
def basic_agent():
    return Task(
        dataset=dataset,
        solver=[
            system_message("You are an agent. Always use the calculator tool for math problems. Do not attempt mental math."),
            use_tools(calculator()),
            generate()
        ],
        scorer=includes(),
    )
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--run_id", required=False)
    parser.add_argument("--model", required=False)
    parser.add_argument("--task", required=False)
    parser.add_argument("--modality", required=False)
    parser.add_argument("--limit", type=int, default=None)
    args, unknown = parser.parse_known_args()
    
    # If not invoked with run_id, might be imported/run by inspect directly
    if not args.run_id:
        return

    output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".temp_results", args.run_id))
    os.makedirs(output_dir, exist_ok=True)
    
    # Run the inspect eval CLI over this file
    wrapper_path = os.path.abspath(__file__)
    cmd = [
        sys.executable, "-m", "inspect_ai", "eval", f"{wrapper_path}@{args.task}",
        "--model", f"ollama/{args.model}",
        "--log-dir", output_dir,
        "--log-format", "json",
        "--cache-prompt=false"
    ]
    if args.limit is not None:
        cmd.extend(["--limit", str(args.limit)])
        
    env = os.environ.copy()
    env["OLLAMA_BASE_URL"] = "http://localhost:11434/v1"  # Must include /v1 - inspect_ai reads this to override Ollama's service_base_url
    env["OPENAI_API_KEY"] = "dummy_key_for_local"
    env["HF_TOKEN"] = os.getenv("HF_TOKEN")
    env["HF_HOME"] = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".hf_cache"))
    env["HF_DATASETS_CACHE"] = env["HF_HOME"]
    env["HUGGINGFACE_HUB_CACHE"] = env["HF_HOME"]
    env["HF_HUB_ENABLE_HF_TRANSFER"] = "1"
    
    print(f"Running command: {' '.join(cmd)}")
    
    try:
        process = subprocess.Popen(
            cmd,
            stdout=sys.stdout,
            stderr=sys.stderr,
            text=True,
            env=env
        )
        process.wait()
        
        if process.returncode != 0:
            print("inspect eval process failed")
            sys.exit(process.returncode)
            
        search_path = os.path.join(output_dir, "**", "*.json")
        json_files = glob.glob(search_path, recursive=True)
        
        if not json_files:
            print(f"No result json found in {output_dir}")
            sys.exit(1)
            
        with open(json_files[0], "r") as f:
            data = json.load(f)
            
        trajectory = []
        metrics = {}
        
        # Parse step-by-step samples log to build timeline trajectory
        if "samples" in data and len(data["samples"]) > 0:
            # For trajectory we fetch the first sample for proof-of-concept
            messages = data["samples"][0].get("messages", [])
            for msg in messages:
                trajectory.append({
                    "role": msg.get("role"),
                    "content": msg.get("content"),
                    "source": msg.get("source")
                })
        
        # Parse metrics
        if "results" in data and "scores" in data["results"]:
            scores = data["results"]["scores"]
            if scores:
                for metric_name, metric_data in scores[0].get("metrics", {}).items():
                    metrics[metric_name] = metric_data.get("value", 0.0)
                    
        eval_result = {
            "run_id": args.run_id,
            "model": args.model,
            "modality": args.modality,
            "task": args.task,
            "engine": "inspect-ai",
            "metrics": metrics,
            "trajectory": trajectory
        }
        
        # Pipe to SSE Queue
        print(f"[EVAL_RESULT] {json.dumps(eval_result)}")
        
    finally:
        if os.path.exists(output_dir):
            shutil.rmtree(output_dir, ignore_errors=True)
            print(f"Cleaned up {output_dir}")

if __name__ == "__main__":
    main()
