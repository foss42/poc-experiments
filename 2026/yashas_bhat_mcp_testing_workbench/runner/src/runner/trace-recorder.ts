import { mkdir, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

import type {
  HostTraceEntry,
  RunReport,
  ScenarioArtifact,
  TraceEntry,
} from "../shared/mcp"

export interface TraceRecorder {
  getRunDir: () => string
  init: () => Promise<void>
  recordMcp: (entry: TraceEntry) => void
  recordHost: (entry: HostTraceEntry) => void
  saveScenarioArtifacts: (scenarioId: string, payload: unknown) => Promise<ScenarioArtifact>
  finalize: (report: RunReport) => Promise<void>
}

export function createTraceRecorder(
  runId: string,
  rootDir = resolve(process.cwd(), "traces"),
): TraceRecorder {
  const runDir = resolve(rootDir, "runs", runId)
  const mcpTrace: TraceEntry[] = []
  const hostTrace: HostTraceEntry[] = []

  function getRunDir() {
    return runDir
  }

  async function init() {
    await mkdir(runDir, { recursive: true })
  }

  function recordMcp(entry: TraceEntry) {
    mcpTrace.push(entry)
  }

  function recordHost(entry: HostTraceEntry) {
    hostTrace.push(entry)
  }

  async function saveScenarioArtifacts(
    scenarioId: string,
    payload: unknown,
  ): Promise<ScenarioArtifact> {
    const artifactPath = resolve(runDir, `${scenarioId}.json`)
    await writeFile(artifactPath, JSON.stringify(payload, null, 2))
    return {
      label: `${scenarioId} payload`,
      path: artifactPath,
    }
  }

  async function finalize(report: RunReport) {
    await mkdir(resolve(rootDir, "runs"), { recursive: true })
    await writeFile(resolve(runDir, "mcp-trace.json"), JSON.stringify(mcpTrace, null, 2))
    await writeFile(resolve(runDir, "apps-trace.json"), JSON.stringify(hostTrace, null, 2))
    await writeFile(resolve(runDir, "report.json"), JSON.stringify(report, null, 2))
    await writeFile(resolve(rootDir, "latest-report.json"), JSON.stringify(report, null, 2))
  }

  return {
    getRunDir,
    init,
    recordMcp,
    recordHost,
    saveScenarioArtifacts,
    finalize,
  }
}
