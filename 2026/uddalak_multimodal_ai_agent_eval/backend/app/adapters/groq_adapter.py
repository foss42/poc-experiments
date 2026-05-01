"""
Groq adapter — uses the Groq Python SDK (OpenAI-compatible API).

Groq offers many models for free (Llama 3, Mixtral, Gemma, etc.) with
very low latency. GROQ_API_KEY required.

Supported free models (as of 2026-04):
  - llama-3.3-70b-versatile
  - llama-3.1-8b-instant
  - mixtral-8x7b-32768
  - gemma2-9b-it
  - llama-guard-3-8b
"""
import time
from typing import Any, Dict, List, Optional
from groq import AsyncGroq
from .base import AIProviderAdapter

# Groq is free-tier — costs are effectively $0 for PoC
GROQ_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
    "gemma2-9b-it",
]


class GroqAdapter(AIProviderAdapter):
    """Groq adapter — fast, free LLM inference via Groq Cloud.

    Uses the OpenAI-compatible Groq Python SDK. Best for text eval
    and agent eval (tool calling). Does NOT support multimodal (images).
    """

    def __init__(self, api_key: str, model: str = "llama-3.3-70b-versatile"):
        self.client = AsyncGroq(api_key=api_key)
        self.model = model

    def get_provider_name(self) -> str:
        return f"groq/{self.model}"

    async def generate_response(
        self,
        prompt: str,
        schema: Optional[Dict] = None,
        images: Optional[List[str]] = None,
        tools: Optional[List[Dict]] = None,
    ) -> Dict[str, Any]:
        start = time.time()

        if images:
            # Groq doesn't support images — return a graceful error
            return {
                "content": "[GroqAdapter] Image inputs not supported. Use GeminiAdapter for multimodal eval.",
                "tool_calls": None,
                "latency_ms": 0.0,
                "tokens_used": 0,
                "cost_usd": 0.0,
            }

        messages = [{"role": "user", "content": prompt}]

        kwargs: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "max_tokens": 512,
        }
        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"
        if schema:
            kwargs["response_format"] = {"type": "json_object"}

        response = await self.client.chat.completions.create(**kwargs)
        latency_ms = (time.time() - start) * 1000

        msg = response.choices[0].message
        tool_calls = None
        if msg.tool_calls:
            tool_calls = [
                {
                    "name": tc.function.name,
                    "arguments": tc.function.arguments,
                    "call_id": tc.id,
                }
                for tc in msg.tool_calls
            ]

        usage = response.usage
        tokens_used = usage.total_tokens if usage else 0

        return {
            "content": msg.content or "",
            "tool_calls": tool_calls,
            "latency_ms": round(latency_ms, 2),
            "tokens_used": tokens_used,
            "cost_usd": 0.0,  # Groq free tier
        }
