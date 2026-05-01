from typing import Any, Dict, List, Optional
from .base import AIProviderAdapter


class HuggingFaceAdapter(AIProviderAdapter):
    """Scaffold — not implemented in PoC. Will be implemented in GSoC summer."""

    def __init__(self, api_key: str, model: str = "mistralai/Mistral-7B-Instruct-v0.2"):
        self.model = model
        # TODO: initialize HuggingFace Inference API client

    def get_provider_name(self) -> str:
        return f"huggingface/{self.model}"

    async def generate_response(
        self,
        prompt: str,
        schema: Optional[Dict] = None,
        images: Optional[List[str]] = None,
        tools: Optional[List[Dict]] = None,
    ) -> Dict[str, Any]:
        raise NotImplementedError(
            "HuggingFaceAdapter is not implemented in the PoC. "
            "Use OpenAIAdapter or AnthropicAdapter."
        )
