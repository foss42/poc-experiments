import { Image, AudioLines, FlaskConical } from "lucide-react";

interface Props {
  tab: "eval" | "results";
  setTab: (t: "eval" | "results") => void;
}

export function Header({ tab, setTab }: Props) {
  return (
    <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-blue-400" />
          <span className="font-semibold text-sm tracking-tight">
            Multimodal AI Eval
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium">
            PoC
          </span>
        </div>
        <nav className="flex gap-1">
          {(["eval", "results"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                tab === t
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              {t === "eval" ? (
                <span className="flex items-center gap-1.5">
                  <Image className="w-3.5 h-3.5" />
                  Run Eval
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <AudioLines className="w-3.5 h-3.5" />
                  Results
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
