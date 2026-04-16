"""
AI Evaluation PoC - Main Entry Point
Clean, simple HTTP server startup
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from server import app, Config
import uvicorn


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("🚀 AI Evaluation PoC")
    print("=" * 60)
    print(f"   Groq Model: {Config.GROQ_MODEL}")
    print(f"   Mistral Model: {Config.MISTRAL_MODEL}")
    print(f"   API Keys: {'✓' if (Config.GROQ_API_KEY and Config.MISTRAL_API_KEY) else '✗'}")
    print(f"   Endpoint: http://{Config.FASTAPI_HOST}:{Config.FASTAPI_PORT}")
    print(f"   Health: http://localhost:{Config.FASTAPI_PORT}/health")
    print(f"   Evaluate: POST /api/evaluate")
    print("=" * 60 + "\n")
    
    uvicorn.run(
        "server:app",
        host=Config.FASTAPI_HOST,
        port=Config.FASTAPI_PORT,
        reload=False,
        log_level="info"
    )