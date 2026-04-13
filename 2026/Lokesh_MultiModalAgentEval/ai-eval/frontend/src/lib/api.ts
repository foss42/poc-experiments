
export interface TrajectoryStep {
  role: string;
  content: string;
  source: string;
}

export interface VisionSample {
  id: string | number;
  image_base64: string;
  image_mime_type?: string;
  question?: string | null;
  prediction?: string | null;
  target?: string | null;
  is_correct?: boolean | null;
}

export interface EvalResults {
  run_id: string;
  model: string;
  modality: 'text' | 'vision' | 'audio' | 'agent';
  task: string;
  engine: 'lmms-eval' | 'inspect-ai';
  metrics: Record<string, number>;
  trajectory?: TrajectoryStep[];
  input_preview: string | null;
  vision_samples?: VisionSample[];
}

export interface EvalConfig {
  model: string;
  api_key?: string;
  tasks: string[];
  limit?: number;
}

export const startEvaluation = async (config: EvalConfig): Promise<{ run_id: string }> => {
  const response = await fetch('http://localhost:8000/api/evaluate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    throw new Error('Failed to start evaluation');
  }

  return response.json();
};
