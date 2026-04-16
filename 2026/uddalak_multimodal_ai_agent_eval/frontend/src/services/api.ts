import axios from 'axios';
import type { EvalRequest, EvalResult } from '../types/eval';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const evalService = {
  async fetchDatasets(): Promise<string[]> {
    // Use trailing slash to avoid 307 redirect; backend returns objects, extract names
    const response = await api.get('/datasets/');
    const raw = response.data.datasets ?? [];
    return raw.map((d: any) => (typeof d === 'string' ? d : d.name));
  },

  async runEval(request: EvalRequest): Promise<{ job_id: string; status: string }> {
    const response = await api.post('/eval/run', request);
    return response.data;
  },

  /** Fetch the actual items from a named dataset (prompt + ground_truth per item). */
  async fetchDatasetItems(name: string): Promise<{ prompt: string; ground_truth: string }[]> {
    const response = await api.get(`/datasets/${name}`);
    return response.data.items ?? [];
  },

  async getJobStatus(jobId: string): Promise<EvalResult> {
    const response = await api.get(`/eval/status/${jobId}`);
    const data = response.data;
    // Backend wraps per-provider metrics in result:[...]; merge first item into top level
    const firstResult = Array.isArray(data.result) ? data.result[0] : null;
    return {
      job_id:          data.job_id,
      status:          data.status,
      modality:        firstResult?.modality   ?? 'text',
      provider:        firstResult?.provider   ?? undefined,
      num_samples:     firstResult?.num_samples,
      accuracy:        firstResult?.accuracy,
      latency:         firstResult?.latency,
      total_tokens:    firstResult?.total_tokens,
      total_cost_usd:  firstResult?.total_cost_usd,
      per_sample_results: firstResult?.per_sample_results,
      error:           data.error,
    };
  },

  async fetchAllResults(): Promise<EvalResult[]> {
    const response = await api.get('/results/');
    return response.data.results ?? [];
  }
};
