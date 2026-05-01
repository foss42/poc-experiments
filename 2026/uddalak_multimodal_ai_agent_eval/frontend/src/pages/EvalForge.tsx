import React, { useState } from 'react';
import { useEval, PROVIDER_MODELS } from '../context/EvalContext';
import { Button } from '../components/ui/Button';
import { evalService } from '../services/api';
import { Play, Plus, Trash2, Cpu, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import type { ProviderConfig, ModalityType } from '../types/eval';

// ── Inline styles for reuse ──────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--surface-container)',
  padding: '28px 32px',
  borderRadius: '2px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontFamily: 'var(--font-mono)',
  fontWeight: 700,
  letterSpacing: '1.5px',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  marginBottom: '20px',
  display: 'block',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: 'var(--surface-dim)',
  border: '1px solid var(--surface-container-high)',
  borderRadius: '2px',
  color: 'var(--primary)',
  padding: '14px 16px',
  fontSize: '15px',
  outline: 'none',
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%23888' stroke-width='1.5'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 16px center',
  paddingRight: '40px',
};

const MODALITY_META: Record<ModalityType, { label: string; desc: string }> = {
  text:        { label: 'TEXT',        desc: 'MMLU-style Q&A accuracy on text datasets' },
  multimodal:  { label: 'MULTIMODAL', desc: 'Image + text VQA evaluation (vision models)' },
  agent:       { label: 'AGENT',      desc: 'Tool-call trajectory fidelity scoring (TFS)' },
};

export const EvalForge: React.FC = () => {
  const { datasets, startEval, isLoading, isPolling, pollingProgress, activeJob, error } = useEval();

  const [selectedDataset,    setSelectedDataset]    = useState('');
  const [modality,           setModality]           = useState<ModalityType>('text');
  const [providers,          setProviders]          = useState<ProviderConfig[]>([
    { name: 'groq', model: 'llama-3.3-70b-versatile' }
  ]);
  const [jobId,              setJobId]              = useState<string | null>(null);
  const [isFetchingDataset,  setIsFetchingDataset]  = useState(false);
  const [datasetError,       setDatasetError]       = useState<string | null>(null);

  const addProvider = () => {
    setProviders([...providers, { name: 'gemini', model: 'gemini-2.0-flash' }]);
  };

  const removeProvider = (index: number) => {
    if (providers.length <= 1) return;
    setProviders(providers.filter((_, i) => i !== index));
  };

  const updateProvider = (index: number, updates: Partial<ProviderConfig>) => {
    setProviders(providers.map((p, i) => {
      if (i !== index) return p;
      const merged = { ...p, ...updates };
      // Auto-select first model when provider changes
      if (updates.name && updates.name !== p.name) {
        merged.model = PROVIDER_MODELS[updates.name]?.[0] ?? '';
      }
      return merged;
    }));
  };

  const handleRun = async () => {
    if (!selectedDataset) return alert('Please select a dataset in Step 2 first.');
    if (isPolling || isFetchingDataset) return;

    try {
      // ── Fetch REAL dataset items from the backend ────────────────────────
      setIsFetchingDataset(true);
      setDatasetError(null);
      const items = await evalService.fetchDatasetItems(selectedDataset);

      if (items.length === 0) {
        setDatasetError(`Dataset "${selectedDataset}" returned 0 items. Check the .jsonl file.`);
        return;
      }

      // ── Launch the eval with actual prompts + ground_truth ───────────────
      setJobId(null);
      const id = await startEval({
        modality,
        providers,
        dataset: items,   // ← REAL items, not a fake placeholder
      });
      setJobId(id);
    } catch (e) {
      console.error(e);
      setDatasetError('Failed to load dataset items. Is the backend running?');
    } finally {
      setIsFetchingDataset(false);
    }
  };

  const isBusy = isLoading || isPolling || isFetchingDataset;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '1200px' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 style={{ fontSize: '36px', marginBottom: '8px', letterSpacing: '1px' }}>THE FORGE</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
          Configure and launch AI evaluation cycles across providers and modalities.
        </p>
      </div>

      {/* ── Live Job Status Banner ──────────────────────────────────────────── */}
      {isBusy && (
        <div style={{
          backgroundColor: 'var(--surface-container)',
          border: '1px solid var(--accent)',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Loader2 size={16} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '14px', letterSpacing: '1px', fontFamily: 'var(--font-mono)' }}>
                {isFetchingDataset
                  ? `LOADING DATASET: ${selectedDataset}…`
                  : isLoading
                    ? 'SUBMITTING JOB…'
                    : `EVALUATING — JOB ${jobId ?? '…'}`
                }
              </span>
            </div>
            <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
              {pollingProgress}%
            </span>
          </div>
          {/* Progress bar */}
          <div style={{ height: '3px', backgroundColor: 'var(--surface-container-high)', borderRadius: '2px' }}>
            <div style={{
              height: '100%',
              width: `${pollingProgress}%`,
              backgroundColor: 'var(--accent)',
              borderRadius: '2px',
              transition: 'width 0.4s ease',
            }} />
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Running inference on <strong style={{ color: 'var(--primary)' }}>{providers.map(p => `${p.name}/${p.model}`).join(', ')}</strong> — results will appear in Analytics automatically.
          </span>
        </div>
      )}

      {/* ── Job Completed Banner ───────────────────────────────────────────── */}
      {!isBusy && jobId && activeJob?.status === 'complete' && (
        <div style={{
          backgroundColor: 'rgba(232, 255, 0, 0.06)',
          border: '1px solid var(--accent)',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <CheckCircle2 size={18} color="var(--accent)" />
          <div>
            <span style={{ fontSize: '14px', fontFamily: 'var(--font-mono)' }}>
              JOB {jobId} COMPLETE —
            </span>
            <span style={{ fontSize: '14px', color: 'var(--text-muted)', marginLeft: '8px' }}>
              Switch to Analytics to see results and charts.
            </span>
          </div>
        </div>
      )}

      {/* ── Error Banner (API/start errors) ───────────────────────────────── */}
      {(error || datasetError) && (
        <div style={{
          backgroundColor: 'rgba(255, 68, 68, 0.08)',
          border: '1px solid #ff4444',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <AlertCircle size={16} color="#ff4444" />
          <span style={{ fontSize: '14px', color: '#ff4444' }}>{datasetError ?? error}</span>
        </div>
      )}

      {/* ── Main layout: 3/2 grid ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '32px', alignItems: 'start' }}>

        {/* ═══════════════ LEFT COLUMN ═══════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Step 1: Modality */}
          <div style={cardStyle}>
            <span style={labelStyle}>Step 1 — Evaluation Modality</span>
            <div style={{ display: 'flex', gap: '12px' }}>
              {(Object.entries(MODALITY_META) as [ModalityType, typeof MODALITY_META[ModalityType]][]).map(([m, meta]) => (
                <div
                  key={m}
                  onClick={() => setModality(m)}
                  style={{
                    flex: 1,
                    padding: '18px 12px',
                    backgroundColor: modality === m ? 'rgba(232,255,0,0.08)' : 'var(--surface-dim)',
                    border: modality === m ? '1.5px solid var(--accent)' : '1.5px solid var(--surface-container-high)',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{
                    fontSize: '14px',
                    letterSpacing: '1px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    color: modality === m ? 'var(--accent)' : 'var(--primary)',
                    marginBottom: '6px',
                  }}>
                    {meta.label}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {meta.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 2: Dataset */}
          <div style={cardStyle}>
            <span style={labelStyle}>Step 2 — Target Dataset</span>
            {datasets.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '13px' }}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                Loading datasets from backend…
              </div>
            ) : (
              <select
                value={selectedDataset}
                onChange={(e) => setSelectedDataset(e.target.value)}
                style={selectStyle}
              >
                <option value="">— select a dataset —</option>
                {datasets.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            )}
            {selectedDataset && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                ✓ Selected: <span style={{ color: 'var(--accent)' }}>{selectedDataset}</span>
              </div>
            )}
          </div>

          {/* Step 3: Providers */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span style={labelStyle}>Step 3 — AI Providers</span>
              <button
                onClick={addProvider}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  backgroundColor: 'var(--surface-dim)',
                  border: '1px solid var(--surface-container-high)',
                  color: 'var(--primary)',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  letterSpacing: '0.5px',
                }}
              >
                <Plus size={13} />
                ADD PROVIDER
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {providers.map((p, i) => (
                <div key={i} style={{
                  backgroundColor: 'var(--surface-dim)',
                  border: '1px solid var(--surface-container-high)',
                  padding: '20px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Cpu size={14} color="var(--accent)" />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '1px', color: 'var(--accent)' }}>
                        PROVIDER #{i + 1}
                      </span>
                    </div>
                    {providers.length > 1 && (
                      <button
                        onClick={() => removeProvider(i)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex' }}
                        title="Remove provider"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* Provider selector */}
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
                        PROVIDER
                      </label>
                      <select
                        value={p.name}
                        onChange={(e) => updateProvider(i, { name: e.target.value as ProviderConfig['name'] })}
                        style={{ ...selectStyle, fontSize: '14px', padding: '12px 14px', paddingRight: '36px' }}
                      >
                        <option value="groq">Groq (Free)</option>
                        <option value="gemini">Gemini (Google)</option>
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                      </select>
                    </div>

                    {/* Model dropdown */}
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
                        MODEL
                      </label>
                      <select
                        value={p.model}
                        onChange={(e) => updateProvider(i, { model: e.target.value })}
                        style={{ ...selectStyle, fontSize: '14px', padding: '12px 14px', paddingRight: '36px' }}
                      >
                        {(PROVIDER_MODELS[p.name] ?? []).map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════ RIGHT COLUMN ═══════════════ */}
        <div style={{ position: 'sticky', top: '80px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ ...cardStyle, border: '1px solid var(--surface-container-high)' }}>
            <span style={labelStyle}>FORGE SUMMARY</span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Summary rows */}
              {[
                { label: 'Modality',     value: modality.toUpperCase() },
                { label: 'Dataset',      value: selectedDataset || '—' },
                { label: 'Providers',    value: String(providers.length) },
                { label: 'Models',       value: providers.map(p => p.model).join(', ') || '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
                  <span style={{
                    fontSize: '13px',
                    fontFamily: 'var(--font-mono)',
                    color: value === '—' ? 'var(--text-muted)' : 'var(--primary)',
                    textAlign: 'right',
                    wordBreak: 'break-all',
                  }}>{value}</span>
                </div>
              ))}

              <div style={{ height: '1px', backgroundColor: 'var(--surface-container-high)', margin: '8px 0' }} />

              {/* Launch button */}
              <Button
                variant="accent"
                onClick={handleRun}
                disabled={isBusy}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '16px',
                  fontSize: '14px',
                  letterSpacing: '1px',
                  opacity: isBusy ? 0.6 : 1,
                  cursor: isBusy ? 'not-allowed' : 'pointer',
                }}
              >
                {isBusy
                  ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> EVALUATING…</>
                  : <><Play size={15} /> INITIATE EVALUATION</>
                }
              </Button>

              {/* Progress bar in summary card too */}
              {isPolling && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>PROGRESS</span>
                    <span style={{ fontSize: '11px', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{pollingProgress}%</span>
                  </div>
                  <div style={{ height: '3px', backgroundColor: 'var(--surface-container-high)' }}>
                    <div style={{
                      height: '100%',
                      width: `${pollingProgress}%`,
                      backgroundColor: 'var(--accent)',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              )}

              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.6 }}>
                Results will appear in Analytics automatically when the job completes.
              </p>
            </div>
          </div>

          {/* Quick-start hint */}
          <div style={{ ...cardStyle, backgroundColor: 'rgba(232,255,0,0.04)', border: '1px dashed var(--surface-container-high)' }}>
            <span style={{ ...labelStyle, color: 'var(--accent)' }}>QUICK START</span>
            <ol style={{ paddingLeft: '16px', color: 'var(--text-muted)', fontSize: '13px', lineHeight: 2, margin: 0 }}>
              <li>Choose a modality (Text for MMLU)</li>
              <li>Select <code style={{ color: 'var(--accent)' }}>mmlu_sample</code> dataset</li>
              <li>Groq is free & fast — try it first</li>
              <li>Click INITIATE EVALUATION</li>
              <li>Watch progress above, then view Analytics</li>
            </ol>
          </div>
        </div>

      </div>

      {/* CSS animation for spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
