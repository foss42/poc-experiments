import { useEffect, useState } from "react";
import { Image, AudioLines, Play, Square, RefreshCw, CheckCircle, XCircle, GitCompare } from "lucide-react";
import type { ModelList, ProviderConfig } from "../types";
import { useSSE } from "../hooks/useSSE";
import { ProgressView } from "./ProgressView";

interface Props {
  models: ModelList | null;
}

// ─── Benchmark definitions ─────────────────────────────────────────────────

interface Benchmark {
  id: string;
  label: string;          // user-friendly name
  tech: string;           // technical name / task id shown in parens
  description: string;
  metric: string;
  backend: "lm-eval" | "lmms-eval" | "local";
  defaultModel: string;
  defaultTasks: string;   // comma-separated task ids
  modelLabel: string;
  taskOptions: { label: string; value: string }[];
}

const IMAGE_BENCHMARKS: Benchmark[] = [
  {
    id: "mmmu",
    label: "Multidisciplinary Knowledge & Reasoning",
    tech: "MMMU — lm-eval-harness",
    description: "11.5K questions from college exams across 30 subjects: science, medicine, engineering, arts. Tests deep multimodal reasoning.",
    metric: "Accuracy",
    backend: "lm-eval",
    defaultModel: "pretrained=Qwen/Qwen2.5-VL-3B-Instruct",
    defaultTasks: "mmmu_val",
    modelLabel: "VLM model (HuggingFace ID)",
    taskOptions: [
      { label: "Validation split — all subjects (mmmu_val)", value: "mmmu_val" },
      { label: "Pro version — harder questions (mmmu_pro)", value: "mmmu_pro" },
    ],
  },
  {
    id: "scienceqa",
    label: "Science Reasoning with Images",
    tech: "ScienceQA — lm-eval-harness",
    description: "21K K-12 science questions paired with images. Covers natural science, social science, and language. Used by LLaVA and GPT-4V papers.",
    metric: "Accuracy",
    backend: "lm-eval",
    defaultModel: "pretrained=Qwen/Qwen2.5-VL-3B-Instruct",
    defaultTasks: "scienceqa_img",
    modelLabel: "VLM model (HuggingFace ID)",
    taskOptions: [
      { label: "Image subset (scienceqa_img)", value: "scienceqa_img" },
    ],
  },
  {
    id: "textvqa",
    label: "Text Reading in Real-World Images",
    tech: "TextVQA — lm-eval-harness",
    description: "Questions that require reading and reasoning about text in images — street signs, storefronts, product labels. Used by PaLI and Flamingo.",
    metric: "VQA Accuracy",
    backend: "lm-eval",
    defaultModel: "pretrained=Qwen/Qwen2.5-VL-3B-Instruct",
    defaultTasks: "textvqa",
    modelLabel: "VLM model (HuggingFace ID)",
    taskOptions: [
      { label: "Full evaluation set (textvqa)", value: "textvqa" },
    ],
  },
  {
    id: "chartqa",
    label: "Chart & Graph Understanding",
    tech: "ChartQA — lm-eval-harness",
    description: "Questions about bar charts, pie charts, and line graphs. Tests if models can parse visual data representations. Used in GPT-4V and Gemini evals.",
    metric: "Relaxed Accuracy",
    backend: "lm-eval",
    defaultModel: "pretrained=Qwen/Qwen2.5-VL-3B-Instruct",
    defaultTasks: "chartqa",
    modelLabel: "VLM model (HuggingFace ID)",
    taskOptions: [
      { label: "Test set (chartqa)", value: "chartqa" },
    ],
  },
  {
    id: "gqa",
    label: "Compositional Visual Reasoning",
    tech: "GQA — lm-eval-harness",
    description: "Multi-step reasoning questions grounded in scene graphs. Tests spatial relationships, attribute recognition, and object composition. Used by LLaVA.",
    metric: "Accuracy",
    backend: "lm-eval",
    defaultModel: "pretrained=Qwen/Qwen2.5-VL-3B-Instruct",
    defaultTasks: "gqa",
    modelLabel: "VLM model (HuggingFace ID)",
    taskOptions: [
      { label: "Balanced test set (gqa)", value: "gqa" },
    ],
  },
  {
    id: "ollama-local",
    label: "Quick Local Test",
    tech: "Ollama Vision — sample VQA",
    description: "Run your local Ollama vision model on a small built-in VQA dataset. No internet, no GPU cluster needed — ideal for local testing.",
    metric: "ROUGE-L, BLEU",
    backend: "local",
    defaultModel: "llava",
    defaultTasks: "sample",
    modelLabel: "Ollama model name",
    taskOptions: [
      { label: "Built-in sample — 5 image-question pairs", value: "sample" },
    ],
  },
];

const AUDIO_BENCHMARKS: Benchmark[] = [
  {
    id: "librispeech",
    label: "Standard English Speech Recognition",
    tech: "LibriSpeech — lmms-eval",
    description: "1,000 hours of English audiobook speech. The #1 benchmark for ASR quality. Used in every major STT model release — Whisper, wav2vec2, Conformer.",
    metric: "WER (lower is better)",
    backend: "lmms-eval",
    defaultModel: "pretrained=openai/whisper-base",
    defaultTasks: "librispeech",
    modelLabel: "Model (HuggingFace ID)",
    taskOptions: [
      { label: "Clean speech — test-clean (librispeech)", value: "librispeech" },
      { label: "Noisy speech — test-other (librispeech_other)", value: "librispeech_other" },
    ],
  },
  {
    id: "commonvoice",
    label: "Multilingual & Diverse Accents",
    tech: "CommonVoice — lmms-eval",
    description: "Mozilla's crowdsourced dataset across 100+ languages and diverse accents. Used by SeamlessM4T and Whisper large-v3 evaluations.",
    metric: "WER",
    backend: "lmms-eval",
    defaultModel: "pretrained=openai/whisper-base",
    defaultTasks: "common_voice_15_en",
    modelLabel: "Model (HuggingFace ID)",
    taskOptions: [
      { label: "English (common_voice_15_en)", value: "common_voice_15_en" },
      { label: "Arabic (common_voice_15_ar)", value: "common_voice_15_ar" },
      { label: "French (common_voice_15_fr)", value: "common_voice_15_fr" },
    ],
  },
  {
    id: "fleurs",
    label: "Cross-Lingual Speech Understanding (102 Languages)",
    tech: "FLEURS — lmms-eval",
    description: "Google's benchmark across 102 languages for ASR, translation, and retrieval. Used by Gemini and Whisper large model evaluations.",
    metric: "WER / CER",
    backend: "lmms-eval",
    defaultModel: "pretrained=openai/whisper-base",
    defaultTasks: "fleurs_en_us",
    modelLabel: "Model (HuggingFace ID)",
    taskOptions: [
      { label: "English US (fleurs_en_us)", value: "fleurs_en_us" },
      { label: "Arabic (fleurs_ar_eg)", value: "fleurs_ar_eg" },
    ],
  },
  {
    id: "voicebench",
    label: "Spoken Instruction Following",
    tech: "VoiceBench — lmms-eval",
    description: "Tests whether models understand and follow spoken instructions. Covers accents, noisy environments, and specialized vocabulary. Used for LLM voice assistant evaluation.",
    metric: "Accuracy",
    backend: "lmms-eval",
    defaultModel: "pretrained=openai/whisper-base",
    defaultTasks: "voicebench",
    modelLabel: "Model (HuggingFace ID)",
    taskOptions: [
      { label: "Full suite (voicebench)", value: "voicebench" },
    ],
  },
  {
    id: "whisper-local",
    label: "Quick Local Test",
    tech: "Whisper STT — local sample",
    description: "Run local Whisper on a small built-in audio dataset. Scores WER and CER instantly. No downloads required.",
    metric: "WER, CER",
    backend: "local",
    defaultModel: "base",
    defaultTasks: "sample",
    modelLabel: "Whisper model size",
    taskOptions: [
      { label: "Built-in sample — 4 spoken sentences", value: "sample" },
    ],
  },
];

// ─── Component ─────────────────────────────────────────────────────────────

export function EvalPanel({ models }: Props) {
  const [modality, setModality] = useState<"image" | "audio">("image");
  const [benchmark, setBenchmark] = useState<Benchmark>(IMAGE_BENCHMARKS[0]);
  const [model, setModel] = useState(IMAGE_BENCHMARKS[0].defaultModel);
  const [tasks, setTasks] = useState(IMAGE_BENCHMARKS[0].defaultTasks);
  const [lmLimit, setLmLimit] = useState("10");
  const [comparisonMode, setComparisonMode] = useState(false);
  const [providers, setProviders] = useState<ProviderConfig[]>([
    { provider: "ollama", model: "llava" },
    { provider: "ollama", model: "moondream" },
  ]);

  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const { events, running, start, stop } = useSSE();
  const [harnessResult, setHarnessResult] = useState<Record<string, unknown> | null>(null);
  const [harnessRunning, setHarnessRunning] = useState(false);

  // ── Ollama health check ───────────────────────────────────────────────

  const checkOllama = async () => {
    setChecking(true);
    try {
      const r = await fetch("/api/health");
      const d = await r.json();
      setOllamaOk(d.ollama === true);
    } catch {
      setOllamaOk(false);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => { checkOllama(); }, []);

  // ── Modality switch ───────────────────────────────────────────────────

  const switchModality = (m: "image" | "audio") => {
    setModality(m);
    const first = m === "image" ? IMAGE_BENCHMARKS[0] : AUDIO_BENCHMARKS[0];
    setBenchmark(first);
    setModel(first.defaultModel);
    setTasks(first.defaultTasks);
    setHarnessResult(null);
  };

  const selectBenchmark = (b: Benchmark) => {
    setBenchmark(b);
    setModel(b.defaultModel);
    setTasks(b.defaultTasks);
    setHarnessResult(null);
  };

  // ── Run ───────────────────────────────────────────────────────────────

  const runEval = async () => {
    if (benchmark.backend === "local") {
      if (comparisonMode && modality === "image") {
        start("/api/eval/image/compare", { providers });
        return;
      }
      const endpoint = modality === "image" ? "/api/eval/image" : "/api/eval/audio";
      start(endpoint, { model, provider: model.includes("/") ? "huggingface" : "ollama" });
      return;
    }

    setHarnessRunning(true);
    setHarnessResult(null);
    try {
      const resp = await fetch("/api/eval/harness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_type: modality === "image" ? "hf-multimodal" : "hf",
          model_args: model,
          tasks: tasks.split(",").map((t) => t.trim()),
          limit: parseInt(lmLimit) || 10,
        }),
      });
      setHarnessResult(await resp.json());
    } catch (e) {
      setHarnessResult({ error: String(e) });
    } finally {
      setHarnessRunning(false);
    }
  };

  const addProvider = () => {
    setProviders([...providers, { provider: "ollama", model: "llava" }]);
  };

  const removeProvider = (idx: number) => {
    setProviders(providers.filter((_, i) => i !== idx));
  };

  const updateProvider = (idx: number, field: "provider" | "model", value: string) => {
    const updated = [...providers];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === "provider") {
      const defaultModel = value === "huggingface"
        ? "HuggingFaceTB/SmolVLM-256M-Instruct"
        : value === "openai"
        ? "gpt-4o"
        : "llava";
      updated[idx].model = defaultModel;
    }
    setProviders(updated);
  };

  const benchmarks = modality === "image" ? IMAGE_BENCHMARKS : AUDIO_BENCHMARKS;
  const isLocal = benchmark.backend === "local";
  const busy = running || harnessRunning;
  const runDisabled = busy || (benchmark.id === "ollama-local" && ollamaOk === false);

  return (
    <div className="space-y-5 max-w-2xl mx-auto">

      {/* ── Step 1: Modality ── */}
      <Section step={1} title="What type of data do you want to evaluate?">
        <div className="flex gap-3">
          {(["image", "audio"] as const).map((m) => (
            <button
              key={m}
              onClick={() => switchModality(m)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                modality === m
                  ? "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
              }`}
            >
              {m === "image" ? <Image className="w-4 h-4" /> : <AudioLines className="w-4 h-4" />}
              {m === "image" ? "Image" : "Audio"}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Step 2: Benchmark ── */}
      <Section step={2} title="Which benchmark do you want to use?">
        <div className="flex flex-col gap-2">
          {benchmarks.map((b) => (
            <button
              key={b.id}
              onClick={() => selectBenchmark(b)}
              className={`text-left px-4 py-3 rounded-lg border transition-all ${
                benchmark.id === b.id
                  ? "border-blue-500/50 bg-blue-500/10"
                  : "border-zinc-800 bg-zinc-800/30 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className={`text-sm font-medium ${benchmark.id === b.id ? "text-blue-300" : "text-zinc-200"}`}>
                    {benchmark.id === b.id && <span className="mr-1">✓</span>}
                    {b.label}
                  </span>
                  <span className="ml-1.5 text-xs text-zinc-500">({b.tech})</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400 flex-shrink-0 mt-0.5">
                  {b.metric}
                </span>
              </div>
              {benchmark.id === b.id && (
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{b.description}</p>
              )}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Step 3: Tasks & Model ── */}
      <Section step={3} title="Select tasks and configure model">
        <div className="space-y-3">
          {/* Task selector */}
          <label className="block">
            <span className="text-xs text-zinc-400 block mb-1">Tasks</span>
            <select
              value={tasks}
              onChange={(e) => setTasks(e.target.value)}
              className="input"
            >
              {benchmark.taskOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          {/* Model */}
          <label className="block">
            <span className="text-xs text-zinc-400 block mb-1">{benchmark.modelLabel}</span>
            {benchmark.id === "ollama-local" ? (
              <select value={model} onChange={(e) => setModel(e.target.value)} className="input">
                {(models?.ollama?.length
                  ? models.ollama.map((m) => m.name)
                  : ["llava", "llava:13b", "bakllava", "llava-phi3"]
                ).map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            ) : benchmark.id === "whisper-local" ? (
              <select value={model} onChange={(e) => setModel(e.target.value)} className="input">
                {(models?.whisper || ["tiny", "base", "small", "medium"]).map((s) => (
                  <option key={s} value={s}>{s}{s === "base" ? " (default)" : ""}</option>
                ))}
              </select>
            ) : (
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="input"
                placeholder={benchmark.defaultModel}
              />
            )}
          </label>

          {/* Sample limit — only for harness benchmarks */}
          {!isLocal && (
            <label className="block">
              <span className="text-xs text-zinc-400 block mb-1">
                Sample limit per task
                <span className="ml-1 text-zinc-600">(keep small for a quick test)</span>
              </span>
              <input
                type="number"
                value={lmLimit}
                onChange={(e) => setLmLimit(e.target.value)}
                className="input w-28"
              />
            </label>
          )}
        </div>
      </Section>

      {/* ── Comparison mode toggle (image local only) ── */}
      {isLocal && modality === "image" && benchmark.id === "ollama-local" && (
        <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-3">
          <button
            onClick={() => setComparisonMode(!comparisonMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              comparisonMode
                ? "bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/40"
                : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            Compare multiple models
          </button>
          {comparisonMode && (
            <span className="text-xs text-zinc-500">
              Side-by-side ROUGE-L / BLEU / latency comparison
            </span>
          )}
        </div>
      )}

      {/* ── Multi-provider config (comparison mode) ── */}
      {isLocal && comparisonMode && modality === "image" && (
        <Section step={4} title="Select models to compare">
          <div className="space-y-3">
            <p className="text-xs text-zinc-400 mb-2">
              Compare up to 4 vision models side-by-side. Results will show ROUGE-L, BLEU, and latency for each.
            </p>
            
            {providers.map((p, idx) => (
              <div key={idx} className="flex gap-2 items-center bg-zinc-800/50 p-2 rounded-lg">
                <select
                  value={p.provider}
                  onChange={(e) => updateProvider(idx, "provider", e.target.value)}
                  className="input flex-shrink-0 w-32"
                >
                  <option value="ollama">Ollama</option>
                  <option value="lmstudio">LM Studio</option>
                  <option value="huggingface">HuggingFace</option>
                  <option value="openai">OpenAI</option>
                </select>
                
                {p.provider === "ollama" && (
                  <select
                    value={p.model}
                    onChange={(e) => updateProvider(idx, "model", e.target.value)}
                    className="input flex-1"
                  >
                    {(models?.ollama?.length
                      ? models.ollama.map((m) => m.name)
                      : ["llava", "llava:13b", "bakllava", "moondream", "minicpm-v"]
                    ).map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                )}
                
                {p.provider === "lmstudio" && (
                  <input
                    value={p.model}
                    onChange={(e) => updateProvider(idx, "model", e.target.value)}
                    className="input flex-1"
                    placeholder="model-name from LM Studio"
                  />
                )}
                
                {p.provider === "huggingface" && (
                  <input
                    value={p.model}
                    onChange={(e) => updateProvider(idx, "model", e.target.value)}
                    className="input flex-1"
                    placeholder="HuggingFaceTB/SmolVLM-256M-Instruct"
                  />
                )}
                
                {p.provider === "openai" && (
                  <select
                    value={p.model}
                    onChange={(e) => updateProvider(idx, "model", e.target.value)}
                    className="input flex-1"
                  >
                    <option value="gpt-4o">gpt-4o</option>
                    <option value="gpt-4o-mini">gpt-4o-mini</option>
                    <option value="gpt-4-turbo">gpt-4-turbo</option>
                  </select>
                )}
                
                {providers.length > 1 && (
                  <button
                    onClick={() => removeProvider(idx)}
                    className="text-zinc-500 hover:text-red-400 px-1"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            
            {providers.length < 4 && (
              <button
                onClick={addProvider}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                + Add another model
              </button>
            )}
            
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <span className="text-emerald-300 font-medium">Ollama / LM Studio:</span>
                <span className="text-zinc-400 ml-1">Local, no API key</span>
              </div>
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <span className="text-amber-300 font-medium">HuggingFace / OpenAI:</span>
                <span className="text-zinc-400 ml-1">Requires API key</span>
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* ── Provider status + Run ── */}
      <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4">
        <div className="flex items-center gap-4 text-sm">
          {checking
            ? <RefreshCw className="w-4 h-4 animate-spin text-zinc-500" />
            : ollamaOk
            ? <CheckCircle className="w-4 h-4 text-emerald-400" />
            : <XCircle className="w-4 h-4 text-red-400" />}
          <span className={ollamaOk ? "text-zinc-300" : "text-zinc-500"}>
            Ollama {ollamaOk ? "running" : ollamaOk === false ? "not detected" : "checking…"}
          </span>
          <button
            onClick={checkOllama}
            disabled={checking}
            className="text-xs text-zinc-600 hover:text-zinc-400 underline"
          >
            recheck
          </button>
        </div>

        <div className="flex gap-2">
          {isLocal && running && (
            <button
              onClick={stop}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg text-sm"
            >
              <Square className="w-3.5 h-3.5" /> Stop
            </button>
          )}
          <button
            onClick={runEval}
            disabled={runDisabled}
            className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            {busy ? "Running…" : "Run Evaluation"}
          </button>
        </div>
      </div>

      {/* ── Live streaming results (local evals) ── */}
      {isLocal && events.length > 0 && <ProgressView events={events} />}

      {/* ── lm-eval / lmms-eval results ── */}
      {!isLocal && harnessResult && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
          <h3 className="text-sm font-medium text-zinc-300 mb-3">
            Results — {benchmark.label}
            <span className="ml-2 text-xs text-zinc-500">({tasks})</span>
          </h3>
          <pre className="text-xs text-zinc-400 bg-zinc-800 rounded-lg p-4 overflow-auto max-h-96">
            {JSON.stringify(harnessResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Section wrapper ────────────────────────────────────────────────────────

function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-semibold flex items-center justify-center shrink-0">
          {step}
        </span>
        <span className="text-sm font-medium text-zinc-200">{title}</span>
      </div>
      {children}
    </div>
  );
}
