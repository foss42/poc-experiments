import json
import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_upload_returns_session_id_and_count(client):
    manifest = json.dumps([
        {"filename": "cat.jpg", "question": "What animal?", "answer": "cat"},
    ])
    files = [("files[]", ("cat.jpg", b"fake-jpeg-bytes", "image/jpeg"))]
    data = {"manifest": manifest}
    resp = client.post("/api/custom-eval/upload", files=files, data=data)
    assert resp.status_code == 200
    body = resp.json()
    assert "session_id" in body
    assert isinstance(body["session_id"], str)
    assert body["count"] == 1


def test_upload_rejects_file_over_10mb(client):
    big_content = b"x" * (10 * 1024 * 1024 + 1)
    files = [("files[]", ("big.jpg", big_content, "image/jpeg"))]
    data = {"manifest": json.dumps([{"filename": "big.jpg", "question": "Q?"}])}
    resp = client.post("/api/custom-eval/upload", files=files, data=data)
    assert resp.status_code == 400
    assert "too large" in resp.json()["detail"].lower()


def test_stream_returns_404_for_unknown_session(client):
    payload = {
        "session_id": "nonexistent",
        "provider": "ollama",
        "model": "llava",
    }
    resp = client.post("/api/custom-eval/stream", json=payload)
    assert resp.status_code == 404
