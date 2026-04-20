import asyncio
import os
import base64
import sys

# Add the current directory to sys.path to import from app
sys.path.append("/app")

from app.adapters.gemini_adapter import GeminiAdapter
from app.config import settings

async def test_live_demo():
    print(f"Using API Key: {settings.GEMINI_API_KEY[:10]}...")
    adapter = GeminiAdapter(api_key=settings.GEMINI_API_KEY)
    
    # Simple 1x1 black pixel base64
    dummy_image_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    
    print("Sending request to Gemini...")
    try:
        response = await adapter.generate_response(
            prompt="What is in this image?",
            images=[dummy_image_b64]
        )
        print("Response received successfully!")
        print(f"Content: {response.get('content')}")
    except Exception as e:
        print(f"FAILED with error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_live_demo())
