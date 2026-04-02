"""Dataset management endpoints - upload, list, and preview datasets."""

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import Dataset
from app.schemas import DatasetResponse, DatasetPreview
from app.services.dataset_service import save_dataset_file, load_dataset_items, DatasetValidationError

router = APIRouter(prefix="/api/datasets", tags=["datasets"])


@router.post("/upload", response_model=DatasetResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    name: str = Form(""),
    description: str = Form(""),
    db: AsyncSession = Depends(get_db),
):
    """Upload and validate a JSON dataset file."""
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
    )
    db.add(dataset)
    await db.flush()
    await db.refresh(dataset)

    return DatasetResponse(
        id=dataset.id,
        name=dataset.name,
        description=dataset.description,
        item_count=dataset.item_count,
        created_at=dataset.created_at,
    )


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
        created_at=dataset.created_at,
        items=preview_items,
    )
