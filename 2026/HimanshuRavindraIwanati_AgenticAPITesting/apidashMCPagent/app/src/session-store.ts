import type { AgentSession, AgentState } from "./types.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

// ─── In-Memory Session Store ────────────────────────────────────────────────
// In the full system this is backed by AgentCore's persistent session manager.
// For the POC we use a simple Map — sufficient for a single demo session.

const sessions = new Map<string, AgentSession>();
const STORE_FILE = join(process.cwd(), ".mcp", "sessions.json");

function saveSessions(): void {
  const payload = JSON.stringify([...sessions.values()], null, 2);
  mkdirSync(dirname(STORE_FILE), { recursive: true });
  writeFileSync(STORE_FILE, payload, "utf8");
}

function loadSessions(): void {
  if (!existsSync(STORE_FILE)) {
    return;
  }

  try {
    const content = readFileSync(STORE_FILE, "utf8");
    const parsed = JSON.parse(content) as AgentSession[];

    for (const session of parsed) {
      sessions.set(session.id, session);
    }
  } catch {
    // Ignore malformed/corrupted store and start with an empty in-memory map.
  }
}

loadSessions();

export function createSession(): AgentSession {
  const id = `sess_${Date.now()}_${Math.floor(Math.random() * 10_000)}`;
  const session: AgentSession = {
    id,
    state: "IDLE",
    generatedTests: [],
    approvedTests: [],
    executionResults: [],
    healingPatches: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  sessions.set(id, session);
  saveSessions();
  return session;
}

export function getSession(id: string): AgentSession | undefined {
  return sessions.get(id);
}

export function updateSession(
  id: string,
  updates: Partial<AgentSession>
): AgentSession {
  const existing = sessions.get(id);
  if (!existing) throw new Error(`Session ${id} not found`);
  const updated: AgentSession = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  sessions.set(id, updated);
  saveSessions();
  return updated;
}

export function transitionState(id: string, newState: AgentState): AgentSession {
  return updateSession(id, { state: newState });
}

export function getOrCreateDefaultSession(): AgentSession {
  // For the POC, we maintain a single "default" session
  const existing = [...sessions.values()].find((s) => s.state !== "COMPLETE" && s.state !== "FAILED");
  return existing ?? createSession();
}
