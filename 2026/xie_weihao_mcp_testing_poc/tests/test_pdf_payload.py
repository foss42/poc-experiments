import base64

from client.mcp_http_client import SampleMcpClient

SAMPLE_SELECTIONS = {
    "states": ["MH", "KA", "TN"],
    "metric": "revenue",
    "period": "monthly",
    "year": "2025",
}



def run_test() -> list[str]:
    client = SampleMcpClient()

    report_result = client.call_tool_sync("get-sales-data", SAMPLE_SELECTIONS)
    assert not report_result.is_error, f"get-sales-data returned error: {report_result.text_content}"
    report = report_result.structured_content
    assert report is not None, "missing report structuredContent"

    pdf_result = client.call_tool_sync(
        "show-sales-pdf-report",
        {
            "selections": SAMPLE_SELECTIONS,
            "report": report,
        },
    )
    assert not pdf_result.is_error, f"show-sales-pdf-report returned error: {pdf_result.text_content}"

    structured = pdf_result.structured_content
    assert structured is not None, "missing PDF structuredContent"

    pdf_base64 = structured.get("pdfBase64")
    file_name = structured.get("fileName")
    file_size = structured.get("fileSize")

    assert isinstance(pdf_base64, str) and pdf_base64, "pdfBase64 must be a non-empty string"
    assert isinstance(file_name, str) and file_name.endswith(".pdf"), f"unexpected fileName: {file_name}"
    assert isinstance(file_size, int) and file_size > 0, f"unexpected fileSize: {file_size}"

    pdf_bytes = base64.b64decode(pdf_base64)
    assert pdf_bytes.startswith(b"%PDF"), "decoded payload is not a valid PDF header"

    return [
        f"PDF file generated successfully: {file_name}",
        f"reported file size: {file_size} bytes",
        f"decoded PDF payload size: {len(pdf_bytes)} bytes",
    ]
