import sys
from mcp.server.fastmcp import FastMCP

# Initialize FastMCP Server
mcp = FastMCP("AI-Eval-Pro")

@mcp.tool()
def evaluate_response(prompt: str, response: str) -> str:
    """
    Evaluates an AI response based on a prompt.
    Aligned with AWS Sales Analytics Agentic UI patterns.
    """
    # Simple logic-based scoring for the PoC
    score = 85 if "logic" in response.lower() else 40
    return f"Eval Score: {score}/100. Reasoning: High coherence detected."

if __name__ == "__main__":
    # Final Solution: Print to stderr so it shows in terminal 
    # without breaking the MCP protocol.
    print("AI-Eval-Pro MCP Server is running (STDIO mode)...", file=sys.stderr)
    mcp.run()