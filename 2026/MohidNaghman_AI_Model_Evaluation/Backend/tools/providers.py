"""
LLM Provider clients: Groq, Gemini.
"""

import requests
from typing import Optional
from config import Config


class ProviderError(Exception):
    """Base exception for provider errors"""
    pass


class GroqProvider:
    """Groq API client for Llama-3-70B"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or Config.GROQ_API_KEY
        self.model = Config.GROQ_MODEL
        self.base_url = Config.GROQ_BASE_URL
        self.timeout = Config.REQUEST_TIMEOUT
        
        if not self.api_key:
            raise ProviderError("GROQ_API_KEY not configured")
    
    def evaluate(self, prompt: str, temperature: float = 0.7, max_tokens: int = None) -> str:
        """
        Call Groq API and get response.
        
        Args:
            prompt: Input prompt
            temperature: Generation temperature (0.0-1.0)
            max_tokens: Maximum tokens to generate
        
        Returns:
            Generated text response
        """
        try:
            response = requests.post(
                f"{self.base_url}/chat/completions",
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": temperature,
                    "max_tokens": max_tokens or Config.MAX_TOKENS,
                },
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=self.timeout,
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
        except requests.exceptions.Timeout:
            raise ProviderError(f"Groq API timeout (>{self.timeout}s)")
        except requests.exceptions.HTTPError as e:
            raise ProviderError(f"Groq API error: {e.response.status_code} - {e.response.text}")
        except KeyError:
            raise ProviderError("Invalid response structure from Groq API")
        except Exception as e:
            raise ProviderError(f"Groq evaluation error: {str(e)}")


class MistralProvider:
    """Mistral AI API client"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or Config.MISTRAL_API_KEY
        self.model = Config.MISTRAL_MODEL
        self.base_url = Config.MISTRAL_BASE_URL
        self.timeout = Config.REQUEST_TIMEOUT
        
        if not self.api_key:
            raise ProviderError("MISTRAL_API_KEY not configured")
    
    def evaluate(self, prompt: str, temperature: float = 0.7, max_tokens: int = None) -> str:
        """
        Call Mistral API and get response.
        
        Args:
            prompt: Input prompt
            temperature: Generation temperature (0.0-1.0)
            max_tokens: Maximum tokens to generate
        
        Returns:
            Generated text response
        """
        try:
            response = requests.post(
                f"{self.base_url}/chat/completions",
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": temperature,
                    "max_tokens": max_tokens or Config.MAX_TOKENS,
                },
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=self.timeout,
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
        except requests.exceptions.Timeout:
            raise ProviderError(f"Mistral API timeout (>{self.timeout}s)")
        except requests.exceptions.HTTPError as e:
            raise ProviderError(f"Mistral API error: {e.response.status_code} - {e.response.text}")
        except KeyError:
            raise ProviderError("Invalid response structure from Mistral API")
        except Exception as e:
            raise ProviderError(f"Mistral evaluation error: {str(e)}")


def get_provider(provider_name: str) -> Optional[object]:
    """
    Factory function to get provider instance.
    
    Args:
        provider_name: 'groq' or 'mistral'
    
    Returns:
        Provider instance or None
    """
    if provider_name.lower() == "groq":
        return GroqProvider()
    elif provider_name.lower() == "mistral":
        return MistralProvider()
    else:
        return None