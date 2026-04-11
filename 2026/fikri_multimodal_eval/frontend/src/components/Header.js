import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Image, AudioLines, FlaskConical } from "lucide-react";
export function Header({ tab, setTab }) {
    return (_jsx("header", { className: "border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-0 z-10", children: _jsxs("div", { className: "max-w-6xl mx-auto px-4 flex items-center justify-between h-14", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(FlaskConical, { className: "w-5 h-5 text-blue-400" }), _jsx("span", { className: "font-semibold text-sm tracking-tight", children: "Multimodal AI Eval" }), _jsx("span", { className: "text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium", children: "PoC" })] }), _jsx("nav", { className: "flex gap-1", children: ["eval", "results"].map((t) => (_jsx("button", { onClick: () => setTab(t), className: `px-3 py-1.5 text-xs rounded-md transition-colors ${tab === t
                            ? "bg-zinc-700 text-white"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"}`, children: t === "eval" ? (_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(Image, { className: "w-3.5 h-3.5" }), "Run Eval"] })) : (_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(AudioLines, { className: "w-3.5 h-3.5" }), "Results"] })) }, t))) })] }) }));
}
