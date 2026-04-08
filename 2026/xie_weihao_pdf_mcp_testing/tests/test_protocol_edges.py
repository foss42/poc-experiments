from __future__ import annotations

from tests.shared import create_client, get_fixture_paths


def run_test() -> list[str]:
    client = create_client()
    paths = get_fixture_paths()
    pdf_path = paths["pdf"]

    missing = client.call_tool_sync("get_pdf_info", {"file_path": paths["missing_pdf"]})
    non_pdf = client.call_tool_sync("get_pdf_info", {"file_path": paths["non_pdf"]})
    invalid_query = client.call_tool_sync("search_pdf_text", {"file_path": pdf_path, "query": ""})
    invalid_page = client.call_tool_sync("get_pdf_page_info", {"file_path": pdf_path, "page": 99})
    compare = client.call_tool_sync("compare_pdf_pages", {"file_path": pdf_path, "page1": 1, "page2": 2})
    fallback_pages = client.call_tool_sync("read_pdf_as_text", {"file_path": pdf_path, "pages": "abc"})

    assert missing.is_error, "missing file should error"
    assert non_pdf.is_error, "non-pdf file should error"
    assert invalid_query.is_error, "empty query should error"
    assert invalid_page.is_error, "out-of-range page should error"
    assert not compare.is_error and compare.structured_content is not None
    assert not fallback_pages.is_error and fallback_pages.structured_content is not None

    compare_data = compare.structured_content
    fallback_data = fallback_pages.structured_content

    assert compare_data["page1"] == 1 and compare_data["page2"] == 2
    assert 0 <= compare_data["similarity"] <= 1, f"unexpected similarity: {compare_data['similarity']}"
    assert fallback_data["extracted_pages"] == [1, 2, 3], (
        f"invalid pages string should fall back to all pages, got {fallback_data['extracted_pages']}"
    )

    missing_error = missing.text_content[0] if missing.text_content else "missing error text"
    non_pdf_error = non_pdf.text_content[0] if non_pdf.text_content else "non-pdf error text"

    return [
        f"missing file rejected: {missing_error}",
        f"non-pdf input rejected: {non_pdf_error}",
        f"invalid search query rejected and invalid page number rejected",
        f"compare_pdf_pages verified similarity={compare_data['similarity']}",
        f"invalid page-range token fallback verified as extracted_pages={fallback_data['extracted_pages']}",
    ]
