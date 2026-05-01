import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_list_datasets(ac: AsyncClient):
    """Verify that datasets are listed correctly."""
    response = await ac.get("/datasets/")
    assert response.status_code == 200
    data = response.json()
    assert "datasets" in data
    # Basic check for one of the sample files we saw
    dataset_names = [d["name"] for d in data["datasets"]]
    assert "mmlu_sample" in dataset_names

@pytest.mark.asyncio
async def test_get_dataset_detail(ac: AsyncClient):
    """Verify that a specific dataset can be retrieved."""
    response = await ac.get("/datasets/mmlu_sample")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "mmlu_sample"
    assert len(data["items"]) > 0
    assert "prompt" in data["items"][0]

@pytest.mark.asyncio
async def test_get_invalid_dataset(ac: AsyncClient):
    """Verify 404 for non-existent dataset."""
    response = await ac.get("/datasets/non_existent_dataset")
    assert response.status_code == 404
