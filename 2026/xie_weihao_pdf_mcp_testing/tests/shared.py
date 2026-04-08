from __future__ import annotations

from client.mcp_stdio_client import PdfReaderMcpClient
from tests.fixtures import fixture_paths

EXPECTED_TOOLS = {
    "get_pdf_info",
    "read_pdf_as_images",
    "read_pdf_as_text",
    "get_pdf_outline",
    "search_pdf_text",
    "extract_pdf_tables",
    "extract_pdf_images",
    "get_pdf_page_info",
    "extract_pdf_links",
    "get_pdf_annotations",
    "get_pdf_text_stats",
    "compare_pdf_pages",
}


def create_client() -> PdfReaderMcpClient:
    return PdfReaderMcpClient()


def get_fixture_paths() -> dict[str, str]:
    return fixture_paths()
