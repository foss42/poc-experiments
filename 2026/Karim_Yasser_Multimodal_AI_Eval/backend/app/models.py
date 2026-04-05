"""SQLAlchemy ORM models for the evaluation framework."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    description = Column(String, default="")
    item_count = Column(Integer, default=0)
    file_path = Column(String, nullable=False)
    created_at = Column(String, default=utcnow_iso)

    evaluation_runs = relationship("EvaluationRun", back_populates="dataset")


class ModelConfig(Base):
    __tablename__ = "model_configs"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    provider = Column(String, nullable=False, default="openai")
    api_key = Column(String, default="")
    model_name = Column(String, nullable=False)
    temperature = Column(Float, default=0.7)
    max_tokens = Column(Integer, default=256)
    base_url = Column(String, default="https://api.openai.com/v1")
    supports_vision = Column(Boolean, default=False)
    created_at = Column(String, default=utcnow_iso)

    evaluation_runs = relationship("EvaluationRun", back_populates="model_config")
    benchmark_runs = relationship("BenchmarkRun", back_populates="model_config")


class EvaluationRun(Base):
    __tablename__ = "evaluation_runs"

    id = Column(String, primary_key=True, default=generate_uuid)
    dataset_id = Column(String, ForeignKey("datasets.id"), nullable=False)
    model_config_id = Column(String, ForeignKey("model_configs.id"), nullable=False)
    status = Column(String, default="pending")  # pending, running, completed, failed
    # Run-level dual metrics (MUSE-inspired: Hard Score / Soft Score / GZW)
    hard_score = Column(Float, default=0.0)       # % of Full Match items (level 5)
    soft_score = Column(Float, default=0.0)       # % of Full + Partial Match items (levels 4-5)
    gray_zone_width = Column(Float, default=0.0)  # soft_score - hard_score
    avg_latency_ms = Column(Float, default=0.0)
    total_items = Column(Integer, default=0)
    completed_items = Column(Integer, default=0)
    created_at = Column(String, default=utcnow_iso)
    completed_at = Column(String, nullable=True)

    dataset = relationship("Dataset", back_populates="evaluation_runs")
    model_config = relationship("ModelConfig", back_populates="evaluation_runs")
    results = relationship("EvaluationResult", back_populates="run")


class EvaluationResult(Base):
    __tablename__ = "evaluation_results"

    id = Column(String, primary_key=True, default=generate_uuid)
    run_id = Column(String, ForeignKey("evaluation_runs.id"), nullable=False)
    input = Column(Text, nullable=False)
    expected_output = Column(Text, nullable=False)
    actual_output = Column(Text, default="")
    # Five-level quality taxonomy (MUSE-inspired: arXiv:2603.02482)
    # Level 5=Full Match, 4=Partial Match, 3=Indirect Match, 2=Mismatch, 1=Non-Responsive
    score_level = Column(Integer, default=1)
    score_label = Column(String, default="Non-Responsive")
    hard_score = Column(Float, default=0.0)  # 1.0 if level == 5, else 0.0
    soft_score = Column(Float, default=0.0)  # 1.0 if level >= 4, else 0.0
    latency_ms = Column(Float, default=0.0)
    created_at = Column(String, default=utcnow_iso)

    run = relationship("EvaluationRun", back_populates="results")


class BenchmarkRun(Base):
    """A run of standardised benchmarks via LM Evaluation Harness."""
    __tablename__ = "benchmark_runs"

    id = Column(String, primary_key=True, default=generate_uuid)
    model_config_id = Column(String, ForeignKey("model_configs.id"), nullable=False)
    model_type = Column(String, default="local-chat-completions")
    tasks = Column(Text, nullable=False)           # JSON list of task names
    status = Column(String, default="pending")     # pending, running, completed, failed
    limit = Column(Integer, nullable=True)         # sample limit per task
    num_fewshot = Column(Integer, nullable=True)
    apply_chat_template = Column(Boolean, default=True)
    fewshot_as_multiturn = Column(Boolean, default=True)
    results_json = Column(Text, nullable=True)     # full lm_eval results dict as JSON
    error_message = Column(Text, nullable=True)
    created_at = Column(String, default=utcnow_iso)
    completed_at = Column(String, nullable=True)

    model_config = relationship("ModelConfig", back_populates="benchmark_runs")
    task_results = relationship("BenchmarkTaskResult", back_populates="run", cascade="all, delete-orphan")


class BenchmarkTaskResult(Base):
    """Per-task metric result from a benchmark run."""
    __tablename__ = "benchmark_task_results"

    id = Column(String, primary_key=True, default=generate_uuid)
    run_id = Column(String, ForeignKey("benchmark_runs.id"), nullable=False)
    task_name = Column(String, nullable=False)
    metric_name = Column(String, nullable=False)     # acc, acc_norm, exact_match, etc.
    metric_value = Column(Float, default=0.0)
    stderr = Column(Float, nullable=True)
    is_multimodal = Column(Boolean, default=False)
    created_at = Column(String, default=utcnow_iso)

    run = relationship("BenchmarkRun", back_populates="task_results")


class Setting(Base):
    """Simple key-value settings store."""
    __tablename__ = "settings"

    key = Column(String, primary_key=True)
    value = Column(Text, default="")
