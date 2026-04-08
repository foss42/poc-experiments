from __future__ import annotations

import struct
import tempfile
import zlib
from pathlib import Path

import fitz

FIXTURE_KEYWORD = "MCPTESTKEYWORD"
FIXTURE_VERSION = "v2"


def _png_bytes(width: int = 120, height: int = 120, color: tuple[int, int, int] = (255, 0, 0)) -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack("!I", len(data)) + tag + data + struct.pack("!I", crc)

    raw = bytearray()
    row = bytes(color) * width
    for _ in range(height):
        raw.extend(b"\x00" + row)

    ihdr = struct.pack("!IIBBBBB", width, height, 8, 2, 0, 0, 0)
    idat = zlib.compress(bytes(raw), 9)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


def _fixture_dir() -> Path:
    fixture_dir = Path(tempfile.gettempdir()) / "pdf-mcp-testing-fixtures"
    fixture_dir.mkdir(parents=True, exist_ok=True)
    return fixture_dir


def _ensure_common_support_files() -> tuple[Path, Path]:
    fixture_dir = _fixture_dir()
    image_path = fixture_dir / f"fixture_image_{FIXTURE_VERSION}.png"
    text_path = fixture_dir / f"not_a_pdf_{FIXTURE_VERSION}.txt"
    image_path.write_bytes(_png_bytes())
    text_path.write_text("this is not a pdf", encoding="utf-8")
    return image_path, text_path


def ensure_rich_fixture_pdf() -> Path:
    fixture_dir = _fixture_dir()
    image_path, _ = _ensure_common_support_files()
    pdf_path = fixture_dir / f"rich_fixture_{FIXTURE_VERSION}.pdf"
    if pdf_path.exists():
        return pdf_path

    doc = fitz.open()

    page1 = doc.new_page()
    page1.insert_text((72, 72), f"PDF MCP testing keyword alpha {FIXTURE_KEYWORD}", fontsize=12)
    page1.insert_text((72, 100), "This page contains text for extraction, search, and stats.", fontsize=12)

    x0, y0, width, height = 72, 150, 240, 90
    for i in range(4):
        y = y0 + i * (height / 3)
        page1.draw_line((x0, y), (x0 + width, y), width=1)
    for j in range(4):
        x = x0 + j * (width / 3)
        page1.draw_line((x, y0), (x, y0 + height), width=1)

    labels = [["A1", "B1", "C1"], ["A2", "B2", "C2"], ["A3", "B3", "C3"]]
    for row_idx in range(3):
        for col_idx in range(3):
            page1.insert_text(
                (x0 + 10 + col_idx * (width / 3), y0 + 20 + row_idx * (height / 3)),
                labels[row_idx][col_idx],
                fontsize=10,
            )

    page1.insert_image(fitz.Rect(340, 140, 460, 260), filename=str(image_path))
    page1.insert_text((72, 285), "External link target", fontsize=12)
    page1.insert_text((72, 315), "Jump to second page", fontsize=12)
    highlight_rects = page1.search_for(FIXTURE_KEYWORD)
    if highlight_rects:
        page1.add_highlight_annot(highlight_rects)

    page2 = doc.new_page()
    page2.insert_text((72, 72), f"Second page text for compare and search {FIXTURE_KEYWORD} beta", fontsize=12)
    page2.insert_text((72, 100), "This page is intentionally different from page one.", fontsize=12)

    page3 = doc.new_page()
    page3.insert_text((72, 72), "Third page summary section", fontsize=12)

    doc.save(pdf_path)
    doc.close()

    saved_doc = fitz.open(pdf_path)
    first_page = saved_doc[0]
    first_page.insert_link(
        {
            "kind": fitz.LINK_URI,
            "from": fitz.Rect(72, 280, 220, 300),
            "uri": "https://example.com",
        }
    )
    first_page.insert_link(
        {
            "kind": fitz.LINK_GOTO,
            "from": fitz.Rect(72, 310, 220, 330),
            "page": 1,
        }
    )
    saved_doc.set_toc([[1, "Overview", 1], [1, "Details", 2], [2, "Summary", 3]])
    saved_doc.saveIncr()
    saved_doc.close()

    return pdf_path


def ensure_large_fixture_pdf() -> Path:
    fixture_dir = _fixture_dir()
    pdf_path = fixture_dir / f"large_fixture_{FIXTURE_VERSION}.pdf"
    if pdf_path.exists():
        return pdf_path

    doc = fitz.open()
    for page_number in range(1, 22):
        page = doc.new_page()
        page.insert_text((72, 72), f"Large fixture page {page_number}", fontsize=12)
    doc.save(pdf_path)
    doc.close()
    return pdf_path


def ensure_scanned_fixture_pdf() -> Path:
    fixture_dir = _fixture_dir()
    image_path, _ = _ensure_common_support_files()
    pdf_path = fixture_dir / f"scanned_fixture_{FIXTURE_VERSION}.pdf"
    if pdf_path.exists():
        return pdf_path

    doc = fitz.open()
    page = doc.new_page()
    page.insert_image(fitz.Rect(72, 72, 420, 420), filename=str(image_path))
    doc.save(pdf_path)
    doc.close()
    return pdf_path


def fixture_paths() -> dict[str, str]:
    fixture_dir = _fixture_dir()
    _, text_path = _ensure_common_support_files()
    return {
        "pdf": str(ensure_rich_fixture_pdf()),
        "large_pdf": str(ensure_large_fixture_pdf()),
        "scanned_pdf": str(ensure_scanned_fixture_pdf()),
        "non_pdf": str(text_path),
        "missing_pdf": str(fixture_dir / f"missing_file_{FIXTURE_VERSION}.pdf"),
        "keyword": FIXTURE_KEYWORD,
    }
