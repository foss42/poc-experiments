
export interface TrajectoryStep {
  role: string;
  content: string;
  source: string;
}

export interface EvalResults {
  run_id: string;
  model: string;
  modality: 'text' | 'vision' | 'audio' | 'agent';
  task: string;
  engine: 'lmms-eval' | 'inspect-ai';
  metrics: Record<string, number>;
  trajectory?: TrajectoryStep[];
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