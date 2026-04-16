import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { evalService } from '../services/api';
import type { EvalResult, EvalRequest } from '../types/eval';

interface EvalContextType {
  datasets: string[];
  results: EvalResult[];
  activeJob: EvalResult | null;
  isLoading: boolean;       // true while submitting the eval request
  isPolling: boolean;       // true while a job is in-flight (show progress UI)
  pollingProgress: number;  // 0-100 estimated progress
  error: string | null;
  refreshDatasets: () => Promise<void>;
  startEval: (request: EvalRequest) => Promise<string>;
  refreshResults: () => Promise<void>;
}

const EvalContext = createContext<EvalContextType | undefined>(undefined);

// Models available per provider — used to populate dropdowns
export const PROVIDER_MODELS: Record<string, string[]> = {
  gemini:    ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro'],
  groq:      ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768'],
  openai:    ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
};

const POLL_INTERVAL_MS = 2000;
const MAX_PROGRESS_BEFORE_DONE = 90; // Never show 100% until actually complete

export const EvalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [datasets,         setDatasets]         = useState<string[]>([]);
  const [results,          setResults]          = useState<EvalResult[]>([]);
  const [activeJob,        setActiveJob]        = useState<EvalResult | null>(null);
  const [isLoading,        setIsLoading]        = useState(false);
  const [isPolling,        setIsPolling]        = useState(false);
  const [pollingProgress,  setPollingProgress]  = useState(0);
  const [error,            setError]            = useState<string | null>(null);
  const [pollingJobId,     setPollingJobId]     = useState<string | null>(null);

  const progressTimer  = useRef<any>(null);
  const pollInterval   = useRef<any>(null);

  // ── Datasets ──────────────────────────────────────────────────────────────
  const refreshDatasets = useCallback(async () => {
    try {
      const data = await evalService.fetchDatasets();
      setDatasets(data);
    } catch {
      setError('Failed to fetch datasets');
    }
  }, []);

  // ── Results ───────────────────────────────────────────────────────────────
  const refreshResults = useCallback(async () => {
    try {
      const data = await evalService.fetchAllResults();
      setResults(data);
    } catch {
      setError('Failed to fetch results');
    }
  }, []);

  // ── Progress ticker ───────────────────────────────────────────────────────
  const startProgressTicker = useCallback(() => {
    setPollingProgress(0);
    progressTimer.current = setInterval(() => {
      setPollingProgress(prev =>
        prev < MAX_PROGRESS_BEFORE_DONE ? prev + 2 : prev
      );
    }, 400);
  }, []);

  const stopProgressTicker = useCallback((complete: boolean) => {
    clearInterval(progressTimer.current);
    setPollingProgress(complete ? 100 : 0);
  }, []);

  // ── Job status polling ────────────────────────────────────────────────────
  const checkStatus = useCallback(async (jobId: string) => {
    try {
      const result = await evalService.getJobStatus(jobId);
      setActiveJob(result);

      if (result.status === 'complete' || result.status === 'error') {
        // Done — stop polling
        clearInterval(pollInterval.current);
        setPollingJobId(null);
        setIsPolling(false);
        stopProgressTicker(result.status === 'complete');
        // Immediately refresh the results list so charts update
        await refreshResults();
      }
    } catch (err) {
      console.error('[EvalContext] Polling error:', err);
    }
  }, [refreshResults, stopProgressTicker]);

  // Start/stop poll interval whenever pollingJobId changes
  useEffect(() => {
    if (pollingJobId) {
      setIsPolling(true);
      startProgressTicker();
      pollInterval.current = setInterval(() => checkStatus(pollingJobId), POLL_INTERVAL_MS);
      // Fire immediately so UI reflects fast-completing jobs
      checkStatus(pollingJobId);
    } else {
      clearInterval(pollInterval.current);
    }
    return () => clearInterval(pollInterval.current);
  }, [pollingJobId, checkStatus, startProgressTicker]);

  // ── Start eval ────────────────────────────────────────────────────────────
  const startEval = async (request: EvalRequest): Promise<string> => {
    setIsLoading(true);
    setError(null);
    setActiveJob(null);
    try {
      const { job_id } = await evalService.runEval(request);
      setPollingJobId(job_id);  // kicks off polling via the effect above
      return job_id;
    } catch (err) {
      setError('Failed to start evaluation');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    refreshDatasets();
    refreshResults();
  }, [refreshDatasets, refreshResults]);

  return (
    <EvalContext.Provider value={{
      datasets, results, activeJob,
      isLoading, isPolling, pollingProgress,
      error,
      refreshDatasets, startEval, refreshResults,
    }}>
      {children}
    </EvalContext.Provider>
  );
};

export const useEval = () => {
  const context = useContext(EvalContext);
  if (!context) throw new Error('useEval must be used within EvalProvider');
  return context;
};
