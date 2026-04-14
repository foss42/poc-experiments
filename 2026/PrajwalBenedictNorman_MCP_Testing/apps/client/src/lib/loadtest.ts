import { mcpConnection } from "./connection"

export type GraphPoint = {
  level: number
  avgLatency: number
  successCount: number
  failureCount: number
}

export function generateTestData(
  properties: Record<string, any>,
  count: number
): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = []

  for (let i = 0; i < count; i++) {
    const args: Record<string, unknown> = {}

    Object.entries(properties).forEach(([fieldName, fieldSchema]) => {
      if (fieldSchema.type === "number") {
        args[fieldName] = Math.floor(Math.random() * 100)
      }
      if (fieldSchema.type === "string") {
        args[fieldName] = `test_${Math.random().toString(36).slice(2, 7)}`
      }
      if (fieldSchema.type === "boolean") {
        args[fieldName] = Math.random() > 0.5
      }
    })

    results.push(args)
  }

  return results
}

export async function runLoadTest(
  toolName: string,
  properties: Record<string, any>,
  levels: number[],
  onProgress?: (message: string) => void
): Promise<GraphPoint[]> {
  const graphData: GraphPoint[] = []

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i]
    onProgress?.(`Level ${level} (${i + 1}/${levels.length})…`)

    const testData = generateTestData(properties, level)

    const promises = testData.map((data) => mcpConnection.callTool(toolName, data))

    const results = await Promise.allSettled(promises)

    const latencies: number[] = []
    let successCount = 0
    let failureCount = 0
    for (const r of results) {
      if (r.status === "rejected") {
        failureCount++
        continue
      }
      if (r.value.status === "success") {
        successCount++
        latencies.push(r.value.latencyMs)
      } else {
        failureCount++
      }
    }

    const avg =
      latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0

    graphData.push({ level, avgLatency: Math.round(avg * 100) / 100, successCount, failureCount })
  }

  onProgress?.("Done")
  return graphData
}
