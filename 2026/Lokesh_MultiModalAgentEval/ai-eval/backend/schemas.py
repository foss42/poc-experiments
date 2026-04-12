from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal

class EvalRequest(BaseModel):
    model: str
    api_key: Optional[str] = None
    tasks: List[str]
    limit: Optional[int] = None

class EvalResult(BaseModel):
    run_id: str
    model: str
    modality: Literal['text', 'vision', 'audio', 'agent']
    task: str
    engine: Literal['lmms-eval', 'inspect-ai', 'faster-whisper']
    metrics: Dict[str, float]
    trajectory: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    metadata: Optional[Dict[str, Any]] = None

