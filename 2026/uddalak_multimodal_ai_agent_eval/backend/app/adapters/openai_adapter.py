import time
from typing import Any, Dict, List, Optional
from openai import AsyncOpenAI
from .base import AIProviderAdapter

COST_PER_1K_TOKENS = {
    "gpt-4o": {"input": 0.005, "output": 0.015},
    "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
    "gpt-4-turbo": {"input": 0.01, "output": 0.03},
}


class OpenAIAdapter(AIProviderAdapter):
    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = model

    def get_provider_name(self) -> str:
        return f"openai/{self.model}"

    async def generate_response(
        self,
        prompt: str,
        schema: Optional[Dict] = None,
        images: Optional[List[str]] = None,
        tools: Optional[List[Dict]] = None,
    ) -> Dict[str, Any]:
        start = time.time()

        # Build message content (text + optional images)
        content: Any = [{"type": "text", "text": prompt}]
        if images:
            for img_b64 in images:
                content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"}
                })

        messages = [{"role": "user", "content": content}]

        kwargs: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "max_tokens": 512,
        }
        if tools:
            kwargs["tools"] = tools
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
                    "arguments": tc.function.arguments,  # JSON string
                    "call_id": tc.id,
                }
                for tc in msg.tool_calls
            ]

        usage = response.usage
        rates = COST_PER_1K_TOKENS.get(self.model, {"input": 0.01, "output": 0.03})
        if usage:
            cost = (usage.prompt_tokens / 1000 * rates["input"]) + \
                   (usage.completion_tokens / 1000 * rates["output"])
            tokens_used = usage.total_tokens
        else:
            cost = 0.0
            tokens_used = 0

        return {
            "content": msg.content or "",
            "tool_calls": tool_calls,
            "latency_ms": round(latency_ms, 2),
            "tokens_used": tokens_used,
            "cost_usd": round(cost, 6),
        }
