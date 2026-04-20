from client.mcp_http_client import SampleMcpClient

EXPECTED_TOOLS = {
    "select-sales-metric",
    "get-sales-data",
    "visualize-sales-data",
    "show-sales-pdf-report",
}

SAMPLE_SELECTIONS = {
    "states": ["MH", "KA", "TN"],
    "metric": "revenue",
    "period": "monthly",
    "year": "2025",
}



def run_test() -> list[str]:
    client = SampleMcpClient()

    tool_names = client.list_tool_names_sync()
    missing_tools = sorted(EXPECTED_TOOLS.difference(tool_names))
    assert not missing_tools, f"missing expected tools: {missing_tools}, actual={tool_names}"

    result = client.call_tool_sync("get-sales-data", SAMPLE_SELECTIONS)
    assert not result.is_error, f"get-sales-data returned error: {result.text_content}"

    structured = result.structured_content
    assert structured is not None, "structuredContent is missing"

    required_keys = {"summary", "topState", "periods", "states", "stateNames"}
    missing_keys = sorted(required_keys.difference(structured.keys()))
    assert not missing_keys, f"missing structured content keys: {missing_keys}"

    periods = structured["periods"]
    states = structured["states"]
    state_names = structured["stateNames"]

    assert isinstance(periods, list) and periods, "periods must be a non-empty list"
    assert len(periods) == 12, f"monthly report should contain 12 periods, got {len(periods)}"
    assert isinstance(states, list) and states, "states must be a non-empty list"
    assert isinstance(state_names, list) and len(state_names) == len(SAMPLE_SELECTIONS["states"]), (
        f"stateNames length mismatch: {state_names}"
    )

    first_period = periods[0]
    for key in ("period", "total", "stateValues"):
        assert key in first_period, f"period entry missing key: {key}"

    summary = structured["summary"]
    for key in ("total", "average", "trend", "totalRaw", "averageRaw"):
        assert key in summary, f"summary missing key: {key}"

    top_state = structured["topState"]
    for key in ("name", "code", "value", "percentage"):
        assert key in top_state, f"topState missing key: {key}"

    return [
        f"tools discovered successfully: {tool_names}",
        f"structuredContent keys verified: {sorted(structured.keys())}",
        f"monthly report contains {len(periods)} periods for {state_names}",
    ]
