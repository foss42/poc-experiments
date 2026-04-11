import type { HealthStatus } from "../types";

export function StatusBar({ health }: { health: HealthStatus | null }) {
  if (!health) {
    return (
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 text-xs text-zinc-500">
        Connecting to backend...
      </div>
    );
  }

  const providers = health.providers || {};

  return (
    <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex flex-wrap gap-4 text-xs">
      <Dot ok={providers.ollama} label="Ollama" />
      <Dot ok={providers.lmstudio} label="LM Studio" />
      <Dot ok={providers.huggingface} label="HuggingFace" />
      <Dot ok={providers.openai} label="OpenAI" />
      <Dot ok={health.whisper} label="Whisper" />
    </div>
  );
}

function Dot({ ok, label }: { ok?: boolean; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-emerald-400" : "bg-zinc-600"}`}
      />
      <span className={ok ? "text-zinc-300" : "text-zinc-500"}>{label}</span>
    </span>
  );
}
