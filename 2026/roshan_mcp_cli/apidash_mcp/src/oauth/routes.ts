/**
 * OAuth 2.1 Routes (MCP spec-compliant)
 *
 * Endpoints implemented:
 *  GET  /.well-known/oauth-authorization-server  — RFC 8414 metadata discovery
 *  POST /register                                — RFC 7591 Dynamic Client Registration
 *  GET  /authorize                               — Auth code + PKCE (RFC 7636)
 *  POST /token                                   — Token endpoint (code exchange + refresh)
 *  POST /token/revoke                            — RFC 7009 token revocation
 *
 * Security notes:
 *  • PKCE S256 is REQUIRED (plain is rejected per OAuth 2.1 mandate)
 *  • All tokens are cryptographically random (base64url, 256-bit)
 *  • Auth codes are single-use with a 60 s TTL
 *  • Access tokens have a 1 hr TTL; refresh tokens are rolling one-time-use
 *  • Authorization auto-approves (appropriate for a local developer tool)
 */

import crypto                       from "crypto";
import { Router, Request, Response } from "express";
import {
  registerClient,
  getClient,
  createAuthCode,
  consumeAuthCode,
  createAccessToken,
  consumeRefreshToken,
  revokeToken,
} from "./store.js";

const router = Router();

// Base URL helper — reads from PORT env or defaults to 3001
function baseUrl(): string {
  const port = process.env.PORT ?? "3001";
  return process.env.BASE_URL ?? `http://localhost:${port}`;
}

// ─────────────────────────────────────────────────────────────
// RFC 8414 — Authorization Server Metadata Discovery
// ─────────────────────────────────────────────────────────────

router.get("/.well-known/oauth-authorization-server", (_req: Request, res: Response) => {
  const base = baseUrl();
  res.json({
    issuer:                               base,
    authorization_endpoint:              `${base}/authorize`,
    token_endpoint:                      `${base}/token`,
    registration_endpoint:               `${base}/register`,
    revocation_endpoint:                 `${base}/token/revoke`,
    response_types_supported:            ["code"],
    grant_types_supported:               ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_basic"],
    code_challenge_methods_supported:    ["S256"],
    scopes_supported:                    ["mcp"],
    // RFC 8707 resource indicators
    resource_indicators_supported:       true,
  });
});

// ─────────────────────────────────────────────────────────────
// RFC 7591 — Dynamic Client Registration
// ─────────────────────────────────────────────────────────────

router.post("/register", (req: Request, res: Response) => {
  const {
    redirect_uris,
    client_name,
    grant_types,
    response_types,
    token_endpoint_auth_method,
    scope,
  } = req.body ?? {};

  if (!redirect_uris || !Array.isArray(redirect_uris) || redirect_uris.length === 0) {
    res.status(400).json({
      error:             "invalid_client_metadata",
      error_description: "redirect_uris is required and must be a non-empty array",
    });
    return;
  }

  const client = registerClient({
    redirect_uris,
    client_name,
    grant_types,
    response_types,
    token_endpoint_auth_method: token_endpoint_auth_method ?? "none",
    scope,
  });

  res.status(201).json({
    client_id:                  client.client_id,
    client_secret:              client.client_secret,
    redirect_uris:              client.redirect_uris,
    client_name:                client.client_name,
    grant_types:                client.grant_types,
    response_types:             client.response_types,
    token_endpoint_auth_method: client.token_endpoint_auth_method,
    scope:                      client.scope,
    client_id_issued_at:        Math.floor(client.created_at / 1000),
  });
});

// ─────────────────────────────────────────────────────────────
// Authorization Endpoint — Auth Code + PKCE (RFC 7636)
// ─────────────────────────────────────────────────────────────

router.get("/authorize", (req: Request, res: Response) => {
  const {
    response_type,
    client_id,
    redirect_uri,
    code_challenge,
    code_challenge_method,
    scope = "mcp",
    state,
  } = req.query as Record<string, string>;

  // Validate required params
  if (response_type !== "code") {
    res.status(400).json({ error: "unsupported_response_type" });
    return;
  }
  if (!client_id || !redirect_uri || !code_challenge) {
    res.status(400).json({
      error:             "invalid_request",
      error_description: "client_id, redirect_uri, and code_challenge are required",
    });
    return;
  }

  // OAuth 2.1: only S256 is allowed
  if (code_challenge_method !== "S256") {
    const url = new URL(redirect_uri);
    url.searchParams.set("error", "invalid_request");
    url.searchParams.set("error_description", "Only S256 code_challenge_method is supported (OAuth 2.1)");
    if (state) url.searchParams.set("state", state);
    res.redirect(url.toString());
    return;
  }

  // Validate client + redirect_uri
  const client = getClient(client_id);
  if (!client) {
    res.status(400).json({ error: "invalid_client" });
    return;
  }
  if (!client.redirect_uris.includes(redirect_uri)) {
    // RFC 8252 (Native Apps) allows dynamic ports on the loopback interface.
    // Also, VS Code registers http://127.0.0.1:port/ but requests http://127.0.0.1:port/callback
    const requestedUrl = new URL(redirect_uri);
    const isValidLocal = client.redirect_uris.some((uri) => {
      const registeredUrl = new URL(uri);
      return (
        requestedUrl.hostname === '127.0.0.1' &&
        registeredUrl.hostname === '127.0.0.1' &&
        requestedUrl.pathname.startsWith(registeredUrl.pathname)
      );
    });

    if (!isValidLocal) {
      res.status(400).json({
        error:             "invalid_request",
        error_description: "redirect_uri not registered for this client",
      });
      return;
    }
  }

  // For a local developer tool, auto-approve by showing a self-submitting page.
  // In production, render a login form here.
  const authCode = createAuthCode({
    client_id,
    redirect_uri,
    code_challenge,
    code_challenge_method: "S256",
    scope,
  });

  // Render a minimal auto-approve consent page
  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set("code", authCode.code);
  if (state) redirectUrl.searchParams.set("state", state);

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>APIDash MCP — Authorize</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f0f11;
      color: #e4e4e7;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 2rem;
      max-width: 400px;
      width: 90%;
      text-align: center;
    }
    .logo { font-size: 2.5rem; margin-bottom: 1rem; }
    h1 { font-size: 1.25rem; margin-bottom: 0.5rem; color: #f4f4f5; }
    p  { font-size: 0.875rem; color: #71717a; margin-bottom: 1.5rem; }
    .client { background: #27272a; border-radius: 6px; padding: 0.5rem 1rem;
              font-size: 0.8rem; color: #a1a1aa; margin-bottom: 1.5rem; }
    .scope { display: inline-block; background: #1e3a5f; color: #60a5fa;
             border-radius: 999px; padding: 0.25rem 0.75rem; font-size: 0.75rem;
             margin-bottom: 1.5rem; }
    .btn {
      display: block; width: 100%;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff; border: none; border-radius: 8px;
      padding: 0.75rem; font-size: 1rem; cursor: pointer;
      font-weight: 600; transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.9; }
    .auto { font-size: 0.75rem; color: #52525b; margin-top: 1rem; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🔐</div>
    <h1>Authorize APIDash MCP</h1>
    <p>The following client is requesting access:</p>
    <div class="client">${client.client_name ?? client_id}</div>
    <div class="scope">scope: ${scope}</div>
    <form action="/authorize/confirm" method="POST">
      <input type="hidden" name="code"         value="${authCode.code}">
      <input type="hidden" name="redirect_uri" value="${redirectUrl.toString()}">
      <button type="submit" class="btn">✓ Allow Access</button>
    </form>
    <p class="auto">You will be redirected back to the application.</p>
  </div>
</body>
</html>`);
});

// Confirmation POST — redirects with the code
router.post("/authorize/confirm", (req: Request, res: Response) => {
  const { redirect_uri } = req.body ?? {};
  if (!redirect_uri) {
    res.status(400).send("Missing redirect_uri");
    return;
  }
  res.redirect(redirect_uri);
});

// ─────────────────────────────────────────────────────────────
// Token Endpoint — Code Exchange + Refresh
// ─────────────────────────────────────────────────────────────

router.post("/token", (req: Request, res: Response) => {
  const { grant_type, code, redirect_uri, code_verifier, client_id, refresh_token } =
    req.body ?? {};

  // ── Authorization Code Grant ──────────────────────────────
  if (grant_type === "authorization_code") {
    if (!code || !redirect_uri || !code_verifier || !client_id) {
      res.status(400).json({
        error:             "invalid_request",
        error_description: "code, redirect_uri, code_verifier, and client_id are required",
      });
      return;
    }

    const ac = consumeAuthCode(code);
    if (!ac) {
      res.status(400).json({
        error:             "invalid_grant",
        error_description: "Authorization code is invalid or expired",
      });
      return;
    }

    if (ac.client_id !== client_id) {
      res.status(400).json({ error: "invalid_grant", error_description: "client_id mismatch" });
      return;
    }
    if (ac.redirect_uri !== redirect_uri) {
      res.status(400).json({ error: "invalid_grant", error_description: "redirect_uri mismatch" });
      return;
    }

    // PKCE S256 verification — OAuth 2.1 requirement
    const hash = crypto
      .createHash("sha256")
      .update(code_verifier)
      .digest("base64url");

    if (hash !== ac.code_challenge) {
      res.status(400).json({
        error:             "invalid_grant",
        error_description: "PKCE code_verifier does not match code_challenge",
      });
      return;
    }

    const at = createAccessToken({ client_id, scope: ac.scope });

    res.json({
      access_token:  at.token,
      token_type:    "Bearer",
      expires_in:    3600,
      refresh_token: at.refresh_token,
      scope:         at.scope,
    });
    return;
  }

  // ── Refresh Token Grant ────────────────────────────────────
  if (grant_type === "refresh_token") {
    if (!refresh_token || !client_id) {
      res.status(400).json({
        error:             "invalid_request",
        error_description: "refresh_token and client_id are required",
      });
      return;
    }

    const rt = consumeRefreshToken(refresh_token);
    if (!rt || rt.client_id !== client_id) {
      res.status(400).json({
        error:             "invalid_grant",
        error_description: "Refresh token is invalid, expired, or does not belong to this client",
      });
      return;
    }

    const at = createAccessToken({ client_id: rt.client_id, scope: rt.scope });

    res.json({
      access_token:  at.token,
      token_type:    "Bearer",
      expires_in:    3600,
      refresh_token: at.refresh_token,
      scope:         at.scope,
    });
    return;
  }

  res.status(400).json({
    error:             "unsupported_grant_type",
    error_description: `grant_type '${grant_type}' is not supported`,
  });
});

// ─────────────────────────────────────────────────────────────
// RFC 7009 — Token Revocation
// ─────────────────────────────────────────────────────────────

router.post("/token/revoke", (req: Request, res: Response) => {
  const { token } = req.body ?? {};
  if (token) revokeToken(token);
  // Per RFC 7009 §2.2: always return 200 even if token not found
  res.sendStatus(200);
});

export default router;
