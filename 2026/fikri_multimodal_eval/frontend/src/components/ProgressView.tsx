import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { SSEEvent, HarnessResult } from "../types";

// ─── Helpers ───────────────────────────────────────────────────────────────

function shortModelName(modelArgs: string): string {
  // "pretrained=org/model-name" → "model-name"
  const match = modelArgs.match(/pretrained=(?:[^/]+\/)?(.+)/);
  return match ? match[1] : modelArgs;
}

function primaryMetric(result: HarnessResult): { key: string; value: number } | null {
  for (const taskMetrics of Object.values(result.results || {})) {
    for (const [k, v] of Object.entries(taskMetrics)) {
      if (!k.includes("stderr") && typeof v === "number") {
        return { key: k.replace(",none", ""), value: v };
      }
    }
  }
  return null;
}

const BAR_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#a855f7"];

// ─── Component ─────────────────────────────────────────────────────────────

export function ProgressView({ events }: { events: SSEEvent[] }) {
  const startEvt = events.find((e) => e.type === "start");
  const modelCompleteEvts = events.filter((e) => e.type === "model_complete");
  const modelErrorEvts = events.filter((e) => e.type === "model_error");
  const modelStartEvts = events.filter((e) => e.type === "model_start");
  const currentEvt = modelStartEvts[modelStartEvts.length - 1];
  const completeEvt = events.find((e) => e.type === "complete");
  const errorEvt = events.find((e) => e.type === "error");

  const total = startEvt?.total ?? 0;
  const done = modelCompleteEvts.length + modelErrorEvts.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // Build chart data from per-model results
  const chartData = modelCompleteEvts
    .filter((e) => e.model && e.result)
    .map((e) => {
      const m = primaryMetric(e.result!);
      return {
        model: shortModelName(e.model!),
        fullModel: e.model!,
        value: m ? (m.value < 1 ? parseFloat((m.value * 100).toFixed(2)) : parseFloat(m.value.toFixed(3))) : 0,
        metricKey: m?.key ?? "",
      };
    });

  const isPercent = chartData.length > 0 && chartData[0].value <= 100 && chartData[0].metricKey.includes("acc");

  return (
    <div className="space-y-4">

      {/* Progress bar */}
      {!completeEvt && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
          <div className="flex justify-between text-xs text-zinc-400 mb-2">
            <span className="text-purple-300 font-medium">
              {currentEvt
                ? `Running: ${shortModelName(currentEvt.model!)}`
                : startEvt
                ? `Preparing ${total} model${total !== 1 ? "s" : ""}…`
                : "Starting…"}
            </span>
            <span>{done}/{total} models ({pct}%)</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 transition-all duration-500 rounded-full"
              style={{ width: `${pct}%` }}
            />
          </div>
          {/* Intermediate results as they arrive */}
          {modelCompleteEvts.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {modelCompleteEvts.map((e) => {
                const m = primaryMetric(e.result!);
                return (
                  <span key={e.model} className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-300">
                    {shortModelName(e.model!)}
                    {m && (
                      <span className="ml-1.5 text-blue-300 font-mono">
                        {m.key}: {m.value < 1 ? (m.value * 100).toFixed(1) + "%" : m.value.toFixed(3)}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {errorEvt && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-sm text-red-300">
          {errorEvt.message}
        </div>
      )}

      {/* Model-level errors */}
      {modelErrorEvts.map((e) => (
        <div key={e.model} className="bg-amber-900/20 border border-amber-800 rounded-xl p-3 text-xs text-amber-300">
          <span className="font-medium">{shortModelName(e.model!)}</span> — {e.error}
        </div>
      ))}

      {/* Final results */}
      {(completeEvt || modelCompleteEvts.length > 0) && chartData.length > 0 && (
        <div className="space-y-4">

          {/* Bar chart */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-sm font-medium text-zinc-300 mb-1">
              {completeEvt ? "Comparison Results" : "Results so far"}
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              {chartData[0]?.metricKey} · {startEvt?.tasks?.join(", ")} · {startEvt?.harness}
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    dataKey="model"
                    tick={{ fill: "#888", fontSize: 10 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fill: "#888", fontSize: 11 }}
                    tickFormatter={(v) => isPercent ? `${v}%` : v}
                    domain={isPercent ? [0, 100] : [0, "auto"]}
                  />
                  <Tooltip
                    contentStyle={{ background: "#1e1e1e", border: "1px solid #333", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => isPercent ? `${v}%` : v}
                    labelFormatter={(label) => {
                      const entry = chartData.find((d) => d.model === label);
                      return entry?.fullModel ?? label;
                    }}
                  />
                  <Bar dataKey="value" name={chartData[0]?.metricKey || "score"} radius={[4, 4, 0, 0]}>
                    {chartData.map((_, idx) => (
                      <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Results table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500">
                  <th className="px-4 py-2.5 text-left">Model</th>
                  {startEvt?.tasks?.map((t) => (
                    <th key={t} className="px-4 py-2.5 text-left">{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modelCompleteEvts.map((e, idx) => {
                  const taskResults = e.result?.results ?? {};
                  return (
                    <tr key={e.model} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: BAR_COLORS[idx % BAR_COLORS.length] }}
                          />
                          <span className="text-zinc-300 font-medium">{shortModelName(e.model!)}</span>
                        </div>
                        <div className="text-zinc-600 text-[10px] mt-0.5 truncate max-w-48">{e.model}</div>
                      </td>
                      {startEvt?.tasks?.map((taskName) => {
                        const metrics = taskResults[taskName];
                        if (!metrics) return <td key={taskName} className="px-4 py-2.5 text-zinc-600">—</td>;
                        return (
                          <td key={taskName} className="px-4 py-2.5">
                            {Object.entries(metrics)
                              .filter(([k]) => !k.includes("stderr"))
                              .map(([k, v]) => (
                                <div key={k} className="flex gap-1.5 items-baseline">
                                  <span className="text-zinc-500 text-[10px]">{k.replace(",none", "")}</span>
                                  <span className="font-mono font-semibold text-zinc-100">
                                    {typeof v === "number"
                                      ? v < 1 ? (v * 100).toFixed(1) + "%" : v.toFixed(3)
                                      : String(v)}
                                  </span>
                                </div>
                              ))}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
