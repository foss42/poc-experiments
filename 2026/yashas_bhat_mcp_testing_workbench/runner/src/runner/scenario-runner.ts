import { resolve } from "node:path"

import { createMcpAppsHarness } from "../apps-harness/mcp-apps-harness"
import { createMcpHttpClient } from "../client/mcp-http-client"
import { scenarios } from "../scenarios"
import { failAssertion } from "./assertions"
import { isScenarioRunError } from "./scenario-run-error"
import { buildScenarioManifestMap } from "./scenario-loader"
import { createTraceRecorder } from "./trace-recorder"
import type { RunReport, ScenarioResult, ScenarioStepRecord } from "../shared/mcp"
import {
  toScenarioManifest,
  type RunState,
  type ScenarioDefinition,
  type ScenarioExecutionResult,
} from "../shared/scenario"

interface RunOptions {
  serverUrl: string
  scenarioIds?: string[]
}

export async function runScenarioSuite({
  serverUrl,
  scenarioIds,
}: RunOptions): Promise<RunReport> {
  const startedAt = new Date()
  const runId = buildRunId(startedAt)
  const recorder = createTraceRecorder(runId)
  await recorder.init()

  const client = createMcpHttpClient({
    serverUrl,
    onTrace: (entry) => recorder.recordMcp(entry),
  })
  const harness = createMcpAppsHarness({
    client,
    onTrace: (entry) => recorder.recordHost(entry),
  })

  const manifests = buildScenarioManifestMap()
  const selected = resolveScenarios(scenarioIds)

  const state: RunState = {}
  const scenarioResults: ScenarioResult[] = []

  try {
    for (const scenario of selected) {
      const scenarioStart = new Date()
      try {
        const manifest = manifests.get(scenario.id) ?? toScenarioManifest(scenario)

        const outcome = await scenario.run({ client, harness, recorder, manifest, state })

        scenarioResults.push(buildScenarioResult(scenario, scenarioStart, outcome))
      } catch (error) {
        scenarioResults.push(buildScenarioErrorResult(scenario, scenarioStart, error))
      }
    }
  } finally {
    await harness.close()
  }

  const finishedAt = new Date()
  const report: RunReport = {
    runId,
    serverUrl,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    totals: buildRunTotals(scenarioResults),
    scenarioResults,
    latestArtifacts: [
      { label: "latest report", path: resolve(process.cwd(), "traces", "latest-report.json") },
    ],
  }

  await recorder.finalize(report)
  return report
}

function buildRunId(timestamp: Date): string {
  return timestamp.toISOString().replaceAll(":", "-").replace(/\..+/, "")
}

function buildScenarioResult(
  scenario: ScenarioDefinition,
  scenarioStart: Date,
  outcome: ScenarioExecutionResult,
): ScenarioResult {
  const steps: ScenarioStepRecord[] = outcome.steps ?? []
  return {
    id: scenario.id,
    title: scenario.title,
    suite: scenario.suite,
    status: outcome.assertions.some((assertion) => assertion.status === "failed") ? "failed" : "passed",
    startedAt: scenarioStart.toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - scenarioStart.getTime(),
    assertions: outcome.assertions,
    notes: outcome.notes ?? [],
    steps,
    artifacts: outcome.artifacts ?? [],
  }
}

function buildScenarioErrorResult(
  scenario: ScenarioDefinition,
  scenarioStart: Date,
  error: unknown,
): ScenarioResult {
  if (isScenarioRunError(error)) {
    const terminal = failAssertion(
      "scenario-error",
      `${scenario.id} execution failed`,
      error.cause ?? error,
    )
    return buildScenarioResult(scenario, scenarioStart, {
      assertions: [...error.partial.assertions, terminal],
      notes: error.partial.notes,
      steps: error.partial.steps,
      artifacts: error.partial.artifacts,
    })
  }

  return {
    id: scenario.id,
    title: scenario.title,
    suite: scenario.suite,
    status: "failed",
    startedAt: scenarioStart.toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - scenarioStart.getTime(),
    assertions: [failAssertion("scenario-error", `${scenario.id} execution failed`, error)],
    notes: [],
    steps: [],
    artifacts: [],
  }
}

function buildRunTotals(scenarioResults: ScenarioResult[]): RunReport["totals"] {
  return {
    scenarios: scenarioResults.length,
    passed: scenarioResults.filter((scenario) => scenario.status === "passed").length,
    failed: scenarioResults.filter((scenario) => scenario.status === "failed").length,
    assertions: scenarioResults.reduce((count, scenario) => count + scenario.assertions.length, 0),
    assertionsFailed: scenarioResults.reduce(
      (count, scenario) =>
        count + scenario.assertions.filter((assertion) => assertion.status === "failed").length,
      0,
    ),
  }
}

function resolveScenarios(requestedIds?: string[]): ScenarioDefinition[] {
  if (!requestedIds?.length) {
    return scenarios
  }

  const scenarioMap = new Map(scenarios.map((scenario) => [scenario.id, scenario]))
  const resolvedIds = new Set<string>()

  function visit(id: string) {
    const scenario = scenarioMap.get(id)
    if (!scenario || resolvedIds.has(id)) {
      return
    }

    for (const dependencyId of scenario.dependencies ?? []) {
      visit(dependencyId)
    }

    resolvedIds.add(id)
  }

  for (const id of requestedIds) {
    visit(id)
  }

  return scenarios.filter((scenario) => resolvedIds.has(scenario.id))
}
