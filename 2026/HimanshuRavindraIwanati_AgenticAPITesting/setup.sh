#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# apidash-agent-mcp — Quick Start
# GSoC 2026 POC: Agentic API Testing for API Dash
# ─────────────────────────────────────────────────────────────────────────────

set -e

echo "🚀 apidash-agent-mcp setup"
echo ""

# 1. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 2. Build TypeScript
echo "🔨 Building..."
npm run build

# 3. Inject absolute path into VS Code config
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VSCODE_CONFIG=".vscode/mcp.json"
sed -i "s|REPLACE_WITH_ABSOLUTE_PATH|$SCRIPT_DIR|g" "$VSCODE_CONFIG"

echo ""
echo "✅ Build complete."
echo ""
echo "Next steps:"
echo "  1. Set your Anthropic API key:"
echo "     export ANTHROPIC_API_KEY=sk-ant-..."
echo ""
echo "  2. Open this folder in VS Code Insiders"
echo "     The .vscode/mcp.json is already configured at:"
echo "     $SCRIPT_DIR/.vscode/mcp.json"
echo ""
echo "  3. Open Copilot Chat in Agent mode"
echo ""
echo "  4. Run demo prompts in order:"
echo "     → parse the API spec"
echo "     → generate tests for the users endpoints"
echo "     → execute the approved tests"
echo "     → execute the tests with simulate_drift set to true"
echo "     → detect and heal the failures"
echo ""
echo "  5. Approve the patch in the healing-diff MCP App 🎉"
