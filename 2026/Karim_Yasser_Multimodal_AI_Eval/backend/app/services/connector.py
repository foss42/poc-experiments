"""AI model API connectors - base class and OpenAI-compatible implementation."""

import asyncio
import base64
import os
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

    async def send_multimodal_request(
        self,
        text: str,
        image_bytes: bytes,
        image_media_type: str = "image/jpeg",
        *,
        system_prompt: str = "",
        image_list: list[bytes] | None = None,
        image_url: str | None = None,
    ) -> tuple[str, float]:
        """Send a multimodal prompt (text + image(s)) to the model.

        Args:
            text: The text prompt.
            image_bytes: Primary image bytes (ignored if image_list is provided).
            image_media_type: MIME type of the image(s).
            system_prompt: Optional system instruction.
            image_list: Optional list of image bytes (for video frames / PDF pages).
            image_url: Optional URL to pass directly instead of base64.
        """
        raise ConnectorError("Multimodal requests are not supported by this connector.")


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
        cleaned_url = base_url.rstrip("/")
        if os.path.exists("/.dockerenv") and ("localhost" in cleaned_url or "127.0.0.1" in cleaned_url):
            cleaned_url = cleaned_url.replace("localhost", "host.docker.internal").replace("127.0.0.1", "host.docker.internal")
            
        self.base_url = cleaned_url
        self.api_key = api_key
        self.model_name = model_name
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.client = httpx.AsyncClient(timeout=60.0)

    def _resolved_api_key(self) -> str:
        """Resolve API key from explicit value or environment fallbacks."""
        if self.api_key:
            return self.api_key

        # HF router compatibility: allow empty DB key and fallback to HF_TOKEN.
        if "router.huggingface.co" in self.base_url:
            return os.getenv("HF_TOKEN", "")

        # Generic OpenAI-compatible fallback for local developer convenience.
        return os.getenv("OPENAI_API_KEY", "")

    def _build_auth_headers(self) -> dict:
        headers = {"Content-Type": "application/json"}
        resolved_key = self._resolved_api_key()
        if resolved_key:
            headers["Authorization"] = f"Bearer {resolved_key}"
        return headers

    async def send_request(self, prompt: str) -> tuple[str, float]:
        """Send a chat completion request and return (response_text, latency_ms)."""
        url = f"{self.base_url}/chat/completions"
        headers = self._build_auth_headers()

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

    async def send_multimodal_request(
        self,
        text: str,
        image_bytes: bytes,
        image_media_type: str = "image/jpeg",
        *,
        system_prompt: str = "",
        image_list: list[bytes] | None = None,
        image_url: str | None = None,
    ) -> tuple[str, float]:
        """Send a multimodal chat completion request and return (response_text, latency_ms)."""
        images = image_list if image_list else ([image_bytes] if image_bytes else [])
        if not images and not image_url:
            raise ConnectorError("At least one image or image_url is required for multimodal requests.")

        url = f"{self.base_url}/chat/completions"
        headers = self._build_auth_headers()

        # Build message content parts
        content_parts = [{"type": "text", "text": text}]

        if image_url and not images:
            # Use URL directly (avoids base64 encoding)
            content_parts.append({
                "type": "image_url",
                "image_url": {"url": image_url},
            })
        else:
            for img_bytes in images:
                image_b64 = base64.b64encode(img_bytes).decode("ascii")
                data_url = f"data:{image_media_type};base64,{image_b64}"
                content_parts.append({
                    "type": "image_url",
                    "image_url": {"url": data_url},
                })

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": content_parts})

        payload = {
            "model": self.model_name,
            "messages": messages,
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


class HuggingFaceConnector(BaseConnector):
    """Connector using huggingface_hub InferenceClient chat completions."""

    def __init__(
        self,
        api_key: str,
        model_name: str,
        temperature: float = 0.7,
        max_tokens: int = 256,
    ):
        from huggingface_hub import InferenceClient

        resolved_key = (api_key or "").strip().strip('"').strip("'")
        if not resolved_key:
            resolved_key = os.getenv("HF_TOKEN", "").strip()

        self.api_key = resolved_key
        self.model_name = model_name
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.client = InferenceClient(
            api_key=self.api_key,
            provider="auto",
        )

    async def send_request(self, prompt: str) -> tuple[str, float]:
        """Send a text chat completion through Hugging Face InferenceClient."""

        def _call():
            completion = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a precise evaluation assistant. You must answer with the absolute shortest, most direct answer possible. Give ONLY the final answer. Do NOT add any conversational filler, explanations, markdown formatting (like backticks or bold), or extra words of any kind. If the answer is just a word or a number, output only that word or number.",
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    },
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens,
            )
            return completion.choices[0].message.content

        start_time = time.perf_counter()
        try:
            content = await asyncio.to_thread(_call)
            latency_ms = (time.perf_counter() - start_time) * 1000
            return (content or "").strip(), latency_ms
        except Exception as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            raise ConnectorError(f"Hugging Face request failed: {e}") from e

    async def send_multimodal_request(
        self,
        text: str,
        image_bytes: bytes,
        image_media_type: str = "image/jpeg",
        *,
        system_prompt: str = "",
        image_list: list[bytes] | None = None,
        image_url: str | None = None,
    ) -> tuple[str, float]:
        """Send text + image(s) chat completion through Hugging Face InferenceClient."""
        images = image_list if image_list else ([image_bytes] if image_bytes else [])
        if not images and not image_url:
            raise ConnectorError("At least one image or image_url is required for multimodal requests.")

        # Build content parts
        content_parts = [{"type": "text", "text": text}]

        if image_url and not images:
            content_parts.append({
                "type": "image_url",
                "image_url": {"url": image_url},
            })
        else:
            for img_bytes in images:
                image_b64 = base64.b64encode(img_bytes).decode("ascii")
                data_url = f"data:{image_media_type};base64,{image_b64}"
                content_parts.append({
                    "type": "image_url",
                    "image_url": {"url": data_url},
                })

        def _call():
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": content_parts})

            completion = self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
            )
            return completion.choices[0].message.content

        start_time = time.perf_counter()
        try:
            content = await asyncio.to_thread(_call)
            latency_ms = (time.perf_counter() - start_time) * 1000
            return (content or "").strip(), latency_ms
        except Exception as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            raise ConnectorError(f"Hugging Face multimodal request failed: {e}") from e

    async def close(self):
        """No-op close method for interface compatibility."""
        return None


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
    normalized_provider = (provider or "").strip().lower()

    if normalized_provider == "huggingface":
        return HuggingFaceConnector(
            api_key=api_key,
            model_name=model_name,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    if normalized_provider == "huggingface" and not base_url:
        base_url = "https://router.huggingface.co/v1"

    if normalized_provider in ("openai", "ollama", "lmstudio", "local"):
        return OpenAIConnector(
            base_url=base_url,
            api_key=api_key,
            model_name=model_name,
            temperature=temperature,
            max_tokens=max_tokens,
        )
    else:
        raise ValueError(
            f"Unsupported provider: {provider}. Supported: openai, ollama, lmstudio, local, huggingface"
        )
