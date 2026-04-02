

set -e

SERVER_DIR="sample-mcp-apps-chatflow"
REPO_URL="https://github.com/ashitaprasad/sample-mcp-apps-chatflow.git"

echo ""
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║  MCP Testing Suite PoC — Server Setup            ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo ""


command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required. Install from https://nodejs.org"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required."; exit 1; }
command -v git >/dev/null 2>&1 || { echo "❌ git is required."; exit 1; }

NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
    echo "❌ Node.js >= 18 required. You have v$(node -v)"
    exit 1
fi

echo "  ✓ Node.js $(node -v)"
echo "  ✓ npm $(npm -v)"
echo ""


if [ -d "$SERVER_DIR" ]; then
    echo "  → Server directory already exists, pulling latest..."
    cd "$SERVER_DIR"
    git pull origin main 2>/dev/null || true
    cd ..
else
    echo "  → Cloning Sales Analytics MCP server..."
    git clone "$REPO_URL"
fi


echo "  → Installing dependencies..."
cd "$SERVER_DIR"
npm install --silent 2>/dev/null

echo "  → Building TypeScript..."
npm run build 2>/dev/null || npx tsc 2>/dev/null

echo ""
echo "  ✓ Server ready at: $(pwd)/dist/index.js"
echo ""
echo "  Run the test harness:"
echo "    python3 poc_sales_analytics.py"
echo ""
