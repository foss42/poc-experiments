"""AI model API connectors - base class and OpenAI-compatible implementation."""

import time
from abc import ABC, abstractmethod
import httpx


class ConnectorError(Exception):
    """Raised when an API request fails."""
    pass


class BaseConnector(ABC):
    """Abstract base class for AI model connectors."""

    @abstractmethod
    async def send_request(self, prompt: str) -> tuple[str, float]:
        """Send a prompt to the model and return (response_text, latency_ms)."""
        ...


class OpenAIConnector(BaseConnector):
    """Connector for OpenAI-compatible APIs (OpenAI, Ollama, LM Studio, etc.)."""

    def __init__(
        self,
        base_url: str,
        api_key: str,
        model_name: str,
        temperature: float = 0.7,
        max_tokens: int = 256,
    ):
        import os
        cleaned_url = base_url.rstrip("/")
        if os.path.exists("/.dockerenv") and ("localhost" in cleaned_url or "127.0.0.1" in cleaned_url):
            cleaned_url = cleaned_url.replace("localhost", "host.docker.internal").replace("127.0.0.1", "host.docker.internal")
            
        self.base_url = cleaned_url
        self.api_key = api_key
        self.model_name = model_name
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.client = httpx.AsyncClient(timeout=60.0)

    async def send_request(self, prompt: str) -> tuple[str, float]:
        """Send a chat completion request and return (response_text, latency_ms)."""
        url = f"{self.base_url}/chat/completions"
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        payload = {
            "model": self.model_name,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a precise evaluation assistant. You must answer with the absolute shortest, most direct answer possible. Give ONLY the final answer. Do NOT add any conversational filler, explanations, markdown formatting (like backticks or bold), or extra words of any kind. If the answer is just a word or a number, output only that word or number."
                },
                {"role": "user", "content": prompt}
            ],
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
        }

        start_time = time.perf_counter()
        try:
            response = await self.client.post(url, json=payload, headers=headers)
            latency_ms = (time.perf_counter() - start_time) * 1000

            if response.status_code != 200:
                raise ConnectorError(
                    f"API returned status {response.status_code}: {response.text}"
                )

            data = response.json()
            content = data["choices"][0]["message"]["content"]
            return content.strip(), latency_ms

        except httpx.RequestError as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            raise ConnectorError(f"Request failed: {e}") from e

    async def close(self):
        """Close the underlying HTTP client."""
        await self.client.aclose()


def create_connector(
    provider: str,
    base_url: str,
    api_key: str,
    model_name: str,
    temperature: float = 0.7,
    max_tokens: int = 256,
) -> BaseConnector:
    """Factory function to create a connector based on provider type.

    Currently supports: openai (and any OpenAI-compatible API).
    """
    if provider in ("openai", "ollama", "lmstudio", "local"):
        return OpenAIConnector(
            base_url=base_url,
            api_key=api_key,
            model_name=model_name,
            temperature=temperature,
            max_tokens=max_tokens,
        )
    else:
        raise ValueError(f"Unsupported provider: {provider}. Supported: openai, ollama, lmstudio, local")
