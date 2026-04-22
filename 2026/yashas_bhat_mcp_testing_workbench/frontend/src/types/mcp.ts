export interface McpInitializeResult {
  protocolVersion?: string
  capabilities?: Record<string, unknown>
  serverInfo?: {
    name?: string
    version?: string
  }
}

export interface McpToolDefinition {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
  _meta?: Record<string, unknown>
}

export interface McpResourceDefinition {
  uri: string
  name?: string
  description?: string
  mimeType?: string
  _meta?: Record<string, unknown>
}

export interface McpResourceContents {
  uri: string
  mimeType?: string
  text?: string
  blob?: string
  _meta?: Record<string, unknown>
}

export interface TraceEntry {
  kind: "mcp"
  direction: "client->server" | "server->client"
  method?: string
  timestamp: string
  status?: number
  durationMs?: number
  headers?: Record<string, string>
  payload: unknown
}

export interface HostTraceEntry {
  kind: "host-app"
  direction: "host->app" | "app->host"
  timestamp: string
  method?: string
  payload: unknown
}

export interface DiscoveryPayload {
  serverUrl: string
  initialize: McpInitializeResult
  tools: McpToolDefinition[]
  resources: McpResourceDefinition[]
}

export interface LatestTracesPayload {
  runId: string
  mcpTrace: TraceEntry[]
  appTrace: HostTraceEntry[]
}

export interface ResourcePayload {
  serverUrl: string
  resource: McpResourceContents
}

export interface ToolCallPayload {
  serverUrl: string
  toolName: string
  result: unknown
}

export interface AssertionResult {
  id: string
  title: string
  status: "passed" | "failed"
  message: string
  expected?: unknown
  actual?: unknown
}

export interface ScenarioArtifact {
  label: string
  path: string
}

export interface ScenarioStepRecord {
  title: string
  durationMs: number
  status: "completed" | "failed"
  error?: string
}

export interface ScenarioResult {
  id: string
  title: string
  suite: string
  status: "passed" | "failed"
  startedAt: string
  finishedAt: string
  durationMs: number
  assertions: AssertionResult[]
  notes: string[]
  steps: ScenarioStepRecord[]
  artifacts: ScenarioArtifact[]
}

export interface RunReport {
  runId: string
  serverUrl: string
  startedAt: string
  finishedAt: string
  durationMs: number
  totals: {
    scenarios: number
    passed: number
    failed: number
    assertions: number
    assertionsFailed: number
  }
  scenarioResults: ScenarioResult[]
  latestArtifacts: ScenarioArtifact[]
}

export interface ScenarioManifest {
  id: string
  title: string
  suite: string
  description: string
  tags: string[]
  dependencies?: string[]
  sourceType?: "typescript"
  inputs?: Record<string, unknown>
  expected?: Record<string, unknown>
}
