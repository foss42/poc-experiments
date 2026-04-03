import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Tool, McpServerConfig } from '../types/index.js';

interface McpConnection {
  client: Client;
  transport: StdioClientTransport;
  server: McpServerConfig;
  tools: Tool[];
}

export class McpClientService {
  private connections: Map<string, McpConnection> = new Map();
  private servers: McpServerConfig[];

  constructor(servers: McpServerConfig[] = []) {
    this.servers = servers;
  }

  /** Connect to all enabled MCP servers */
  async connect(): Promise<void> {
    const enabled = this.servers.filter(s => s.enabled !== false);
    for (const server of enabled) {
      await this.connectServer(server);
    }
  }

  /** Connect to a single MCP server */
  async connectServer(server: McpServerConfig): Promise<void> {
    try {
      const transport = new StdioClientTransport({
        command: server.command,
        args: server.args,
      });

      const client = new Client(
        { name: 'cli_tool', version: '1.0.0' },
        { capabilities: {} }
      );

      await client.connect(transport);
      const result = await client.listTools();
      const tools: Tool[] = result.tools.map(t => ({
        name: t.name,
        description: t.description || '',
        inputSchema: t.inputSchema as Record<string, unknown>,
      }));

      this.connections.set(server.name, { client, transport, server, tools });
    } catch (err: any) {
      console.error(`Failed to connect to MCP server ${server.name}: ${err.message}`);
    }
  }

  /** Disconnect from all servers */
  async disconnect(): Promise<void> {
    for (const [name, conn] of this.connections) {
      try {
        await conn.transport.close();
      } catch { /* ignore */ }
      this.connections.delete(name);
    }
  }

  /** List all tools across all servers */
  async listTools(): Promise<Array<Tool & { server: string }>> {
    const tools: Array<Tool & { server: string }> = [];
    for (const [serverName, conn] of this.connections) {
      for (const tool of conn.tools) {
        tools.push({ ...tool, server: serverName });
      }
    }
    return tools;
  }

  /** List all connected servers */
  listServers(): Array<{ name: string; tools: number; enabled: boolean }> {
    const result: Array<{ name: string; tools: number; enabled: boolean }> = [];
    for (const [name, conn] of this.connections) {
      result.push({ name, tools: conn.tools.length, enabled: conn.server.enabled !== false });
    }
    // Also list configured but not connected servers
    for (const server of this.servers) {
      if (!this.connections.has(server.name)) {
        result.push({ name: server.name, tools: 0, enabled: false });
      }
    }
    return result;
  }

  /** Call a specific tool */
  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    for (const [, conn] of this.connections) {
      const tool = conn.tools.find(t => t.name === name);
      if (tool) {
        const result = await conn.client.callTool({ name, arguments: args });
        return result;
      }
    }
    throw new Error(`Tool not found: ${name}`);
  }

  /** Reconnect all servers */
  async refresh(): Promise<void> {
    await this.disconnect();
    await this.connect();
  }

  /** Enable a server */
  async enableServer(name: string): Promise<void> {
    const server = this.servers.find(s => s.name === name);
    if (server) {
      server.enabled = true;
      await this.connectServer(server);
    }
  }

  /** Disable a server */
  async disableServer(name: string): Promise<void> {
    const conn = this.connections.get(name);
    if (conn) {
      await conn.transport.close();
      this.connections.delete(name);
    }
    const server = this.servers.find(s => s.name === name);
    if (server) server.enabled = false;
  }

  getServers(): McpServerConfig[] { return this.servers; }
  setServers(servers: McpServerConfig[]): void { this.servers = servers; }
}
