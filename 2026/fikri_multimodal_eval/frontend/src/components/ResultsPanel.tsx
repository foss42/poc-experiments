import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

export function ResultsPanel() {
  const [results, setResults] = useState<Record<string, Record<string, unknown>>>({});
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

  const entries = Object.entries(results);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-300">
          Past Evaluations ({entries.length})
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

      {entries.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-sm text-zinc-500">
          No evaluations yet. Run one from the Eval tab.
        </div>
      ) : (
        <div className="grid gap-3">
          {entries.map(([id, summary]) => (
            <div
              key={id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-mono text-zinc-500">{id}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  {String(summary.modality || "harness")}
                </span>
                <span className="text-xs text-zinc-400">
                  {String(summary.model || "")}
                </span>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {Object.entries(summary)
                  .filter(([k]) => !["model", "modality"].includes(k))
                  .map(([k, v]) => (
                    <div key={k}>
                      <div className="text-[10px] uppercase text-zinc-600">
                        {k.replace(/_/g, " ")}
                      </div>
                      <div className="text-sm font-mono text-zinc-200">
                        {typeof v === "number" ? v.toFixed(4) : JSON.stringify(v)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
