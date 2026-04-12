import { useState } from "react";
import { Image, AudioLines, Bot, Play, Square, Plus, X, ChevronDown, ChevronRight } from "lucide-react";
import type { ModelList, TrajectoryMessage } from "../types";
import { useSSE } from "../hooks/useSSE";
import { ProgressView } from "./ProgressView";

interface Props {
  models: ModelList | null;
}

// ─── Benchmark definitions ─────────────────────────────────────────────────

type Harness = "lm-eval" | "lmms-eval" | "inspect-ai" | "faster-whisper";
type Provider = "huggingface" | "ollama";

interface Benchmark {
  id: string;
  label: string;
  tech: string;
  description: string;
  metric: string;
  harness: Harness;
  modelType: string;
  defaultModel: string;
  defaultModelOllama?: string;   // alternate default when provider=ollama
  defaultTasks: string;
  taskOptions: { label: string; value: string }[];
}

const IMAGE_BENCHMARKS: Benchmark[] = [
  {
    id: "mmmu",
    label: "Multidisciplinary Knowledge & Reasoning",
    tech: "MMMU — lm-eval-harness",
    description: "11.5K questions from college exams across 30 subjects: science, medicine, engineering, arts. Tests deep multimodal reasoning. Used by GPT-4V, LLaVA, Gemini evals.",
    metric: "Accuracy",
    harness: "lm-eval",
    modelType: "hf-multimodal",
    defaultModel: "pretrained=Qwen/Qwen2.5-VL-3B-Instruct",
    defaultModelOllama: "llava-phi3",
    defaultTasks: "mmmu_val",
    taskOptions: [
      { label: "Validation split — all 30 subjects (mmmu_val)", value: "mmmu_val" },
      { label: "Pro version — harder questions (mmmu_pro)", value: "mmmu_pro" },
    ],
  },
  {
    id: "scienceqa",
    label: "Science Reasoning with Images",
    tech: "ScienceQA — lm-eval-harness",
    description: "21K K-12 science questions paired with images. Covers natural science, social science, and language. Benchmark used in the original LLaVA and GPT-4V papers.",
    metric: "Accuracy",
    harness: "lm-eval",
    modelType: "hf-multimodal",
    defaultModel: "pretrained=Qwen/Qwen2.5-VL-3B-Instruct",
    defaultModelOllama: "llava-phi3",
    defaultTasks: "scienceqa_img",
    taskOptions: [
      { label: "Image-paired questions (scienceqa_img)", value: "scienceqa_img" },
    ],
  },
  {
    id: "textvqa",
    label: "Text Reading in Real-World Images",
    tech: "TextVQA — lm-eval-harness",
    description: "Questions requiring reading and reasoning about text in images — street signs, storefronts, labels. Used by PaLI, Flamingo, and GPT-4V evals.",
    metric: "VQA Accuracy",
    harness: "lm-eval",
    modelType: "hf-multimodal",
    defaultModel: "pretrained=Qwen/Qwen2.5-VL-3B-Instruct",
    defaultModelOllama: "llava-phi3",
    defaultTasks: "textvqa",
    taskOptions: [
      { label: "Full evaluation set (textvqa)", value: "textvqa" },
    ],
  },
  {
    id: "chartqa",
    label: "Chart & Graph Understanding",
    tech: "ChartQA — lm-eval-harness",
    description: "Questions about bar charts, pie charts, and line graphs. Tests visual data parsing. Featured in GPT-4V, Gemini, and InternVL evaluation reports.",
    metric: "Relaxed Accuracy",
    harness: "lm-eval",
    modelType: "hf-multimodal",
    defaultModel: "pretrained=Qwen/Qwen2.5-VL-3B-Instruct",
    defaultModelOllama: "llava-phi3",
    defaultTasks: "chartqa",
    taskOptions: [
      { label: "Test set (chartqa)", value: "chartqa" },
    ],
  },
  {
    id: "gqa",
    label: "Compositional Visual Reasoning",
    tech: "GQA — lm-eval-harness",
    description: "Multi-step reasoning grounded in scene graphs. Tests spatial relationships, attributes, and object composition. Standard benchmark in LLaVA and BLIP-2 papers.",
    metric: "Accuracy",
    harness: "lm-eval",
    modelType: "hf-multimodal",
    defaultModel: "pretrained=Qwen/Qwen2.5-VL-3B-Instruct",
    defaultModelOllama: "llava-phi3",
    defaultTasks: "gqa",
    taskOptions: [
      { label: "Balanced test set (gqa)", value: "gqa" },
    ],
  },
];

const AUDIO_BENCHMARKS: Benchmark[] = [
  {
    id: "librispeech",
    label: "Standard English Speech Recognition",
    tech: "LibriSpeech — lmms-eval",
    description: "1,000 hours of English audiobook speech. The gold-standard ASR benchmark. Used in every major STT release — Whisper, wav2vec2, Conformer, SeamlessM4T.",
    metric: "WER ↓",
    harness: "lmms-eval",
    modelType: "hf",
    defaultModel: "pretrained=openai/whisper-base",
    defaultTasks: "librispeech",
    taskOptions: [
      { label: "Clean speech — test-clean (librispeech)", value: "librispeech" },
      { label: "Noisy speech — test-other (librispeech_other)", value: "librispeech_other" },
    ],
  },
  {
    id: "librispeech-fw",
    label: "LibriSpeech — faster-whisper (INT8, CUDA→CPU fallback)",
    tech: "LibriSpeech — faster-whisper",
    description: "Same LibriSpeech benchmark but driven by faster-whisper (CTranslate2/INT8) instead of HuggingFace. Runs 4× faster, uses <300 MB VRAM, and automatically falls back from CUDA to CPU. Enter just the model size: base, small, medium, large-v3.",
    metric: "WER ↓ / Accuracy ↑",
    harness: "faster-whisper",
    modelType: "faster-whisper",
    defaultModel: "base",
    defaultTasks: "librispeech",
    taskOptions: [
      { label: "Clean speech — test-clean (librispeech)", value: "librispeech" },
      { label: "Noisy speech — test-other (librispeech_other)", value: "librispeech_other" },
    ],
  },
  {
    id: "commonvoice",
    label: "Multilingual & Diverse Accents",
    tech: "CommonVoice — lmms-eval",
    description: "Mozilla's crowd-sourced dataset across 100+ languages with diverse accents. Used in SeamlessM4T and Whisper large-v3 evaluation reports.",
    metric: "WER ↓",
    harness: "lmms-eval",
    modelType: "hf",
    defaultModel: "pretrained=openai/whisper-base",
    defaultTasks: "common_voice_15_en",
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
    description: "Google's benchmark covering 102 languages for ASR, translation, and retrieval. Used in Gemini, Whisper large-v3, and USM evaluation papers.",
    metric: "WER / CER ↓",
    harness: "lmms-eval",
    modelType: "hf",
    defaultModel: "pretrained=openai/whisper-base",
    defaultTasks: "fleurs_en_us",
    taskOptions: [
      { label: "English US (fleurs_en_us)", value: "fleurs_en_us" },
      { label: "Arabic (fleurs_ar_eg)", value: "fleurs_ar_eg" },
    ],
  },
  {
    id: "voicebench",
    label: "Spoken Instruction Following",
    tech: "VoiceBench — lmms-eval",
    description: "Tests model ability to understand and follow spoken instructions across accents, noisy environments, and specialized vocabulary. Used for LLM voice-assistant evaluation.",
    metric: "Accuracy",
    harness: "lmms-eval",
    modelType: "hf",
    defaultModel: "pretrained=openai/whisper-base",
    defaultTasks: "voicebench",
    taskOptions: [
      { label: "Full suite (voicebench)", value: "voicebench" },
    ],
  },
];

const AGENT_BENCHMARKS: Benchmark[] = [
  {
    id: "basic_agent",
    label: "Math Tool-Use Agent",
    tech: "basic_agent — inspect-ai",
    description: "3-sample math benchmark that tests whether an Ollama model correctly invokes a calculator tool for arithmetic. Verifies tool selection, argument construction, and answer extraction. Returns step-by-step trajectory of every agent message.",
    metric: "Accuracy",
    harness: "inspect-ai",
    modelType: "",
    defaultModel: "qwen2.5:1.5b",
    defaultTasks: "basic_agent",
    taskOptions: [
      { label: "Math tool-use — 3 samples (basic_agent)", value: "basic_agent" },
    ],
  },
];

// ─── Component ─────────────────────────────────────────────────────────────

type Modality = "image" | "audio" | "agent";

export function EvalPanel({ models }: Props) {
  const [modality, setModality] = useState<Modality>("image");
  const [benchmark, setBenchmark] = useState<Benchmark>(IMAGE_BENCHMARKS[0]);
  const [tasks, setTasks] = useState(IMAGE_BENCHMARKS[0].defaultTasks);
  const [provider, setProvider] = useState<Provider>("huggingface");

  // Multi-model list — 1 model = single eval, 2+ = comparison
  const [modelList, setModelList] = useState<string[]>([IMAGE_BENCHMARKS[0].defaultModel]);
  const [lmLimit, setLmLimit] = useState("10");

  const { events, running, start, stop } = useSSE();
  const [singleResult, setSingleResult] = useState<Record<string, unknown> | null>(null);
  const [singleRunning, setSingleRunning] = useState(false);

  // ── Modality / benchmark switch ───────────────────────────────────────

  const switchModality = (m: Modality) => {
    setModality(m);
    const benchmarks = m === "image" ? IMAGE_BENCHMARKS : m === "audio" ? AUDIO_BENCHMARKS : AGENT_BENCHMARKS;
    const first = benchmarks[0];
    setBenchmark(first);
    setTasks(first.defaultTasks);
    setProvider("huggingface");
    setModelList([first.defaultModel]);
    setSingleResult(null);
  };

  const selectBenchmark = (b: Benchmark) => {
    setBenchmark(b);
    setTasks(b.defaultTasks);
    setProvider("huggingface");
    setModelList([b.defaultModel]);
    setSingleResult(null);
  };

  const switchProvider = (p: Provider) => {
    setProvider(p);
    const defaultM = p === "ollama" ? (benchmark.defaultModelOllama ?? benchmark.defaultModel) : benchmark.defaultModel;
    setModelList([defaultM]);
    setSingleResult(null);
  };

  // ── Model list management ─────────────────────────────────────────────

  const addModel = () => {
    setModelList([...modelList, benchmark.defaultModel]);
  };

  const removeModel = (idx: number) => {
    setModelList(modelList.filter((_, i) => i !== idx));
  };

  const updateModel = (idx: number, value: string) => {
    const updated = [...modelList];
    updated[idx] = value;
    setModelList(updated);
  };

  const isAgentBenchmark = benchmark.harness === "inspect-ai";
  const isFasterWhisper = benchmark.harness === "faster-whisper";
  const isComparison = modelList.length >= 2 && !isAgentBenchmark;
  const busy = running || singleRunning;

  const defaultLimit = isAgentBenchmark ? "5" : "10";

  // ── Suggested models ─────────────────────────────────────────────────

  const suggestedModels = (): string[] => {
    if (isAgentBenchmark) return models?.agent ?? [];
    if (isFasterWhisper) return models?.faster_whisper_sizes ?? [];
    if (modality === "image") {
      return provider === "ollama" ? (models?.ollama_vlm ?? []) : (models?.image_vlm ?? []);
    }
    return models?.audio_asr ?? [];
  };

  // ── Run ───────────────────────────────────────────────────────────────

  const runEval = async () => {
    const taskList = tasks.split(",").map((t) => t.trim());

    // Agent eval — always single model, always uses Ollama via inspect-ai
    if (isAgentBenchmark) {
      setSingleRunning(true);
      setSingleResult(null);
      try {
        const resp = await fetch("/api/eval/harness", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model_type: "",
            model_args: modelList[0],
            tasks: taskList,
            limit: parseInt(lmLimit || defaultLimit) || 5,
            harness: "inspect-ai",
            provider: "ollama",
          }),
        });
        setSingleResult(await resp.json());
      } catch (e) {
        setSingleResult({ error: String(e) });
      } finally {
        setSingleRunning(false);
      }
      return;
    }

    if (isComparison) {
      start("/api/eval/harness/compare", {
        model_type: benchmark.modelType,
        models: modelList,
        tasks: taskList,
        limit: parseInt(lmLimit) || 10,
        harness: benchmark.harness,
        provider,
      });
      return;
    }

    setSingleRunning(true);
    setSingleResult(null);
    try {
      const resp = await fetch("/api/eval/harness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_type: benchmark.modelType,
          model_args: modelList[0],
          tasks: taskList,
          limit: parseInt(lmLimit) || 10,
          harness: benchmark.harness,
          provider,
        }),
      });
      setSingleResult(await resp.json());
    } catch (e) {
      setSingleResult({ error: String(e) });
    } finally {
      setSingleRunning(false);
    }
  };

  const benchmarks = modality === "image" ? IMAGE_BENCHMARKS : modality === "audio" ? AUDIO_BENCHMARKS : AGENT_BENCHMARKS;

  const modelInputPlaceholder = (): string => {
    if (isAgentBenchmark) return "Ollama model (e.g. qwen2.5:1.5b)";
    if (isFasterWhisper) return "Model size (base, small, medium, large-v3)";
    if (provider === "ollama") return "Ollama model name (e.g. llava-phi3)";
    return "pretrained=org/model-name";
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">

      {/* ── Step 1: Modality ── */}
      <Section step={1} title="What type of data do you want to evaluate?">
        <div className="flex gap-3">
          {(["image", "audio", "agent"] as const).map((m) => (
            <button
              key={m}
              onClick={() => switchModality(m)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                modality === m
                  ? "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
              }`}
            >
              {m === "image" ? <Image className="w-4 h-4" /> : m === "audio" ? <AudioLines className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              {m === "image" ? "Image" : m === "audio" ? "Audio" : "Agent"}
            </button>
          ))}
        </div>
        {modality === "agent" && (
          <p className="text-xs text-zinc-500 mt-2">
            Agent evals run via <span className="text-zinc-400">inspect-ai</span> against a local Ollama model. Each run captures the full step-by-step tool-call trajectory.
          </p>
        )}
      </Section>

      {/* ── Step 1b: Provider (image only) ── */}
      {modality === "image" && (
        <Section step="1b" title="Model provider">
          <div className="flex gap-3">
            {(["huggingface", "ollama"] as const).map((p) => (
              <button
                key={p}
                onClick={() => switchProvider(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  provider === p
                    ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                    : "bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
                }`}
              >
                {p === "huggingface" ? "HuggingFace" : "Ollama (local)"}
              </button>
            ))}
          </div>
          {provider === "ollama" && (
            <p className="text-xs text-zinc-500 mt-2">
              Routes image/VLM tasks to your local Ollama instance via its OpenAI-compatible endpoint (<code className="text-zinc-400">localhost:11434/v1</code>).
            </p>
          )}
        </Section>
      )}

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

      {/* ── Step 3: Tasks + Models ── */}
      <Section step={3} title="Configure tasks and models">
        <div className="space-y-4">
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

          {/* Sample limit */}
          <label className="block">
            <span className="text-xs text-zinc-400 block mb-1">
              Sample limit per task
              <span className="ml-1 text-zinc-600">(keep small for a quick test)</span>
            </span>
            <input
              type="number"
              min={1}
              value={lmLimit || defaultLimit}
              onChange={(e) => setLmLimit(e.target.value)}
              className="input w-28"
            />
          </label>

          {/* Model list */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-zinc-400">
                {isAgentBenchmark
                  ? "Ollama model for agent"
                  : isFasterWhisper
                  ? "faster-whisper model size"
                  : `Model${modelList.length > 1 ? "s" : ""} to evaluate`}
                {!isAgentBenchmark && !isFasterWhisper && provider === "huggingface" && (
                  <span className="ml-1 text-zinc-600">(HuggingFace model_args)</span>
                )}
              </span>
              {isComparison && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30">
                  Comparison mode
                </span>
              )}
            </div>

            <div className="space-y-2">
              {modelList.map((m, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <input
                      value={m}
                      onChange={(e) => updateModel(idx, e.target.value)}
                      list={`model-suggestions-${idx}`}
                      className="input pr-8"
                      placeholder={modelInputPlaceholder()}
                    />
                    <datalist id={`model-suggestions-${idx}`}>
                      {suggestedModels().map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                  {modelList.length > 1 && (
                    <button
                      onClick={() => removeModel(idx)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 rounded hover:bg-zinc-800 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {modelList.length < 4 && !isAgentBenchmark && (
                <button
                  onClick={addModel}
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 py-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add model to compare
                </button>
              )}
            </div>

            {isComparison && (
              <p className="text-xs text-zinc-500 mt-2">
                Each model will be evaluated on the same tasks concurrently. Results stream in as they complete.
              </p>
            )}
            {isAgentBenchmark && (
              <p className="text-xs text-zinc-500 mt-2">
                Agent evals run one model at a time. The full tool-call trajectory is captured after the run.
              </p>
            )}
          </div>
        </div>
      </Section>

      {/* ── Run ── */}
      <div className="flex items-center justify-end gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4">
        {running && (
          <button
            onClick={stop}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg text-sm"
          >
            <Square className="w-3.5 h-3.5" /> Stop
          </button>
        )}
        <button
          onClick={runEval}
          disabled={busy || modelList.some((m) => !m.trim())}
          className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
        >
          <Play className="w-3.5 h-3.5" />
          {busy
            ? isComparison ? "Comparing…" : isAgentBenchmark ? "Running agent…" : "Running…"
            : isComparison ? "Compare Models" : "Run Evaluation"}
        </button>
      </div>

      {/* ── Comparison streaming results ── */}
      {isComparison && events.length > 0 && <ProgressView events={events} />}

      {/* ── Single model result ── */}
      {!isComparison && singleResult && (
        <SingleResultView result={singleResult} benchmark={benchmark} tasks={tasks} />
      )}
    </div>
  );
}

// ─── Single result display ──────────────────────────────────────────────────

function SingleResultView({
  result,
  benchmark,
  tasks,
}: {
  result: Record<string, unknown>;
  benchmark: Benchmark;
  tasks: string;
}) {
  const taskResults = result.results as Record<string, Record<string, number>> | undefined;
  const trajectory = result.trajectory as TrajectoryMessage[] | undefined;

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-zinc-200">{benchmark.label}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {benchmark.tech} · {tasks} · {benchmark.metric}
            {typeof result.engine === "string" && result.engine !== "lm-eval" && result.engine !== "lmms-eval" && (
              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                {result.engine}
                {typeof result.device === "string" && ` · ${result.device}`}
              </span>
            )}
          </p>
        </div>
      </div>

      {result.error ? (
        <p className="text-sm text-red-400">{String(result.error)}</p>
      ) : taskResults ? (
        <div className="space-y-3">
          {Object.entries(taskResults).map(([taskName, metrics]) => (
            <div key={taskName} className="bg-zinc-800 rounded-lg p-3">
              <p className="text-xs text-zinc-400 font-medium mb-2">{taskName}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(metrics)
                  .filter(([k]) => !k.includes("stderr"))
                  .map(([metricKey, value]) => (
                    <div key={metricKey}>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
                        {metricKey.replace(",none", "")}
                      </div>
                      <div className="text-base font-mono font-semibold text-zinc-100 mt-0.5">
                        {typeof value === "number"
                          ? value < 1 ? (value * 100).toFixed(1) + "%" : value.toFixed(3)
                          : String(value)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <pre className="text-xs text-zinc-400 bg-zinc-800 rounded-lg p-4 overflow-auto max-h-80">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}

      {/* Agent trajectory */}
      {trajectory && trajectory.length > 0 && (
        <TrajectoryView messages={trajectory} />
      )}
    </div>
  );
}

// ─── Trajectory viewer ──────────────────────────────────────────────────────

function TrajectoryView({ messages }: { messages: TrajectoryMessage[] }) {
  const [open, setOpen] = useState(false);

  const roleColor: Record<string, string> = {
    system: "text-zinc-500",
    user: "text-blue-300",
    assistant: "text-emerald-300",
    tool: "text-amber-300",
  };

  const roleLabel: Record<string, string> = {
    system: "system",
    user: "user",
    assistant: "agent",
    tool: "tool result",
  };

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-xs text-zinc-400"
      >
        <span className="flex items-center gap-1.5">
          <Bot className="w-3.5 h-3.5 text-emerald-400" />
          Agent trajectory ({messages.length} messages)
        </span>
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div className="divide-y divide-zinc-800/60 max-h-96 overflow-y-auto">
          {messages.map((msg, i) => (
            <div key={i} className="px-4 py-2.5">
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${roleColor[msg.role] ?? "text-zinc-400"}`}>
                {roleLabel[msg.role] ?? msg.role}
              </span>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed whitespace-pre-wrap break-words">
                {msg.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section wrapper ────────────────────────────────────────────────────────

function Section({ step, title, children }: { step: number | string; title: string; children: React.ReactNode }) {
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
