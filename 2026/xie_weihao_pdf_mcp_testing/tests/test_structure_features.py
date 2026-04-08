from __future__ import annotations

from tests.shared import create_client, get_fixture_paths


def run_test() -> list[str]:
    client = create_client()
    paths = get_fixture_paths()
    pdf_path = paths["pdf"]

    outline = client.call_tool_sync("get_pdf_outline", {"file_path": pdf_path})
    page_info = client.call_tool_sync("get_pdf_page_info", {"file_path": pdf_path, "page": 1})
    links = client.call_tool_sync("extract_pdf_links", {"file_path": pdf_path})
    annotations = client.call_tool_sync("get_pdf_annotations", {"file_path": pdf_path})

    assert not outline.is_error and outline.structured_content is not None
    assert not page_info.is_error and page_info.structured_content is not None
    assert not links.is_error and links.structured_content is not None
    assert not annotations.is_error and annotations.structured_content is not None

    outline_data = outline.structured_content
    page_info_data = page_info.structured_content
    links_data = links.structured_content
    annotations_data = annotations.structured_content

    assert outline_data["has_outline"] is True, "fixture PDF should expose outline"
    assert outline_data["outline_count"] == 3, f"expected 3 outline items, got {outline_data['outline_count']}"
    assert page_info_data["page_number"] == 1
    assert page_info_data["has_text"] is True
    assert page_info_data["image_count"] >= 1, f"expected embedded image on page 1, got {page_info_data['image_count']}"
    assert links_data["total_links"] >= 2, f"expected at least 2 links, got {links_data['total_links']}"
    assert len(links_data["external_links"]) >= 1, "expected at least one external link"
    assert len(links_data["internal_links"]) >= 1, "expected at least one internal link"
    assert annotations_data["total_annotations"] >= 1, "expected at least one annotation"

    return [
        f"get_pdf_outline verified outline_count={outline_data['outline_count']}",
        f"get_pdf_page_info verified image_count={page_info_data['image_count']} and has_text={page_info_data['has_text']}",
        f"extract_pdf_links verified total_links={links_data['total_links']}",
        f"get_pdf_annotations verified total_annotations={annotations_data['total_annotations']}",
    ]
