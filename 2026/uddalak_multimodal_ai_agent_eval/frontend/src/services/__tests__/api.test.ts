import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { evalService } from '../api';
import type { EvalRequest, EvalResult } from '../../types/eval';
import type { Mocked } from 'vitest';



// Mock the axios module so no real HTTP calls are made
vi.mock('axios');
const mockedAxios = axios as Mocked<typeof axios>;

// axios.create() returns an axios instance — we need to mock the instance methods
vi.mock('axios', () => {
  const mockInstance = {
    get: vi.fn(),
    post: vi.fn(),
  };
  return {
    default: {
      create: vi.fn(() => mockInstance),
    },
    ...mockInstance,
  };
});

// Re-import after mock is in place
let api: typeof evalService;

describe('evalService', () => {
  // We grab the mocked axios instance that the module created at import time
  let instance: { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.resetModules();
    // Re-set up the mock fresh for each test
    const mockInstance = { get: vi.fn(), post: vi.fn() };
    vi.doMock('axios', () => ({
      default: { create: vi.fn(() => mockInstance) },
    }));
    // Dynamic import so we get the module with fresh mocks
    const mod = await import('../api');
    api = mod.evalService;
    instance = mockInstance;
  });

  it('fetchDatasets — returns dataset name strings from response objects', async () => {
    instance.get.mockResolvedValueOnce({ data: { datasets: [
      { name: 'mmlu_sample', filename: 'mmlu_sample.jsonl', num_items: 50 },
      { name: 'agent_sample', filename: 'agent_sample.jsonl', num_items: 10 },
    ]}});
    const result = await api.fetchDatasets();
    expect(result).toEqual(['mmlu_sample', 'agent_sample']);
    expect(instance.get).toHaveBeenCalledWith('/datasets/');
  });

  it('fetchDatasets — propagates network error', async () => {
    instance.get.mockRejectedValueOnce(new Error('Network Error'));
    await expect(api.fetchDatasets()).rejects.toThrow('Network Error');
  });

  it('fetchDatasets — handles plain string arrays too (backward compat)', async () => {
    instance.get.mockResolvedValueOnce({ data: { datasets: ['mmlu_sample'] } });
    const result = await api.fetchDatasets();
    expect(result).toEqual(['mmlu_sample']);
  });

  it('runEval — POSTs to /eval/run and returns job_id + status', async () => {
    const payload: EvalRequest = {
      modality: 'text',
      providers: [{ name: 'gemini', model: 'gemini-2.0-flash' }],
      dataset: [{ prompt: 'What is 2+2?', ground_truth: '4' }],
    };
    instance.post.mockResolvedValueOnce({ data: { job_id: 'abc-123', status: 'running' } });
    const result = await api.runEval(payload);
    expect(result).toEqual({ job_id: 'abc-123', status: 'running' });
    expect(instance.post).toHaveBeenCalledWith('/eval/run', payload);
  });

  it('getJobStatus — GETs /eval/status/{jobId} with correct path', async () => {
    const fakeResult: Partial<EvalResult> = { job_id: 'abc-123', status: 'complete' };
    instance.get.mockResolvedValueOnce({ data: fakeResult });
    const result = await api.getJobStatus('abc-123');
    expect(result).toMatchObject({ job_id: 'abc-123', status: 'complete' });
    expect(instance.get).toHaveBeenCalledWith('/eval/status/abc-123');
  });

  it('fetchAllResults — returns the results array from response', async () => {
    const fakeResults: Partial<EvalResult>[] = [{ job_id: 'x' }, { job_id: 'y' }];
    instance.get.mockResolvedValueOnce({ data: { results: fakeResults } });
    const result = await api.fetchAllResults();
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ job_id: 'x' });
    expect(instance.get).toHaveBeenCalledWith('/results/');
  });

});
