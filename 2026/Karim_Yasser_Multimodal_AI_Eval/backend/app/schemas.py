"""Pydantic schemas for API request / response validation."""

from typing import Optional, Union
from pydantic import BaseModel, ConfigDict, Field


# ─── Dataset Schemas ─────────────────────────────────────────────────────────

class DatasetItem(BaseModel):
    input: str
    expected_output: Union[str, list[str]]


class MultimodalDatasetItem(BaseModel):
    """Dataset item for multimodal evaluation (media in → text out)."""
    media_url: Optional[str] = None      # URL to fetch media from
    media_file: Optional[str] = None     # Local uploaded file path
    input: str = "Describe this concisely and accurately"  # Text prompt
    expected_output: Union[str, list[str]]


class DatasetResponse(BaseModel):
    id: str
    name: str
    description: str
    item_count: int
    is_multimodal: bool = False
    media_type: str = "text"
    created_at: str


class DatasetPreview(BaseModel):
    id: str
    name: str
    description: str
    item_count: int
    is_multimodal: bool = False
    media_type: str = "text"
    created_at: str
    items: list[DatasetItem]


# ─── Model Config Schemas ────────────────────────────────────────────────────

class ModelConfigCreate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    name: str
    provider: str = "openai"
    api_key: str = ""
    model_name: str
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=256, ge=1, le=32768)
    base_url: str = "https://api.openai.com/v1"
    supports_vision: bool = False


class ModelConfigResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    id: str
    name: str
    provider: str
    model_name: str
    temperature: float
    max_tokens: int
    base_url: str
    supports_vision: bool
    created_at: str


# ─── Evaluation Schemas ──────────────────────────────────────────────────────

class EvaluationCreate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    dataset_id: str
    model_config_id: str


class EvaluationRunResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    id: str
    dataset_id: str
    model_config_id: str
    status: str
    hard_score: float
    soft_score: float
    gray_zone_width: float
    avg_latency_ms: float
    total_items: int
    completed_items: int
    created_at: str
    completed_at: Optional[str] = None


class EvaluationResultResponse(BaseModel):
    id: str
    run_id: str
    input: str
    expected_output: Union[str, list[str]]
    actual_output: str
    media_url: Optional[str] = None
    score_level: int
    score_label: str
    hard_score: float
    soft_score: float
    latency_ms: float


# ─── Benchmark Schemas ───────────────────────────────────────────────────────

class BenchmarkCreate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_config_id: str
    model_type: str = "local-chat-completions"
    tasks: list[str]
    limit: Optional[int] = None
    num_fewshot: Optional[int] = None
    apply_chat_template: bool = True
    fewshot_as_multiturn: bool = True


class BenchmarkRunResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    id: str
    model_config_id: str
    model_type: str
    tasks: list[str]
    status: str
    limit: Optional[int] = None
    num_fewshot: Optional[int] = None
    apply_chat_template: bool
    fewshot_as_multiturn: bool
    results_json: Optional[str] = None
    error_message: Optional[str] = None
    created_at: str
    completed_at: Optional[str] = None


class BenchmarkTaskResultResponse(BaseModel):
    id: str
    run_id: str
    task_name: str
    metric_name: str
    metric_value: float
    stderr: Optional[float] = None
    is_multimodal: bool


class AvailableTask(BaseModel):
    name: str
    category: str
    is_multimodal: bool
    output_type: str  # "generate_until" or "loglikelihood"
    description: str


# ─── Health ──────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "0.2.0"

