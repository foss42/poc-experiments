# MCP Conformance Test Runner — includes Playwright + Chromium for host simulation
#
# Uses the official Playwright image which ships with browsers pre-installed.
# This means mentors don't need to install anything locally — just `docker compose up`.

FROM mcr.microsoft.com/playwright:v1.52.0-noble

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source
COPY tsconfig.json ./
COPY src/ src/
COPY fixtures/ fixtures/

# Default: run all suites against the MCP server
# The MCP_SERVER_URL env var is set by docker-compose
CMD ["npx", "tsx", "src/cli.ts", \
     "--transport", "http", \
     "--url", "${MCP_SERVER_URL:-http://mcp-server:3000/mcp}"]
