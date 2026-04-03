import { Session, ChatMessage } from '../types/index.js';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import crypto from 'crypto';

/**
 * Manages chat sessions with auto-save and persistence
 */
export class SessionManager {
  private sessionsDir: string;
  private currentSession: Session | null = null;
  private currentProjectHash: string;

  constructor(projectPath: string = process.cwd()) {
    this.sessionsDir = join(homedir(), '.cli-tool', 'sessions');
    this.currentProjectHash = this.generateProjectHash(projectPath);
    this.ensureDirectories();
  }

  /**
   * Generate a hash for the current project
   */
  private generateProjectHash(path: string): string {
    return crypto.createHash('md5').update(path).digest('hex').substring(0, 8);
  }

  /**
   * Ensure session directories exist
   */
  private ensureDirectories(): void {
    if (!existsSync(this.sessionsDir)) {
      mkdirSync(this.sessionsDir, { recursive: true });
    }
    const projectDir = join(this.sessionsDir, this.currentProjectHash);
    if (!existsSync(projectDir)) {
      mkdirSync(projectDir, { recursive: true });
    }
  }

  /**
   * Create a new session
   */
  createSession(name?: string): Session {
    const session: Session = {
      id: crypto.randomUUID(),
      name: name || `session-${Date.now()}`,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      projectId: this.currentProjectHash,
    };
    return session;
  }

  /**
   * Get session file path
   */
  private getSessionPath(sessionId: string): string {
    return join(this.sessionsDir, this.currentProjectHash, `${sessionId}.json`);
  }

  /**
   * Save a session to disk
   */
  saveSession(session: Session): void {
    session.updatedAt = new Date();
    const path = this.getSessionPath(session.id);
    writeFileSync(path, JSON.stringify(session, null, 2), 'utf-8');
  }

  /**
   * Load a session from disk
   */
  loadSession(sessionId: string): Session | null {
    const path = this.getSessionPath(sessionId);
    if (!existsSync(path)) {
      return null;
    }
    try {
      const data = readFileSync(path, 'utf-8');
      const session = JSON.parse(data);
      // Parse dates
      session.createdAt = new Date(session.createdAt);
      session.updatedAt = new Date(session.updatedAt);
      session.messages.forEach((msg: ChatMessage) => {
        if (msg.timestamp) {
          msg.timestamp = new Date(msg.timestamp);
        }
      });
      return session;
    } catch {
      return null;
    }
  }

  /**
   * List all sessions for current project
   */
  listSessions(): Session[] {
    const projectDir = join(this.sessionsDir, this.currentProjectHash);
    const sessions: Session[] = [];

    if (!existsSync(projectDir)) {
      return sessions;
    }

    const files = readdirSync(projectDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const sessionId = file.replace('.json', '');
        const session = this.loadSession(sessionId);
        if (session) {
          sessions.push(session);
        }
      }
    }

    return sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): boolean {
    const path = this.getSessionPath(sessionId);
    if (!existsSync(path)) {
      return false;
    }
    try {
      rmSync(path);
      if (this.currentSession?.id === sessionId) {
        this.currentSession = null;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Set the current active session
   */
  setCurrentSession(session: Session): void {
    this.currentSession = session;
  }

  /**
   * Get the current active session
   */
  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  /**
   * Add a message to the current session
   */
  addMessage(message: ChatMessage): void {
    if (!this.currentSession) {
      this.currentSession = this.createSession();
    }
    message.timestamp = new Date();
    this.currentSession.messages.push(message);
    this.saveSession(this.currentSession);
  }

  /**
   * Get messages from the current session
   */
  getMessages(): ChatMessage[] {
    return this.currentSession?.messages || [];
  }

  /**
   * Clear all messages from current session
   */
  clearMessages(): void {
    if (this.currentSession) {
      this.currentSession.messages = [];
      this.saveSession(this.currentSession);
    }
  }

  /**
   * Export session to shareable format
   */
  exportSession(sessionId: string): string | null {
    const session = this.loadSession(sessionId);
    if (!session) {
      return null;
    }
    return JSON.stringify(session, null, 2);
  }

  /**
   * Load session from shared format
   */
  importSession(sessionData: string): Session | null {
    try {
      const session = JSON.parse(sessionData) as Session;
      session.id = crypto.randomUUID();
      session.createdAt = new Date();
      session.updatedAt = new Date();
      session.projectId = this.currentProjectHash;
      this.saveSession(session);
      return session;
    } catch {
      return null;
    }
  }
}