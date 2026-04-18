# Research Notes

## Resources Studied

### 1. AWS Dev.to Article
Link: https://dev.to/aws/how-i-built-mcp-apps-based-sales-analytics...

Key learnings:
- MCP tools expose structured business logic as callable endpoints
- Sales Analytics server exposes 4 tools: select-sales-metric,
  get-sales-data, visualize-sales-data, show-sales-pdf-report
- Agentic UI pattern: LLM decides which tool to call based on user intent
- Deployed on Amazon Bedrock AgentCore for production scaling

### 2. sample-mcp-apps-chatflow GitHub
Link: https://github.com/ashitaprasad/sample-mcp-apps-chatflow

Key learnings:
- Server uses Streamable HTTP transport (not stdio)
- MCP endpoint lives at /mcp route
- Resources exposed: sales-metric-input-ui, sales-data-visualization-ui,
  sales-pdf-report-ui
- Tools are stateless — each call is independent
- Inspector v0.21.1 requires Transport Type set to Streamable HTTP in UI

## What I Built
- A Node.js/Express middleware client (server.js) that proxies MCP tool
  calls from a browser frontend
- Frontend UI to call tools, view results, and inspect resources
- Verified all tools work via both custom client and MCP Inspector v0.21.1