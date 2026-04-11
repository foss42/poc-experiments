import { useEffect, useState } from "react";
import type { HealthStatus, ModelList } from "./types";
import { Header } from "./components/Header";
import { StatusBar } from "./components/StatusBar";
import { EvalPanel } from "./components/EvalPanel";
import { ResultsPanel } from "./components/ResultsPanel";

export default function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [models, setModels] = useState<ModelList | null>(null);
  const [tab, setTab] = useState<"eval" | "results">("eval");

  useEffect(() => {
    fetch("/api/health").then((r) => r.json()).then(setHealth).catch(() => {});
    fetch("/api/models").then((r) => r.json()).then(setModels).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header tab={tab} setTab={setTab} />
      <StatusBar health={health} />
      <main className="max-w-6xl mx-auto px-4 py-6">
        {tab === "eval" ? (
          <EvalPanel models={models} />
        ) : (
          <ResultsPanel />
        )}
      </main>
    </div>
  );
}
