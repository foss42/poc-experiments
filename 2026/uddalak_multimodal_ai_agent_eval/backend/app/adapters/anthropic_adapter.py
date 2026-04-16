import time
from typing import Any, Dict, List, Optional
import anthropic
from .base import AIProviderAdapter

COST_PER_1K_TOKENS = {
    "claude-3-5-haiku-20241022": {"input": 0.00025, "output": 0.00125},
    "claude-3-5-sonnet-20241022": {"input": 0.003, "output": 0.015},
    "claude-3-opus-20240229": {"input": 0.015, "output": 0.075},
}


class AnthropicAdapter(AIProviderAdapter):
    def __init__(self, api_key: str, model: str = "claude-3-5-haiku-20241022"):
        self.client = anthropic.AsyncAnthropic(api_key=api_key)
        self.model = model

    def get_provider_name(self) -> str:
        return f"anthropic/{self.model}"

    async def generate_response(
        self,
        prompt: str,
        schema: Optional[Dict] = None,
        images: Optional[List[str]] = None,
        tools: Optional[List[Dict]] = None,
    ) -> Dict[str, Any]:
        start = time.time()

        # Build message content
        content: List[Dict] = [{"type": "text", "text": prompt}]
        if images:
            for img_b64 in images:
                content.append({
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/jpeg",
                        "data": img_b64,
                    }
                })

        kwargs: Dict[str, Any] = {
            "model": self.model,
            "max_tokens": 512,
            "messages": [{"role": "user", "content": content}],
        }

        # Convert OpenAI tool format → Anthropic tool format
        if tools:
            kwargs["tools"] = [
                {
                    "name": t["function"]["name"],
                    "description": t["function"].get("description", ""),
                    "input_schema": t["function"].get("parameters", {}),
                }
                for t in tools
            ]

        response = await self.client.messages.create(**kwargs)
        latency_ms = (time.time() - start) * 1000

        text_content = ""
        tool_calls = None
        for block in response.content:
            if block.type == "text":
                text_content = block.text
            elif block.type == "tool_use":
                if tool_calls is None:
                    tool_calls = []
                import json
                tool_calls.append({
                    "name": block.name,
                    "arguments": json.dumps(block.input) if isinstance(block.input, dict) else str(block.input),
                    "call_id": block.id,
                })

        rates = COST_PER_1K_TOKENS.get(self.model, {"input": 0.003, "output": 0.015})
        cost = (response.usage.input_tokens / 1000 * rates["input"]) + \
               (response.usage.output_tokens / 1000 * rates["output"])

        return {
            "content": text_content,
            "tool_calls": tool_calls,
            "latency_ms": round(latency_ms, 2),
            "tokens_used": response.usage.input_tokens + response.usage.output_tokens,
            "cost_usd": round(cost, 6),
        }
