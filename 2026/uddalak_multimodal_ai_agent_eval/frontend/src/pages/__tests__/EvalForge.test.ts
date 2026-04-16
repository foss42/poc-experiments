import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProviderConfig } from '../../types/eval';

/**
 * EvalForge pure-logic tests
 *
 * The three array-management functions (addProvider, removeProvider, updateProvider)
 * are extracted from the component for isolated unit testing. We test
 * the underlying logic rather than rendering the full component, which
 * keeps tests fast and dependency-free (no React/DOM needed here).
 */

// ─── Pure logic extracted from EvalForge.tsx ──────────────────────────────────

const DEFAULTS: ProviderConfig = { name: 'groq', model: 'llama-3.3-70b-versatile' };

function addProvider(providers: ProviderConfig[]): ProviderConfig[] {
  return [...providers, { ...DEFAULTS }];
}

function removeProvider(providers: ProviderConfig[], index: number): ProviderConfig[] {
  return providers.filter((_, i) => i !== index);
}

function updateProvider(
  providers: ProviderConfig[],
  index: number,
  updates: Partial<ProviderConfig>,
): ProviderConfig[] {
  return providers.map((p, i) => (i === index ? { ...p, ...updates } : p));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('EvalForge — addProvider', () => {
  it('appends a new provider and increases length by 1', () => {
    const initial: ProviderConfig[] = [{ name: 'gemini', model: 'gemini-2.0-flash' }];
    const result = addProvider(initial);
    expect(result).toHaveLength(2);
    expect(result[1].name).toBe('groq');
    expect(result[1].model).toBe('llama-3.3-70b-versatile');
  });

  it('does not mutate the original array', () => {
    const initial: ProviderConfig[] = [{ name: 'gemini', model: 'gemini-2.0-flash' }];
    addProvider(initial);
    expect(initial).toHaveLength(1);
  });
});

describe('EvalForge — removeProvider', () => {
  it('removes only the provider at the given index', () => {
    const providers: ProviderConfig[] = [
      { name: 'gemini', model: 'gemini-2.0-flash' },
      { name: 'groq', model: 'llama-3.3-70b-versatile' },
      { name: 'openai', model: 'gpt-4o' },
    ];
    const result = removeProvider(providers, 1);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('gemini');
    expect(result[1].name).toBe('openai');
  });

  it('removes the first provider correctly', () => {
    const providers: ProviderConfig[] = [
      { name: 'gemini', model: 'gemini-2.0-flash' },
      { name: 'groq', model: 'llama-3.3-70b-versatile' },
    ];
    const result = removeProvider(providers, 0);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('groq');
  });

  it('does not mutate the original array', () => {
    const providers: ProviderConfig[] = [{ name: 'gemini', model: 'gemini-2.0-flash' }];
    removeProvider(providers, 0);
    expect(providers).toHaveLength(1);
  });
});

describe('EvalForge — updateProvider', () => {
  it('merges the update into the correct slot', () => {
    const providers: ProviderConfig[] = [
      { name: 'gemini', model: 'gemini-2.0-flash' },
      { name: 'groq', model: 'llama-3.3-70b-versatile' },
    ];
    const result = updateProvider(providers, 0, { model: 'gemini-1.5-pro' });
    expect(result[0].model).toBe('gemini-1.5-pro');
    expect(result[0].name).toBe('gemini'); // unchanged field preserved
    expect(result[1]).toEqual(providers[1]); // other slot untouched
  });

  it('does not mutate the original array', () => {
    const providers: ProviderConfig[] = [{ name: 'gemini', model: 'gemini-2.0-flash' }];
    updateProvider(providers, 0, { model: 'gemini-1.5-pro' });
    expect(providers[0].model).toBe('gemini-2.0-flash');
  });
});

describe('EvalForge — handleRun guard', () => {
  it('returns early (no action) when selectedDataset is empty string', () => {
    const startEval = vi.fn();
    const handleRun = (selectedDataset: string) => {
      if (!selectedDataset) return; // mirrors the guard in the component
      startEval();
    };
    handleRun('');
    expect(startEval).not.toHaveBeenCalled();
  });

  it('calls startEval when selectedDataset is non-empty', () => {
    const startEval = vi.fn();
    const handleRun = (selectedDataset: string) => {
      if (!selectedDataset) return;
      startEval();
    };
    handleRun('mmlu_sample');
    expect(startEval).toHaveBeenCalledTimes(1);
  });
});
