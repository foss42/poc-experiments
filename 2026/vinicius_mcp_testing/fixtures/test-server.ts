import { createInterface } from "node:readline";

/**
 * Minimal MCP server for conformance testing.
 * Implements: initialize, tools/list, tools/call
 * Exposes 3 tools: greet, add, echo
 */

const SERVER_INFO = {
  name: "test-mcp-server",
  version: "1.0.0",
};

const TOOLS = [
  {
    name: "greet",
    description: "Returns a greeting message for a given name",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Name to greet" },
      },
      required: ["name"],
    },
  },
  {
    name: "add",
    description: "Adds two numbers together",
    inputSchema: {
      type: "object" as const,
      properties: {
        a: { type: "number", description: "First number" },
        b: { type: "number", description: "Second number" },
      },
      required: ["a", "b"],
    },
  },
  {
    name: "echo",
    description: "Echoes back the input message",
    inputSchema: {
      type: "object" as const,
      properties: {
        message: { type: "string", description: "Message to echo" },
      },
      required: ["message"],
    },
  },
];

type ToolArgs = Record<string, unknown>;

function handleToolCall(name: string, args: ToolArgs): { content: Array<{ type: string; text: string }> } {
  switch (name) {
    case "greet":
      return { content: [{ type: "text", text: `Hello, ${args.name ?? "stranger"}!` }] };
    case "add":
      return { content: [{ type: "text", text: String(Number(args.a ?? 0) + Number(args.b ?? 0)) }] };
    case "echo":
      return { content: [{ type: "text", text: String(args.message ?? "") }] };
    default:
      // Per MCP spec: unknown tool is -32602 (Invalid params), not -32601 (Method not found).
      // tools/call IS the method — the tool name is the invalid parameter.
      throw { code: -32602, message: `Unknown tool: ${name}` };
  }
}

interface JsonRpcRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

function handleRequest(request: JsonRpcRequest): unknown {
  switch (request.method) {
    case "initialize":
      return {
        protocolVersion: "2025-03-26",
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      };

    case "tools/list":
      return { tools: TOOLS };

    case "tools/call": {
      const { name, arguments: args } = request.params as { name: string; arguments: ToolArgs };
      return handleToolCall(name, args || {});
    }

    default:
      throw { code: -32601, message: `Method not found: ${request.method}` };
  }
}

// stdio JSON-RPC loop
const rl = createInterface({ input: process.stdin });

rl.on("line", (line: string) => {
  try {
    const request = JSON.parse(line) as JsonRpcRequest;

    try {
      const result = handleRequest(request);
      const response = { jsonrpc: "2.0", id: request.id, result };
      process.stdout.write(JSON.stringify(response) + "\n");
    } catch (err) {
      const error = err as { code: number; message: string };
      const response = {
        jsonrpc: "2.0",
        id: request.id,
        error: { code: error.code || -32603, message: error.message || "Internal error" },
      };
      process.stdout.write(JSON.stringify(response) + "\n");
    }
  } catch {
    const response = {
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: "Parse error" },
    };
    process.stdout.write(JSON.stringify(response) + "\n");
  }
});
