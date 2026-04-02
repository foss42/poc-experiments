"""Pydantic schemas for API request / response validation."""

from typing import Optional, Union
from pydantic import BaseModel, Field


# ─── Dataset Schemas ─────────────────────────────────────────────────────────

class DatasetItem(BaseModel):
    input: str
    expected_output: Union[str, list[str]]


class DatasetResponse(BaseModel):
    id: str
    name: str
    description: str
    item_count: int
    created_at: str


class DatasetPreview(BaseModel):
    id: str
    name: str
    description: str
    item_count: int
    created_at: str
    items: list[DatasetItem]


# ─── Model Config Schemas ────────────────────────────────────────────────────

class ModelConfigCreate(BaseModel):
    name: str
    provider: str = "openai"
    api_key: str = ""
    model_name: str
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=256, ge=1, le=32768)
    base_url: str = "https://api.openai.com/v1"


class ModelConfigResponse(BaseModel):
    id: str
    name: str
    provider: str
    model_name: str
    temperature: float
    max_tokens: int
    base_url: str
    created_at: str


# ─── Evaluation Schemas ──────────────────────────────────────────────────────

class EvaluationCreate(BaseModel):
    dataset_id: str
    model_config_id: str


class EvaluationRunResponse(BaseModel):
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
    score_level: int
    score_label: str
    hard_score: float
    soft_score: float
    latency_ms: float


# ─── Health ──────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "0.1.0"
