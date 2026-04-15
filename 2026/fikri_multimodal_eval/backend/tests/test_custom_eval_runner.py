import base64
from pathlib import Path

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
