import { Router, Request, Response } from "express";

// Base URL helper
function baseUrl(): string {
  const port = process.env.PORT ?? "3001";
  return process.env.BASE_URL ?? `http://localhost:${port}`;
}

const router = Router();

/**
 * MCP Server Card discovery endpoint (Roadmap March 2026).
 * Allows MCP clients and registries to discover server capabilities
 * without establishing a live connection.
 */
router.get("/.well-known/mcp", (_req: Request, res: Response) => {
  res.json({
    name: "apidash-mcp",
    version: "1.0.0",
    protocolVersion: "2025-11-25",
    capabilities: { tools: {}, resources: {}, prompts: {} },
    endpoint: "/mcp",
    transport: "streamable-http",
  });
});

/**
 * OAuth 2.1 Protected Resource Metadata
 * Informs Copilot / VS Code how to authenticate with this server.
 */
router.get("/.well-known/oauth-protected-resource", (_req: Request, res: Response) => {
  const base = baseUrl();
  res.json({
    resource: `${base}/mcp`,
    authorization_servers: [base],
    scopes_supported: ["mcp", "tools:read", "tools:call"]
  });
});

export default router;
