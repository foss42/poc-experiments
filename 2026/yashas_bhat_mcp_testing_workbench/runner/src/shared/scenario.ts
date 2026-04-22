import type {
  AssertionResult,
  McpResourceContents,
  McpResourceDefinition,
  McpToolDefinition,
  ScenarioArtifact,
  ScenarioManifest,
  ScenarioStepRecord,
} from "./mcp"
import type { McpHttpClient } from "../client/mcp-http-client"
import type { McpAppsHarness } from "../apps-harness/mcp-apps-harness"
import type { TraceRecorder } from "../runner/trace-recorder"

export interface RunState {
  discovery?: DiscoverySnapshot
  salesFormUi?: UiResourceSnapshot
  salesData?: SalesDataSnapshot
  visualizationUi?: UiResourceSnapshot
  visualizationPayload?: Record<string, unknown>
  pdfUi?: UiResourceSnapshot
  pdfPayload?: Record<string, unknown>
}

export function requireState<K extends keyof RunState>(
  state: RunState,
  key: K,
): NonNullable<RunState[K]> {
  const value = state[key]
  if (value === undefined) {
    throw new Error(`Required state "${key}" is not set — check scenario ordering`)
  }
  return value as NonNullable<RunState[K]>
}

export interface ScenarioContext {
  client: McpHttpClient
  harness: McpAppsHarness
  recorder: TraceRecorder
  manifest: ScenarioManifest
  state: RunState
}

export interface ScenarioExecutionResult {
  assertions: AssertionResult[]
  notes?: string[]
  steps?: ScenarioStepRecord[]
  artifacts?: ScenarioArtifact[]
}

export interface ScenarioDefinition {
  id: string
  title: string
  suite: string
  description: string
  tags: string[]
  dependencies?: string[]
  run(context: ScenarioContext): Promise<ScenarioExecutionResult>
}

export function toScenarioManifest(scenario: ScenarioDefinition): ScenarioManifest {
  return {
    id: scenario.id,
    title: scenario.title,
    suite: scenario.suite,
    description: scenario.description,
    tags: scenario.tags,
    dependencies: scenario.dependencies,
    sourceType: "typescript",
  }
}

export interface DiscoverySnapshot {
  tools: McpToolDefinition[]
  resources: McpResourceDefinition[]
  initialize: Record<string, unknown>
}

export interface SalesDataSnapshot {
  selections: {
    states: string[]
    metric: string
    period: "monthly" | "quarterly"
    year: string
  }
  report: {
    summary: Record<string, unknown>
    topState: Record<string, unknown>
    periods: Array<Record<string, unknown>>
    states: Array<Record<string, unknown>>
    stateNames?: string[]
  }
}

export interface UiResourceSnapshot {
  uri: string
  resource: McpResourceContents
}
