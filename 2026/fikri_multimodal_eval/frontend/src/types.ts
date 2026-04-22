export interface HealthStatus {
  status: string;
  ollama: boolean;
  lm_eval: boolean;
  lmms_eval: boolean;
  inspect_ai: boolean;
  faster_whisper: boolean;
}

export interface ModelList {
  image_vlm: string[];
  ollama_vlm: string[];
  audio_asr: string[];
  faster_whisper_sizes: string[];
  agent: string[];
}

export interface TaskList {
  "lm-eval": string[];
  "lmms-eval": string[];
  "inspect-ai": string[];
  "faster-whisper": string[];
}

// ─── Harness result types ──────────────────────────────────────────────────

export interface TaskMetrics {
  [metricKey: string]: number;  // e.g. "acc,none": 0.45, "acc_stderr,none": 0.012
}

export interface HarnessResult {
  eval_id?: string;
  results: Record<string, TaskMetrics>;  // task_name → metrics
  configs?: Record<string, unknown>;
  versions?: Record<string, unknown>;
  // Agent eval extras
  trajectory?: TrajectoryMessage[];
  engine?: string;
  device?: string;
}

export interface ComparisonResult {
  comparison: Record<string, HarnessResult>;  // model_args → HarnessResult
  tasks: string[];
}

// ─── Agent trajectory ──────────────────────────────────────────────────────

export interface TrajectoryMessage {
  role: string;   // "system" | "user" | "assistant" | "tool"
  content: string;
}

// ─── SSE events for comparison streaming ──────────────────────────────────

export type SSEEventType =
  | "init"
  | "start"
  | "model_start"
  | "model_complete"
  | "model_error"
  | "complete"
  | "error";

export interface SSEEvent {
  type: SSEEventType;
  // init
  eval_id?: string;
  // start
  total?: number;
  models?: string[];
  tasks?: string[];
  harness?: string;
  // model_start / model_complete / model_error
  model?: string;
  index?: number;
  result?: HarnessResult;
  error?: string;
  // complete
  comparison?: Record<string, HarnessResult>;
  // error
  message?: string;
}
