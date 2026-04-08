from __future__ import annotations

import base64

from tests.shared import create_client, get_fixture_paths


def run_test() -> list[str]:
    client = create_client()
    paths = get_fixture_paths()
    pdf_path = paths["pdf"]

    rendered = client.call_tool_sync(
        "read_pdf_as_images",
        {"file_path": pdf_path, "pages": "1", "dpi": 72, "image_format": "png"},
    )
    embedded = client.call_tool_sync(
        "extract_pdf_images",
        {"file_path": pdf_path, "pages": "1", "min_width": 50, "min_height": 50},
    )

    assert not rendered.is_error and rendered.structured_content is not None
    assert not embedded.is_error and embedded.structured_content is not None

    rendered_payload = rendered.structured_content
    if isinstance(rendered_payload, list):
        rendered_images = rendered_payload
    elif isinstance(rendered_payload, dict) and isinstance(rendered_payload.get("result"), list):
        rendered_images = rendered_payload["result"]
    else:
        raise AssertionError(f"unexpected read_pdf_as_images payload shape: {type(rendered_payload)} -> {rendered_payload!r}")
    assert len(rendered_images) == 1, f"expected one rendered page image, got {len(rendered_images)}"
    first_rendered = rendered_images[0]
    decoded_rendered = base64.b64decode(first_rendered["image_base64"])
    assert decoded_rendered.startswith(b"\x89PNG"), "rendered page should decode to PNG bytes"
    assert first_rendered["width"] > 0 and first_rendered["height"] > 0

    embedded_data = embedded.structured_content
    assert embedded_data["total_images"] >= 1, f"expected at least one extracted image, got {embedded_data['total_images']}"
    first_embedded = embedded_data["images"][0]
    decoded_embedded = base64.b64decode(first_embedded["image_base64"])
    assert len(decoded_embedded) > 0, "embedded image base64 should decode to bytes"
    assert first_embedded["width"] > 0 and first_embedded["height"] > 0

    return [
        f"read_pdf_as_images verified rendered_pages={len(rendered_images)}",
        f"rendered page payload decoded successfully with size={len(decoded_rendered)} bytes",
        f"extract_pdf_images verified total_images={embedded_data['total_images']}",
        f"embedded image dimensions verified as {first_embedded['width']}x{first_embedded['height']}",
    ]
