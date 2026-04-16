import { spawn, ChildProcess } from "node:child_process";
import { createInterface, Interface } from "node:readline";

export interface TransportAdapter {
  connect(): Promise<void>;
  send(message: JsonRpcRequest): Promise<JsonRpcResponse>;
  disconnect(): Promise<void>;
}

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export class StdioTransport implements TransportAdapter {
  private process: ChildProcess | null = null;
  private readline: Interface | null = null;
  private pending = new Map<number, {
    resolve: (value: JsonRpcResponse) => void;
    reject: (reason: Error) => void;
  }>();
  private nextId = 1;
  private command: string;
  private args: string[];

  constructor(serverCommand: string) {
    const parts = serverCommand.split(" ");
    this.command = parts[0];
    this.args = parts.slice(1);
  }

  async connect(): Promise<void> {
    this.process = spawn(this.command, this.args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    if (!this.process.stdout || !this.process.stdin) {
      throw new Error("Failed to access stdio streams");
    }

    this.readline = createInterface({ input: this.process.stdout });

    this.readline.on("line", (line: string) => {
      try {
        const response = JSON.parse(line) as JsonRpcResponse;
        const pending = this.pending.get(response.id);
        if (pending) {
          this.pending.delete(response.id);
          pending.resolve(response);
        }
      } catch {
        // ignore non-JSON lines (stderr, logs, etc.)
      }
    });

    this.process.on("error", (err) => {
      for (const [id, pending] of this.pending) {
        pending.reject(err);
        this.pending.delete(id);
      }
    });
  }

  async send(message: JsonRpcRequest): Promise<JsonRpcResponse> {
    if (!this.process?.stdin) {
      throw new Error("Transport not connected");
    }

    const id = this.nextId++;
    const request = { ...message, id };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Request ${id} timed out (${message.method})`));
      }, 10000);

      this.pending.set(id, {
        resolve: (response) => {
          clearTimeout(timeout);
          resolve(response);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        },
      });

      this.process!.stdin!.write(JSON.stringify(request) + "\n");
    });
  }

  async disconnect(): Promise<void> {
    if (this.readline) {
      this.readline.close();
    }
    if (this.process) {
      this.process.kill("SIGTERM");
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          this.process?.kill("SIGKILL");
          resolve();
        }, 3000);
        this.process!.on("exit", () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
    this.pending.clear();
  }
}
