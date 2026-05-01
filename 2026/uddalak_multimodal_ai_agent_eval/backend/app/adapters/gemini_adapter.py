"""
Gemini adapter — uses the official google-genai SDK (v1.0+).

google.generativeai is deprecated. This uses `google.genai` which is the
current, actively maintained SDK from Google DeepMind.

This is the PRIMARY adapter for this PoC since GEMINI_API_KEY is available.
Supports text, multimodal (images), and tool-call (agent) eval modes.
"""
import time
from typing import Any, Dict, List, Optional
from google import genai
from google.genai import types as genai_types
from .base import AIProviderAdapter

# Approximate cost per 1K tokens for Gemini models
COST_PER_1K_TOKENS = {
    "gemini-2.0-flash": {"input": 0.0001, "output": 0.0004},
    "gemini-2.0-flash-lite": {"input": 0.000075, "output": 0.0003},
    "gemini-2.5-flash": {"input": 0.0, "output": 0.0},       # free preview
    "gemini-2.5-pro": {"input": 0.00125, "output": 0.005},
    "gemini-1.5-flash": {"input": 0.000075, "output": 0.0003},
    "gemini-1.5-pro": {"input": 0.00125, "output": 0.005},
}


class GeminiAdapter(AIProviderAdapter):
    """Google Gemini adapter (primary adapter for this PoC).

    Uses the google-genai SDK (v1.0+).

    Supports:
    - Text eval (MMLU-style MCQ)
    - Multimodal eval (images via base64 inline data)
    - Agent eval (function/tool calling)
    """

    def __init__(self, api_key: str, model: str = "gemini-2.0-flash"):
        self.client = genai.Client(api_key=api_key)
        self.model_name = model

    def get_provider_name(self) -> str:
        return f"gemini/{self.model_name}"

    async def generate_response(
        self,
        prompt: str,
        schema: Optional[Dict] = None,
        images: Optional[List[str]] = None,
        tools: Optional[List[Dict]] = None,
    ) -> Dict[str, Any]:
        import asyncio
        start = time.time()

        # Build content parts
        parts: List[Any] = [genai_types.Part.from_text(text=prompt)]

        if images:
            for img_b64 in images:
                import base64
                parts.append(
                    genai_types.Part.from_bytes(
                        data=base64.b64decode(img_b64),
                        mime_type="image/jpeg",
                    )
                )

        contents = [genai_types.Content(role="user", parts=parts)]

        # Build config
        config_kwargs: Dict[str, Any] = {"max_output_tokens": 512}
        if schema:
            config_kwargs["response_mime_type"] = "application/json"

        # Tool declarations for agent eval
        gemini_tools = None
        if tools:
            gemini_tools = self._convert_tools(tools)

        # Safety settings (unrestrictive for eval/research purposes)
        safety_settings = [
            genai_types.SafetySetting(
                category=cat,
                threshold="BLOCK_NONE",
            )
            for cat in [
                "HARM_CATEGORY_HATE_SPEECH",
                "HARM_CATEGORY_HARASSMENT",
                "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "HARM_CATEGORY_DANGEROUS_CONTENT",
                "HARM_CATEGORY_CIVIC_INTEGRITY",
            ]
        ]

        generation_config = genai_types.GenerateContentConfig(
            **config_kwargs,
            tools=gemini_tools,
            safety_settings=safety_settings,
        )

        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: self.client.models.generate_content(
                model=self.model_name,
                contents=contents,
                config=generation_config,
            ),
        )
        latency_ms = (time.time() - start) * 1000

        # Extract content and tool calls
        content = ""
        tool_calls = None

        try:
            if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if part.text:
                        content += part.text
                    if part.function_call:
                        if tool_calls is None:
                            tool_calls = []
                        fc = part.function_call
                        tool_calls.append({
                            "name": fc.name,
                            "arguments": dict(fc.args) if fc.args else {},
                            "call_id": f"gemini_{fc.name}",
                        })
            else:
                # Fallback for blocked or empty response
                content = "[Response blocked or empty]"
        except Exception as e:
            print(f"[GeminiAdapter] Error parsing response: {e}")
            content = "[Parse Error]"

        # Token cost
        tokens_used = 0
        cost_usd = 0.0
        try:
            usage = response.usage_metadata
            tokens_used = (usage.prompt_token_count or 0) + (usage.candidates_token_count or 0)
            rates = COST_PER_1K_TOKENS.get(self.model_name, {"input": 0.001, "output": 0.002})
            cost_usd = round(
                (usage.prompt_token_count or 0) / 1000 * rates["input"]
                + (usage.candidates_token_count or 0) / 1000 * rates["output"],
                6,
            )
        except Exception:
            pass

        return {
            "content": content,
            "tool_calls": tool_calls,
            "latency_ms": round(latency_ms, 2),
            "tokens_used": tokens_used,
            "cost_usd": cost_usd,
        }

    @staticmethod
    def _convert_tools(openai_tools: List[Dict]) -> List[genai_types.Tool]:
        """Convert OpenAI-format tool specs to google-genai FunctionDeclaration format."""
        declarations = []
        for tool in openai_tools:
            fn = tool.get("function", tool)
            props = fn.get("parameters", {}).get("properties", {})
            declarations.append(
                genai_types.FunctionDeclaration(
                    name=fn["name"],
                    description=fn.get("description", ""),
                    parameters=genai_types.Schema(
                        type="OBJECT",
                        properties={
                            k: genai_types.Schema(type="STRING")
                            for k in props
                        },
                        required=fn.get("parameters", {}).get("required", []),
                    ),
                )
            )
        return [genai_types.Tool(function_declarations=declarations)]
