import type { HealthStatus } from "../types";

export function StatusBar({ health }: { health: HealthStatus | null }) {
  if (!health) {
    return (
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 text-xs text-zinc-500">
        Connecting to backend…
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex flex-wrap gap-4 text-xs">
      <Dot ok={health.lm_eval} label="lm-eval-harness" />
      <Dot ok={health.lmms_eval} label="lmms-eval" />
      <Dot ok={health.inspect_ai} label="inspect-ai" />
      <Dot ok={health.faster_whisper} label="faster-whisper" />
      <Dot ok={health.ollama} label="Ollama" />
    </div>
  );
}

function Dot({ ok, label }: { ok?: boolean; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-emerald-400" : "bg-zinc-600"}`} />
      <span className={ok ? "text-zinc-300" : "text-zinc-500"}>{label}</span>
    </span>
  );
}
