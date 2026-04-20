from client.mcp_http_client import SampleMcpClient

MONTHLY_SELECTIONS = {
    "states": ["MH", "KA", "TN"],
    "metric": "revenue",
    "period": "monthly",
    "year": "2025",
}

QUARTERLY_SELECTIONS = {
    "states": ["MH", "KA", "TN"],
    "metric": "revenue",
    "period": "quarterly",
    "year": "2025",
}

INVALID_SELECTIONS = {
    "states": ["MH", "KA", "TN"],
    "metric": "revenue",
    "period": "weekly",
    "year": "2025",
}



def run_test() -> list[str]:
    client = SampleMcpClient()
    tools = {tool["name"]: tool for tool in client.list_tools_sync()}

    get_sales_data = tools["get-sales-data"]
    visibility = get_sales_data["meta"]["ui"]["visibility"]
    assert visibility == ["app"], f"get-sales-data visibility should be app-only, got {visibility}"

    monthly = client.call_tool_sync("get-sales-data", MONTHLY_SELECTIONS)
    quarterly = client.call_tool_sync("get-sales-data", QUARTERLY_SELECTIONS)
    invalid = client.call_tool_sync("get-sales-data", INVALID_SELECTIONS)

    monthly_periods = len((monthly.structured_content or {}).get("periods", []))
    quarterly_periods = len((quarterly.structured_content or {}).get("periods", []))

    assert monthly_periods == 12, f"expected 12 monthly periods, got {monthly_periods}"
    assert quarterly_periods == 4, f"expected 4 quarterly periods, got {quarterly_periods}"
    assert invalid.is_error, "invalid period should trigger MCP validation error"
    assert any("Invalid option" in text for text in invalid.text_content), (
        f"unexpected invalid-input error payload: {invalid.text_content}"
    )

    visualize_meta = tools["visualize-sales-data"]["meta"]["ui"]
    pdf_meta = tools["show-sales-pdf-report"]["meta"]["ui"]
    assert visualize_meta["resourceUri"] == "ui://sample-mcp-apps-chatflow/sales-visualization"
    assert pdf_meta["resourceUri"] == "ui://sample-mcp-apps-chatflow/sales-pdf-report"

    return [
        f"get-sales-data visibility verified as app-only: {visibility}",
        f"monthly vs quarterly periods verified: {monthly_periods} vs {quarterly_periods}",
        f"invalid tool input rejected with MCP validation error: {invalid.text_content[0]}",
    ]
