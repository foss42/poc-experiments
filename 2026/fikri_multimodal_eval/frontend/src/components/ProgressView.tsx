import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { SSEEvent, EvalSample, ComparisonSummary } from "../types";

export function ProgressView({ events }: { events: SSEEvent[] }) {
  const startEvt = events.find((e) => e.type === "start");
  const progressEvents = events.filter((e) => e.type === "progress");
  const completeEvt = events.find((e) => e.type === "complete") as (SSEEvent & {
    comparison?: boolean;
    summaries?: Record<string, ComparisonSummary>;
    results?: EvalSample[] | Record<string, EvalSample[]>;
  }) | undefined;
  const errorEvt = events.find((e) => e.type === "error");

  const total = startEvt?.total || 0;
  const current = progressEvents.length;
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  const isComparison = completeEvt?.comparison === true;

  return (
    <div className="space-y-4">
      {!completeEvt && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
          <div className="flex justify-between text-xs text-zinc-400 mb-2">
            <span>
              {isComparison ? "Comparison" : startEvt?.modality} —{" "}
              {isComparison
                ? (startEvt?.providers as string[])?.join(" vs ")
                : startEvt?.model}
            </span>
            <span>
              {current}/{total} ({pct}%)
            </span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                isComparison ? "bg-purple-500" : "bg-blue-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {errorEvt && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-sm text-red-300">
          {errorEvt.message}
        </div>
      )}

      {completeEvt && (
        <div className="space-y-4">
          {isComparison && completeEvt.summaries && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
              <h3 className="text-sm font-medium text-purple-300 mb-3">
                Model Comparison Results
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(completeEvt.summaries).map(([key, summary]) => (
                  <div
                    key={key}
                    className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-700"
                  >
                    <div className="text-xs text-zinc-400 mb-1 truncate" title={key}>
                      {key}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-zinc-500">ROUGE</span>
                        <div className="text-blue-300 font-mono">
                          {summary.avg_rouge_l.toFixed(3)}
                        </div>
                      </div>
                      <div>
                        <span className="text-zinc-500">BLEU</span>
                        <div className="text-emerald-300 font-mono">
                          {summary.avg_bleu.toFixed(3)}
                        </div>
                      </div>
                      <div>
                        <span className="text-zinc-500">Latency</span>
                        <div className="text-amber-300 font-mono">
                          {summary.avg_latency_ms.toFixed(0)}ms
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isComparison && completeEvt.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(completeEvt.summary).map(([k, v]) => (
                <div
                  key={k}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg p-3"
                >
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                    {k.replace(/_/g, " ")}
                  </div>
                  <div className="text-lg font-semibold text-zinc-100 mt-1">
                    {typeof v === "number" ? v.toFixed(4) : String(v)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isComparison && Array.isArray(completeEvt.results) && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-sm font-medium text-zinc-300 mb-4">
                Per-Sample Metrics
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={completeEvt.results}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="sample_id"
                      tick={{ fill: "#888", fontSize: 11 }}
                      label={{
                        value: "Sample",
                        position: "insideBottom",
                        offset: -2,
                        fill: "#888",
                        fontSize: 11,
                      }}
                    />
                    <YAxis tick={{ fill: "#888", fontSize: 11 }} domain={[0, 1]} />
                    <Tooltip
                      contentStyle={{
                        background: "#1e1e1e",
                        border: "1px solid #333",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {completeEvt.summary?.modality === "image" ? (
                      <>
                        <Bar dataKey="rouge_l" fill="#3b82f6" name="ROUGE-L" />
                        <Bar dataKey="bleu" fill="#10b981" name="BLEU" />
                      </>
                    ) : (
                      <>
                        <Bar dataKey="wer" fill="#f59e0b" name="WER" />
                        <Bar dataKey="cer" fill="#ef4444" name="CER" />
                      </>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {isComparison &&
            completeEvt.results &&
            typeof completeEvt.results === "object" &&
            !Array.isArray(completeEvt.results) && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <h3 className="text-sm font-medium text-zinc-300 mb-4">
                  Side-by-Side Comparison
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={(() => {
                        const providerKeys = Object.keys(completeEvt.results);
                        if (!providerKeys.length) return [];
                        const firstProviderResults = completeEvt.results[
                          providerKeys[0]
                        ] as EvalSample[];
                        const sampleCount = firstProviderResults?.length || 0;
                        return Array.from({ length: sampleCount }, (_, i) => {
                          const row: Record<string, number | string> = {
                            sample: i + 1,
                          };
                          providerKeys.forEach((pk) => {
                            const providerResults = completeEvt.results![
                              pk
                            ] as EvalSample[];
                            const r = providerResults?.[i];
                            if (r) {
                              const label = pk.split(":")[1] || pk;
                              row[`${label}_rouge`] = r.rouge_l as number;
                              row[`${label}_bleu`] = r.bleu as number;
                            }
                          });
                          return row;
                        });
                      })()}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis
                        dataKey="sample"
                        tick={{ fill: "#888", fontSize: 11 }}
                      />
                      <YAxis
                        tick={{ fill: "#888", fontSize: 11 }}
                        domain={[0, 1]}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#1e1e1e",
                          border: "1px solid #333",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {Object.keys(completeEvt.results).flatMap((pk) => {
                        const label = pk.split(":")[1] || pk;
                        return [
                          <Bar
                            key={`${pk}_rouge`}
                            dataKey={`${label}_rouge`}
                            fill="#3b82f6"
                            name={`${label} ROUGE-L`}
                          />,
                          <Bar
                            key={`${pk}_bleu`}
                            dataKey={`${label}_bleu`}
                            fill="#10b981"
                            name={`${label} BLEU`}
                          />,
                        ];
                      })}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

          {!isComparison && Array.isArray(completeEvt.results) && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500">
                      <th className="px-4 py-2 text-left">#</th>
                      {completeEvt.summary?.modality === "image" ? (
                        <>
                          <th className="px-4 py-2 text-left">Question</th>
                          <th className="px-4 py-2 text-left">Expected</th>
                          <th className="px-4 py-2 text-left">Predicted</th>
                          <th className="px-4 py-2 text-right">ROUGE-L</th>
                          <th className="px-4 py-2 text-right">BLEU</th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-2 text-left">Reference</th>
                          <th className="px-4 py-2 text-left">Predicted</th>
                          <th className="px-4 py-2 text-right">WER</th>
                          <th className="px-4 py-2 text-right">CER</th>
                        </>
                      )}
                      <th className="px-4 py-2 text-right">Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completeEvt.results.map((r, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-zinc-800/50 hover:bg-zinc-800/50"
                      >
                        <td className="px-4 py-2 text-zinc-500">
                          {r.sample_id}
                        </td>
                        {completeEvt.summary?.modality === "image" ? (
                          <>
                            <td className="px-4 py-2 text-zinc-300 max-w-48 truncate">
                              {r.question as string}
                            </td>
                            <td className="px-4 py-2 text-zinc-400">
                              {r.expected as string}
                            </td>
                            <td className="px-4 py-2 text-zinc-200 max-w-48 truncate">
                              {r.predicted as string}
                            </td>
                            <td className="px-4 py-2 text-right font-mono text-blue-300">
                              {(r.rouge_l as number).toFixed(3)}
                            </td>
                            <td className="px-4 py-2 text-right font-mono text-emerald-300">
                              {(r.bleu as number).toFixed(3)}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-2 text-zinc-400">
                              {r.reference as string}
                            </td>
                            <td className="px-4 py-2 text-zinc-200">
                              {r.predicted as string}
                            </td>
                            <td className="px-4 py-2 text-right font-mono text-amber-300">
                              {(r.wer as number).toFixed(3)}
                            </td>
                            <td className="px-4 py-2 text-right font-mono text-red-300">
                              {(r.cer as number).toFixed(3)}
                            </td>
                          </>
                        )}
                        <td className="px-4 py-2 text-right font-mono text-zinc-400">
                          {(r.latency_ms as number).toFixed(0)}ms
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
