import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, } from "recharts";
export function ProgressView({ events }) {
    const startEvt = events.find((e) => e.type === "start");
    const progressEvents = events.filter((e) => e.type === "progress");
    const completeEvt = events.find((e) => e.type === "complete");
    const errorEvt = events.find((e) => e.type === "error");
    const total = startEvt?.total || 0;
    const current = progressEvents.length;
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    const isComparison = completeEvt?.comparison === true;
    return (_jsxs("div", { className: "space-y-4", children: [!completeEvt && (_jsxs("div", { className: "bg-zinc-900 rounded-xl border border-zinc-800 p-5", children: [_jsxs("div", { className: "flex justify-between text-xs text-zinc-400 mb-2", children: [_jsxs("span", { children: [isComparison ? "Comparison" : startEvt?.modality, " \u2014", " ", isComparison
                                        ? startEvt?.providers?.join(" vs ")
                                        : startEvt?.model] }), _jsxs("span", { children: [current, "/", total, " (", pct, "%)"] })] }), _jsx("div", { className: "h-2 bg-zinc-800 rounded-full overflow-hidden", children: _jsx("div", { className: `h-full transition-all duration-300 rounded-full ${isComparison ? "bg-purple-500" : "bg-blue-500"}`, style: { width: `${pct}%` } }) })] })), errorEvt && (_jsx("div", { className: "bg-red-900/20 border border-red-800 rounded-xl p-4 text-sm text-red-300", children: errorEvt.message })), completeEvt && (_jsxs("div", { className: "space-y-4", children: [isComparison && completeEvt.summaries && (_jsxs("div", { className: "bg-purple-500/10 border border-purple-500/30 rounded-xl p-4", children: [_jsx("h3", { className: "text-sm font-medium text-purple-300 mb-3", children: "Model Comparison Results" }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3", children: Object.entries(completeEvt.summaries).map(([key, summary]) => (_jsxs("div", { className: "bg-zinc-900/50 rounded-lg p-3 border border-zinc-700", children: [_jsx("div", { className: "text-xs text-zinc-400 mb-1 truncate", title: key, children: key }), _jsxs("div", { className: "grid grid-cols-3 gap-2 text-xs", children: [_jsxs("div", { children: [_jsx("span", { className: "text-zinc-500", children: "ROUGE" }), _jsx("div", { className: "text-blue-300 font-mono", children: summary.avg_rouge_l.toFixed(3) })] }), _jsxs("div", { children: [_jsx("span", { className: "text-zinc-500", children: "BLEU" }), _jsx("div", { className: "text-emerald-300 font-mono", children: summary.avg_bleu.toFixed(3) })] }), _jsxs("div", { children: [_jsx("span", { className: "text-zinc-500", children: "Latency" }), _jsxs("div", { className: "text-amber-300 font-mono", children: [summary.avg_latency_ms.toFixed(0), "ms"] })] })] })] }, key))) })] })), !isComparison && completeEvt.summary && (_jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3", children: Object.entries(completeEvt.summary).map(([k, v]) => (_jsxs("div", { className: "bg-zinc-900 border border-zinc-800 rounded-lg p-3", children: [_jsx("div", { className: "text-[10px] uppercase tracking-wider text-zinc-500", children: k.replace(/_/g, " ") }), _jsx("div", { className: "text-lg font-semibold text-zinc-100 mt-1", children: typeof v === "number" ? v.toFixed(4) : String(v) })] }, k))) })), !isComparison && Array.isArray(completeEvt.results) && (_jsxs("div", { className: "bg-zinc-900 border border-zinc-800 rounded-xl p-5", children: [_jsx("h3", { className: "text-sm font-medium text-zinc-300 mb-4", children: "Per-Sample Metrics" }), _jsx("div", { className: "h-64", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: completeEvt.results, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#333" }), _jsx(XAxis, { dataKey: "sample_id", tick: { fill: "#888", fontSize: 11 }, label: {
                                                    value: "Sample",
                                                    position: "insideBottom",
                                                    offset: -2,
                                                    fill: "#888",
                                                    fontSize: 11,
                                                } }), _jsx(YAxis, { tick: { fill: "#888", fontSize: 11 }, domain: [0, 1] }), _jsx(Tooltip, { contentStyle: {
                                                    background: "#1e1e1e",
                                                    border: "1px solid #333",
                                                    borderRadius: 8,
                                                    fontSize: 12,
                                                } }), _jsx(Legend, { wrapperStyle: { fontSize: 11 } }), completeEvt.summary?.modality === "image" ? (_jsxs(_Fragment, { children: [_jsx(Bar, { dataKey: "rouge_l", fill: "#3b82f6", name: "ROUGE-L" }), _jsx(Bar, { dataKey: "bleu", fill: "#10b981", name: "BLEU" })] })) : (_jsxs(_Fragment, { children: [_jsx(Bar, { dataKey: "wer", fill: "#f59e0b", name: "WER" }), _jsx(Bar, { dataKey: "cer", fill: "#ef4444", name: "CER" })] }))] }) }) })] })), isComparison &&
                        completeEvt.results &&
                        typeof completeEvt.results === "object" &&
                        !Array.isArray(completeEvt.results) && (_jsxs("div", { className: "bg-zinc-900 border border-zinc-800 rounded-xl p-5", children: [_jsx("h3", { className: "text-sm font-medium text-zinc-300 mb-4", children: "Side-by-Side Comparison" }), _jsx("div", { className: "h-72", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: (() => {
                                            const providerKeys = Object.keys(completeEvt.results);
                                            if (!providerKeys.length)
                                                return [];
                                            const firstProviderResults = completeEvt.results[providerKeys[0]];
                                            const sampleCount = firstProviderResults?.length || 0;
                                            return Array.from({ length: sampleCount }, (_, i) => {
                                                const row = {
                                                    sample: i + 1,
                                                };
                                                providerKeys.forEach((pk) => {
                                                    const providerResults = completeEvt.results[pk];
                                                    const r = providerResults?.[i];
                                                    if (r) {
                                                        const label = pk.split(":")[1] || pk;
                                                        row[`${label}_rouge`] = r.rouge_l;
                                                        row[`${label}_bleu`] = r.bleu;
                                                    }
                                                });
                                                return row;
                                            });
                                        })(), children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#333" }), _jsx(XAxis, { dataKey: "sample", tick: { fill: "#888", fontSize: 11 } }), _jsx(YAxis, { tick: { fill: "#888", fontSize: 11 }, domain: [0, 1] }), _jsx(Tooltip, { contentStyle: {
                                                    background: "#1e1e1e",
                                                    border: "1px solid #333",
                                                    borderRadius: 8,
                                                    fontSize: 12,
                                                } }), _jsx(Legend, { wrapperStyle: { fontSize: 11 } }), Object.keys(completeEvt.results).flatMap((pk) => {
                                                const label = pk.split(":")[1] || pk;
                                                return [
                                                    _jsx(Bar, { dataKey: `${label}_rouge`, fill: "#3b82f6", name: `${label} ROUGE-L` }, `${pk}_rouge`),
                                                    _jsx(Bar, { dataKey: `${label}_bleu`, fill: "#10b981", name: `${label} BLEU` }, `${pk}_bleu`),
                                                ];
                                            })] }) }) })] })), !isComparison && Array.isArray(completeEvt.results) && (_jsx("div", { className: "bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-xs", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-zinc-800 text-zinc-500", children: [_jsx("th", { className: "px-4 py-2 text-left", children: "#" }), completeEvt.summary?.modality === "image" ? (_jsxs(_Fragment, { children: [_jsx("th", { className: "px-4 py-2 text-left", children: "Question" }), _jsx("th", { className: "px-4 py-2 text-left", children: "Expected" }), _jsx("th", { className: "px-4 py-2 text-left", children: "Predicted" }), _jsx("th", { className: "px-4 py-2 text-right", children: "ROUGE-L" }), _jsx("th", { className: "px-4 py-2 text-right", children: "BLEU" })] })) : (_jsxs(_Fragment, { children: [_jsx("th", { className: "px-4 py-2 text-left", children: "Reference" }), _jsx("th", { className: "px-4 py-2 text-left", children: "Predicted" }), _jsx("th", { className: "px-4 py-2 text-right", children: "WER" }), _jsx("th", { className: "px-4 py-2 text-right", children: "CER" })] })), _jsx("th", { className: "px-4 py-2 text-right", children: "Latency" })] }) }), _jsx("tbody", { children: completeEvt.results.map((r, idx) => (_jsxs("tr", { className: "border-b border-zinc-800/50 hover:bg-zinc-800/50", children: [_jsx("td", { className: "px-4 py-2 text-zinc-500", children: r.sample_id }), completeEvt.summary?.modality === "image" ? (_jsxs(_Fragment, { children: [_jsx("td", { className: "px-4 py-2 text-zinc-300 max-w-48 truncate", children: r.question }), _jsx("td", { className: "px-4 py-2 text-zinc-400", children: r.expected }), _jsx("td", { className: "px-4 py-2 text-zinc-200 max-w-48 truncate", children: r.predicted }), _jsx("td", { className: "px-4 py-2 text-right font-mono text-blue-300", children: r.rouge_l.toFixed(3) }), _jsx("td", { className: "px-4 py-2 text-right font-mono text-emerald-300", children: r.bleu.toFixed(3) })] })) : (_jsxs(_Fragment, { children: [_jsx("td", { className: "px-4 py-2 text-zinc-400", children: r.reference }), _jsx("td", { className: "px-4 py-2 text-zinc-200", children: r.predicted }), _jsx("td", { className: "px-4 py-2 text-right font-mono text-amber-300", children: r.wer.toFixed(3) }), _jsx("td", { className: "px-4 py-2 text-right font-mono text-red-300", children: r.cer.toFixed(3) })] })), _jsxs("td", { className: "px-4 py-2 text-right font-mono text-zinc-400", children: [r.latency_ms.toFixed(0), "ms"] })] }, idx))) })] }) }) }))] }))] }));
}
