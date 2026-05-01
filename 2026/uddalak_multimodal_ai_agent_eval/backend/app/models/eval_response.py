from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ToolCallTrace(BaseModel):
    name: str = Field(..., description="Name of the tool called")
    arguments: str = Field(..., description="JSON string of arguments passed to tool")
    call_id: str = Field(..., description="Unique ID of the tool call")
    arguments_valid: bool = Field(True, description="Whether arguments validated against JSON schema")


class TaskResult(BaseModel):
    task: str = Field(..., description="The original task or prompt substring")
    passed: bool = Field(..., description="Whether the task was successfully completed/correct")
    latency_ms: float = Field(..., description="Latency of the model generation")
    
    # Text-specific
    prediction: Optional[str] = None
    ground_truth: Optional[str] = None
    
    # Agent-specific
    trajectory_fidelity_score: Optional[float] = None
    actual_trace: Optional[List[ToolCallTrace]] = None
    expected_sequence: Optional[List[str]] = None
    
    error: Optional[str] = None


class AggregateMetrics(BaseModel):
    provider: str = Field(..., description="Provider/Model identifier")
    modality: str = Field(..., description="text, multimodal, agent, or mcp")
    num_samples: int = Field(..., description="Number of tasks evaluated")
    latency: Dict[str, float] = Field(..., description="Latency metrics (mean, p50, p95, p99)")
    total_cost_usd: float = Field(..., description="Total estimated cost")
    total_tokens: int = Field(..., description="Total tokens used")
    error: Optional[str] = None

    # Text
    accuracy: Optional[float] = None
    
    # Audio
    wer: Optional[float] = None

    # Agent
    mean_trajectory_fidelity_score: Optional[float] = None
    task_completion_rate: Optional[float] = None


class JobStatus(BaseModel):
    job_id: str
    status: str = Field(..., description="running, complete, or error")
    result: Optional[List[AggregateMetrics]] = None
    error: Optional[str] = None
