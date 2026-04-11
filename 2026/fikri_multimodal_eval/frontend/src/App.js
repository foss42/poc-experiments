import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Header } from "./components/Header";
import { StatusBar } from "./components/StatusBar";
import { EvalPanel } from "./components/EvalPanel";
import { ResultsPanel } from "./components/ResultsPanel";
export default function App() {
    const [health, setHealth] = useState(null);
    const [models, setModels] = useState(null);
    const [tab, setTab] = useState("eval");
    useEffect(() => {
        fetch("/api/health").then((r) => r.json()).then(setHealth).catch(() => { });
        fetch("/api/models").then((r) => r.json()).then(setModels).catch(() => { });
    }, []);
    return (_jsxs("div", { className: "min-h-screen bg-zinc-950 text-zinc-100", children: [_jsx(Header, { tab: tab, setTab: setTab }), _jsx(StatusBar, { health: health }), _jsx("main", { className: "max-w-6xl mx-auto px-4 py-6", children: tab === "eval" ? (_jsx(EvalPanel, { models: models })) : (_jsx(ResultsPanel, {})) })] }));
}
