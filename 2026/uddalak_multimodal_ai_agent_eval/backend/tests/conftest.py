import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest_asyncio.fixture
async def ac() -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP client wired to the FastAPI app under test."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client
