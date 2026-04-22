from client.mcp_http_client import SampleMcpClient

EXPECTED_RESOURCES = {
    "ui://sample-mcp-apps-chatflow/sales-metric-input-ui",
    "ui://sample-mcp-apps-chatflow/sales-visualization",
    "ui://sample-mcp-apps-chatflow/sales-pdf-report",
}
EXPECTED_MIME = "text/html;profile=mcp-app"



def run_test() -> list[str]:
    client = SampleMcpClient()
    resources = client.list_resources_sync()

    uris = {resource["uri"] for resource in resources}
    missing = sorted(EXPECTED_RESOURCES.difference(uris))
    assert not missing, f"missing expected resources: {missing}, actual={sorted(uris)}"

    mime_mismatches = [resource for resource in resources if resource.get("mimeType") != EXPECTED_MIME]
    assert not mime_mismatches, f"unexpected resource mime types: {mime_mismatches}"

    resource_map = {resource["uri"]: resource for resource in resources}
    form_html = client.read_resource_sync("ui://sample-mcp-apps-chatflow/sales-metric-input-ui")
    visualization_html = client.read_resource_sync("ui://sample-mcp-apps-chatflow/sales-visualization")
    pdf_html = client.read_resource_sync("ui://sample-mcp-apps-chatflow/sales-pdf-report")

    assert "ui/initialize" in form_html.text, "sales form resource should initialize MCP UI handshake"
    assert "chart.js" in visualization_html.text, "visualization resource should load Chart.js"
    assert "pdf.min.mjs" in pdf_html.text, "pdf resource should load PDF.js"
    assert "ui/download-file" in pdf_html.text, "pdf resource should use host mediated download"

    return [
        f"resource URIs verified: {sorted(uris)}",
        f"resource MIME types verified: {EXPECTED_MIME}",
        f"visualization resource description: {resource_map['ui://sample-mcp-apps-chatflow/sales-visualization']['description']}",
    ]
