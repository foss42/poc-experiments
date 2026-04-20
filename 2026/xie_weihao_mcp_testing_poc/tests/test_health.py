from client.mcp_http_client import SampleMcpClient


def run_test() -> list[str]:
    client = SampleMcpClient()
    health = client.get_health()

    assert health["status"] == "ok", f"unexpected status payload: {health}"
    assert health["server"] == "sample-mcp-apps-chatflow", f"unexpected server payload: {health}"

    return [
        f"health endpoint reachable: {health}",
        "sample MCP server is available for tool-level testing",
    ]
