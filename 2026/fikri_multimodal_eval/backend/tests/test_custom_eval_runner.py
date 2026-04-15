import base64
import shutil
import tempfile
from pathlib import Path

import pytest
from unittest.mock import AsyncMock, patch

from custom_eval_runner import normalize, score, encode_image, call_model, run_custom_eval

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

# --- encode_image ---

def test_encode_image_jpg_returns_jpeg_data_uri(tmp_path):
    content = b"fake-jpeg-bytes"
    path = tmp_path / "image.jpg"
    path.write_bytes(content)
    uri = encode_image(path)
    assert uri.startswith("data:image/jpeg;base64,")
    assert base64.b64decode(uri.split(",", 1)[1]) == content


def test_encode_image_jpeg_extension_maps_to_jpeg_mime(tmp_path):
    content = b"data"
    path = tmp_path / "image.jpeg"
    path.write_bytes(content)
    uri = encode_image(path)
    assert uri.startswith("data:image/jpeg;base64,")
    assert base64.b64decode(uri.split(",", 1)[1]) == content


def test_encode_image_png_returns_png_data_uri(tmp_path):
    content = b"fake-png-bytes"
    path = tmp_path / "image.png"
    path.write_bytes(content)
    uri = encode_image(path)
    assert uri.startswith("data:image/png;base64,")
    assert base64.b64decode(uri.split(",", 1)[1]) == content

def test_score_case_insensitive():
    assert score("A CAT", "a cat") is True

# --- call_model ---

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

@pytest.mark.asyncio
async def test_call_model_routes_to_huggingface():
    with patch("custom_eval_runner._call_huggingface", new_callable=AsyncMock) as mock:
        mock.return_value = "dog"
        result = await call_model(
            "huggingface", "Salesforce/blip-vqa-base",
            "data:image/png;base64,abc", "What animal?"
        )
        mock.assert_called_once_with(
            "Salesforce/blip-vqa-base",
            "data:image/png;base64,abc",
            "What animal?",
        )
        assert result == "dog"


@pytest.mark.asyncio
async def test_run_custom_eval_yields_started_then_samples_then_complete():
    import custom_eval_runner
    sdir = Path(tempfile.mkdtemp())
    session_id = sdir.name
    parent = sdir.parent
    original = custom_eval_runner.SESSION_DIR
    custom_eval_runner.SESSION_DIR = parent

    (sdir / "cat.jpg").write_bytes(b"fake")
    samples = [{"filename": "cat.jpg", "question": "What animal?", "answer": "cat"}]

    with patch("custom_eval_runner.call_model", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = "a cat"
        events = [e async for e in run_custom_eval(session_id, samples, "ollama", "llava")]

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
    import custom_eval_runner
    sdir = Path(tempfile.mkdtemp())
    session_id = sdir.name
    parent = sdir.parent
    original = custom_eval_runner.SESSION_DIR
    custom_eval_runner.SESSION_DIR = parent
    (sdir / "img.png").write_bytes(b"fake")

    samples = [{"filename": "img.png", "question": "Describe this."}]

    with patch("custom_eval_runner.call_model", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = "a landscape"
        events = [e async for e in run_custom_eval(session_id, samples, "ollama", "llava")]

    custom_eval_runner.SESSION_DIR = original
    shutil.rmtree(sdir, ignore_errors=True)

    assert events[1]["correct"] is None
    complete_event = events[2]
    assert "accuracy" not in complete_event


@pytest.mark.asyncio
async def test_run_custom_eval_model_error_yields_sample_error():
    import custom_eval_runner
    sdir = Path(tempfile.mkdtemp())
    session_id = sdir.name
    parent = sdir.parent
    original = custom_eval_runner.SESSION_DIR
    custom_eval_runner.SESSION_DIR = parent
    (sdir / "img.jpg").write_bytes(b"fake")

    samples = [{"filename": "img.jpg", "question": "Q?", "answer": "A"}]

    with patch("custom_eval_runner.call_model", new_callable=AsyncMock) as mock_call:
        mock_call.side_effect = RuntimeError("API error")
        events = [e async for e in run_custom_eval(session_id, samples, "ollama", "llava")]

    custom_eval_runner.SESSION_DIR = original
    shutil.rmtree(sdir, ignore_errors=True)

    assert events[1]["type"] == "sample_error"
    assert "API error" in events[1]["detail"]
    assert events[2]["type"] == "complete"


@pytest.mark.asyncio
async def test_run_custom_eval_sets_openrouter_env_vars():
    import custom_eval_runner
    import os as _os
    sdir = Path(tempfile.mkdtemp())
    session_id = sdir.name
    original_dir = custom_eval_runner.SESSION_DIR
    custom_eval_runner.SESSION_DIR = sdir.parent
    (sdir / "img.jpg").write_bytes(b"fake")
    samples = [{"filename": "img.jpg", "question": "Q?"}]

    with patch("custom_eval_runner.call_model", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = "answer"
        events = []
        async for e in run_custom_eval(
            session_id, samples, "openrouter", "openai/gpt-4o-mini",
            openrouter_api_key="sk-test",
        ):
            events.append(e)
            if e["type"] == "started":
                # Check env vars are set during execution
                assert _os.environ.get("OPENAI_API_KEY") == "sk-test"
                assert _os.environ.get("OPENAI_API_BASE") == "https://openrouter.ai/api/v1"

    custom_eval_runner.SESSION_DIR = original_dir
    shutil.rmtree(sdir, ignore_errors=True)
    # Env vars should be cleaned up by the generator's finally block
    assert _os.environ.get("OPENAI_API_KEY") != "sk-test"
