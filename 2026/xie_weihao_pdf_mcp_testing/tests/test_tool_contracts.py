from __future__ import annotations

from tests.shared import EXPECTED_TOOLS, create_client


def run_test() -> list[str]:
    client = create_client()
    tool_names = set(client.list_tool_names_sync())
    missing = EXPECTED_TOOLS - tool_names
    assert not missing, f"missing tools: {sorted(missing)}"

    return [
        f"discovered {len(tool_names)} MCP tools",
        f"verified expected tools: {sorted(EXPECTED_TOOLS)}",
    ]
