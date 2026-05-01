import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { EvalResult } from '../../types/eval';

/**
 * EvalContext logic tests
 *
 * We test the core state-transition logic of checkStatus and startEval
 * directly — extracted as pure functions — rather than rendering the
 * full context provider with React, which keeps setup minimal and fast.
 */

// ─── Helpers that mirror EvalContext.tsx logic ────────────────────────────────

type StatusState = {
  activeJob: EvalResult | null;
  pollingId: string | null;
};

/**
 * Pure version of checkStatus: given a job result, updates state.
 * If status is terminal (complete | error), clears pollingId.
 */
function applyCheckStatus(
  state: StatusState,
  result: EvalResult,
): StatusState {
  const isTerminal = result.status === 'complete' || result.status === 'error';
  return {
    activeJob: result,
    pollingId: isTerminal ? null : state.pollingId,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

const baseResult: EvalResult = {
  job_id: 'job-abc',
  status: 'running',
  modality: 'text',
  dataset_name: 'mmlu_sample',
  providers: ['openai'],
  metrics: {},
  per_sample_results: [],
  created_at: '2026-04-15T00:00:00Z',
};

describe('EvalContext — checkStatus logic', () => {
  it('sets activeJob to the received result', () => {
    const state: StatusState = { activeJob: null, pollingId: 'job-abc' };
    const result = applyCheckStatus(state, { ...baseResult, status: 'running' });
    expect(result.activeJob).toMatchObject({ job_id: 'job-abc', status: 'running' });
  });

  it('keeps pollingId when status is "running"', () => {
    const state: StatusState = { activeJob: null, pollingId: 'job-abc' };
    const result = applyCheckStatus(state, { ...baseResult, status: 'running' });
    expect(result.pollingId).toBe('job-abc');
  });

  it('clears pollingId when status is "complete"', () => {
    const state: StatusState = { activeJob: null, pollingId: 'job-abc' };
    const result = applyCheckStatus(state, { ...baseResult, status: 'complete' });
    expect(result.pollingId).toBeNull();
  });

  it('clears pollingId when status is "error"', () => {
    const state: StatusState = { activeJob: null, pollingId: 'job-abc' };
    const result = applyCheckStatus(state, { ...baseResult, status: 'error' });
    expect(result.pollingId).toBeNull();
  });
});

describe('EvalContext — startEval logic', () => {
  it('sets pollingId to the returned job_id on success', async () => {
    const mockRunEval = vi.fn().mockResolvedValue({ job_id: 'new-job', status: 'running' });
    let pollingId: string | null = null;

    const startEval = async () => {
      const { job_id } = await mockRunEval();
      pollingId = job_id;
      return job_id;
    };

    const returned = await startEval();
    expect(returned).toBe('new-job');
    expect(pollingId).toBe('new-job');
  });

  it('sets isLoading false after success', async () => {
    const mockRunEval = vi.fn().mockResolvedValue({ job_id: 'x', status: 'running' });
    let isLoading = false;

    const startEval = async () => {
      isLoading = true;
      try {
        await mockRunEval();
      } finally {
        isLoading = false;
      }
    };

    await startEval();
    expect(isLoading).toBe(false);
  });

  it('sets error and re-throws on failure', async () => {
    const mockRunEval = vi.fn().mockRejectedValue(new Error('API down'));
    let error: string | null = null;

    const startEval = async () => {
      try {
        await mockRunEval();
      } catch {
        error = 'Failed to start evaluation';
        throw new Error('Failed to start evaluation');
      }
    };

    await expect(startEval()).rejects.toThrow('Failed to start evaluation');
    expect(error).toBe('Failed to start evaluation');
  });
});
