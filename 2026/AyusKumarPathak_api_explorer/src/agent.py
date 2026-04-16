"""
agent.py — Simple rule-based agent for API tool selection
Demonstrates how API templates can be treated as callable tools.
"""

from typing import Optional


class APITool:
    """Represents a single API endpoint as a callable tool."""

    def __init__(self, endpoint: dict):
        self.name = f"{endpoint['method']} {endpoint['path']}"
        self.summary = endpoint.get("summary", "")
        self.tag = endpoint.get("tag", "General")

    def call(self) -> str:
        """Simulate calling the endpoint."""
        return f"[200 OK] Simulated response for {self.name}"

    def __repr__(self) -> str:
        return f"APITool({self.name!r}, tag={self.tag!r})"


class SimpleAgent:
    """Basic agent that selects and invokes API tools based on intent."""

    def __init__(self, template: dict):
        self.tools = [APITool(ep) for ep in template.get("endpoints", [])]
        print(
            f"\n[Agent] Loaded {len(self.tools)} tools from template: "
            f"'{template.get('name', 'Unknown API')}'"
        )

    def score_tool(self, intent: str, tool: APITool) -> int:
        """
        Assign a score based on how well the tool matches the intent.
        Uses keyword overlap + simple structural hints.
        """
        intent_words = set(intent.lower().split())
        candidate = f"{tool.name} {tool.summary}".lower()

        score = 0

        # Structural hint: ID-based endpoints
        if "id" in intent and "{" in tool.name:
            score += 2

        # Keyword overlap
        for word in intent_words:
            if word in candidate:
                score += 1

        return score

    def select_tool(self, intent: str) -> Optional[APITool]:
        """
        Select the best matching tool.
        Falls back to a GET endpoint if no good match is found.
        """
        best_tool = None
        best_score = -1

        for tool in self.tools:
            score = self.score_tool(intent, tool)
            if score > best_score:
                best_score = score
                best_tool = tool

        # Fallback: first GET endpoint
        if best_score <= 0:
            for tool in self.tools:
                if tool.name.startswith("GET"):
                    return tool
            return self.tools[0] if self.tools else None

        return best_tool

    def run(self, intent: str) -> None:
        print(f"\n[Agent] Intent  → '{intent}'")
        tool = self.select_tool(intent)
        print(f"[Agent] Selected → {tool}")
        result = tool.call()
        print(f"[Agent] Result   → {result}")


def run_agent_demo(template: dict) -> None:
    """Run demo queries through the agent."""
    agent = SimpleAgent(template)

    intents = [
        "find a pet by ID",
        "place an order for a pet",
        "list available pets in the store",
        "update user information",
    ]

    print("\n" + "=" * 60)
    print("  AI AGENT SIMULATION")
    print("=" * 60)

    for intent in intents:
        agent.run(intent)

    print("\n" + "=" * 60)
    print("[Agent] Simulation complete.")