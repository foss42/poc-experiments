// ─── Provider Config ─────────────────────────────────────────────────────────
// Field names MUST match the backend ProviderConfig Pydantic model exactly.
export interface ProviderConfig {
  name: 'gemini' | 'groq' | 'openai' | 'anthropic';
  model: string;
  api_key?: string;
}

// ─── Modality ─────────────────────────────────────────────────────────────────
export type ModalityType = 'text' | 'multimodal' | 'agent';

// ─── Dataset Item ─────────────────────────────────────────────────────────────
// Matches backend EvalDatasetItem Pydantic model.
export interface EvalDatasetItem {
  prompt: string;
  ground_truth?: string;
  images?: string[];              // base64-encoded
  expected_tool_sequence?: string[];
  tools_spec?: Record<string, unknown>[];
}

// ─── Eval Request ─────────────────────────────────────────────────────────────
// Matches backend EvalRequest Pydantic model exactly.
export interface EvalRequest {
  providers: ProviderConfig[];
  modality: ModalityType;
  dataset: EvalDatasetItem[];     // NOTE: array of items, not a dataset name
  concurrency_limit?: number;
}


// ─── Eval Result ──────────────────────────────────────────────────────────────
// Matches the flattened shape returned by backend /results/ endpoint.
export interface EvalResult {
  job_id: string;
  status: 'running' | 'complete' | 'error';
  modality: ModalityType;
  provider?: string;                  // e.g. "groq/llama-3.3-70b-versatile"
  num_samples?: number;
  accuracy?: number;                  // 0.0–1.0
  latency?: {
    mean_ms: number;
    p50_ms: number;
    p95_ms: number;
    p99_ms: number;
  };
  total_tokens?: number;
  total_cost_usd?: number;
  per_sample_results?: unknown[];
  error?: string;
}
