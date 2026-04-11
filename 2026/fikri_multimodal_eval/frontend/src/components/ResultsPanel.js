import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
export function ResultsPanel() {
    const [results, setResults] = useState({});
    const [loading, setLoading] = useState(false);
    const refresh = () => {
        setLoading(true);
        fetch("/api/results")
            .then((r) => r.json())
            .then(setResults)
            .catch(() => { })
            .finally(() => setLoading(false));
    };
    useEffect(refresh, []);
    const entries = Object.entries(results);
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("h2", { className: "text-sm font-medium text-zinc-300", children: ["Past Evaluations (", entries.length, ")"] }), _jsxs("button", { onClick: refresh, disabled: loading, className: "flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors text-zinc-300", children: [_jsx(RefreshCw, { className: `w-3 h-3 ${loading ? "animate-spin" : ""}` }), "Refresh"] })] }), entries.length === 0 ? (_jsx("div", { className: "bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-sm text-zinc-500", children: "No evaluations yet. Run one from the Eval tab." })) : (_jsx("div", { className: "grid gap-3", children: entries.map(([id, summary]) => (_jsxs("div", { className: "bg-zinc-900 border border-zinc-800 rounded-xl p-4", children: [_jsxs("div", { className: "flex items-center gap-3 mb-2", children: [_jsx("span", { className: "text-xs font-mono text-zinc-500", children: id }), _jsx("span", { className: "text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300", children: String(summary.modality || "harness") }), _jsx("span", { className: "text-xs text-zinc-400", children: String(summary.model || "") })] }), _jsx("div", { className: "grid grid-cols-3 md:grid-cols-5 gap-2", children: Object.entries(summary)
                                .filter(([k]) => !["model", "modality"].includes(k))
                                .map(([k, v]) => (_jsxs("div", { children: [_jsx("div", { className: "text-[10px] uppercase text-zinc-600", children: k.replace(/_/g, " ") }), _jsx("div", { className: "text-sm font-mono text-zinc-200", children: typeof v === "number" ? v.toFixed(4) : JSON.stringify(v) })] }, k))) })] }, id))) }))] }));
}
