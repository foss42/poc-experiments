import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { WebSocketClientTransport } from "@modelcontextprotocol/sdk/client/websocket.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"

export type ConnectionMode = 'stdio' | 'http'

export interface MCPTool {
  name: string
  description: string | undefined
  inputSchema: Record<string, unknown>
}

export interface ToolCallResult {
  result: unknown
  latencyMs: number
  rawRequest: unknown
  rawResponse: unknown
  timestamp: Date
  status: 'success' | 'failure'
  error?: string
}

class MCPConnection {
  private mcp: Client
  private transport: WebSocketClientTransport | StreamableHTTPClientTransport | null = null
  public tools: MCPTool[] = []
  public connected: boolean = false
  public httpUrl: string | null = null
  constructor() {
    this.mcp = new Client({ name: "mcp-dev-poc", version: "1.0.0" })
  }

  async connect(input: string, mode: ConnectionMode = 'stdio'): Promise<MCPTool[]> {
    try {
      if (mode === 'http') {
        this.transport = new StreamableHTTPClientTransport(new URL(input))
        this.httpUrl = input
      } else {
        this.transport = new WebSocketClientTransport(
          new URL(`ws://localhost:3333?command=${encodeURIComponent(input)}`)
        )
      }
      await this.mcp.connect(this.transport as any)
      const toolsResult = await this.mcp.listTools()
      this.tools = toolsResult.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema as Record<string, unknown>
      }))
      this.connected = true
      return this.tools
    } catch (e) {
      console.error('Failed to connect:', e)
      throw e
    }
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolCallResult> {
    if (!this.connected) throw new Error('Not connected to MCP server')
    const rawRequest = { method: 'tools/call', params: { name, arguments: args } }
    const start = Date.now()
    try {
      const result = await this.mcp.callTool({ name, arguments: args })
      return {
        result,
        latencyMs: Date.now() - start,
        rawRequest,
        rawResponse: result,
        timestamp: new Date(),
        status: 'success'
      }
    } catch (error) {
      return {
        result: null,
        latencyMs: Date.now() - start,
        rawRequest,
        rawResponse: error,
        timestamp: new Date(),
        status: 'failure',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async callToolRaw(name: string, args: Record<string, unknown>): Promise<any> {
  const response = await fetch(this.httpUrl!, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'  // ← add this
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name, arguments: args }
    })
  })
  return await response.json()
}
  disconnect(): void {
    if (this.connected) {
      this.mcp.close()
      this.connected = false
      this.tools = []
      this.transport = null
      this.httpUrl = null
      this.mcp = new Client({ name: "mcp-dev-poc", version: "1.0.0" })
    }
  }
}

export const mcpConnection = new MCPConnection()