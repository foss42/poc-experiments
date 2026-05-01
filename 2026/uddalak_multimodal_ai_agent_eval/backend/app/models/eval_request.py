from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator, model_validator


class ProviderConfig(BaseModel):
    name: str = Field(..., description="Provider name (e.g. openai, anthropic)")
    model: str = Field(..., description="Model string (e.g. gpt-4o-mini)")
    api_key: Optional[str] = Field(None, description="Request-scoped API key override")


class EvalDatasetItem(BaseModel):
    prompt: str = Field(..., description="The user prompt or task instruction")
    ground_truth: Optional[str] = Field(None, description="Expected answer (for text eval)")
    images: Optional[List[str]] = Field(None, description="List of base64 encoded images")
    expected_tool_sequence: Optional[List[str]] = Field(None, description="List of expected tool names (for agent eval)")
    tools_spec: Optional[List[Dict[str, Any]]] = Field(None, description="OpenAI-format tools specification array")


class EvalRequest(BaseModel):
    providers: List[ProviderConfig] = Field(..., description="List of models to evaluate against")
    modality: str = Field(..., description="text, multimodal, agent, or mcp")
    dataset: List[EvalDatasetItem] = Field(..., description="List of items to evaluate")
    concurrency_limit: int = Field(5, description="Max concurrent provider calls")

    @field_validator("modality")
    @classmethod
    def validate_modality(cls, v: str) -> str:
        valid = {"text", "multimodal", "agent", "mcp"}
        if v not in valid:
            raise ValueError(f"modality must be one of {valid}")
        return v

    @model_validator(mode="after")
    def validate_dataset_for_modality(self) -> 'EvalRequest':
        for item in self.dataset:
            if self.modality == "agent" and not item.tools_spec:
                raise ValueError("agent modality requires tools_spec on each dataset item")
            if self.modality == "multimodal" and not item.images:
                raise ValueError("multimodal modality requires images on each dataset item")
        return self
