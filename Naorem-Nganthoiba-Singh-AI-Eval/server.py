import sys
import re
import math
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("API-Dash-Eval-Pro")

class EvalEngine:
    @staticmethod
    def calculate_coherence(text):
        # Heuristic: Average word length and sentence structure
        words = text.split()
        if not words: return 0
        avg_word_len = sum(len(word) for word in words) / len(words)
        # Ideal avg word length in technical English is 4.5 - 6.5
        return 1.0 if 4.5 <= avg_word_len <= 7.0 else 0.7

    @staticmethod
    def check_hallucination_risk(prompt, response):
        # Heuristic: Fact-to-Context density
        # Checks if response length is disproportionate to prompt complexity
        ratio = len(response.split()) / max(len(prompt.split()), 1)
        if ratio > 5.0: return 0.5  # High risk of "yapping" / hallucination
        return 1.0

@mcp.tool()
def run_advanced_eval(prompt: str, response: str) -> dict:
    """
    Industry-grade Evaluation Tool. 
    Returns a multi-dimensional quality report for AI responses.
    """
    engine = EvalEngine()
    
    metrics = {
        "coherence": engine.calculate_coherence(response),
        "factuality_risk": engine.check_hallucination_risk(prompt, response),
        "structural_integrity": 1.0 if re.search(r'[.!?]$', response.strip()) else 0.5
    }
    
    # Weighted Scoring Formula
    # Final Score = (C * 0.4) + (F * 0.4) + (S * 0.2)
    final_score = (metrics["coherence"] * 40) + \
                  (metrics["factuality_risk"] * 40) + \
                  (metrics["structural_integrity"] * 20)

    return {
        "score": round(final_score, 2),
        "breakdown": metrics,
        "status": "PASS" if final_score > 70 else "FAIL",
        "recommendation": "Maintain" if final_score > 70 else "Refine prompt context"
    }

if __name__ == "__main__":
    print("API-Dash Eval Engine Initialized (v1.0.0)...", file=sys.stderr)
    mcp.run()