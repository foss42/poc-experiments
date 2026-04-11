import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function StatusBar({ health }) {
    if (!health) {
        return (_jsx("div", { className: "bg-zinc-900 border-b border-zinc-800 px-4 py-2 text-xs text-zinc-500", children: "Connecting to backend..." }));
    }
    const providers = health.providers || {};
    return (_jsxs("div", { className: "bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex flex-wrap gap-4 text-xs", children: [_jsx(Dot, { ok: providers.ollama, label: "Ollama" }), _jsx(Dot, { ok: providers.lmstudio, label: "LM Studio" }), _jsx(Dot, { ok: providers.huggingface, label: "HuggingFace" }), _jsx(Dot, { ok: providers.openai, label: "OpenAI" }), _jsx(Dot, { ok: health.whisper, label: "Whisper" })] }));
}
function Dot({ ok, label }) {
    return (_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: `w-1.5 h-1.5 rounded-full ${ok ? "bg-emerald-400" : "bg-zinc-600"}` }), _jsx("span", { className: ok ? "text-zinc-300" : "text-zinc-500", children: label })] }));
}
