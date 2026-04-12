"""Dataset management service - validation, storage, and retrieval."""

import json
import os
import uuid
from typing import Any

DATASETS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "datasets")
os.makedirs(DATASETS_DIR, exist_ok=True)


class DatasetValidationError(Exception):
    """Raised when a dataset fails schema validation."""
    pass


def validate_dataset(data: Any) -> list[dict]:
    """Validate that data is a list of {input, expected_output} objects.

    Returns the parsed list on success, raises DatasetValidationError on failure.
    """
    if not isinstance(data, list):
        raise DatasetValidationError("Dataset must be a JSON array.")

    if len(data) == 0:
        raise DatasetValidationError("Dataset must contain at least one item.")

    for i, item in enumerate(data):
        if not isinstance(item, dict):
            raise DatasetValidationError(f"Item at index {i} must be a JSON object.")
        if "input" not in item:
            raise DatasetValidationError(f"Item at index {i} is missing 'input' field.")
        if "expected_output" not in item:
            raise DatasetValidationError(f"Item at index {i} is missing 'expected_output' field.")
        
        expected = item.get("expected_output")
        if not isinstance(expected, (str, list)):
            raise DatasetValidationError(f"Item at index {i} 'expected_output' must be a string or a list of strings.")
        if isinstance(expected, list) and not all(isinstance(x, str) for x in expected):
            raise DatasetValidationError(f"Item at index {i} 'expected_output' list must contain only strings.")

    return data


def save_dataset_file(content: bytes, filename: str) -> tuple[str, list[dict]]:
    """Parse, validate, and save a dataset file.

    Returns (file_path, parsed_items).
    """
    try:
        data = json.loads(content.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        raise DatasetValidationError(f"Invalid JSON: {e}")

    items = validate_dataset(data)

    safe_name = f"{uuid.uuid4().hex}_{filename}"
    file_path = os.path.join(DATASETS_DIR, safe_name)
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2)

    return file_path, items


def load_dataset_items(file_path: str) -> list[dict]:
    """Load dataset items from the stored JSON file."""
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def validate_multimodal_dataset(data: Any) -> list[dict]:
    """Validate that data is a list of multimodal {media_url/media_file, expected_output} objects.

    Each item must have at least one of 'media_url' or 'media_file', plus 'expected_output'.
    'input' (text prompt) is optional and defaults to a generic description prompt.

    Returns the parsed list on success, raises DatasetValidationError on failure.
    """
    if not isinstance(data, list):
        raise DatasetValidationError("Dataset must be a JSON array.")

    if len(data) == 0:
        raise DatasetValidationError("Dataset must contain at least one item.")

    for i, item in enumerate(data):
        if not isinstance(item, dict):
            raise DatasetValidationError(f"Item at index {i} must be a JSON object.")

        has_url = bool(item.get("media_url", ""))
        has_file = bool(item.get("media_file", ""))

        if not has_url and not has_file:
            raise DatasetValidationError(
                f"Item at index {i} must have either 'media_url' or 'media_file'."
            )

        if "expected_output" not in item:
            raise DatasetValidationError(
                f"Item at index {i} is missing 'expected_output' field."
            )

        expected = item.get("expected_output")
        if not isinstance(expected, (str, list)):
            raise DatasetValidationError(
                f"Item at index {i} 'expected_output' must be a string or list of strings."
            )
        if isinstance(expected, list) and not all(isinstance(x, str) for x in expected):
            raise DatasetValidationError(
                f"Item at index {i} 'expected_output' list must contain only strings."
            )

        # Set default text prompt if missing
        if "input" not in item or not item["input"]:
            item["input"] = "Describe this concisely and accurately"

    return data


def detect_dataset_media_type(items: list[dict]) -> str:
    """Detect the overall media type of a multimodal dataset.

    Returns one of: 'image', 'pdf', 'video', 'mixed'.
    """
    from app.services.media_service import detect_media_type

    types = set()
    for item in items:
        source = item.get("media_url", "") or item.get("media_file", "")
        if source:
            mt = detect_media_type(source)
            if mt != "unknown":
                types.add(mt)

    if len(types) == 0:
        return "mixed"
    if len(types) == 1:
        return types.pop()
    return "mixed"


def save_multimodal_dataset_file(content: bytes, filename: str) -> tuple[str, list[dict], str]:
    """Parse, validate, and save a multimodal dataset file.

    Returns (file_path, parsed_items, media_type).
    """
    try:
        data = json.loads(content.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        raise DatasetValidationError(f"Invalid JSON: {e}")

    items = validate_multimodal_dataset(data)
    media_type = detect_dataset_media_type(items)

    safe_name = f"{uuid.uuid4().hex}_{filename}"
    file_path = os.path.join(DATASETS_DIR, safe_name)
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2)

    return file_path, items, media_type
