import { useState } from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { runLoadTest } from "../lib/loadtest.ts"
import type { MCPTool } from "../lib/connection.ts"
import type { GraphPoint } from "../lib/loadtest.ts"

const CONCURRENCY_LEVELS = [1, 5, 10, 20, 30] as const

function LoadTooltip(props: { active?: boolean; payload?: { payload?: GraphPoint }[] }) {
  const { active, payload } = props
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload
  if (!p) return null
  return (
    <div className="rounded-lg border border-[#DDDAD6] bg-[#F9F8F6] px-3 py-2 text-xs text-[#1F2E26] shadow-sm">
      <div className="font-medium">Concurrency: {p.level}</div>
      <div>Avg latency: {p.avgLatency} ms</div>
      <div className="text-[#2C9768]">Success: {p.successCount}</div>
      <div className="text-red-700/80">Failed: {p.failureCount}</div>
    </div>
  )
}

function LoadTestGraph({
  tool,
  concurrencyNumber,
}: {
  tool: MCPTool
  concurrencyNumber: number
}) {
  const [graphData, setGraphData] = useState<GraphPoint[]>([])
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)

  const properties = (tool.inputSchema as any).properties ?? {}
  const index = CONCURRENCY_LEVELS.indexOf(concurrencyNumber as (typeof CONCURRENCY_LEVELS)[number])
  const selectLevels =
    index >= 0 ? CONCURRENCY_LEVELS.slice(0, index + 1) : [...CONCURRENCY_LEVELS]

  async function startLoadTest() {
    setRunning(true)
    setProgress("Starting…")
    try {
      const data = await runLoadTest(tool.name, properties, [...selectLevels], setProgress)
      setGraphData(data)
    } finally {
      setRunning(false)
      setProgress(null)
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={startLoadTest}
        disabled={running}
        className="mt-4 rounded-xl bg-[#2C9768] px-3 py-1 text-sm text-white transition hover:bg-[#25865c] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {running ? "Running…" : "Run load test"}
      </button>
      {progress && (
        <p className="mt-2 text-xs text-[#1F2E26]/60" aria-live="polite">
          {progress}
        </p>
      )}
      <div className="py-6">
        {graphData.length === 0 && !running && (
          <p className="text-xs text-[#1F2E26]/45">
            Run a load test to chart average latency per concurrency level (up to your selected
            max).
          </p>
        )}
        {graphData.length > 0 && (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={graphData}>
              <XAxis
                dataKey="level"
                label={{ value: "Concurrent calls", position: "bottom", offset: 4 }}
              />
              <YAxis label={{ value: "Avg latency (ms)", angle: -90, position: "insideLeft" }} />
              <Tooltip content={<LoadTooltip />} />
              <Line
                type="monotone"
                dataKey="avgLatency"
                stroke="#2C9768"
                strokeWidth={2}
                dot
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export default LoadTestGraph