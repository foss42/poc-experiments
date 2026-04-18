"""
MCP Server - Model Context Protocol Tools
Simplified version with only working tools (Groq-based)
"""

import json
from typing import Any, Optional

from config import Config
from tools.providers import GroqProvider, ProviderError
from tools.metrics import (
    calculate_bleu_score,
    calculate_rouge_score,
    check_exact_match,
    calculate_token_overlap
)


# ============================================================================
# CORE TOOLS (Minimal Implementation)
# ============================================================================

def evaluate_with_groq(prompt: str, temperature: float = 0.7) -> dict:
    """Evaluate using Groq LLM (llama-3.1-8b-instant)"""
    try:
        provider = GroqProvider()
        result = provider.evaluate(prompt, temperature)
        return {"status": "success", "output": result}
    except ProviderError as e:
        return {"status": "error", "message": str(e)}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def calculate_metrics(candidate: str, reference: str) -> dict:
    """Calculate all evaluation metrics"""
    try:
        return {
            "bleu": calculate_bleu_score(reference, candidate),
            "rouge": calculate_rouge_score(reference, candidate),
            "exact_match": check_exact_match(reference, candidate),
            "token_overlap": calculate_token_overlap(reference, candidate)
        }
    except Exception as e:
        return {"error": str(e)}


def get_available_tools() -> dict:
    """List available tools"""
    return {
        "tools": [
            {
                "name": "groq_evaluate",
                "description": "Evaluate with Groq LLM",
                "model": Config.GROQ_MODEL,
                "status": "✅ WORKING"
            },
            {
                "name": "calculate_metrics",
                "description": "Calculate BLEU, ROUGE, ExactMatch, TokenOverlap",
                "status": "✅ WORKING"
            }
        ],
        "groq_model": Config.GROQ_MODEL,
        "groq_configured": bool(Config.GROQ_API_KEY)
    }


# ============================================================================
# LEGACY TOOL DEFINITIONS (for compatibility)
# ============================================================================

class MCPToolRegistry:
    """Simple registry for MCP tools"""
    
    @staticmethod
    def groq_evaluate(prompt: str, temperature: float = 0.7) -> str:
        """Call Groq evaluation"""
        result = evaluate_with_groq(prompt, temperature)
        if result["status"] == "success":
            return result["output"]
        else:
            return f"Error: {result['message']}"
    
    @staticmethod
    def calculate_bleu(candidate: str, reference: str) -> float:
        """Calculate BLEU score"""
        return calculate_bleu_score(reference, candidate)
    
    @staticmethod
    def calculate_rouge(candidate: str, reference: str) -> float:
        """Calculate ROUGE score"""
        return calculate_rouge_score(reference, candidate)
    
    @staticmethod
    def exact_match(candidate: str, reference: str) -> bool:
        """Check exact match"""
        return check_exact_match(reference, candidate)
    
    @staticmethod
    def token_overlap(candidate: str, reference: str) -> float:
        """Calculate token overlap"""
        return calculate_token_overlap(reference, candidate)


# ============================================================================
# EXPORT
# ============================================================================

def get_mcp_tools_list() -> list:
    """Get list of MCP tools for /tools endpoint"""
    return [
        {
            "name": "groq_evaluate",
            "description": "Evaluate prompt with Groq LLM"
        },
        {
            "name": "calculate_bleu",
            "description": "Calculate BLEU metric (0-100)"
        },
        {
            "name": "calculate_rouge",
            "description": "Calculate ROUGE metric (0-100)"
        },
        {
            "name": "exact_match",
            "description": "Check exact string match"
        },
        {
            "name": "token_overlap",
            "description": "Calculate token overlap percentage (0-100)"
        }
    ]