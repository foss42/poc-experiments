import json
import unittest

from mcp_server import APIMarketplaceMCPServer


class MCPServerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.server = APIMarketplaceMCPServer()

    def test_explore_apis_tool_returns_results(self) -> None:
        response = self.server.handle(
            {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/call",
                "params": {
                    "name": "explore_apis",
                    "arguments": {"query": "finance", "limit": 5},
                },
            }
        )

        self.assertEqual(response["id"], 1)
        content = response["result"]["content"][0]["text"]
        payload = json.loads(content)
        self.assertIn("apis", payload)

    def test_get_pipeline_status_tool_returns_counts(self) -> None:
        response = self.server.handle(
            {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/call",
                "params": {
                    "name": "get_pipeline_status",
                    "arguments": {},
                },
            }
        )

        payload = json.loads(response["result"]["content"][0]["text"])
        self.assertIn("published_api_count", payload)


if __name__ == "__main__":
    unittest.main()
