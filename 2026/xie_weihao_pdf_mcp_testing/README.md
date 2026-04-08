# PDF Reader MCP Testing PoC

This repository is my second PoC for the APIDash GSoC MCP Testing track.

While my first PoC focused on the mentor-provided Sales Analytics MCP Apps server, this one focuses on testing my own `pdf-reader-mcp` server from an MCP client perspective.

For this PoC, I treated `pdf-reader-mcp` as a PDF-focused MCP surface with multiple capability layers: metadata, text extraction, search, structural analysis, image extraction, and edge-case handling.

## What this PoC covers

This PoC currently validates:

- tool discovery for the PDF Reader MCP server
- PDF metadata and basic file information
- text extraction and keyword search workflow
- text statistics and scanned-PDF detection behavior
- outline, page info, links, and annotation extraction
- rendered page image payloads and embedded image extraction
- edge cases such as missing files, non-PDF inputs, invalid search queries, and invalid page numbers
- page-range fallback behavior for invalid page range tokens
- page comparison output and similarity bounds
- scenario-based workflow checks using generated fixture PDFs

## Target under test

Target repository: `pdf-reader-mcp`

This MCP server exposes tools such as:

- `get_pdf_info`
- `read_pdf_as_text`
- `read_pdf_as_images`
- `get_pdf_outline`
- `search_pdf_text`
- `extract_pdf_tables`
- `extract_pdf_images`
- `get_pdf_page_info`
- `extract_pdf_links`
- `get_pdf_annotations`
- `get_pdf_text_stats`
- `compare_pdf_pages`

## Why I built it this way

For this second PoC, I wanted to show that I can apply MCP testing not only to a mentor-provided sample server, but also to an MCP server I built myself.

I focused on a few layers that feel especially important for a PDF-oriented MCP server:

- contract-level capability discovery
- text reading and search behavior
- structure-oriented extraction such as outline, links, and annotations
- binary payload validation for rendered pages and extracted images
- protocol and edge-case behavior around invalid inputs

That way, this PoC is not just a local function smoke test. It is a more structured MCP testing pass over the server behavior as exposed to a real MCP client.

## Current automated coverage

### 1. Tool contracts

Validate that the expected PDF Reader MCP tools are exposed by the server.

### 2. Text workflow validation

Validate a text-oriented workflow using:

1. `get_pdf_info`
2. `read_pdf_as_text`
3. `search_pdf_text`
4. `get_pdf_text_stats`

The checks verify page counts, extracted page ranges, keyword matches, and text statistics.

### 3. Structure feature validation

Validate:

- outline extraction
- page-level information
- external/internal link extraction
- annotation extraction

This PoC uses an automatically generated fixture PDF that contains a table, embedded image, outline, links, and a highlight annotation.

### 4. Image payload validation

Validate:

- `read_pdf_as_images` returns a decodable rendered page payload
- `extract_pdf_images` returns decodable embedded image payloads with valid dimensions

### 5. Protocol edge validation

Validate:

- missing file rejection
- non-PDF input rejection
- invalid search query rejection
- invalid page number rejection
- fallback behavior for invalid page-range tokens
- page comparison similarity bounds

### 6. Scenario-based workflow validation

Run two end-to-end workflows:

- `text_analysis_workflow`
- `structure_and_media_workflow`

These workflows verify that the MCP server behaves consistently across related tool calls instead of only in isolated single-tool checks.

## Test fixtures

This PoC generates its own local fixture PDFs at runtime instead of depending on manually prepared sample files.

The generated fixtures cover:

- a rich PDF with text, table-like layout, embedded image, links, outline, and annotation
- a larger multi-page PDF for page-range boundary checks
- a minimal image-only PDF for scanned-content-related behavior
- a non-PDF file and a missing-file path for negative cases

## Environment

- Python 3.11
- Python packages: `mcp`, `httpx`, `PyMuPDF`
- target MCP server: local `pdf-reader-mcp`

## How to run

From this project directory:

```bash
python scripts/run_tests.py
```

This PoC connects to the local `pdf-reader-mcp` server over MCP stdio using:

- `F:/杂物/个人开发/MCP/pdf-reader-mcp/.venv/Scripts/python.exe`
- module entrypoint: `pdf_reader_mcp.server`

Running the test runner generates local reports in:

- `reports/latest_report.json`
- `reports/latest_report.md`

I treat those as generated output rather than submission files.

## A short note

I used AI tools while working on this PoC as well, but I did not treat them as a substitute for understanding the system.

In this case, the important part for me was not just writing assertions, but making sure the tests matched the real behavior of the MCP server: how payloads are returned, how fixture PDFs should be constructed, and how edge cases are currently handled by the server implementation.

I wanted this PoC to reflect a practical testing habit: understand the server surface first, generate targeted fixtures, validate real outputs, and keep the checks aligned with current behavior instead of assumed behavior.
