# MCP Testing Playground — GSoC 2026 PoC

**Candidate:** Vansh Kaushal
**Proposed Project:** MCP Testing Toolkit for API Dash
**Repository:** https://github.com/VanshKaushal/mcp-testing-playground

## What This Demonstrates

Connects to the Sales Analytics MCP Apps server (ashitaprasad/sample-mcp-apps-chatflow)
and tests it programmatically — like Postman but for MCP servers.

- Auto-discovers all 4 tools with schema + param inspection
- Calls get-sales-data with real inputs (states, metric, period, year)
- Detects MCP protocol errors inside response body (not just exceptions)
- Intentional validation tests prove error detection works correctly
- Structured CLI output: request / response / timing / pass/fail summary

## How to Run

Terminal 1 — Start the MCP server:
git clone https://github.com/ashitaprasad/sample-mcp-apps-chatflow.git mcp-server
cd mcp-server && npm install && npm run dev

Terminal 2 — Run the playground:
git clone https://github.com/VanshKaushal/mcp-testing-playground.git
cd mcp-testing-playground && npm install && npm start
