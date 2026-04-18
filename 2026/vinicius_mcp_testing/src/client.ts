import { TransportAdapter, JsonRpcRequest, JsonRpcResponse } from "./transport/stdio.js";

export interface ServerCapabilities {
  tools?: Record<string, unknown>;
  resources?: Record<string, unknown>;
  prompts?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface InitializeResult {
  protocolVersion: string;
  capabilities: ServerCapabilities;
  serverInfo: { name: string; version: string };
}

export interface ToolDefinition {
  name: string;
  description?: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolCallResult {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>;
  isError?: boolean;
}

export class MCPClient {
  constructor(private transport: TransportAdapter) {}

  async sendRaw(method: string, params?: Record<string, unknown>): Promise<JsonRpcResponse> {
    return this.transport.send({
      jsonrpc: "2.0",
      id: 0,
      method,
      params: params ?? {},
    });
  }

  async initialize(): Promise<InitializeResult> {
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: 0,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "mcp-conformance", version: "0.1.0" },
      },
    };

    const response = await this.transport.send(request);
    if (response.error) {
      throw new Error(`Initialize failed: ${response.error.message}`);
    }
    return response.result as InitializeResult;
  }

  async listTools(): Promise<ToolDefinition[]> {
    const response = await this.transport.send({
      jsonrpc: "2.0",
      id: 0,
      method: "tools/list",
      params: {},
    });

    if (response.error) {
      throw new Error(`tools/list failed: ${response.error.message}`);
    }
    const result = response.result as { tools: ToolDefinition[] };
    return result.tools;
  }

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<ToolCallResult> {
    const response = await this.transport.send({
      jsonrpc: "2.0",
      id: 0,
      method: "tools/call",
      params: { name, arguments: args },
    });

    if (response.error) {
      const err = new Error(response.error.message) as Error & { code: number };
      err.code = response.error.code;
      throw err;
    }
    return response.result as ToolCallResult;
  }

  async callToolRaw(name: string, args: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const response = await this.transport.send({
      jsonrpc: "2.0",
      id: 0,
      method: "tools/call",
      params: { name, arguments: args },
    });

    if (response.error) {
      const err = new Error(response.error.message) as Error & { code: number };
      err.code = response.error.code;
      throw err;
    }
    return response.result as Record<string, unknown>;
  }

  async listResources(): Promise<Array<Record<string, unknown>>> {
    const response = await this.transport.send({
      jsonrpc: "2.0",
      id: 0,
      method: "resources/list",
      params: {},
    });

    if (response.error) {
      throw new Error(`resources/list failed: ${response.error.message}`);
    }
    const result = response.result as { resources: Array<Record<string, unknown>> };
    return result.resources;
  }

  async readResource(uri: string): Promise<Array<Record<string, unknown>>> {
    const response = await this.transport.send({
      jsonrpc: "2.0",
      id: 0,
      method: "resources/read",
      params: { uri },
    });

    if (response.error) {
      throw new Error(`resources/read failed: ${response.error.message}`);
    }
    const result = response.result as { contents: Array<Record<string, unknown>> };
    return result.contents;
  }

  async listToolsRaw(): Promise<Array<Record<string, unknown>>> {
    const response = await this.transport.send({
      jsonrpc: "2.0",
      id: 0,
      method: "tools/list",
      params: {},
    });

    if (response.error) {
      throw new Error(`tools/list failed: ${response.error.message}`);
    }
    const result = response.result as { tools: Array<Record<string, unknown>> };
    return result.tools;
  }
}
