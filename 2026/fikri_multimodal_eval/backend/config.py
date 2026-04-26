import os

# ─── Provider Configuration ───────────────────────────────────────────────────

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
LMSTUDIO_BASE_URL = os.getenv("LMSTUDIO_BASE_URL", "http://localhost:1234/v1")
HF_TOKEN = os.getenv("HF_TOKEN", "")
HF_INFERENCE_URL = os.getenv(
    "HF_INFERENCE_URL", "https://api-inference.huggingface.co/models"
)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base")
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8001"))

# ─── Supported Vision Model Providers ──────────────────────────────────────────

SUPPORTED_VLM_PROVIDERS = {
    "ollama": {
        "name": "Ollama",
        "models": ["llava", "llava:13b", "bakllava", "moondream", "minicpm-v"],
        "requires_api_key": False,
        "supports_multimodal": True,
        "description": "Local Ollama vision models (llava, moondream, etc.)",
    },
    "lmstudio": {
        "name": "LM Studio",
        "models": [],  # Dynamically loaded from LM Studio server
        "requires_api_key": False,
        "supports_multimodal": True,
        "description": "LM Studio local server with OpenAI-compatible API",
    },
    "huggingface": {
        "name": "HuggingFace",
        "models": [
            "HuggingFaceTB/SmolVLM-256M-Instruct",
            "HuggingFaceTB/SmolVLM-500M-Instruct",
            "Salesforce/blip2-opt-2.7b",
            "Salesforce/blip2-opt-6.7b",
            "microsoft/kosmos-2-patch14-224",
        ],
        "requires_api_key": True,
        "supports_multimodal": True,
        "description": "HuggingFace Inference API (requires HF_TOKEN)",
    },
    "openai": {
        "name": "OpenAI",
        "models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
        "requires_api_key": True,
        "supports_multimodal": True,
        "description": "OpenAI GPT-4 Vision models (requires OPENAI_API_KEY)",
    },
}

# ─── Supported Text/LLM Providers (for harness benchmarks) ────────────────────

SUPPORTED_LLM_PROVIDERS = {
    "ollama": {
        "name": "Ollama",
        "base_url": OLLAMA_BASE_URL,
        "requires_api_key": False,
    },
    "lmstudio": {
        "name": "LM Studio",
        "base_url": LMSTUDIO_BASE_URL,
        "requires_api_key": False,
    },
    "huggingface": {
        "name": "HuggingFace Router",
        "base_url": "https://router.huggingface.co/v1",
        "requires_api_key": True,
    },
    "openai": {
        "name": "OpenAI",
        "base_url": "https://api.openai.com/v1",
        "requires_api_key": True,
    },
}
