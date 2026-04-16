import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_health_check(ac: AsyncClient):
    """Verify the health check endpoint returns 200 OK."""
    response = await ac.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "0.1.0"}

@pytest.mark.asyncio
async def test_static_files_access(ac: AsyncClient):
    """Verify that the static files mount is accessible."""
    # We know eval-dashboard.html exists from our previous research
    response = await ac.get("/static/eval-dashboard.html")
    assert response.status_code == 200
    assert "EvalForge Dashboard" in response.text
