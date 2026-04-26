"""
LangGraph evaluation agent and MCP tools.
"""

import time
from typing import List
from langgraph.graph import StateGraph

from config import EvaluationState, EvaluationResult, Config
from tools.providers import get_provider, ProviderError
from tools.metrics import calculate_bleu_score, calculate_rouge_score, check_exact_match


# ============================================================================
# RATE LIMITING CONFIGURATION
# ============================================================================

# Use config values with internal defaults
REQUEST_DELAYS = {
    "groq": getattr(Config, 'GROQ_REQUEST_DELAY', 0.5),
    "mistral": getattr(Config, 'MISTRAL_REQUEST_DELAY', 1.0),
}

# Track last request time per model
_last_request_time = {}


def throttle_request(model: str):
    """
    Throttle API requests to respect rate limits.
    
    Args:
        model: Model name ('groq' or 'gemini')
    """
    if model not in REQUEST_DELAYS:
        return
    
    current_time = time.time()
    last_time = _last_request_time.get(model, 0)
    delay = REQUEST_DELAYS[model]
    elapsed = current_time - last_time
    
    if elapsed < delay:
        wait_time = delay - elapsed
        print(f"    ⏱️ Rate limiting: waiting {wait_time:.1f}s for {model}...")
        time.sleep(wait_time)
    
    _last_request_time[model] = time.time()


# ============================================================================
# MCP TOOLS (Callable by agents via tool decorators)
# ============================================================================

def evaluate_with_groq(prompt: str, temperature: float = 0.7) -> str:
    """
    Evaluate a prompt using Groq LLM with rate limiting.
    
    Args:
        prompt: The input prompt to evaluate
        temperature: Model temperature (0.0-1.0)
    
    Returns:
        The model's response
    """
    try:
        # Apply rate limiting before request
        throttle_request("groq")
        
        provider = get_provider("groq")
        return provider.evaluate(prompt, temperature)
    except ProviderError as e:
        return f"[GROQ ERROR: {str(e)}]"
    except Exception as e:
        return f"[GROQ ERROR: {str(e)}]"


def evaluate_with_mistral(prompt: str, temperature: float = 0.7) -> str:
    """
    Evaluate a prompt using Mistral AI with retry logic.
    
    Args:
        prompt: The input prompt to evaluate
        temperature: Model temperature (0.0-1.0)
    
    Returns:
        The model's response
    """
    max_retries = getattr(Config, 'MISTRAL_RETRY_ATTEMPTS', 3)
    base_delay = getattr(Config, 'MISTRAL_RETRY_BASE_DELAY', 2.0)
    
    for attempt in range(max_retries):
        try:
            # Apply rate limiting before request
            throttle_request("mistral")
            
            provider = get_provider("mistral")
            return provider.evaluate(prompt, temperature)
        except ProviderError as e:
            error_str = str(e)
            
            # Check if it's a quota/rate limit error (429)
            if "429" in error_str or "quota" in error_str.lower():
                if attempt < max_retries - 1:
                    wait_time = base_delay * (2 ** attempt)  # Exponential backoff: 2s, 4s, 8s
                    print(f"    ⚠️ Mistral rate limited (429). Retry {attempt + 1}/{max_retries} after {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                else:
                    return f"[MISTRAL ERROR: Quota exhausted after {max_retries} retries - {error_str}]"
            else:
                return f"[MISTRAL ERROR: {error_str}]"
        except Exception as e:
            error_msg = f"[MISTRAL ERROR: {str(e)}]"
            print(f"    🔴 {error_msg}")
            return error_msg
    
    return "[MISTRAL ERROR: Max retries exceeded]"


def calculate_bleu(candidate: str, reference: str) -> float:
    """
    Calculate BLEU score between candidate and reference (0-100 scale).
    
    Args:
        candidate: The generated text
        reference: The reference text
    
    Returns:
        BLEU score (0-100)
    """
    return calculate_bleu_score(candidate, reference)


def calculate_rouge(candidate: str, reference: str) -> float:
    """
    Calculate ROUGE-L score between candidate and reference (0-100 scale).
    
    ROUGE-L measures longest common subsequence similarity.
    
    Args:
        candidate: The generated text
        reference: The reference text
    
    Returns:
        ROUGE-L F-score (0-100)
    """
    return calculate_rouge_score(candidate, reference)


def check_match(candidate: str, reference: str) -> bool:
    """
    Check if candidate exactly matches reference (case-insensitive).
    
    Args:
        candidate: The generated text
        reference: The reference text
    
    Returns:
        True if exact match, False otherwise
    """
    return check_exact_match(candidate, reference)


# ============================================================================
# LANGGRAPH AGENT NODES
# ============================================================================

def process_prompt(state: EvaluationState) -> EvaluationState:
    """
    Process a single prompt with all selected models.
    
    This node:
    1. Gets current prompt from state
    2. Calls MCP tools for each selected model
    3. Calculates metrics
    4. Appends results to state
    5. Updates trace log
    """
    idx = state["current_prompt_idx"]
    prompt = state["prompts"][idx]
    expected = state["expected_answers"][idx]
    temperature = state["temperature"]
    
    trace_msg = f"📝 Processing prompt {idx + 1}/{len(state['prompts'])}: '{prompt[:50]}...'"
    state["trace"].append(trace_msg)
    print(trace_msg)
    
    # Evaluate with each model
    for model in state["models"]:
        try:
            # Get provider
            provider = get_provider(model)
            if not provider:
                trace_msg = f"  ⚠️ Unknown model: {model}"
                state["trace"].append(trace_msg)
                print(trace_msg)
                continue
            
            # Call MCP tool (model evaluation)
            if model == "groq":
                output = evaluate_with_groq(prompt, temperature)
                model_display = "🟦 Groq"
            elif model == "mistral":
                print(f"  ⏳ Calling Mistral API...")
                output = evaluate_with_mistral(prompt, temperature)
                model_display = "🟪 Mistral"
            else:
                continue
            
            # Log output
            trace_msg = f"  {model_display} output: '{output[:50]}...'"
            state["trace"].append(trace_msg)
            print(trace_msg)
            
            # Skip metrics if output is an error
            if output.startswith("[") and "ERROR" in output:
                trace_msg = f"    ⚠️ Skipping metrics due to error output"
                state["trace"].append(trace_msg)
                print(trace_msg)
                continue
            
            # Calculate metrics (MCP tools)
            bleu = calculate_bleu(output, expected)
            rouge = calculate_rouge_score(output, expected)
            exact_match = check_match(output, expected)
            
            # Create result
            result = EvaluationResult(
                prompt=prompt,
                expected=expected,
                model=model,
                output=output,
                bleu_score=bleu,
                rouge_score=rouge,
                exact_match=exact_match
            )
            
            state["results"].append(result)
            
            # Log metrics
            trace_msg = f"    📊 BLEU: {bleu}, ROUGE-L: {rouge}, Match: {'✓' if exact_match else '✗'}"
            state["trace"].append(trace_msg)
            print(trace_msg)
            
        except Exception as e:
            trace_msg = f"  ❌ Error with {model}: {str(e)}"
            state["trace"].append(trace_msg)
            print(trace_msg)
    
    state["current_prompt_idx"] += 1
    return state


def should_continue(state: EvaluationState) -> str:
    """
    Conditional edge: decide whether to continue looping or finish.
    
    Returns:
        "process" to continue, "finish" to end
    """
    if state["current_prompt_idx"] < len(state["prompts"]):
        return "process"
    else:
        return "finish"


def finish_evaluation(state: EvaluationState) -> EvaluationState:
    """Finalize evaluation and log completion."""
    trace_msg = f"✅ Evaluation complete! Processed {len(state['prompts'])} prompts with {len(state['models'])} models"
    state["trace"].append(trace_msg)
    print(trace_msg)
    return state


# ============================================================================
# BUILD LANGGRAPH
# ============================================================================

def build_evaluation_graph():
    """
    Build the LangGraph evaluation workflow.
    
    Graph structure:
        process_prompt ↔ should_continue → finish
            ↑                     ↓
            └─────────────────────┘ (loop)
    """
    builder = StateGraph(EvaluationState)
    
    # Add nodes
    builder.add_node("process_prompt", process_prompt)
    builder.add_node("finish", finish_evaluation)
    
    # Set entry point
    builder.set_entry_point("process_prompt")
    
    # Add conditional edges
    builder.add_conditional_edges(
        "process_prompt",
        should_continue,
        {
            "process": "process_prompt",  # Loop back for more prompts
            "finish": "finish",            # Go to finish when done
        },
    )
    
    # Set finish point
    builder.set_finish_point("finish")
    
    return builder.compile()


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def get_mcp_tools_list():
    """Return list of available MCP tools with descriptions"""
    return [
        {
            "name": "evaluate_with_groq",
            "description": "Evaluate a prompt using Groq LLM (Llama-3-70B)",
            "input_schema": {
                "type": "object",
                "properties": {
                    "prompt": {"type": "string", "description": "Input prompt"},
                    "temperature": {"type": "number", "description": "Model temperature (0-1)"}
                },
                "required": ["prompt"]
            }
        },
        {
            "name": "evaluate_with_mistral",
            "description": "Evaluate a prompt using Mistral AI",
            "input_schema": {
                "type": "object",
                "properties": {
                    "prompt": {"type": "string", "description": "Input prompt"},
                    "temperature": {"type": "number", "description": "Model temperature (0-1)"}
                },
                "required": ["prompt"]
            }
        },
        {
            "name": "calculate_bleu",
            "description": "Calculate BLEU score (0-100)",
            "input_schema": {
                "type": "object",
                "properties": {
                    "candidate": {"type": "string", "description": "Generated text"},
                    "reference": {"type": "string", "description": "Reference text"}
                },
                "required": ["candidate", "reference"]
            }
        },
        {
            "name": "calculate_rouge",
            "description": "Calculate ROUGE-L F-score (0-100) - measures longest common subsequence",
            "input_schema": {
                "type": "object",
                "properties": {
                    "candidate": {"type": "string", "description": "Generated text"},
                    "reference": {"type": "string", "description": "Reference text"}
                },
                "required": ["candidate", "reference"]
            }
        },
        {
            "name": "check_match",
            "description": "Check exact match (case-insensitive)",
            "input_schema": {
                "type": "object",
                "properties": {
                    "candidate": {"type": "string", "description": "Generated text"},
                    "reference": {"type": "string", "description": "Reference text"}
                },
                "required": ["candidate", "reference"]
            }
        }
    ]