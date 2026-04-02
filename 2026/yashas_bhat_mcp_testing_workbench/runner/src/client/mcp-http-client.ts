import type {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcSuccess,
  McpInitializeResult,
  McpResourceContents,
  McpResourceDefinition,
  McpToolCallEnvelope,
  McpToolDefinition,
  TraceEntry,
} from "../shared/mcp"

const DEFAULT_PROTOCOL_VERSIONS = ["2025-03-26", "2024-11-05"]

interface ClientOptions {
  serverUrl: string
  onTrace?: (entry: TraceEntry) => void
}

interface RequestOptions {
  traceMethod?: string
}

export interface McpHttpClient {
  initialize: () => Promise<McpInitializeResult>
  listTools: () => Promise<McpToolDefinition[]>
  listResources: () => Promise<McpResourceDefinition[]>
  readResource: (uri: string) => Promise<McpResourceContents>
  callTool: <T = Record<string, unknown>>(
    name: string,
    arguments_: Record<string, unknown>,
  ) => Promise<T>
}

export function getToolStructuredContent<T>(
  result: McpToolCallEnvelope<T>,
  fallback?: T,
): T {
  if (result.structuredContent !== undefined) {
    return result.structuredContent
  }

  if (fallback !== undefined) {
    return fallback
  }

  return result as T
}

export function createMcpHttpClient({ serverUrl, onTrace }: ClientOptions): McpHttpClient {
  let requestId = 1
  let sessionId: string | null = null
  let initialized = false
  let initializeResult: McpInitializeResult | null = null
  let negotiatedProtocolVersion: string | null = null

  function trace(entry: TraceEntry) {
    onTrace?.(entry)
  }

  function buildHeaders(): Headers {
    const headers = new Headers({
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    })

    if (sessionId) {
      headers.set("mcp-session-id", sessionId)
    }

    if (negotiatedProtocolVersion) {
      headers.set("mcp-protocol-version", negotiatedProtocolVersion)
    }

    return headers
  }

  async function request<T>(
    method: string,
    params: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    const id = requestId++
    const payload: JsonRpcRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    }

    const headers = buildHeaders()

    trace({
      kind: "mcp",
      direction: "client->server",
      method: options.traceMethod ?? method,
      timestamp: new Date().toISOString(),
      headers: headersToObject(headers),
      payload,
    })

    const startedAt = Date.now()
    const response = await fetch(serverUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    })

    const responseHeaders = headersToObject(response.headers)
    const nextSessionId = response.headers.get("mcp-session-id")
    if (nextSessionId) {
      sessionId = nextSessionId
    }

    const bodyText = await response.text()
    const rpcPayload = parseTransportPayload(bodyText, response.headers.get("content-type"), id)

    trace({
      kind: "mcp",
      direction: "server->client",
      method: options.traceMethod ?? method,
      timestamp: new Date().toISOString(),
      status: response.status,
      durationMs: Date.now() - startedAt,
      headers: responseHeaders,
      payload: rpcPayload,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${bodyText}`)
    }

    if ("error" in rpcPayload) {
      throw new Error(`${rpcPayload.error.code}: ${rpcPayload.error.message}`)
    }

    return (rpcPayload as JsonRpcSuccess<T>).result
  }

  async function notify(
    method: string,
    params: unknown,
    options: RequestOptions = {},
  ): Promise<void> {
    const payload = {
      jsonrpc: "2.0" as const,
      method,
      params,
    }

    const headers = buildHeaders()

    trace({
      kind: "mcp",
      direction: "client->server",
      method: options.traceMethod ?? method,
      timestamp: new Date().toISOString(),
      headers: headersToObject(headers),
      payload,
    })

    const startedAt = Date.now()
    const response = await fetch(serverUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    })

    const responseHeaders = headersToObject(response.headers)
    const nextSessionId = response.headers.get("mcp-session-id")
    if (nextSessionId) {
      sessionId = nextSessionId
    }

    const bodyText = await response.text()
    const responsePayload =
      bodyText.length > 0
        ? parseTransportPayload(bodyText, response.headers.get("content-type"))
        : null

    trace({
      kind: "mcp",
      direction: "server->client",
      method: options.traceMethod ?? method,
      timestamp: new Date().toISOString(),
      status: response.status,
      durationMs: Date.now() - startedAt,
      headers: responseHeaders,
      payload: responsePayload,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${bodyText}`)
    }
  }

  async function initialize(): Promise<McpInitializeResult> {
    if (initialized) {
      if (initializeResult === null) {
        throw new Error("MCP client invariant violated: initialized flag set without cached initialize result")
      }
      return initializeResult
    }

    let lastError: Error | null = null

    for (const protocolVersion of DEFAULT_PROTOCOL_VERSIONS) {
      try {
        const result = await request<McpInitializeResult>(
          "initialize",
          {
            protocolVersion,
            capabilities: {},
            clientInfo: {
              name: "mcp-testing-workbench",
              version: "0.1.0",
            },
          },
          { traceMethod: "initialize" },
        )
        negotiatedProtocolVersion = result.protocolVersion ?? protocolVersion
        await notify("notifications/initialized", {}, { traceMethod: "notifications/initialized" })
        initializeResult = result
        initialized = true
        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
      }
    }

    throw lastError ?? new Error("Failed to initialize MCP session")
  }

  async function listTools(): Promise<McpToolDefinition[]> {
    const result = await request<{ tools?: McpToolDefinition[] }>("tools/list", {})
    return result.tools ?? []
  }

  async function listResources(): Promise<McpResourceDefinition[]> {
    const result = await request<{ resources?: McpResourceDefinition[] }>("resources/list", {})
    return result.resources ?? []
  }

  async function readResource(uri: string): Promise<McpResourceContents> {
    const result = await request<{ contents?: McpResourceContents[] }>("resources/read", { uri })
    const resource = result.contents?.[0]
    if (!resource) {
      throw new Error(`No resource contents returned for ${uri}`)
    }
    return resource
  }

  async function callTool<T = Record<string, unknown>>(
    name: string,
    arguments_: Record<string, unknown>,
  ): Promise<T> {
    return request<T>("tools/call", {
      name,
      arguments: arguments_,
    })
  }

  return {
    initialize,
    listTools,
    listResources,
    readResource,
    callTool,
  }
}

function parseTransportPayload(
  payload: string,
  contentType: string | null,
  requestId?: string | number,
): JsonRpcResponse {
  if (contentType?.includes("text/event-stream")) {
    const messages = payload
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as JsonRpcResponse)

    if (messages.length === 0) {
      throw new Error("Empty SSE response from MCP server")
    }

    return selectRpcResponse(messages, requestId)
  }

  const parsed = JSON.parse(payload) as JsonRpcResponse | JsonRpcResponse[]
  return selectRpcResponse(Array.isArray(parsed) ? parsed : [parsed], requestId)
}

function selectRpcResponse(
  responses: JsonRpcResponse[],
  requestId?: string | number,
): JsonRpcResponse {
  if (requestId === undefined) {
    const response = responses[0]
    if (!response) {
      throw new Error("No JSON-RPC response returned by MCP server")
    }
    return response
  }

  const matching = responses.find((response) => response.id === requestId)
  if (!matching) {
    throw new Error(`No JSON-RPC response matched request id ${String(requestId)}`)
  }

  return matching
}

function headersToObject(headers: Headers): Record<string, string> {
  const output: Record<string, string> = {}
  headers.forEach((value, key) => {
    output[key] = value
  })
  return output
}
