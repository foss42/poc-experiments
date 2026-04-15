/**
 * OAuth 2.1 In-Memory Store with Disk Persistence for Clients
 *
 * Clients are persisted to .oauth-clients.json so registered client_ids
 * survive server restarts (VS Code stores its client_id permanently).
 *
 * Auth codes and tokens remain in-memory only (short-lived by design).
 */

import crypto from "crypto";
import fs     from "fs";
import path   from "path";
import { fileURLToPath } from "url";

// Path to persistence file (same dir as this module → src/oauth/)
const __dirname    = path.dirname(fileURLToPath(import.meta.url));
const CLIENTS_FILE = path.join(__dirname, "..", "..", ".oauth-clients.json");

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface OAuthClient {
  client_id: string;
  client_secret?: string;
  redirect_uris: string[];
  client_name?: string;
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
  scope?: string;
  created_at: number;
}

export interface AuthCode {
  code: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: "S256" | "plain";
  scope: string;
  expires_at: number;
}

export interface AccessToken {
  token: string;
  client_id: string;
  scope: string;
  expires_at: number;
  refresh_token?: string;
}

export interface RefreshToken {
  token: string;
  client_id: string;
  scope: string;
}

// ─────────────────────────────────────────────────────────────
// In-memory stores
// ─────────────────────────────────────────────────────────────

// Load persisted clients on startup
function loadClientsFromDisk(): Map<string, OAuthClient> {
  try {
    if (fs.existsSync(CLIENTS_FILE)) {
      const raw  = fs.readFileSync(CLIENTS_FILE, "utf8");
      const arr  = JSON.parse(raw) as OAuthClient[];
      return new Map(arr.map(c => [c.client_id, c]));
    }
  } catch (e) {
    console.error("[oauth] Failed to load clients from disk:", e);
  }
  return new Map();
}

function saveClientsToDisk(map: Map<string, OAuthClient>): void {
  try {
    fs.writeFileSync(CLIENTS_FILE, JSON.stringify([...map.values()], null, 2));
  } catch (e) {
    console.error("[oauth] Failed to persist clients to disk:", e);
  }
}

const clients      = loadClientsFromDisk();
const authCodes    = new Map<string, AuthCode>();
const accessTokens = new Map<string, AccessToken>();
const refreshTokens = new Map<string, RefreshToken>();

// ─────────────────────────────────────────────────────────────
// Client management (RFC 7591)
// ─────────────────────────────────────────────────────────────

export function registerClient(data: Partial<OAuthClient>): OAuthClient {
  const client_id     = crypto.randomUUID();
  const isPublic      = data.token_endpoint_auth_method === "none";
  const client_secret = isPublic ? undefined : crypto.randomBytes(32).toString("hex");

  const client: OAuthClient = {
    client_id,
    client_secret,
    redirect_uris:              data.redirect_uris              ?? [],
    client_name:                data.client_name,
    grant_types:                data.grant_types                ?? ["authorization_code", "refresh_token"],
    response_types:             data.response_types             ?? ["code"],
    token_endpoint_auth_method: data.token_endpoint_auth_method ?? "none",
    scope:                      data.scope                      ?? "mcp",
    created_at: Date.now(),
  };

  clients.set(client_id, client);
  saveClientsToDisk(clients);     // ← persist immediately
  console.log(`[oauth] Registered client: ${client_id} (${client.client_name ?? "unnamed"}) — saved to disk`);
  return client;
}

export function getClient(client_id: string): OAuthClient | undefined {
  return clients.get(client_id);
}

// ─────────────────────────────────────────────────────────────
// Authorization codes (PKCE, 60 s TTL)
// ─────────────────────────────────────────────────────────────

export function createAuthCode(
  data: Omit<AuthCode, "code" | "expires_at">
): AuthCode {
  const code: AuthCode = {
    ...data,
    code:       crypto.randomBytes(32).toString("base64url"),
    expires_at: Date.now() + 60_000,
  };
  authCodes.set(code.code, code);
  return code;
}

/** Atomically consume (read + delete) an auth code. Returns null if missing/expired. */
export function consumeAuthCode(code: string): AuthCode | null {
  const ac = authCodes.get(code);
  if (!ac) return null;
  authCodes.delete(code);
  if (Date.now() > ac.expires_at) return null;
  return ac;
}

// ─────────────────────────────────────────────────────────────
// Access tokens (1 hr TTL) + refresh tokens (rolling)
// ─────────────────────────────────────────────────────────────

export function createAccessToken(
  data: Omit<AccessToken, "token" | "expires_at">
): AccessToken {
  const token        = crypto.randomBytes(32).toString("base64url");
  const refreshToken = crypto.randomBytes(32).toString("base64url");

  const at: AccessToken = {
    ...data,
    token,
    expires_at:    Date.now() + 3_600_000, // 1 hr
    refresh_token: refreshToken,
  };

  accessTokens.set(token, at);
  refreshTokens.set(refreshToken, {
    token:     refreshToken,
    client_id: data.client_id,
    scope:     data.scope,
  });

  return at;
}

export function validateAccessToken(token: string): AccessToken | null {
  const at = accessTokens.get(token);
  if (!at) return null;
  if (Date.now() > at.expires_at) {
    accessTokens.delete(token);
    return null;
  }
  return at;
}

/** One-time-use: consume refresh token and return its data. */
export function consumeRefreshToken(token: string): RefreshToken | null {
  const rt = refreshTokens.get(token);
  if (!rt) return null;
  refreshTokens.delete(token);
  return rt;
}

export function revokeToken(token: string): boolean {
  if (accessTokens.delete(token))  return true;
  if (refreshTokens.delete(token)) return true;
  return false;
}
