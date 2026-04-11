export interface HealthStatus {
  status: string;
  providers: {
    ollama: boolean;
    lmstudio: boolean;
    huggingface: boolean;
    openai: boolean;
  };
  whisper: boolean;
}

export interface ModelList {
  ollama: { name: string; size_mb: number }[];
  lmstudio: { name: string; type: string }[];
  huggingface: string[];
  openai: string[];
  whisper: string[];
  providers: string[];
}

export interface ProviderConfig {
  provider: "ollama" | "lmstudio" | "huggingface" | "openai";
  model: string;
}

export interface ProviderInfo {
  name: string;
  models: string[];
  requires_api_key: boolean;
  supports_multimodal: boolean;
  description: string;
}

export interface EvalSample {
  sample_id: number;
  [key: string]: unknown;
}

export interface EvalSummary {
  model: string;
  modality: string;
  samples: number;
  provider?: string;
  [key: string]: unknown;
}

export interface ComparisonSummary {
  model: string;
  provider: string;
  samples: number;
  avg_rouge_l: number;
  avg_bleu: number;
  avg_latency_ms: number;
}

export interface SSEEvent {
  type: "init" | "start" | "progress" | "complete" | "error";
  eval_id?: string;
  comparison?: boolean;
  total?: number;
  current?: number;
  result?: EvalSample;
  results?: Record<string, EvalSample>;
  summary?: EvalSummary;
  summaries?: Record<string, ComparisonSummary>;
  providers?: string[];
  modality?: string;
  model?: string;
  provider?: string;
  message?: string;
}

export type Modality = "image" | "audio" | "harness";

export interface HarnessResult {
  eval_id: string;
  results: Record<string, Record<string, number>>;
}