import os
import subprocess
import asyncio
import json
import threading
import sys
from schemas import EvalRequest

TASK_REGISTRY = {
    # Generative Tasks handled by LMMS-EVAL
    "gsm8k":        {"engine": "lmms_wrapper",   "modality": "text"},
    "mmlu_pro":     {"engine": "lmms_wrapper",   "modality": "text"},
    "pope":         {"engine": "lmms_wrapper",   "modality": "vision"},

    # Audio ASR handled by faster-whisper (audio_wrapper)
    "librispeech":  {"engine": "audio_wrapper",  "modality": "audio"},

    # Agent/Tool-Use Tasks handled by INSPECT-AI
    "basic_agent":  {"engine": "inspect_wrapper", "modality": "agent"},
}

def run_evaluation_thread(run_id: str, req: EvalRequest, queue: asyncio.Queue, loop: asyncio.AbstractEventLoop, results_store: dict):
    try:
        # Assuming only first task is handled for now per evaluation request
        task = req.tasks[0] if req.tasks else "pope"
        task_info = TASK_REGISTRY.get(task)
        
        if not task_info:
            raise ValueError(f"Task {task} not found in registry")

        engine = task_info["engine"]
        modality = task_info["modality"]

        wrapper_path = os.path.join(os.path.dirname(__file__), "engines", f"{engine}.py")
        
        if not os.path.exists(wrapper_path):
            raise FileNotFoundError(f"Wrapper not found: {wrapper_path}")

        # Construct arguments using explicit sys.executable to ensure virtual env inheritance
        cmd = [
            sys.executable, wrapper_path,
            "--run_id", run_id,
            "--model", req.model,
            "--task", task,
            "--modality", modality
        ]
        
        if req.limit is not None:
            cmd.extend(["--limit", str(req.limit)])

        if req.api_key:
            os.environ["OPENAI_API_KEY"] = req.api_key

        # Override the Python IO encoding for Windows environments where tables print \u2191 arrows
        popen_env = os.environ.copy()
        popen_env["PYTHONIOENCODING"] = "utf-8"

        # Force massive download caches outside of Uvicorn's view absolutely.
        external_cache = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".hf_cache"))
        popen_env["HF_HOME"] = external_cache
        popen_env["HF_DATASETS_CACHE"] = external_cache
        popen_env["HUGGINGFACE_HUB_CACHE"] = external_cache

        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            bufsize=1,
            env=popen_env,
            cwd=os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        )

        final_result = None

        for line in iter(process.stdout.readline, ''):
            line = line.strip()
            if not line:
                continue

            if line.startswith("[EVAL_RESULT]"):
                # Extract the JSON result pushed out by the wrapper
                try:
                    result_json = line.replace("[EVAL_RESULT]", "").strip()
                    final_result = json.loads(result_json)
                except Exception as e:
                    asyncio.run_coroutine_threadsafe(queue.put(f"[EVAL_ERROR] Error parsing output: {e}"), loop)
            else:
                # Pipe regular logs
                asyncio.run_coroutine_threadsafe(queue.put(line), loop)

        process.stdout.close()
        process.wait()

        if process.returncode != 0:
            raise Exception(f"Subprocess terminated with code {process.returncode}")

        if final_result:
            results_store[run_id] = {"status": "completed", "data": final_result}
            asyncio.run_coroutine_threadsafe(queue.put("[EVAL_DONE]"), loop)
        else:
            raise Exception("Completed, but no [EVAL_RESULT] was returned by wrapper.")

    except Exception as e:
        results_store[run_id] = {"status": "error", "error": str(e)}
        asyncio.run_coroutine_threadsafe(queue.put(f"[EVAL_ERROR] {str(e)}"), loop)