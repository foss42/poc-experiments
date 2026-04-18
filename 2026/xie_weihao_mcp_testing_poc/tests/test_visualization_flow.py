from client.mcp_http_client import SampleMcpClient

SAMPLE_SELECTIONS = {
    "states": ["MH", "KA", "TN"],
    "metric": "revenue",
    "period": "monthly",
    "year": "2025",
}



def run_test() -> list[str]:
    client = SampleMcpClient()
    tools = {tool["name"]: tool for tool in client.list_tools_sync()}

    report_result = client.call_tool_sync("get-sales-data", SAMPLE_SELECTIONS)
    assert not report_result.is_error, f"get-sales-data failed: {report_result.text_content}"
    report = report_result.structured_content
    assert report is not None, "missing report structuredContent"

    visualization_result = client.call_tool_sync(
        "visualize-sales-data",
        {
            "selections": SAMPLE_SELECTIONS,
            "report": report,
        },
    )
    assert not visualization_result.is_error, (
        f"visualize-sales-data returned error: {visualization_result.text_content}"
    )

    structured = visualization_result.structured_content
    assert structured is not None, "visualization structuredContent is missing"
    assert structured.get("selections") == SAMPLE_SELECTIONS, "visualization selections mismatch"
    assert structured.get("report") == report, "visualization report mismatch"

    visualization_meta = tools["visualize-sales-data"]["meta"]["ui"]
    assert visualization_meta["resourceUri"] == "ui://sample-mcp-apps-chatflow/sales-visualization"
    assert visualization_meta["visibility"] == ["model", "app"]

    assert any("Sales visualization rendered" in text for text in visualization_result.text_content), (
        f"unexpected visualization message: {visualization_result.text_content}"
    )

    return [
        "visualize-sales-data accepted selections + report payload",
        "visualization structuredContent preserved the workflow inputs",
        f"visualization UI meta verified: {visualization_meta}",
    ]
