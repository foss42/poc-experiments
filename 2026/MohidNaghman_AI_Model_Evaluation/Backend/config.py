"""
Configuration and data models for AI Evaluation PoC.
"""

import os
from typing import List, Dict, TypedDict
from dotenv import load_dotenv
from pydantic import BaseModel

# Load environment variables
load_dotenv()


# ============================================================================
# PYDANTIC MODELS (FastAPI Request/Response)
# ============================================================================

class EvaluationResult(BaseModel):
    """Result for a single evaluation"""
    prompt: str
    expected: str
    model: str
    output: str
    bleu_score: float
    rouge_score: float
    exact_match: bool


class EvaluationResponse(BaseModel):
    """Response containing all evaluation results"""
    results: List[EvaluationResult]
    agent_trace: List[str]


# ============================================================================
# LANGGRAPH STATE DEFINITION
# ============================================================================

class EvaluationState(TypedDict):
    """State for the evaluation agent"""
    prompts: List[str]
    expected_answers: List[str]
    models: List[str]
    temperature: float
    results: List[EvaluationResult]
    current_prompt_idx: int
    trace: List[str]


# ============================================================================
# ENVIRONMENT CONFIGURATION
# ============================================================================

class Config:
    """Application configuration"""
    
    # API Keys
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "")
    
    # Server
    FASTAPI_HOST = os.getenv("FASTAPI_HOST", "0.0.0.0")
    FASTAPI_PORT = int(os.getenv("FASTAPI_PORT", 8000))
    
    # Models
    GROQ_MODEL = "llama-3.1-8b-instant"
    MISTRAL_MODEL = "mistral-medium"
    
    # API Endpoints
    GROQ_BASE_URL = "https://api.groq.com/openai/v1"
    MISTRAL_BASE_URL = "https://api.mistral.ai/v1"
    
    # Timeouts
    REQUEST_TIMEOUT = 30
    
    # Generation
    MAX_TOKENS = 500
    
    # Rate Limiting (to avoid quota exhaustion)
    # Mistral free tier: 5 requests/minute
    GROQ_REQUEST_DELAY = 0.5        # 500ms between Groq requests
    MISTRAL_REQUEST_DELAY = 1.0     # 1s between Mistral requests
    MISTRAL_RETRY_ATTEMPTS = 3      # Retry on 429 errors
    MISTRAL_RETRY_BASE_DELAY = 2.0  # Start with 2s, then exponential backoff
    
    @property
    def is_configured(self) -> bool:
        """Check if API keys are configured"""
        return bool(self.GROQ_API_KEY and self.MISTRAL_API_KEY)


# ============================================================================
# CSV UTILITIES
# ============================================================================

import csv
import io
from typing import List, Dict


def parse_csv(csv_content: str) -> List[Dict[str, str]]:
    """Parse CSV content"""
    try:
        reader = csv.DictReader(io.StringIO(csv_content))
        if not reader.fieldnames:
            raise ValueError("CSV file is empty")
        
        required_cols = {"prompt", "expected_answer"}
        if not required_cols.issubset(set(reader.fieldnames or [])):
            raise ValueError(f"CSV must have columns: {required_cols}")
        
        rows = []
        for row in reader:
            if not row.get("prompt") or not row.get("expected_answer"):
                continue
            
            rows.append({
                "prompt": row["prompt"].strip(),
                "expected": row["expected_answer"].strip()
            })
        
        if not rows:
            raise ValueError("CSV has no valid rows")
        
        return rows
    except Exception as e:
        raise ValueError(f"CSV parsing error: {str(e)}")


def generate_csv_download(results: List[EvaluationResult]) -> str:
    """Generate CSV string from results with BLEU, ROUGE, and exact match metrics"""
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "Prompt",
        "Expected",
        "Groq Output",
        "Groq BLEU",
        "Groq ROUGE-L",
        "Groq Match",
        "Mistral Output",
        "Mistral BLEU",
        "Mistral ROUGE-L",
        "Mistral Match"
    ])
    
    by_prompt = {}
    for result in results:
        key = result.prompt
        if key not in by_prompt:
            by_prompt[key] = {}
        by_prompt[key][result.model] = result
    
    for prompt, models in by_prompt.items():
        groq = models.get("groq", None)
        mistral = models.get("mistral", None)
        
        writer.writerow([
            prompt,
            results[0].expected if results else "",
            groq.output if groq else "",
            groq.bleu_score if groq else "",
            groq.rouge_score if groq else "",
            "✓" if (groq and groq.exact_match) else "✗" if groq else "",
            mistral.output if mistral else "",
            mistral.bleu_score if mistral else "",
            mistral.rouge_score if mistral else "",
            "✓" if (mistral and mistral.exact_match) else "✗" if mistral else "",
        ])
    
    return output.getvalue()