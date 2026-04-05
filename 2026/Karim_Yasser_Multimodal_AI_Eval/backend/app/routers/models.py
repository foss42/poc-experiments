"""Model configuration CRUD endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import ModelConfig
from app.schemas import ModelConfigCreate, ModelConfigResponse

router = APIRouter(prefix="/api/models", tags=["models"])


@router.post("", response_model=ModelConfigResponse)
async def create_model_config(
    config: ModelConfigCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new model configuration."""
    model = ModelConfig(
        name=config.name,
        provider=config.provider,
        api_key=config.api_key,
        model_name=config.model_name,
        temperature=config.temperature,
        max_tokens=config.max_tokens,
        base_url=config.base_url,
        supports_vision=config.supports_vision,
    )
    db.add(model)
    await db.flush()
    await db.refresh(model)

    return ModelConfigResponse(
        id=model.id,
        name=model.name,
        provider=model.provider,
        model_name=model.model_name,
        temperature=model.temperature,
        max_tokens=model.max_tokens,
        base_url=model.base_url,
        supports_vision=model.supports_vision,
        created_at=model.created_at,
    )


@router.get("", response_model=list[ModelConfigResponse])
async def list_model_configs(db: AsyncSession = Depends(get_db)):
    """List all model configurations."""
    result = await db.execute(select(ModelConfig).order_by(ModelConfig.created_at.desc()))
    configs = result.scalars().all()
    return [
        ModelConfigResponse(
            id=c.id,
            name=c.name,
            provider=c.provider,
            model_name=c.model_name,
            temperature=c.temperature,
            max_tokens=c.max_tokens,
            base_url=c.base_url,
            supports_vision=c.supports_vision,
            created_at=c.created_at,
        )
        for c in configs
    ]


@router.get("/{config_id}", response_model=ModelConfigResponse)
async def get_model_config(config_id: str, db: AsyncSession = Depends(get_db)):
    """Get a specific model configuration."""
    config = await db.get(ModelConfig, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Model config not found.")

    return ModelConfigResponse(
        id=config.id,
        name=config.name,
        provider=config.provider,
        model_name=config.model_name,
        temperature=config.temperature,
        max_tokens=config.max_tokens,
        base_url=config.base_url,
        supports_vision=config.supports_vision,
        created_at=config.created_at,
    )


@router.delete("/{config_id}")
async def delete_model_config(config_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a model configuration."""
    config = await db.get(ModelConfig, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Model config not found.")

    await db.delete(config)
    return {"detail": "Model config deleted."}
