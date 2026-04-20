import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

import type { HostTraceEntry, RunReport, TraceEntry } from "../shared/mcp"

export async function readLatestReport(): Promise<RunReport | null> {
  const latestPath = resolve(process.cwd(), "traces", "latest-report.json")

  try {
    const contents = await readFile(latestPath, "utf8")
    return JSON.parse(contents) as RunReport
  } catch {
    return null
  }
}

export async function readLatestTraces(): Promise<{
  runId: string
  mcpTrace: TraceEntry[]
  appTrace: HostTraceEntry[]
} | null> {
  const latestReport = await readLatestReport()
  if (!latestReport) {
    return null
  }

  const runDir = resolve(process.cwd(), "traces", "runs", latestReport.runId)

  try {
    const [mcpTraceContents, appTraceContents] = await Promise.all([
      readFile(resolve(runDir, "mcp-trace.json"), "utf8"),
      readFile(resolve(runDir, "apps-trace.json"), "utf8"),
    ])

    return {
      runId: latestReport.runId,
      mcpTrace: JSON.parse(mcpTraceContents) as TraceEntry[],
      appTrace: JSON.parse(appTraceContents) as HostTraceEntry[],
    }
  } catch {
    return null
  }
}
