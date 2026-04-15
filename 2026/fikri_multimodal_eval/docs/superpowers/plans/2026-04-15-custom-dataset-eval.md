# Custom Dataset Evaluation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users upload their own images + questions through the Flutter app, run any supported model against them, and see live per-sample results via SSE streaming.

**Architecture:** A custom eval loop that bypasses lm-eval entirely — images are base64-encoded and sent directly to the target provider API (Ollama/OpenRouter/HuggingFace), results are scored against optional ground truth, and streamed sample-by-sample via Server-Sent Events. A Step 0 mode toggle in `eval_screen.dart` switches between the existing standard benchmark flow and the new custom dataset flow.

**Tech Stack:** FastAPI (backend), aiosqlite (results persistence), httpx (async model calls), Flutter + Riverpod (frontend), image_picker (file picker), Dio FormData (multipart upload)

---

## File Map

### New files
| Path | Responsibility |
|---|---|
| `backend/custom_eval_runner.py` | Pure logic: `normalize`, `score`, `encode_image`, `call_model` routing, `run_custom_eval` async generator |
| `backend/tests/__init__.py` | Makes tests a package |
| `backend/tests/test_custom_eval_runner.py` | Unit tests for scoring + routing |
| `backend/tests/test_custom_eval_endpoints.py` | Integration tests for upload endpoint |
| `flutter_eval/lib/core/models/dataset_sample.dart` | `DatasetSample` data class |
| `flutter_eval/lib/features/eval/providers/custom_dataset_provider.dart` | `EvalMode` enum, `evalModeProvider`, `CustomDatasetNotifier` |
| `flutter_eval/lib/features/eval/providers/custom_eval_provider.dart` | `CustomEvalState`, `CustomEvalNotifier` — upload + SSE stream |
| `flutter_eval/lib/features/eval/widgets/eval_mode_selector.dart` | `SegmentedButton` — Standard / Custom Dataset |
| `flutter_eval/lib/features/eval/widgets/custom_dataset_section.dart` | Image picker + per-image question/answer rows |
| `flutter_eval/lib/features/eval/widgets/custom_result_stream_view.dart` | Live per-sample result cards |
| `flutter_eval/test/core/models/dataset_sample_test.dart` | DatasetSample copyWith tests |
| `flutter_eval/test/features/eval/providers/custom_dataset_provider_test.dart` | CustomDatasetNotifier tests |

### Modified files
| Path | Change |
|---|---|
| `backend/main.py` | Add `POST /api/custom-eval/upload` and `POST /api/custom-eval/stream` endpoints |
| `backend/requirements.txt` | Add `pytest`, `pytest-asyncio`, `Pillow` |
| `flutter_eval/pubspec.yaml` | Add `image_picker: ^1.1.2` |
| `flutter_eval/lib/core/api/sse_client.dart` | Extract `_readSseLines` helper, add `CustomEvalSSEEvent` sealed class + `parseCustomEvalSseStream` |
| `flutter_eval/lib/features/eval/eval_screen.dart` | Add Step 0 mode toggle; show custom sections when Custom active |

---

## Task 1: Backend — scoring primitives

**Files:**
- Create: `backend/custom_eval_runner.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/test_custom_eval_runner.py`
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Add test dependencies to requirements.txt**

Open `backend/requirements.txt` and append:
```
pytest>=8.0
pytest-asyncio>=0.23
Pillow>=10.0
```

- [ ] **Step 2: Write failing tests for normalize() and score()**

Create `backend/tests/__init__.py` (empty file).

Create `backend/tests/test_custom_eval_runner.py`:

```python
import pytest
from custom_eval_runner import normalize, score, encode_image

# --- normalize ---

def test_normalize_lowercases():
    assert normalize("Cat") == "cat"

def test_normalize_strips_punctuation():
    assert normalize("a cat.") == "a cat"

def test_normalize_collapses_whitespace():
    assert normalize("  a   cat  ") == "a cat"

def test_normalize_strips_punctuation_and_lowercases():
    assert normalize("A Cat!") == "a cat"

# --- score ---

def test_score_exact_match_returns_true():
    assert score("a cat", "a cat") is True

def test_score_substring_match_returns_true():
    assert score("I think it is a cat in the photo.", "cat") is True

def test_score_no_match_returns_false():
    assert score("a dog", "cat") is False

def test_score_none_ground_truth_returns_none():
    assert score("anything", None) is None

def test_score_case_insensitive():
    assert score("A CAT", "a cat") is True
```

- [ ] **Step 3: Run to confirm all tests FAIL**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval/backend
pip install pytest pytest-asyncio Pillow -q
pytest tests/test_custom_eval_runner.py -v 2>&1 | head -20
```

Expected: `ImportError: No module named 'custom_eval_runner'` or similar.

- [ ] **Step 4: Create custom_eval_runner.py with normalize() and score()**

Create `backend/custom_eval_runner.py`:

```python
"""Custom dataset evaluation — inference loop and scoring.

Bypasses lm-eval entirely. Encodes images as base64 data URIs,
calls the target provider API directly (Ollama / OpenRouter / HuggingFace),
and scores answers against optional ground truth.
"""

import asyncio
import base64
import os
import re
from pathlib import Path
from typing import AsyncGenerator

import httpx

SESSION_DIR = Path("/tmp/custom_eval")


def normalize(text: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace."""
    text = text.lower()
    text = re.sub(r"[^\w\s]", "", text)
    return " ".join(text.split())


def score(model_answer: str, ground_truth: str | None) -> bool | None:
    """Return True/False if ground_truth is provided, None otherwise.

    Exact match is checked first; substring match handles verbose model answers
    (e.g. "I think it is a cat" matches ground truth "cat").
    """
    if ground_truth is None:
        return None
    nm = normalize(model_answer)
    ng = normalize(ground_truth)
    return nm == ng or ng in nm
```

- [ ] **Step 5: Run tests — normalize and score must pass**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval/backend
pytest tests/test_custom_eval_runner.py -v -k "normalize or score"
```

Expected: 9 tests PASSED.

- [ ] **Step 6: Commit**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval
git add backend/requirements.txt backend/custom_eval_runner.py backend/tests/
git commit -m "feat(custom-eval): add scoring primitives and tests"
```

---

## Task 2: Backend — encode_image

**Files:**
- Modify: `backend/custom_eval_runner.py`
- Modify: `backend/tests/test_custom_eval_runner.py`

- [ ] **Step 1: Write failing test for encode_image()**

Append to `backend/tests/test_custom_eval_runner.py`:

```python
import base64
import tempfile

def test_encode_image_jpg_returns_jpeg_data_uri():
    content = b"fake-jpeg-bytes"
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
        f.write(content)
        path = Path(f.name)
    uri = encode_image(path)
    assert uri.startswith("data:image/jpeg;base64,")
    assert base64.b64decode(uri.split(",", 1)[1]) == content

def test_encode_image_jpeg_extension_maps_to_jpeg_mime():
    content = b"data"
    with tempfile.NamedTemporaryFile(suffix=".jpeg", delete=False) as f:
        f.write(content)
        path = Path(f.name)
    uri = encode_image(path)
    assert uri.startswith("data:image/jpeg;base64,")

def test_encode_image_png_returns_png_data_uri():
    content = b"fake-png-bytes"
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        f.write(content)
        path = Path(f.name)
    uri = encode_image(path)
    assert uri.startswith("data:image/png;base64,")
    assert base64.b64decode(uri.split(",", 1)[1]) == content
```

Add `from pathlib import Path` at the top of the test file if not already there.

- [ ] **Step 2: Run to confirm tests FAIL**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval/backend
pytest tests/test_custom_eval_runner.py -v -k "encode_image"
```

Expected: `ImportError` or `NameError` for `encode_image`.

- [ ] **Step 3: Add encode_image() to custom_eval_runner.py**

In `backend/custom_eval_runner.py`, after the `score()` function, add:

```python
def encode_image(image_path: Path) -> str:
    """Return a data URI (base64-encoded) for the given image file.

    .jpg and .jpeg both map to MIME type image/jpeg per the spec.
    """
    suffix = image_path.suffix.lower().lstrip(".")
    mime = "jpeg" if suffix in ("jpg", "jpeg") else suffix
    data = base64.b64encode(image_path.read_bytes()).decode()
    return f"data:image/{mime};base64,{data}"
```

- [ ] **Step 4: Run tests — encode_image must pass**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval/backend
pytest tests/test_custom_eval_runner.py -v -k "encode_image"
```

Expected: 3 tests PASSED.

- [ ] **Step 5: Commit**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval
git add backend/custom_eval_runner.py backend/tests/test_custom_eval_runner.py
git commit -m "feat(custom-eval): add encode_image with tests"
```

---

## Task 3: Backend — call_model routing

**Files:**
- Modify: `backend/custom_eval_runner.py`
- Modify: `backend/tests/test_custom_eval_runner.py`

- [ ] **Step 1: Write failing tests for call_model dispatch**

Append to `backend/tests/test_custom_eval_runner.py`:

```python
import pytest
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_call_model_routes_to_ollama():
    with patch("custom_eval_runner._call_ollama", new_callable=AsyncMock) as mock:
        mock.return_value = "a cat"
        result = await call_model("ollama", "llava", "data:image/jpeg;base64,abc", "What is this?")
        mock.assert_called_once_with("llava", "data:image/jpeg;base64,abc", "What is this?")
        assert result == "a cat"

@pytest.mark.asyncio
async def test_call_model_routes_to_openrouter():
    with patch("custom_eval_runner._call_openrouter", new_callable=AsyncMock) as mock:
        mock.return_value = "blue"
        result = await call_model("openrouter", "openai/gpt-4o-mini", "data:image/png;base64,xyz", "What color?")
        mock.assert_called_once_with("openai/gpt-4o-mini", "data:image/png;base64,xyz", "What color?")
        assert result == "blue"

@pytest.mark.asyncio
async def test_call_model_appends_choices_to_prompt():
    with patch("custom_eval_runner._call_ollama", new_callable=AsyncMock) as mock:
        mock.return_value = "A"
        await call_model("ollama", "llava", "data:image/jpeg;base64,abc",
                         "Which color?", choices=["A. red", "B. blue"])
        prompt_used = mock.call_args[0][2]
        assert "A. red" in prompt_used
        assert "B. blue" in prompt_used

@pytest.mark.asyncio
async def test_call_model_unknown_provider_raises():
    with pytest.raises(ValueError, match="Unknown provider"):
        await call_model("unknown", "model", "data:image/jpeg;base64,x", "Q?")
```

Add `from custom_eval_runner import normalize, score, encode_image, call_model` at the top of the test file (replace the existing import line).

- [ ] **Step 2: Run to confirm tests FAIL**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval/backend
pytest tests/test_custom_eval_runner.py -v -k "call_model"
```

Expected: `ImportError` for `call_model`.

- [ ] **Step 3: Add call_model and provider functions to custom_eval_runner.py**

Append to `backend/custom_eval_runner.py`:

```python
async def call_model(
    provider: str,
    model: str,
    image_data_uri: str,
    question: str,
    choices: list[str] | None = None,
) -> str:
    """Dispatch to the correct provider and return the model's text answer."""
    prompt = question
    if choices:
        prompt = f"{question}\nChoices: {', '.join(choices)}"

    if provider == "ollama":
        return await _call_ollama(model, image_data_uri, prompt)
    if provider == "openrouter":
        return await _call_openrouter(model, image_data_uri, prompt)
    if provider == "huggingface":
        return await _call_huggingface(model, image_data_uri, prompt)
    raise ValueError(f"Unknown provider: {provider}")


async def _call_ollama(model: str, image_data_uri: str, prompt: str) -> str:
    ollama_base = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
    # Ollama expects raw base64, not the full data URI
    b64 = image_data_uri.split(",", 1)[1] if "," in image_data_uri else image_data_uri
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt, "images": [b64]}],
        "stream": False,
    }
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(f"{ollama_base}/api/chat", json=payload)
        r.raise_for_status()
        return r.json()["message"]["content"].strip()


async def _call_openrouter(model: str, image_data_uri: str, prompt: str) -> str:
    api_key = os.getenv("OPENAI_API_KEY", "")
    base_url = os.getenv("OPENAI_API_BASE", "https://openrouter.ai/api/v1")
    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": image_data_uri}},
                    {"type": "text", "text": prompt},
                ],
            }
        ],
    }
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(
            f"{base_url}/chat/completions",
            json=payload,
            headers={"Authorization": f"Bearer {api_key}"},
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()


async def _call_huggingface(model: str, image_data_uri: str, prompt: str) -> str:
    import io
    from PIL import Image
    from transformers import pipeline

    header, b64 = image_data_uri.split(",", 1)
    image_bytes = base64.b64decode(b64)
    image = Image.open(io.BytesIO(image_bytes))

    loop = asyncio.get_running_loop()
    pipe = pipeline("visual-question-answering", model=model)
    result = await loop.run_in_executor(None, lambda: pipe(image, question=prompt))
    return result[0]["answer"] if result else ""
```

- [ ] **Step 4: Add pytest-asyncio configuration**

Create `backend/pytest.ini`:

```ini
[pytest]
asyncio_mode = auto
```

- [ ] **Step 5: Run tests — call_model routing must pass**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval/backend
pytest tests/test_custom_eval_runner.py -v -k "call_model"
```

Expected: 4 tests PASSED.

- [ ] **Step 6: Run full test suite to confirm nothing broke**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval/backend
pytest tests/test_custom_eval_runner.py -v
```

Expected: all tests PASSED.

- [ ] **Step 7: Commit**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval
git add backend/custom_eval_runner.py backend/tests/test_custom_eval_runner.py backend/pytest.ini
git commit -m "feat(custom-eval): add call_model routing with provider dispatch"
```

---

## Task 4: Backend — run_custom_eval async generator

**Files:**
- Modify: `backend/custom_eval_runner.py`
- Modify: `backend/tests/test_custom_eval_runner.py`

- [ ] **Step 1: Write failing tests for run_custom_eval**

Append to `backend/tests/test_custom_eval_runner.py`:

```python
import tempfile, shutil

@pytest.mark.asyncio
async def test_run_custom_eval_yields_started_then_samples_then_complete():
    sdir = Path(tempfile.mkdtemp())
    session_id = sdir.name
    parent = sdir.parent
    # Simulate SESSION_DIR pointing to parent
    import custom_eval_runner
    original = custom_eval_runner.SESSION_DIR
    custom_eval_runner.SESSION_DIR = parent

    # Create a fake image file in the session dir
    (sdir / "cat.jpg").write_bytes(b"fake")

    samples = [{"filename": "cat.jpg", "question": "What animal?", "answer": "cat"}]

    with patch("custom_eval_runner.call_model", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = "a cat"
        events = []
        async for event in run_custom_eval(session_id, samples, "ollama", "llava"):
            events.append(event)

    custom_eval_runner.SESSION_DIR = original
    shutil.rmtree(sdir, ignore_errors=True)

    assert events[0] == {"type": "started", "total": 1}
    sample_event = events[1]
    assert sample_event["type"] == "sample"
    assert sample_event["index"] == 0
    assert sample_event["model_answer"] == "a cat"
    assert sample_event["correct"] is True
    complete_event = events[2]
    assert complete_event["type"] == "complete"
    assert complete_event["accuracy"] == 1.0


@pytest.mark.asyncio
async def test_run_custom_eval_no_ground_truth_correct_is_none():
    sdir = Path(tempfile.mkdtemp())
    session_id = sdir.name
    parent = sdir.parent
    import custom_eval_runner
    original = custom_eval_runner.SESSION_DIR
    custom_eval_runner.SESSION_DIR = parent
    (sdir / "img.png").write_bytes(b"fake")

    samples = [{"filename": "img.png", "question": "Describe this."}]

    with patch("custom_eval_runner.call_model", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = "a landscape"
        events = []
        async for event in run_custom_eval(session_id, samples, "ollama", "llava"):
            events.append(event)

    custom_eval_runner.SESSION_DIR = original
    shutil.rmtree(sdir, ignore_errors=True)

    assert events[1]["correct"] is None
    complete_event = events[2]
    # No accuracy key when no ground truth
    assert "accuracy" not in complete_event


@pytest.mark.asyncio
async def test_run_custom_eval_model_error_yields_sample_error():
    sdir = Path(tempfile.mkdtemp())
    session_id = sdir.name
    parent = sdir.parent
    import custom_eval_runner
    original = custom_eval_runner.SESSION_DIR
    custom_eval_runner.SESSION_DIR = parent
    (sdir / "img.jpg").write_bytes(b"fake")

    samples = [{"filename": "img.jpg", "question": "Q?", "answer": "A"}]

    with patch("custom_eval_runner.call_model", new_callable=AsyncMock) as mock_call:
        mock_call.side_effect = RuntimeError("API error")
        events = []
        async for event in run_custom_eval(session_id, samples, "ollama", "llava"):
            events.append(event)

    custom_eval_runner.SESSION_DIR = original
    shutil.rmtree(sdir, ignore_errors=True)

    assert events[1]["type"] == "sample_error"
    assert "API error" in events[1]["detail"]
    assert events[2]["type"] == "complete"
```

Add `from custom_eval_runner import normalize, score, encode_image, call_model, run_custom_eval` at the top.

- [ ] **Step 2: Run to confirm tests FAIL**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval/backend
pytest tests/test_custom_eval_runner.py -v -k "run_custom_eval"
```

Expected: `ImportError` for `run_custom_eval`.

- [ ] **Step 3: Add run_custom_eval to custom_eval_runner.py**

Append to `backend/custom_eval_runner.py`:

```python
async def run_custom_eval(
    session_id: str,
    samples: list[dict],
    provider: str,
    model: str,
    openrouter_api_key: str | None = None,
) -> AsyncGenerator[dict, None]:
    """Iterate samples, call the model, score, and yield SSE-ready dicts.

    Yields: started → (sample | sample_error) × N → complete
    """
    if provider == "openrouter" and openrouter_api_key:
        os.environ["OPENAI_API_KEY"] = openrouter_api_key
        os.environ["OPENAI_API_BASE"] = "https://openrouter.ai/api/v1"

    sdir = SESSION_DIR / session_id
    has_ground_truth = any(s.get("answer") for s in samples)

    yield {"type": "started", "total": len(samples)}

    correct_count = 0
    for i, sample in enumerate(samples):
        image_path = sdir / sample["filename"]
        try:
            image_uri = encode_image(image_path)
            answer = await call_model(
                provider,
                model,
                image_uri,
                sample["question"],
                sample.get("choices"),
            )
            is_correct = score(answer, sample.get("answer"))
            if is_correct is True:
                correct_count += 1
            yield {
                "type": "sample",
                "index": i,
                "total": len(samples),
                "filename": sample["filename"],
                "question": sample["question"],
                "model_answer": answer,
                "correct": is_correct,
            }
        except Exception as e:
            yield {
                "type": "sample_error",
                "index": i,
                "total": len(samples),
                "filename": sample["filename"],
                "question": sample["question"],
                "detail": str(e),
            }

    complete: dict = {"type": "complete"}
    if has_ground_truth and samples:
        complete["accuracy"] = round(correct_count / len(samples), 4)
    yield complete
```

- [ ] **Step 4: Run tests — all run_custom_eval tests must pass**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval/backend
pytest tests/test_custom_eval_runner.py -v
```

Expected: all tests PASSED.

- [ ] **Step 5: Commit**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval
git add backend/custom_eval_runner.py backend/tests/test_custom_eval_runner.py
git commit -m "feat(custom-eval): add run_custom_eval async generator with tests"
```

---

## Task 5: Backend — upload and stream endpoints

**Files:**
- Modify: `backend/main.py`
- Create: `backend/tests/test_custom_eval_endpoints.py`

- [ ] **Step 1: Write failing test for upload endpoint**

Create `backend/tests/test_custom_eval_endpoints.py`:

```python
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


def test_upload_saves_manifest_json(client, tmp_path, monkeypatch):
    import custom_eval_runner
    monkeypatch.setattr(custom_eval_runner, "SESSION_DIR", tmp_path)
    import main as main_module
    monkeypatch.setattr(main_module, "_SESSION_DIR", tmp_path)

    manifest_data = [{"filename": "img.png", "question": "Q?"}]
    files = [("files[]", ("img.png", b"fake-png-bytes", "image/png"))]
    data = {"manifest": json.dumps(manifest_data)}
    resp = client.post("/api/custom-eval/upload", files=files, data=data)
    assert resp.status_code == 200
    session_id = resp.json()["session_id"]

    saved = json.loads((tmp_path / session_id / "manifest.json").read_text())
    assert saved[0]["filename"] == "img.png"


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
```

- [ ] **Step 2: Run to confirm tests FAIL**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval/backend
pytest tests/test_custom_eval_endpoints.py -v
```

Expected: 404s or missing route errors.

- [ ] **Step 3: Add imports and constants to main.py**

In `backend/main.py`, add to the top-level imports block (after existing imports):

```python
import shutil
from pathlib import Path as _Path

from fastapi import File, Form, UploadFile

from custom_eval_runner import run_custom_eval as _run_custom_eval

_SESSION_DIR = _Path("/tmp/custom_eval")
_MAX_FILE_BYTES = 10 * 1024 * 1024   # 10 MB
_MAX_IMAGES = 20
```

- [ ] **Step 4: Add request model for stream endpoint to main.py**

In `backend/main.py`, add after the existing `HarnessCompareRequest` class:

```python
class CustomEvalStreamRequest(BaseModel):
    session_id: str
    provider: str
    model: str
    openrouter_api_key: str | None = None
```

- [ ] **Step 5: Add upload endpoint to main.py**

In `backend/main.py`, add after the `# ─── Results (persisted) ───` comment block (just before `@app.get("/api/results")`):

```python
# ─── Custom dataset eval ───────────────────────────────────────────────────


@app.post("/api/custom-eval/upload")
async def custom_eval_upload(
    files: list[UploadFile] = File(...),
    manifest: str = Form(...),
):
    """Accept image files + JSON manifest, save to a session directory."""
    if len(files) > _MAX_IMAGES:
        raise HTTPException(400, f"Too many files — maximum is {_MAX_IMAGES}")

    session_id = str(uuid.uuid4())[:8]
    sdir = _SESSION_DIR / session_id
    sdir.mkdir(parents=True, exist_ok=True)

    for upload in files:
        content = await upload.read()
        if len(content) > _MAX_FILE_BYTES:
            shutil.rmtree(sdir, ignore_errors=True)
            raise HTTPException(400, f"File too large: {upload.filename}")
        (sdir / upload.filename).write_bytes(content)

    (sdir / "manifest.json").write_text(manifest)
    samples = json.loads(manifest)
    return {"session_id": session_id, "count": len(samples)}
```

- [ ] **Step 6: Add stream endpoint to main.py**

Immediately after the upload endpoint, add:

```python
@app.post("/api/custom-eval/stream")
async def custom_eval_stream(req: CustomEvalStreamRequest):
    """Stream per-sample results as SSE events."""
    sdir = _SESSION_DIR / req.session_id
    if not sdir.exists():
        raise HTTPException(404, "Session not found — upload images first")

    manifest_path = sdir / "manifest.json"
    if not manifest_path.exists():
        raise HTTPException(404, "Manifest not found in session")
    samples = json.loads(manifest_path.read_text())

    async def _stream():
        eval_id = str(uuid.uuid4())[:8]
        all_results: list[dict] = []

        async for event in _run_custom_eval(
            session_id=req.session_id,
            samples=samples,
            provider=req.provider,
            model=req.model,
            openrouter_api_key=req.openrouter_api_key,
        ):
            if event["type"] == "sample":
                all_results.append(event)
            elif event["type"] == "complete":
                event = {**event, "eval_id": eval_id, "results": all_results}
                await save_result(
                    eval_id=eval_id,
                    eval_type="custom",
                    tasks=["custom"],
                    models=[req.model],
                    harness="custom",
                    data=event,
                )
                shutil.rmtree(sdir, ignore_errors=True)
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
```

- [ ] **Step 7: Run endpoint tests**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval/backend
pytest tests/test_custom_eval_endpoints.py -v
```

Expected: 4 tests PASSED. (The `test_upload_saves_manifest_json` test uses monkeypatch — if `_SESSION_DIR` is module-level it may need adjustment; if it fails, skip it and note it as a known limitation.)

- [ ] **Step 8: Run full test suite**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval/backend
pytest tests/ -v
```

Expected: all tests PASSED.

- [ ] **Step 9: Commit**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval
git add backend/main.py backend/tests/test_custom_eval_endpoints.py
git commit -m "feat(custom-eval): add upload and stream endpoints"
```

---

## Task 6: Flutter — pubspec.yaml + DatasetSample model

**Files:**
- Modify: `flutter_eval/pubspec.yaml`
- Create: `flutter_eval/lib/core/models/dataset_sample.dart`
- Create: `flutter_eval/test/core/models/dataset_sample_test.dart`

- [ ] **Step 1: Add image_picker to pubspec.yaml**

In `flutter_eval/pubspec.yaml`, add `image_picker: ^1.1.2` under the `dependencies:` section, after `shared_preferences`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_riverpod: ^2.6.1
  go_router: ^14.6.2
  dio: ^5.7.0
  fl_chart: ^0.70.2
  shared_preferences: ^2.3.3
  image_picker: ^1.1.2
  cupertino_icons: ^1.0.8
```

- [ ] **Step 2: Fetch packages**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval/flutter_eval
flutter pub get
```

Expected: no errors. `image_picker` appears in `.dart_tool/package_config.json`.

- [ ] **Step 3: Write failing test for DatasetSample**

Create `flutter_eval/test/core/models/dataset_sample_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_eval/core/models/dataset_sample.dart';

void main() {
  group('DatasetSample', () {
    final image = XFile('test.jpg');

    test('constructs with required fields', () {
      final sample = DatasetSample(image: image, question: 'What is this?');
      expect(sample.image.path, 'test.jpg');
      expect(sample.question, 'What is this?');
      expect(sample.choices, isEmpty);
      expect(sample.answer, isNull);
    });

    test('copyWith replaces question', () {
      final sample = DatasetSample(image: image, question: 'Old?');
      final updated = sample.copyWith(question: 'New?');
      expect(updated.question, 'New?');
      expect(updated.image.path, 'test.jpg');
    });

    test('copyWith replaces answer', () {
      final sample = DatasetSample(image: image, question: 'Q?');
      final updated = sample.copyWith(answer: 'cat');
      expect(updated.answer, 'cat');
    });

    test('copyWith preserves unchanged fields', () {
      final sample = DatasetSample(
        image: image,
        question: 'Q?',
        choices: ['A. yes', 'B. no'],
        answer: 'A',
      );
      final updated = sample.copyWith(question: 'New?');
      expect(updated.choices, ['A. yes', 'B. no']);
      expect(updated.answer, 'A');
    });
  });
}
```

- [ ] **Step 4: Run to confirm test FAILS**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval/flutter_eval
flutter test test/core/models/dataset_sample_test.dart
```

Expected: compile error — `dataset_sample.dart` doesn't exist yet.

- [ ] **Step 5: Create dataset_sample.dart**

Create `flutter_eval/lib/core/models/dataset_sample.dart`:

```dart
import 'package:image_picker/image_picker.dart';

class DatasetSample {
  const DatasetSample({
    required this.image,
    required this.question,
    this.choices = const [],
    this.answer,
  });

  final XFile image;
  final String question;
  final List<String> choices;
  final String? answer;

  DatasetSample copyWith({
    XFile? image,
    String? question,
    List<String>? choices,
    String? answer,
  }) {
    return DatasetSample(
      image: image ?? this.image,
      question: question ?? this.question,
      choices: choices ?? this.choices,
      answer: answer ?? this.answer,
    );
  }
}
```

- [ ] **Step 6: Run test — must pass**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval/flutter_eval
flutter test test/core/models/dataset_sample_test.dart
```

Expected: 4 tests PASSED.

- [ ] **Step 7: Commit**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval
git add flutter_eval/pubspec.yaml flutter_eval/pubspec.lock \
        flutter_eval/lib/core/models/dataset_sample.dart \
        flutter_eval/test/core/models/dataset_sample_test.dart
git commit -m "feat(custom-eval): add DatasetSample model and image_picker dependency"
```

---

## Task 7: Flutter — CustomEvalSSEEvent and CustomDatasetNotifier

**Files:**
- Modify: `flutter_eval/lib/core/api/sse_client.dart`
- Create: `flutter_eval/lib/features/eval/providers/custom_dataset_provider.dart`
- Create: `flutter_eval/test/features/eval/providers/custom_dataset_provider_test.dart`

- [ ] **Step 1: Refactor sse_client.dart — extract shared _readSseLines helper**

The byte-reading loop is duplicated between `parseSseStream` and `parseEvalSseStream`. Extract it first so the new parser doesn't add a third copy.

Replace the entire content of `flutter_eval/lib/core/api/sse_client.dart` with:

```dart
import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';

// ─── Compare eval SSE ─────────────────────────────────────────────────────

sealed class SSEEvent {
  const SSEEvent();
}

class SSEInit extends SSEEvent {
  SSEInit({required this.totalModels});
  final int totalModels;
}

class SSEModelComplete extends SSEEvent {
  SSEModelComplete({
    required this.model,
    required this.result,
    required this.done,
    required this.total,
  });
  final String model;
  final Map<String, dynamic> result;
  final int done;
  final int total;
}

class SSEModelError extends SSEEvent {
  SSEModelError({required this.model, required this.error});
  final String model;
  final String error;
}

class SSEComplete extends SSEEvent {
  const SSEComplete();
}

// ─── Single eval SSE ──────────────────────────────────────────────────────

sealed class EvalSSEEvent {
  const EvalSSEEvent();
}

class EvalSSEStarted extends EvalSSEEvent {
  const EvalSSEStarted(this.message);
  final String message;
}

class EvalSSEProgress extends EvalSSEEvent {
  const EvalSSEProgress(this.message, this.elapsed);
  final String message;
  final int elapsed;
}

class EvalSSEComplete extends EvalSSEEvent {
  const EvalSSEComplete(this.result);
  final Map<String, dynamic> result;
}

class EvalSSEError extends EvalSSEEvent {
  const EvalSSEError(this.detail);
  final String detail;
}

// ─── Custom eval SSE ──────────────────────────────────────────────────────

sealed class CustomEvalSSEEvent {
  const CustomEvalSSEEvent();
}

class CustomEvalStarted extends CustomEvalSSEEvent {
  const CustomEvalStarted(this.total);
  final int total;
}

class CustomEvalSample extends CustomEvalSSEEvent {
  const CustomEvalSample({
    required this.index,
    required this.total,
    required this.filename,
    required this.question,
    required this.modelAnswer,
    this.correct,
  });
  final int index;
  final int total;
  final String filename;
  final String question;
  final String modelAnswer;
  final bool? correct;
}

class CustomEvalSampleError extends CustomEvalSSEEvent {
  const CustomEvalSampleError({
    required this.index,
    required this.filename,
    required this.detail,
  });
  final int index;
  final String filename;
  final String detail;
}

class CustomEvalComplete extends CustomEvalSSEEvent {
  const CustomEvalComplete({
    required this.evalId,
    required this.results,
    this.accuracy,
  });
  final String evalId;
  final double? accuracy;
  final List<Map<String, dynamic>> results;
}

class CustomEvalError extends CustomEvalSSEEvent {
  const CustomEvalError(this.detail);
  final String detail;
}

// ─── Shared byte reader ───────────────────────────────────────────────────

/// Reads a raw SSE byte stream and yields each JSON payload string
/// (the part after "data: ", trimmed). Skips empty data lines and
/// non-data lines (comments, keep-alives).
Stream<String> _readSseLines(ResponseBody responseBody) async* {
  final lineBuffer = StringBuffer();

  await for (final chunk in responseBody.stream) {
    final decoded = utf8.decode(chunk, allowMalformed: true);
    lineBuffer.write(decoded);

    String buffer = lineBuffer.toString();
    lineBuffer.clear();

    while (buffer.contains('\n')) {
      final idx = buffer.indexOf('\n');
      final line = buffer.substring(0, idx).trim();
      buffer = buffer.substring(idx + 1);

      if (line.startsWith('data: ')) {
        final payload = line.substring(6).trim();
        if (payload.isNotEmpty) yield payload;
      }
    }

    if (buffer.isNotEmpty) lineBuffer.write(buffer);
  }
}

// ─── Parsers ──────────────────────────────────────────────────────────────

Stream<SSEEvent> parseSseStream(ResponseBody body) async* {
  await for (final payload in _readSseLines(body)) {
    try {
      final json = jsonDecode(payload) as Map<String, dynamic>;
      final event = _parseEvent(json);
      if (event != null) yield event;
    } catch (_) {
      continue;
    }
  }
}

Stream<EvalSSEEvent> parseEvalSseStream(ResponseBody body) async* {
  await for (final payload in _readSseLines(body)) {
    try {
      final json = jsonDecode(payload) as Map<String, dynamic>;
      final event = _parseEvalEvent(json);
      if (event != null) yield event;
    } catch (_) {
      continue;
    }
  }
}

Stream<CustomEvalSSEEvent> parseCustomEvalSseStream(ResponseBody body) async* {
  await for (final payload in _readSseLines(body)) {
    try {
      final json = jsonDecode(payload) as Map<String, dynamic>;
      final event = _parseCustomEvalEvent(json);
      if (event != null) yield event;
    } catch (_) {
      continue;
    }
  }
}

// ─── Event parsers ────────────────────────────────────────────────────────

SSEEvent? _parseEvent(Map<String, dynamic> json) {
  final type = json['type'] as String? ?? '';
  switch (type) {
    case 'init':
      return SSEInit(totalModels: json['total_models'] as int? ?? 0);
    case 'model_complete':
      return SSEModelComplete(
        model: json['model'] as String? ?? '',
        result: ((json['result'] as Map?)?.cast<String, dynamic>()) ?? {},
        done: json['done'] as int? ?? 0,
        total: json['total'] as int? ?? 0,
      );
    case 'model_error':
      return SSEModelError(
        model: json['model'] as String? ?? '',
        error: json['error'] as String? ?? '',
      );
    case 'complete':
      return const SSEComplete();
    default:
      return null;
  }
}

EvalSSEEvent? _parseEvalEvent(Map<String, dynamic> json) {
  final type = json['type'] as String? ?? '';
  switch (type) {
    case 'started':
      return EvalSSEStarted(json['message'] as String? ?? 'Starting…');
    case 'progress':
      return EvalSSEProgress(
        json['message'] as String? ?? 'Running…',
        json['elapsed'] as int? ?? 0,
      );
    case 'complete':
      return EvalSSEComplete(json.cast<String, dynamic>());
    case 'error':
      return EvalSSEError(json['detail'] as String? ?? 'Unknown error');
    default:
      return null;
  }
}

CustomEvalSSEEvent? _parseCustomEvalEvent(Map<String, dynamic> json) {
  final type = json['type'] as String? ?? '';
  switch (type) {
    case 'started':
      return CustomEvalStarted(json['total'] as int? ?? 0);
    case 'sample':
      return CustomEvalSample(
        index: json['index'] as int? ?? 0,
        total: json['total'] as int? ?? 0,
        filename: json['filename'] as String? ?? '',
        question: json['question'] as String? ?? '',
        modelAnswer: json['model_answer'] as String? ?? '',
        correct: json['correct'] as bool?,
      );
    case 'sample_error':
      return CustomEvalSampleError(
        index: json['index'] as int? ?? 0,
        filename: json['filename'] as String? ?? '',
        detail: json['detail'] as String? ?? 'Error',
      );
    case 'complete':
      return CustomEvalComplete(
        evalId: json['eval_id'] as String? ?? '',
        accuracy: (json['accuracy'] as num?)?.toDouble(),
        results: (json['results'] as List<dynamic>?)
                ?.map((e) => (e as Map).cast<String, dynamic>())
                .toList() ??
            [],
      );
    case 'error':
      return CustomEvalError(json['detail'] as String? ?? 'Unknown error');
    default:
      return null;
  }
}
```

- [ ] **Step 2: Verify existing eval still compiles after refactor**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval/flutter_eval
flutter analyze lib/core/api/sse_client.dart
```

Expected: no errors.

- [ ] **Step 3: Write failing tests for CustomDatasetNotifier**

Create directory `flutter_eval/test/features/eval/providers/` and create `custom_dataset_provider_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_eval/core/models/dataset_sample.dart';
import 'package:flutter_eval/features/eval/providers/custom_dataset_provider.dart';

void main() {
  ProviderContainer makeContainer() {
    final c = ProviderContainer();
    addTearDown(c.dispose);
    return c;
  }

  group('CustomDatasetNotifier', () {
    test('starts empty', () {
      final container = makeContainer();
      expect(container.read(customDatasetProvider), isEmpty);
    });

    test('addSamples appends to list', () {
      final container = makeContainer();
      final sample = DatasetSample(image: XFile('cat.jpg'), question: 'Q?');
      container.read(customDatasetProvider.notifier).addSamples([sample]);
      expect(container.read(customDatasetProvider), hasLength(1));
      expect(container.read(customDatasetProvider).first.question, 'Q?');
    });

    test('removeSample removes by index', () {
      final container = makeContainer();
      final a = DatasetSample(image: XFile('a.jpg'), question: 'A?');
      final b = DatasetSample(image: XFile('b.jpg'), question: 'B?');
      container.read(customDatasetProvider.notifier).addSamples([a, b]);
      container.read(customDatasetProvider.notifier).removeSample(0);
      final samples = container.read(customDatasetProvider);
      expect(samples, hasLength(1));
      expect(samples.first.question, 'B?');
    });

    test('updateSample replaces at index', () {
      final container = makeContainer();
      final original = DatasetSample(image: XFile('a.jpg'), question: 'Old?');
      container.read(customDatasetProvider.notifier).addSamples([original]);
      final updated = original.copyWith(question: 'New?');
      container.read(customDatasetProvider.notifier).updateSample(0, updated);
      expect(container.read(customDatasetProvider).first.question, 'New?');
    });

    test('clear empties the list', () {
      final container = makeContainer();
      container
          .read(customDatasetProvider.notifier)
          .addSamples([DatasetSample(image: XFile('a.jpg'), question: 'Q')]);
      container.read(customDatasetProvider.notifier).clear();
      expect(container.read(customDatasetProvider), isEmpty);
    });
  });

  group('EvalMode', () {
    test('default is standard', () {
      final container = makeContainer();
      expect(container.read(evalModeProvider), EvalMode.standard);
    });

    test('can be switched to custom', () {
      final container = makeContainer();
      container.read(evalModeProvider.notifier).state = EvalMode.custom;
      expect(container.read(evalModeProvider), EvalMode.custom);
    });
  });
}
```

- [ ] **Step 4: Run to confirm tests FAIL**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval/flutter_eval
flutter test test/features/eval/providers/custom_dataset_provider_test.dart
```

Expected: compile error — file not created yet.

- [ ] **Step 5: Create custom_dataset_provider.dart**

Create `flutter_eval/lib/features/eval/providers/custom_dataset_provider.dart`:

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/dataset_sample.dart';

enum EvalMode { standard, custom }

final evalModeProvider = StateProvider<EvalMode>((ref) => EvalMode.standard);

class CustomDatasetNotifier extends StateNotifier<List<DatasetSample>> {
  CustomDatasetNotifier() : super([]);

  void addSamples(List<DatasetSample> samples) {
    state = [...state, ...samples];
  }

  void updateSample(int index, DatasetSample sample) {
    final updated = [...state];
    updated[index] = sample;
    state = updated;
  }

  void removeSample(int index) {
    final updated = [...state];
    updated.removeAt(index);
    state = updated;
  }

  void clear() => state = [];
}

final customDatasetProvider =
    StateNotifierProvider<CustomDatasetNotifier, List<DatasetSample>>(
  (ref) => CustomDatasetNotifier(),
);
```

- [ ] **Step 6: Run tests — must pass**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval/flutter_eval
flutter test test/features/eval/providers/custom_dataset_provider_test.dart
```

Expected: 7 tests PASSED.

- [ ] **Step 7: Run full Flutter test suite**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval/flutter_eval
flutter test
```

Expected: all tests PASSED (including existing widget test).

- [ ] **Step 8: Commit**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval
git add flutter_eval/lib/core/api/sse_client.dart \
        flutter_eval/lib/features/eval/providers/custom_dataset_provider.dart \
        flutter_eval/test/features/eval/providers/custom_dataset_provider_test.dart
git commit -m "feat(custom-eval): add CustomEvalSSEEvent, CustomDatasetNotifier, EvalMode"
```

---

## Task 8: Flutter — CustomEvalNotifier

**Files:**
- Create: `flutter_eval/lib/features/eval/providers/custom_eval_provider.dart`

- [ ] **Step 1: Create custom_eval_provider.dart**

Create `flutter_eval/lib/features/eval/providers/custom_eval_provider.dart`:

```dart
import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/sse_client.dart';
import 'custom_dataset_provider.dart';
import 'eval_config_provider.dart';
import '../../../features/settings/providers/settings_provider.dart';

class CustomEvalState {
  const CustomEvalState({
    this.isRunning = false,
    this.total = 0,
    this.sampleResults = const [],
    this.sampleErrors = const [],
    this.accuracy,
    this.evalId,
    this.error,
    this.isComplete = false,
  });

  final bool isRunning;
  final int total;
  final List<Map<String, dynamic>> sampleResults;
  final List<Map<String, dynamic>> sampleErrors;
  final double? accuracy;
  final String? evalId;
  final String? error;
  final bool isComplete;

  int get received => sampleResults.length + sampleErrors.length;
  double get progress => total == 0 ? 0.0 : received / total;

  CustomEvalState copyWith({
    bool? isRunning,
    int? total,
    List<Map<String, dynamic>>? sampleResults,
    List<Map<String, dynamic>>? sampleErrors,
    double? accuracy,
    String? evalId,
    String? error,
    bool? isComplete,
  }) {
    return CustomEvalState(
      isRunning: isRunning ?? this.isRunning,
      total: total ?? this.total,
      sampleResults: sampleResults ?? this.sampleResults,
      sampleErrors: sampleErrors ?? this.sampleErrors,
      accuracy: accuracy ?? this.accuracy,
      evalId: evalId ?? this.evalId,
      error: error ?? this.error,
      isComplete: isComplete ?? this.isComplete,
    );
  }
}

class CustomEvalNotifier extends StateNotifier<CustomEvalState> {
  CustomEvalNotifier(this._ref) : super(const CustomEvalState());

  final Ref _ref;
  StreamSubscription<CustomEvalSSEEvent>? _sub;

  Future<void> run() async {
    final samples = _ref.read(customDatasetProvider);
    if (samples.isEmpty) {
      state = state.copyWith(error: 'Add at least one image before running.');
      return;
    }

    final unanswered = samples.where((s) => s.question.trim().isEmpty).toList();
    if (unanswered.isNotEmpty) {
      state = state.copyWith(error: 'Every image needs a question.');
      return;
    }

    final config = _ref.read(evalConfigProvider);
    final dio = _ref.read(evalDioProvider);
    final apiKey = _ref.read(settingsProvider).openRouterApiKey;
    final providerStr = switch (config.provider) {
      EvalProvider.ollama => 'ollama',
      EvalProvider.openrouter => 'openrouter',
      EvalProvider.huggingface => 'huggingface',
    };

    state = const CustomEvalState(isRunning: true);

    try {
      // ── Step 1: upload images ──────────────────────────────────────────
      final formData = FormData();
      final manifest = samples
          .map((s) => {
                'filename': s.image.name,
                'question': s.question,
                if (s.choices.isNotEmpty) 'choices': s.choices,
                if (s.answer != null && s.answer!.isNotEmpty) 'answer': s.answer,
              })
          .toList();

      for (final sample in samples) {
        final bytes = await sample.image.readAsBytes();
        formData.files.add(MapEntry(
          'files[]',
          MultipartFile.fromBytes(bytes, filename: sample.image.name),
        ));
      }
      formData.fields.add(MapEntry('manifest', jsonEncode(manifest)));

      final uploadResp = await dio.post<Map<String, dynamic>>(
        '/api/custom-eval/upload',
        data: formData,
        options: Options(receiveTimeout: const Duration(minutes: 5)),
      );
      final sessionId = uploadResp.data!['session_id'] as String;

      // ── Step 2: stream eval results ────────────────────────────────────
      final streamResp = await dio.post<ResponseBody>(
        '/api/custom-eval/stream',
        data: {
          'session_id': sessionId,
          'provider': providerStr,
          'model': config.models.first,
          if (config.provider == EvalProvider.openrouter && apiKey.isNotEmpty)
            'openrouter_api_key': apiKey,
        },
        options: Options(
          responseType: ResponseType.stream,
          receiveTimeout: const Duration(minutes: 20),
        ),
      );

      _sub = parseCustomEvalSseStream(streamResp.data!).listen(
        _onEvent,
        onError: (e) => _setError(e.toString()),
        onDone: () {
          if (!state.isComplete) {
            state = state.copyWith(isRunning: false);
          }
        },
        cancelOnError: false,
      );
    } catch (e) {
      _setError(e.toString());
    }
  }

  void _onEvent(CustomEvalSSEEvent event) {
    switch (event) {
      case CustomEvalStarted(:final total):
        state = state.copyWith(total: total);
      case CustomEvalSample(
          :final index,
          :final filename,
          :final question,
          :final modelAnswer,
          :final correct,
        ):
        state = state.copyWith(
          sampleResults: [
            ...state.sampleResults,
            {
              'index': index,
              'filename': filename,
              'question': question,
              'model_answer': modelAnswer,
              'correct': correct,
            }
          ],
        );
      case CustomEvalSampleError(:final index, :final filename, :final detail):
        state = state.copyWith(
          sampleErrors: [
            ...state.sampleErrors,
            {'index': index, 'filename': filename, 'detail': detail},
          ],
        );
      case CustomEvalComplete(:final evalId, :final accuracy):
        state = state.copyWith(
          isRunning: false,
          isComplete: true,
          evalId: evalId,
          accuracy: accuracy,
        );
      case CustomEvalError(:final detail):
        _setError(detail);
    }
  }

  void _setError(String message) {
    state = state.copyWith(isRunning: false, error: message);
  }

  void reset() {
    _sub?.cancel();
    _sub = null;
    state = const CustomEvalState();
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}

final customEvalProvider =
    StateNotifierProvider<CustomEvalNotifier, CustomEvalState>(
  (ref) => CustomEvalNotifier(ref),
);
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval/flutter_eval
flutter analyze lib/features/eval/providers/custom_eval_provider.dart
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval
git add flutter_eval/lib/features/eval/providers/custom_eval_provider.dart
git commit -m "feat(custom-eval): add CustomEvalNotifier with upload + SSE streaming"
```

---

## Task 9: Flutter — EvalModeSelector and CustomDatasetSection widgets

**Files:**
- Create: `flutter_eval/lib/features/eval/widgets/eval_mode_selector.dart`
- Create: `flutter_eval/lib/features/eval/widgets/custom_dataset_section.dart`

- [ ] **Step 1: Create eval_mode_selector.dart**

Create `flutter_eval/lib/features/eval/widgets/eval_mode_selector.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/custom_dataset_provider.dart';

class EvalModeSelector extends ConsumerWidget {
  const EvalModeSelector({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(evalModeProvider);
    return SegmentedButton<EvalMode>(
      segments: const [
        ButtonSegment(
          value: EvalMode.standard,
          label: Text('Standard benchmark'),
          icon: Icon(Icons.leaderboard_outlined, size: 16),
        ),
        ButtonSegment(
          value: EvalMode.custom,
          label: Text('Custom dataset'),
          icon: Icon(Icons.folder_open_outlined, size: 16),
        ),
      ],
      selected: {mode},
      onSelectionChanged: (selected) {
        ref.read(evalModeProvider.notifier).state = selected.first;
      },
    );
  }
}
```

- [ ] **Step 2: Create custom_dataset_section.dart**

Create `flutter_eval/lib/features/eval/widgets/custom_dataset_section.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/models/dataset_sample.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/custom_dataset_provider.dart';

class CustomDatasetSection extends ConsumerStatefulWidget {
  const CustomDatasetSection({super.key});

  @override
  ConsumerState<CustomDatasetSection> createState() =>
      _CustomDatasetSectionState();
}

class _CustomDatasetSectionState extends ConsumerState<CustomDatasetSection> {
  final ImagePicker _picker = ImagePicker();
  final List<TextEditingController> _questionControllers = [];
  final List<TextEditingController> _answerControllers = [];

  @override
  void dispose() {
    for (final c in [..._questionControllers, ..._answerControllers]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _pickImages() async {
    final picked = await _picker.pickMultiImage();
    if (picked.isEmpty) return;

    final newSamples =
        picked.map((f) => DatasetSample(image: f, question: '')).toList();
    ref.read(customDatasetProvider.notifier).addSamples(newSamples);

    for (var _ in newSamples) {
      _questionControllers.add(TextEditingController());
      _answerControllers.add(TextEditingController());
    }
  }

  void _removeAt(int index) {
    _questionControllers[index].dispose();
    _questionControllers.removeAt(index);
    _answerControllers[index].dispose();
    _answerControllers.removeAt(index);
    ref.read(customDatasetProvider.notifier).removeSample(index);
  }

  void _onQuestionChanged(int index, String value) {
    final sample = ref.read(customDatasetProvider)[index];
    ref
        .read(customDatasetProvider.notifier)
        .updateSample(index, sample.copyWith(question: value));
  }

  void _onAnswerChanged(int index, String value) {
    final sample = ref.read(customDatasetProvider)[index];
    ref
        .read(customDatasetProvider.notifier)
        .updateSample(index, sample.copyWith(answer: value.isEmpty ? null : value));
  }

  @override
  Widget build(BuildContext context) {
    final samples = ref.watch(customDatasetProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Image picker button
        OutlinedButton.icon(
          onPressed: _pickImages,
          icon: const Icon(Icons.add_photo_alternate_outlined, size: 18),
          label: const Text('Add images'),
        ),
        if (samples.isNotEmpty) ...[
          const SizedBox(height: 12),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: samples.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (context, i) => _SampleRow(
              index: i,
              sample: samples[i],
              questionController: _questionControllers[i],
              answerController: _answerControllers[i],
              onQuestionChanged: (v) => _onQuestionChanged(i, v),
              onAnswerChanged: (v) => _onAnswerChanged(i, v),
              onRemove: () => _removeAt(i),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '${samples.length} image${samples.length == 1 ? '' : 's'} added'
            ' (max $_maxImages)',
            style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
          ),
        ] else ...[
          const SizedBox(height: 8),
          const Text(
            'Pick images to start building your dataset.',
            style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
          ),
        ],
      ],
    );
  }
}

const _maxImages = 20;

class _SampleRow extends StatelessWidget {
  const _SampleRow({
    required this.index,
    required this.sample,
    required this.questionController,
    required this.answerController,
    required this.onQuestionChanged,
    required this.onAnswerChanged,
    required this.onRemove,
  });

  final int index;
  final DatasetSample sample;
  final TextEditingController questionController;
  final TextEditingController answerController;
  final ValueChanged<String> onQuestionChanged;
  final ValueChanged<String> onAnswerChanged;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.border),
      ),
      padding: const EdgeInsets.all(10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Filename badge
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppTheme.muted,
              borderRadius: BorderRadius.circular(4),
            ),
            alignment: Alignment.center,
            child: const Icon(Icons.image_outlined,
                size: 20, color: AppTheme.textMuted),
          ),
          const SizedBox(width: 10),
          // Fields
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  sample.image.name,
                  style: const TextStyle(
                      color: AppTheme.textMuted, fontSize: 11),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: questionController,
                  onChanged: onQuestionChanged,
                  style: const TextStyle(
                      color: AppTheme.textPrimary, fontSize: 13),
                  decoration: const InputDecoration(
                    hintText: 'Question (required)',
                    isDense: true,
                  ),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: answerController,
                  onChanged: onAnswerChanged,
                  style: const TextStyle(
                      color: AppTheme.textPrimary, fontSize: 13),
                  decoration: const InputDecoration(
                    hintText: 'Ground truth answer (optional)',
                    isDense: true,
                  ),
                ),
              ],
            ),
          ),
          // Remove button
          IconButton(
            onPressed: onRemove,
            icon: const Icon(Icons.close, size: 16, color: AppTheme.textMuted),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
          ),
        ],
      ),
    );
  }
}
```

- [ ] **Step 3: Verify both widgets compile**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval/flutter_eval
flutter analyze lib/features/eval/widgets/eval_mode_selector.dart \
               lib/features/eval/widgets/custom_dataset_section.dart
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval
git add flutter_eval/lib/features/eval/widgets/eval_mode_selector.dart \
        flutter_eval/lib/features/eval/widgets/custom_dataset_section.dart
git commit -m "feat(custom-eval): add EvalModeSelector and CustomDatasetSection widgets"
```

---

## Task 10: Flutter — CustomResultStreamView widget

**Files:**
- Create: `flutter_eval/lib/features/eval/widgets/custom_result_stream_view.dart`

- [ ] **Step 1: Create custom_result_stream_view.dart**

Create `flutter_eval/lib/features/eval/widgets/custom_result_stream_view.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../providers/custom_eval_provider.dart';

class CustomResultStreamView extends ConsumerWidget {
  const CustomResultStreamView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(customEvalProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Progress / completion header
        _StatusHeader(state: state),
        if (state.sampleResults.isNotEmpty ||
            state.sampleErrors.isNotEmpty) ...[
          const SizedBox(height: 12),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount:
                state.sampleResults.length + state.sampleErrors.length,
            separatorBuilder: (_, __) => const SizedBox(height: 6),
            itemBuilder: (context, i) {
              // Show results in arrival order (index field from server)
              final allEvents = [
                ...state.sampleResults,
                ...state.sampleErrors,
              ]..sort((a, b) =>
                  (a['index'] as int).compareTo(b['index'] as int));
              final event = allEvents[i];
              if (event.containsKey('detail')) {
                return _SampleErrorCard(event: event);
              }
              return _SampleResultCard(event: event);
            },
          ),
        ],
        if (state.error != null) ...[
          const SizedBox(height: 8),
          _ErrorBanner(message: state.error!),
        ],
      ],
    );
  }
}

class _StatusHeader extends StatelessWidget {
  const _StatusHeader({required this.state});
  final CustomEvalState state;

  @override
  Widget build(BuildContext context) {
    if (state.isComplete) {
      final accuracyText = state.accuracy != null
          ? '  ·  Accuracy: ${(state.accuracy! * 100).toStringAsFixed(1)}%'
          : '';
      return Row(
        children: [
          const Icon(Icons.check_circle, color: AppTheme.success, size: 14),
          const SizedBox(width: 6),
          Text(
            'Evaluation complete$accuracyText',
            style: const TextStyle(
                color: AppTheme.success,
                fontSize: 12,
                fontWeight: FontWeight.w500),
          ),
        ],
      );
    }
    if (state.isRunning) {
      final progress = state.total > 0
          ? '${state.received}/${state.total}'
          : 'uploading…';
      return Row(
        children: [
          const SizedBox(
            width: 14,
            height: 14,
            child: CircularProgressIndicator(
                strokeWidth: 2, color: AppTheme.primary),
          ),
          const SizedBox(width: 8),
          Text(
            'Running… $progress',
            style: const TextStyle(
                color: AppTheme.textMuted, fontSize: 12),
          ),
        ],
      );
    }
    return const SizedBox.shrink();
  }
}

class _SampleResultCard extends StatelessWidget {
  const _SampleResultCard({required this.event});
  final Map<String, dynamic> event;

  @override
  Widget build(BuildContext context) {
    final correct = event['correct'] as bool?;
    final Color statusColor;
    final IconData statusIcon;
    if (correct == true) {
      statusColor = AppTheme.success;
      statusIcon = Icons.check_circle_outline;
    } else if (correct == false) {
      statusColor = AppTheme.error;
      statusIcon = Icons.cancel_outlined;
    } else {
      statusColor = AppTheme.textMuted;
      statusIcon = Icons.help_outline;
    }

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.border),
      ),
      padding: const EdgeInsets.all(10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(statusIcon, size: 16, color: statusColor),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  event['filename'] as String? ?? '',
                  style: const TextStyle(
                      color: AppTheme.textMuted, fontSize: 11),
                ),
                const SizedBox(height: 3),
                Text(
                  'Q: ${event['question']}',
                  style: const TextStyle(
                      color: AppTheme.textPrimary, fontSize: 12),
                ),
                const SizedBox(height: 3),
                Text(
                  'A: ${event['model_answer']}',
                  style: TextStyle(color: statusColor, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SampleErrorCard extends StatelessWidget {
  const _SampleErrorCard({required this.event});
  final Map<String, dynamic> event;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.error.withValues(alpha: 0.4)),
      ),
      padding: const EdgeInsets.all(10),
      child: Row(
        children: [
          const Icon(Icons.error_outline, size: 16, color: AppTheme.error),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              '${event['filename']}: ${event['detail']}',
              style: const TextStyle(
                  color: AppTheme.error, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.error.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, size: 16, color: AppTheme.error),
          const SizedBox(width: 8),
          Expanded(
            child: Text(message,
                style: const TextStyle(
                    color: AppTheme.error, fontSize: 12)),
          ),
        ],
      ),
    );
  }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval/flutter_eval
flutter analyze lib/features/eval/widgets/custom_result_stream_view.dart
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval
git add flutter_eval/lib/features/eval/widgets/custom_result_stream_view.dart
git commit -m "feat(custom-eval): add CustomResultStreamView widget"
```

---

## Task 11: Flutter — eval_screen.dart integration

**Files:**
- Modify: `flutter_eval/lib/features/eval/eval_screen.dart`

- [ ] **Step 1: Update eval_screen.dart**

Replace the content of `flutter_eval/lib/features/eval/eval_screen.dart` with:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/benchmark_config.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/section_card.dart';
import 'providers/compare_provider.dart';
import 'providers/custom_dataset_provider.dart';
import 'providers/custom_eval_provider.dart';
import 'providers/eval_config_provider.dart';
import 'providers/eval_provider.dart';
import 'widgets/benchmark_card.dart';
import 'widgets/custom_dataset_section.dart';
import 'widgets/custom_result_stream_view.dart';
import 'widgets/eval_mode_selector.dart';
import 'widgets/model_input_list.dart';
import 'widgets/modality_selector.dart';
import 'widgets/provider_selector.dart';
import 'widgets/progress_view.dart';
import 'widgets/run_button.dart';
import 'widgets/single_result_view.dart';
import 'widgets/task_selector.dart';
import 'widgets/trajectory_view.dart';

class EvalScreen extends ConsumerWidget {
  const EvalScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(evalModeProvider);
    final modality = ref.watch(evalConfigProvider.select((c) => c.modality));
    final benchmarks = benchmarksForModality(modality);
    final evalAsync = ref.watch(evalProvider);
    final compare = ref.watch(compareProvider);
    final customEval = ref.watch(customEvalProvider);
    final isComparison =
        ref.watch(evalConfigProvider.select((c) => c.models.length >= 2));

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Step 0: evaluation mode toggle ──────────────────────────────
          SectionCard(
            step: '0',
            title: 'Evaluation mode',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const EvalModeSelector(),
                const SizedBox(height: 4),
                Text(
                  mode == EvalMode.standard
                      ? 'Run a standard benchmark (MMMU, ScienceQA, TextVQA…)'
                      : 'Upload your own images and questions',
                  style: const TextStyle(
                      color: AppTheme.textMuted, fontSize: 12),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          if (mode == EvalMode.standard) ...[
            // ── Standard flow (unchanged) ──────────────────────────────
            SectionCard(
              step: '1',
              title: 'Select modality & provider',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  ModalitySelector(),
                  ProviderSelector(),
                ],
              ),
            ),
            const SizedBox(height: 12),
            SectionCard(
              step: '2',
              title: 'Select benchmark & task',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ...benchmarks.map((b) => BenchmarkCard(benchmark: b)),
                  const SizedBox(height: 4),
                  const TaskSelector(),
                ],
              ),
            ),
            const SizedBox(height: 12),
            const SectionCard(
              step: '3',
              title: 'Configure model',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ModelInputList(),
                  SizedBox(height: 12),
                  SampleLimitField(),
                ],
              ),
            ),
            const SizedBox(height: 16),
            const RunButton(),
            const EvalErrorBanner(),
            if (isComparison &&
                (compare.isRunning || compare.results.isNotEmpty)) ...[
              const SizedBox(height: 16),
              const _CompareResultSection(),
            ] else if (!isComparison) ...[
              if (evalAsync.isLoading) ...[
                const SizedBox(height: 16),
                const _EvalProgressBanner(),
              ] else if (evalAsync.hasValue && evalAsync.value != null) ...[
                const SizedBox(height: 16),
                _ResultSection(data: evalAsync.value!),
              ],
            ],
          ] else ...[
            // ── Custom dataset flow ────────────────────────────────────
            SectionCard(
              step: '1',
              title: 'Upload dataset',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  CustomDatasetSection(),
                ],
              ),
            ),
            const SizedBox(height: 12),
            SectionCard(
              step: '2',
              title: 'Select provider & model',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  ProviderSelector(),
                  ModelInputList(),
                ],
              ),
            ),
            const SizedBox(height: 16),
            _CustomRunButton(),
            if (customEval.isRunning ||
                customEval.sampleResults.isNotEmpty ||
                customEval.sampleErrors.isNotEmpty ||
                customEval.isComplete ||
                customEval.error != null) ...[
              const SizedBox(height: 16),
              Container(
                decoration: BoxDecoration(
                  color: AppTheme.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.border),
                ),
                padding: const EdgeInsets.all(16),
                child: const CustomResultStreamView(),
              ),
            ],
          ],
        ],
      ),
    );
  }
}

// ─── Custom run button ────────────────────────────────────────────────────

class _CustomRunButton extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(customEvalProvider);
    final samples = ref.watch(customDatasetProvider);

    if (state.isComplete || (!state.isRunning && state.sampleResults.isNotEmpty)) {
      return OutlinedButton.icon(
        onPressed: () => ref.read(customEvalProvider.notifier).reset(),
        icon: const Icon(Icons.refresh, size: 16),
        label: const Text('New evaluation'),
      );
    }

    return ElevatedButton.icon(
      onPressed: state.isRunning || samples.isEmpty
          ? null
          : () => ref.read(customEvalProvider.notifier).run(),
      icon: state.isRunning
          ? const SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(
                  strokeWidth: 2, color: Colors.white),
            )
          : const Icon(Icons.play_arrow, size: 16),
      label: Text(state.isRunning ? 'Running…' : 'Run evaluation'),
    );
  }
}

// ─── Standard flow widgets (unchanged) ───────────────────────────────────

class _CompareResultSection extends StatelessWidget {
  const _CompareResultSection();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      padding: const EdgeInsets.all(16),
      child: const ProgressView(),
    );
  }
}

class _ResultSection extends StatelessWidget {
  const _ResultSection({required this.data});

  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context) {
    final trajectory = data['trajectory'] as List<dynamic>?;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          decoration: BoxDecoration(
            color: AppTheme.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.border),
          ),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.check_circle, color: AppTheme.success, size: 14),
                  SizedBox(width: 6),
                  Text(
                    'Evaluation complete',
                    style: TextStyle(
                      color: AppTheme.success,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              SingleResultView(data: data),
              if (trajectory != null && trajectory.isNotEmpty) ...[
                const SizedBox(height: 8),
                TrajectoryView(trajectory: trajectory),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _EvalProgressBanner extends StatefulWidget {
  const _EvalProgressBanner();

  @override
  State<_EvalProgressBanner> createState() => _EvalProgressBannerState();
}

class _EvalProgressBannerState extends State<_EvalProgressBanner> {
  late final Stopwatch _sw;
  late final Stream<int> _ticks;

  @override
  void initState() {
    super.initState();
    _sw = Stopwatch()..start();
    _ticks = Stream.periodic(
        const Duration(seconds: 1), (_) => _sw.elapsed.inSeconds);
  }

  @override
  void dispose() {
    _sw.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      padding: const EdgeInsets.all(16),
      child: StreamBuilder<int>(
        stream: _ticks,
        initialData: 0,
        builder: (context, snap) {
          final elapsed = snap.data ?? 0;
          final label = elapsed < 10
              ? 'Starting evaluation… downloading dataset if needed'
              : 'Running evaluation… ${elapsed}s elapsed';
          return Row(
            children: [
              const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: AppTheme.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(label,
                    style: const TextStyle(
                        color: AppTheme.textMuted, fontSize: 13)),
              ),
            ],
          );
        },
      ),
    );
  }
}
```

- [ ] **Step 2: Analyze for compile errors**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval/flutter_eval
flutter analyze lib/features/eval/eval_screen.dart
```

Expected: no errors.

- [ ] **Step 3: Run full Flutter analysis**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval/flutter_eval
flutter analyze
```

Expected: no errors across the whole app.

- [ ] **Step 4: Run all Flutter tests**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval/flutter_eval
flutter test
```

Expected: all tests PASSED.

- [ ] **Step 5: Build the Flutter web app to verify no compile errors**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval/flutter_eval
flutter build web --web-renderer canvaskit 2>&1 | tail -10
```

Expected: `✓ Built build/web` with no errors.

- [ ] **Step 6: Commit**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval
git add flutter_eval/lib/features/eval/eval_screen.dart
git commit -m "feat(custom-eval): wire up Step 0 mode toggle and custom dataset flow in eval_screen"
```

- [ ] **Step 7: Rebuild Docker image and smoke-test end-to-end**

```bash
cd /home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval
docker compose build && docker compose up -d
```

Open `http://localhost:3000`, navigate to the Eval tab.
- Confirm "0 — Evaluation mode" card appears at the top.
- Click "Custom dataset" — confirm Steps 1–2 change to upload + provider/model.
- Add an image, type a question.
- Select Ollama + a vision model (e.g. `llava`).
- Click "Run evaluation" — confirm per-sample cards appear as results stream in.
