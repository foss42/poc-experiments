from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class AIProviderAdapter(ABC):
    """Abstract interface for standardized AI API interaction.

    All adapters implement this contract. The eval orchestrator only
    talks to this interface — adding a new provider never touches core logic.
    """

    @abstractmethod
    async def generate_response(
        self,
        prompt: str,
        schema: Optional[Dict] = None,
        images: Optional[List[str]] = None,  # base64-encoded strings
        tools: Optional[List[Dict]] = None,  # OpenAI tool format
    ) -> Dict[str, Any]:
        """Returns a unified dict:
        {
            "content": str,
            "tool_calls": list[dict] | None,  # [{name, arguments, call_id}]
            "latency_ms": float,
            "tokens_used": int,
            "cost_usd": float,
        }
        """
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        """Returns 'provider/model' string, e.g., 'openai/gpt-4o-mini'."""
        pass
