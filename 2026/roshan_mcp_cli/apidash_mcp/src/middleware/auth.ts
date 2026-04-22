import { Request, Response, NextFunction } from "express";
import { validateAccessToken }             from "../oauth/store.js";

/**
 * MCP Bearer-token gate.
 *
 * Mode is determined by env vars at startup:
 *
 *  • APIDASH_MCP_AUTH=true   → Full OAuth 2.1 enforcement.
 *                               Only tokens issued by POST /token are accepted.
 *                               Clients must do the Dynamic Registration → PKCE flow.
 *
 *  • APIDASH_MCP_TOKEN=<str>  → Legacy static pre-shared secret (backwards compat).
 *                               Any request with Authorization: Bearer <str> is accepted.
 *                               Also accepts dynamically-issued OAuth tokens.
 *
 *  • (neither set)            → Open access — no authentication required.
 *                               Appropriate for local development.
 *
 * The OAuth endpoints (/register, /authorize, /token) are ALWAYS public
 * and are mounted before this middleware in index.ts.
 */
export function bearerAuth(req: Request, res: Response, next: NextFunction): void {
  const oauthMode  = process.env.APIDASH_MCP_AUTH === "true";
  const staticSecret = process.env.APIDASH_MCP_TOKEN;

  // ── Mode 1: Open access (local dev) ───────────────────────
  if (!oauthMode && !staticSecret) {
    next();
    return;
  }

  // ── Extract Bearer token from header ──────────────────────
  const authHeader = (req.headers["authorization"] ?? "") as string;

  if (!authHeader.startsWith("Bearer ")) {
    res.setHeader("WWW-Authenticate",
      `Bearer realm="apidash-mcp", error="invalid_token", ` +
      `error_description="Bearer token required. Obtain one from POST /token", ` +
      `resource_metadata="${process.env.BASE_URL ?? "http://localhost:" + (process.env.PORT ?? "3001")}/.well-known/oauth-protected-resource"`);
    res.status(401).json({
      error:             "invalid_token",
      error_description: "Authorization: Bearer <token> header is required",
      token_endpoint:    `${process.env.BASE_URL ?? "http://localhost:" + (process.env.PORT ?? "3001")}/token`,
    });
    return;
  }

  const rawToken = authHeader.slice(7).trim();

  // ── Mode 2: OAuth 2.1 enforcement ─────────────────────────
  // Check dynamically-issued token first (always, in all modes)
  if (validateAccessToken(rawToken)) {
    next();
    return;
  }

  // ── Mode 3: Legacy static token fallback ──────────────────
  if (staticSecret && rawToken === staticSecret) {
    next();
    return;
  }

  // ── Rejected ──────────────────────────────────────────────
  res.setHeader("WWW-Authenticate",
    `Bearer realm="apidash-mcp", error="invalid_token", ` +
    `error_description="Token is invalid or expired", ` +
    `resource_metadata="${process.env.BASE_URL ?? "http://localhost:" + (process.env.PORT ?? "3001")}/.well-known/oauth-protected-resource"`);
  res.status(401).json({
    error:             "invalid_token",
    error_description: oauthMode
      ? "Token is invalid or expired. Use the OAuth 2.1 flow to get a new token."
      : "Token is invalid or expired.",
    token_endpoint:    `${process.env.BASE_URL ?? "http://localhost:" + (process.env.PORT ?? "3001")}/token`,
  });
}


