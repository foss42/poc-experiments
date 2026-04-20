"""Settings endpoints — manage application configuration like HF_TOKEN."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Setting

router = APIRouter(prefix="/api/settings", tags=["settings"])


class SettingValue(BaseModel):
    value: str


class SettingResponse(BaseModel):
    key: str
    value: str


@router.get("/{key}", response_model=SettingResponse)
async def get_setting(key: str, db: AsyncSession = Depends(get_db)):
    """Get a setting by key. Returns empty value if not found."""
    setting = await db.get(Setting, key)
    return SettingResponse(key=key, value=setting.value if setting else "")


@router.put("/{key}", response_model=SettingResponse)
async def set_setting(
    key: str,
    body: SettingValue,
    db: AsyncSession = Depends(get_db),
):
    """Create or update a setting."""
    setting = await db.get(Setting, key)
    if setting:
        setting.value = body.value
    else:
        setting = Setting(key=key, value=body.value)
        db.add(setting)
    await db.flush()
    await db.refresh(setting)

    # If this is the HF token, update the environment variable immediately
    if key == "hf_token":
        import os
        if body.value:
            os.environ["HF_TOKEN"] = body.value
        else:
            os.environ.pop("HF_TOKEN", None)

    return SettingResponse(key=setting.key, value=setting.value)
