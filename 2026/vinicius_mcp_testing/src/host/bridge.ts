/**
 * PostMessageBridge — Host-side JSON-RPC 2.0 handler for MCP Apps.
 *
 * Implements the host contract: responds to ui/initialize, proxies tools/call
 * to the MCP server, captures ui/update-model-context payloads, and records
 * all bridge traffic for test assertions.
 *
 * This is the same logic a real host (VS Code, Claude Desktop) would run.
 */

import { MCPClient } from "../client.js";

// ── Types ──

export interface BridgeMessage {
  direction: "inbound" | "outbound";
  method?: string;
  id?: number;
  params?: unknown;
  result?: unknown;
  error?: unknown;
  timestamp: number;
}

export interface ToolCallRecord {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
}

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

// ── Default host context (VS Code-like dark theme) ──

const DEFAULT_HOST_CONTEXT: Record<string, string> = {
  "--color-background-primary": "#1e1e1e",
  "--color-background-secondary": "#252526",
  "--color-text-primary": "#cccccc",
  "--color-text-secondary": "#969696",
  "--color-border": "#3c3c3c",
  "--color-accent": "#0078d4",
  "--color-error": "#f44747",
  "--color-success": "#89d185",
};

// ── Bridge ──

export class PostMessageBridge {
  /** Ordered log of all bridge traffic (inbound + outbound). */
  messages: BridgeMessage[] = [];

  /** True after ui/initialize → response → ui/notifications/initialized. */
  handshakeComplete = false;

  /** Captured params from the app's ui/initialize request. */
  initializeParams: unknown = null;

  /** Captured ui/update-model-context payloads. */
  modelContextUpdates: unknown[] = [];

  /** Captured tools/call requests from the iframe. */
  toolCallRequests: ToolCallRecord[] = [];

  /** Captured ui/notifications/size-changed payloads. */
  sizeChanges: Array<{ width: number; height: number }> = [];

  private handshakeResolve: (() => void) | null = null;
  private handshakePromise: Promise<void> | null = null;

  private messageWaiters: Array<{
    method: string;
    resolve: (msg: BridgeMessage) => void;
    reject: (err: Error) => void;
  }> = [];

  constructor(
    private mcpClient: MCPClient,
    private hostContext: Record<string, string> = DEFAULT_HOST_CONTEXT
  ) {}

  /**
   * Process an inbound JSON-RPC message from the iframe.
   *
   * Returns a JSON-RPC response for requests (messages with an id),
   * or null for notifications (messages without an id).
   */
  async handleMessage(raw: string): Promise<string | null> {
    let msg: JsonRpcRequest;
    try {
      msg = JSON.parse(raw);
    } catch {
      return null;
    }

    if (msg.jsonrpc !== "2.0" || !msg.method) return null;

    const isRequest = msg.id !== undefined;

    // Record inbound
    this.messages.push({
      direction: "inbound",
      method: msg.method,
      id: msg.id,
      params: msg.params,
      timestamp: Date.now(),
    });

    // Notify any waiters
    this.notifyWaiters(msg.method);

    let result: unknown = {};

    switch (msg.method) {
      case "ui/initialize":
        this.initializeParams = msg.params;
        result = {
          protocolVersion: "2025-11-21",
          hostContext: this.hostContext,
          capabilities: {
            openLinks: true,
            updateModelContext: true,
            serverTools: true,
            serverResources: true,
            downloadFile: true,
          },
        };
        break;

      case "ui/notifications/initialized":
        this.handshakeComplete = true;
        if (this.handshakeResolve) {
          this.handshakeResolve();
          this.handshakeResolve = null;
        }
        // Notification — no response
        return null;

      case "tools/call": {
        const params = msg.params as { name: string; arguments?: Record<string, unknown> };
        const toolName = params.name;
        const toolArgs = params.arguments ?? {};
        try {
          const toolResult = await this.mcpClient.callToolRaw(toolName, toolArgs);
          const record: ToolCallRecord = { name: toolName, args: toolArgs, result: toolResult };
          this.toolCallRequests.push(record);
          result = toolResult;
        } catch (err) {
          const record: ToolCallRecord = { name: toolName, args: toolArgs, result: null };
          this.toolCallRequests.push(record);
          if (isRequest) {
            const response: JsonRpcResponse = {
              jsonrpc: "2.0",
              id: msg.id!,
              error: { code: -32603, message: err instanceof Error ? err.message : String(err) },
            };
            this.recordOutbound(msg.method, msg.id, undefined, response.error);
            return JSON.stringify(response);
          }
          return null;
        }
        break;
      }

      case "ui/update-model-context":
        this.modelContextUpdates.push(msg.params);
        result = {};
        break;

      case "ui/notifications/size-changed": {
        const sizeParams = msg.params as { width?: number; height?: number } | undefined;
        if (sizeParams) {
          this.sizeChanges.push({
            width: sizeParams.width ?? 0,
            height: sizeParams.height ?? 0,
          });
        }
        // Notification — no response
        return null;
      }

      case "ui/download-file":
        result = {};
        break;

      case "ui/open-link":
        result = {};
        break;

      default:
        // Unknown method — respond with error for requests, ignore notifications
        if (isRequest) {
          const response: JsonRpcResponse = {
            jsonrpc: "2.0",
            id: msg.id!,
            error: { code: -32601, message: `Unknown method: ${msg.method}` },
          };
          this.recordOutbound(msg.method, msg.id, undefined, response.error);
          return JSON.stringify(response);
        }
        return null;
    }

    // Build response for requests
    if (isRequest) {
      const response: JsonRpcResponse = {
        jsonrpc: "2.0",
        id: msg.id!,
        result,
      };
      this.recordOutbound(msg.method, msg.id, result);
      return JSON.stringify(response);
    }

    return null;
  }

  /**
   * Wait for the full handshake to complete.
   * Resolves when ui/notifications/initialized is received.
   */
  waitForHandshake(timeoutMs = 5000): Promise<void> {
    if (this.handshakeComplete) return Promise.resolve();

    if (!this.handshakePromise) {
      this.handshakePromise = new Promise<void>((resolve, reject) => {
        this.handshakeResolve = resolve;
        setTimeout(() => {
          if (!this.handshakeComplete) {
            this.handshakeResolve = null;
            reject(new Error(`Handshake timed out after ${timeoutMs}ms`));
          }
        }, timeoutMs);
      });
    }
    return this.handshakePromise;
  }

  /**
   * Wait for a specific method to be received.
   */
  waitForMessage(method: string, timeoutMs = 5000): Promise<BridgeMessage> {
    // Check if already received
    const existing = this.messages.find(
      (m) => m.direction === "inbound" && m.method === method
    );
    if (existing) return Promise.resolve(existing);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.messageWaiters.findIndex((w) => w.method === method);
        if (idx >= 0) this.messageWaiters.splice(idx, 1);
        reject(new Error(`Timed out waiting for ${method} after ${timeoutMs}ms`));
      }, timeoutMs);

      this.messageWaiters.push({
        method,
        resolve: (msg) => {
          clearTimeout(timer);
          resolve(msg);
        },
        reject,
      });
    });
  }

  /** Reset all recorded state. */
  reset(): void {
    this.messages = [];
    this.handshakeComplete = false;
    this.initializeParams = null;
    this.modelContextUpdates = [];
    this.toolCallRequests = [];
    this.sizeChanges = [];
    this.handshakeResolve = null;
    this.handshakePromise = null;
    this.messageWaiters = [];
  }

  private recordOutbound(method?: string, id?: number, result?: unknown, error?: unknown): void {
    this.messages.push({
      direction: "outbound",
      method,
      id,
      result,
      error,
      timestamp: Date.now(),
    });
  }

  private notifyWaiters(method: string): void {
    const msg = this.messages[this.messages.length - 1];
    const matched = this.messageWaiters.filter((w) => w.method === method);
    for (const waiter of matched) {
      waiter.resolve(msg);
    }
    this.messageWaiters = this.messageWaiters.filter((w) => w.method !== method);
  }
}
