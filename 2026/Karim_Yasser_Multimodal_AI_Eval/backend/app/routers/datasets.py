"""Dataset management endpoints - upload, list, and preview datasets."""

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import Dataset
from app.schemas import DatasetResponse, DatasetPreview
from app.services.dataset_service import (
    save_dataset_file, load_dataset_items, DatasetValidationError,
    save_multimodal_dataset_file,
)
from app.services.media_service import save_media_file, UPLOADS_DIR

router = APIRouter(prefix="/api/datasets", tags=["datasets"])


@router.post("/upload", response_model=DatasetResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    name: str = Form(""),
    description: str = Form(""),
    db: AsyncSession = Depends(get_db),
):
    """Upload and validate a JSON dataset file (text-only QA)."""
    if not file.filename or not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="File must be a .json file.")

    content = await file.read()
    try:
        file_path, items = save_dataset_file(content, file.filename)
    except DatasetValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))

    dataset = Dataset(
        name=name or file.filename.rsplit(".", 1)[0],
        description=description,
        item_count=len(items),
        file_path=file_path,
        is_multimodal=False,
        media_type="text",
    )
    db.add(dataset)
    await db.flush()
    await db.refresh(dataset)

    return DatasetResponse(
        id=dataset.id,
        name=dataset.name,
        description=dataset.description,
        item_count=dataset.item_count,
        is_multimodal=dataset.is_multimodal,
        media_type=dataset.media_type,
        created_at=dataset.created_at,
    )


@router.post("/upload-multimodal", response_model=DatasetResponse)
async def upload_multimodal_dataset(
    file: UploadFile = File(...),
    name: str = Form(""),
    description: str = Form(""),
    db: AsyncSession = Depends(get_db),
):
    """Upload and validate a multimodal JSON dataset file.

    The JSON must be an array of objects with:
    - media_url: URL to fetch media from (image, PDF, video)
    - media_file: OR path to a locally uploaded media file
    - input: optional text prompt (default: "Describe this concisely")
    - expected_output: expected description (string or list of strings)
    """
    if not file.filename or not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="File must be a .json file.")

    content = await file.read()
    try:
        file_path, items, media_type = save_multimodal_dataset_file(content, file.filename)
    except DatasetValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))

    dataset = Dataset(
        name=name or file.filename.rsplit(".", 1)[0],
        description=description or f"Multimodal {media_type} evaluation dataset",
        item_count=len(items),
        file_path=file_path,
        is_multimodal=True,
        media_type=media_type,
    )
    db.add(dataset)
    await db.flush()
    await db.refresh(dataset)

    return DatasetResponse(
        id=dataset.id,
        name=dataset.name,
        description=dataset.description,
        item_count=dataset.item_count,
        is_multimodal=dataset.is_multimodal,
        media_type=dataset.media_type,
        created_at=dataset.created_at,
    )


@router.post("/upload-media")
async def upload_media_file(
    file: UploadFile = File(...),
):
    """Upload a single media file (image, PDF, video) for use in multimodal datasets.

    Returns the stored file path that can be used as 'media_file' in dataset items.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required.")

    content = await file.read()
    file_path = save_media_file(content, file.filename)
    return {"file_path": file_path, "filename": file.filename}


@router.get("", response_model=list[DatasetResponse])
async def list_datasets(db: AsyncSession = Depends(get_db)):
    """List all uploaded datasets."""
    result = await db.execute(select(Dataset).order_by(Dataset.created_at.desc()))
    datasets = result.scalars().all()
    return [
        DatasetResponse(
            id=d.id,
            name=d.name,
            description=d.description,
            item_count=d.item_count,
            is_multimodal=d.is_multimodal,
            media_type=d.media_type,
            created_at=d.created_at,
        )
        for d in datasets
    ]


@router.get("/{dataset_id}", response_model=DatasetPreview)
async def get_dataset(dataset_id: str, db: AsyncSession = Depends(get_db)):
    """Get a dataset with item preview."""
    dataset = await db.get(Dataset, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    items = load_dataset_items(dataset.file_path)
    preview_items = items[:20]  # Limit preview to first 20 items

    return DatasetPreview(
        id=dataset.id,
        name=dataset.name,
        description=dataset.description,
        item_count=dataset.item_count,
        is_multimodal=dataset.is_multimodal,
        media_type=dataset.media_type,
        created_at=dataset.created_at,
        items=preview_items,
    )


@router.delete("/{dataset_id}", status_code=204)
async def delete_dataset(dataset_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a dataset and all associated runs."""
    dataset = await db.get(Dataset, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    await db.delete(dataset)
    await db.commit()
    return None
