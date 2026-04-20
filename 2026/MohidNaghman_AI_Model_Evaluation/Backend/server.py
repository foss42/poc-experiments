"""
FastAPI server for AI Evaluation PoC - Minimal, Clean Version
- /health: Health check
- /api/evaluate: Main evaluation endpoint
- /api/export: Export results as CSV
"""

from typing import Dict, Any
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from config import (
    EvaluationResponse, 
    EvaluationState, 
    parse_csv, 
    generate_csv_download,
    Config
)
from tools import build_evaluation_graph

# ============================================================================
# FASTAPI APP
# ============================================================================

app = FastAPI(
    title="AI Evaluation PoC",
    version="2.0.0",
    description="Evaluate text generation models using LangGraph"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Build evaluation graph at startup
evaluation_graph = build_evaluation_graph()


# ============================================================================
# ENDPOINTS
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "AI Evaluation PoC",
        "version": "2.0.0",
        "groq": bool(Config.GROQ_API_KEY),
        "mistral": bool(Config.MISTRAL_API_KEY)
    }


@app.post("/api/evaluate")
async def evaluate(
    file: UploadFile = File(...),
    models: str = "groq,mistral",
    temperature: float = 0.7,
):
    """
    Evaluate models on CSV dataset using LangGraph.
    
    Args:
        file: CSV with columns [prompt, expected_answer]
        models: Comma-separated model names (groq, gemini)
        temperature: Generation temperature (0.0-1.0)
    
    Returns:
        EvaluationResponse with results and trace
    """
    try:
        # Validate file
        if not file.filename.endswith(".csv"):
            raise HTTPException(status_code=400, detail="File must be CSV")
        
        # Parse CSV
        content = await file.read()
        csv_text = content.decode("utf-8")
        data = parse_csv(csv_text)
        
        # Extract data
        prompts = [item["prompt"] for item in data]
        expected = [item["expected"] for item in data]
        model_list = [m.strip().lower() for m in models.split(",") if m.strip()]
        
        # Validate
        if not model_list:
            raise HTTPException(status_code=400, detail="At least one model required")
        
        valid_models = {"groq", "mistral"}
        invalid = [m for m in model_list if m not in valid_models]
        if invalid:
            raise HTTPException(status_code=400, detail=f"Invalid models: {invalid}")
        
        print(f"\n🚀 Evaluation starting...")
        print(f"   Prompts: {len(prompts)}")
        print(f"   Models: {model_list}\n")
        
        # Create initial state
        initial_state: EvaluationState = {
            "prompts": prompts,
            "expected_answers": expected,
            "models": model_list,
            "temperature": temperature,
            "results": [],
            "current_prompt_idx": 0,
            "trace": []
        }
        
        # Invoke LangGraph
        final_state = evaluation_graph.invoke(initial_state)
        
        return EvaluationResponse(
            results=final_state["results"],
            agent_trace=final_state["trace"]
        )
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/export")
async def export_results(request: Dict):
    """Export evaluation results as CSV"""
    try:
        results_data = request.get("results", [])
        if not results_data:
            raise HTTPException(status_code=400, detail="No results provided")
        
        from config import EvaluationResult
        results = [EvaluationResult(**r) for r in results_data]
        
        csv_content = generate_csv_download(results)
        
        return StreamingResponse(
            iter([csv_content]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=results.csv"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))