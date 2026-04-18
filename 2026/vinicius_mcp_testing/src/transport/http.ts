import { TransportAdapter, JsonRpcRequest, JsonRpcResponse } from "./stdio.js";

export class HttpTransport implements TransportAdapter {
  private url: string;
  private sessionId: string | undefined;

  constructor(url: string) {
    this.url = url;
  }

  async connect(): Promise<void> {
    // Stateless HTTP transport — verify server is reachable
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(this.url.replace("/mcp", "/health"), {
        signal: controller.signal,
      });
      if (!res.ok) {
        // Health endpoint may not exist — that's fine, we'll fail on first send
      }
    } catch {
      // Server may not have /health — will fail on first send if unreachable
    } finally {
      clearTimeout(timeout);
    }
  }

  async send(message: JsonRpcRequest): Promise<JsonRpcResponse> {
    const id = message.id;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
    };

    if (this.sessionId) {
      headers["mcp-session-id"] = this.sessionId;
    }

    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...message, id }),
        signal: controller.signal,
      });

      // Capture session ID from response headers
      const newSessionId = res.headers.get("mcp-session-id");
      if (newSessionId) {
        this.sessionId = newSessionId;
      }

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream")) {
        // SSE response — parse the first JSON event
        const text = await res.text();
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            try {
              return JSON.parse(data) as JsonRpcResponse;
            } catch {
              continue;
            }
          }
        }
        throw new Error("No valid JSON-RPC response in SSE stream");
      }

      // JSON response
      const body = await res.json() as JsonRpcResponse;
      return body;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`Request timed out (${message.method})`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  async disconnect(): Promise<void> {
    // Attempt graceful session termination via DELETE
    if (this.sessionId) {
      try {
        await fetch(this.url, {
          method: "DELETE",
          headers: {
            "mcp-session-id": this.sessionId,
          },
        });
      } catch {
        // Best-effort cleanup
      }
    }
    this.sessionId = undefined;
  }
}
