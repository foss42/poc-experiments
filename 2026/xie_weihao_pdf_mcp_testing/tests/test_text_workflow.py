from __future__ import annotations

from tests.shared import create_client, get_fixture_paths


def run_test() -> list[str]:
    client = create_client()
    paths = get_fixture_paths()
    pdf_path = paths["pdf"]
    keyword = paths["keyword"]

    info = client.call_tool_sync("get_pdf_info", {"file_path": pdf_path})
    text = client.call_tool_sync("read_pdf_as_text", {"file_path": pdf_path, "pages": "1-2"})
    search = client.call_tool_sync(
        "search_pdf_text",
        {"file_path": pdf_path, "query": keyword, "max_results": 10},
    )
    stats = client.call_tool_sync("get_pdf_text_stats", {"file_path": pdf_path, "pages": "1-2"})

    assert not info.is_error and info.structured_content is not None
    assert not text.is_error and text.structured_content is not None
    assert not search.is_error and search.structured_content is not None
    assert not stats.is_error and stats.structured_content is not None

    info_data = info.structured_content
    text_data = text.structured_content
    search_data = search.structured_content
    stats_data = stats.structured_content

    assert info_data["page_count"] == 3, f"expected 3 pages, got {info_data['page_count']}"
    assert text_data["extracted_pages"] == [1, 2], f"unexpected extracted pages: {text_data['extracted_pages']}"
    assert keyword in text_data["full_text"], "keyword should appear in extracted text"
    assert search_data["total_matches"] >= 2, f"expected at least 2 matches, got {search_data['total_matches']}"
    assert search_data["pages_with_matches"] == [1, 2], f"unexpected pages_with_matches: {search_data['pages_with_matches']}"
    assert stats_data["analyzed_pages"] == 2, f"unexpected analyzed_pages: {stats_data['analyzed_pages']}"
    assert stats_data["total_characters"] > 0, "total_characters should be positive"
    assert stats_data["is_likely_scanned"] is False, "fixture PDF should not look scanned"

    return [
        f"get_pdf_info verified page_count={info_data['page_count']}",
        f"read_pdf_as_text verified extracted_pages={text_data['extracted_pages']}",
        f"search_pdf_text found {search_data['total_matches']} matches across pages {search_data['pages_with_matches']}",
        f"get_pdf_text_stats verified total_characters={stats_data['total_characters']}",
    ]
