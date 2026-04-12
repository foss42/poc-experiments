import { useEffect, useState } from "react";
import { RefreshCw, GitCompare, BarChart2 } from "lucide-react";

interface ResultMeta {
  eval_id: string;
  created_at: string;
  eval_type: "single" | "compare";
  tasks: string[];
  models: string[];
  harness: string;
}

function shortModel(m: string) {
  const match = m.match(/pretrained=(?:[^/]+\/)?(.+)/);
  return match ? match[1] : m;
}

export function ResultsPanel() {
  const [results, setResults] = useState<ResultMeta[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = () => {
    setLoading(true);
    fetch("/api/results")
      .then((r) => r.json())
      .then(setResults)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-300">
          Past Evaluations ({results.length})
        </h2>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors text-zinc-300"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {results.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-sm text-zinc-500">
          No evaluations yet. Run one from the Eval tab.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {results.map((r) => (
            <div key={r.eval_id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {r.eval_type === "compare" ? (
                    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30">
                      <GitCompare className="w-2.5 h-2.5" /> Compare
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30">
                      <BarChart2 className="w-2.5 h-2.5" /> Single
                    </span>
                  )}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    {r.harness}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">{r.eval_id}</span>
                </div>
                <span className="text-[10px] text-zinc-600 flex-shrink-0">
                  {new Date(r.created_at).toLocaleString()}
                </span>
              </div>

              <div className="mt-2 space-y-1">
                <div className="text-xs text-zinc-500">
                  <span className="text-zinc-600">Tasks: </span>
                  {r.tasks.join(", ")}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {r.models.map((m) => (
                    <span
                      key={m}
                      className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 truncate max-w-xs"
                      title={m}
                    >
                      {shortModel(m)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
