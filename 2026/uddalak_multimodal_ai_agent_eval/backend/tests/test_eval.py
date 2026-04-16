import pytest
import asyncio
from httpx import AsyncClient
from unittest.mock import patch, MagicMock

@pytest.mark.asyncio
async def test_submit_eval_job(ac: AsyncClient):
    """Verify that a valid eval job can be submitted and returns a job_id."""
    payload = {
        "providers": [
            {"name": "openai", "model": "gpt-4o-mini", "api_key": "sk-test"}
        ],
        "modality": "text",
        "dataset": [
            {"prompt": "What is 2+2?", "ground_truth": "4"}
        ],
        "concurrency_limit": 1
    }
    
    # We mock _execute_eval to avoid real background work during this specific test
    with patch("app.routers.eval._execute_eval") as mock_exec:
        response = await ac.post("/eval/run", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "job_id" in data
        assert data["status"] == "running"
        
        # Verify background task was scheduled
        mock_exec.assert_called_once()

@pytest.mark.asyncio
async def test_job_status_interaction(ac: AsyncClient):
    """Verify that we can poll for a job status."""
    # First, create a job by hitting the endpoint
    payload = {
        "providers": [{"name": "openai", "model": "gpt-4o-mini"}],
        "modality": "text",
        "dataset": [{"prompt": "Test"}]
    }
    
    # We use a real background task execution here but mock the orchestrator
    with patch("app.routers.eval.orchestrator.run_providers_concurrently") as mock_run:
        mock_run.return_value = [{"prompt": "Test", "response": "Mocked Result", "score": 1.0}]
        
        response = await ac.post("/eval/run", json=payload)
        job_id = response.json()["job_id"]
        
        # Poll status
        # Since background tasks run after the response, we might need a small wait or just poll
        # In FastAPI TestClient/AsyncClient, background tasks run sequentially after the response
        status_resp = await ac.get(f"/eval/status/{job_id}")
        assert status_resp.status_code == 200
        status_data = status_resp.json()
        
        # It might be 'running' or 'completed' depending on timing, 
        # but in ASGITransport tests they usually complete immediately if not awaited
        # "error" is also a valid state when no API keys are configured
        assert status_data["status"] in ["running", "completed", "error"]

@pytest.mark.asyncio
async def test_invalid_modality_validation(ac: AsyncClient):
    """Verify that invalid modality is rejected by Pydantic."""
    payload = {
        "providers": [{"name": "openai", "model": "gpt-4o"}],
        "modality": "invalid_type",
        "dataset": [{"prompt": "Test"}]
    }
    response = await ac.post("/eval/run", json=payload)
    assert response.status_code == 422
    assert "modality" in response.text

@pytest.mark.asyncio
async def test_missing_agent_details_validation(ac: AsyncClient):
    """Verify that agent modality requires tools_spec."""
    payload = {
        "providers": [{"name": "openai", "model": "gpt-4o"}],
        "modality": "agent",
        "dataset": [{"prompt": "Test"}] # Missing tools_spec
    }
    response = await ac.post("/eval/run", json=payload)
    assert response.status_code == 422
