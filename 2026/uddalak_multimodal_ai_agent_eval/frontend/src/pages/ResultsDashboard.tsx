import React from 'react';
import { DataCard } from '../components/ui/DataCard';
import { StatsChart } from '../components/Dashboard/StatsChart';
import { useEval } from '../context/EvalContext';
import type { EvalResult } from '../types/eval';

// ─── Aggregation helpers ──────────────────────────────────────────────────────
function avgOf(results: EvalResult[], key: keyof EvalResult): number {
  const vals = results
    .map(r => r[key])
    .filter((v): v is number => typeof v === 'number');
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

function totalOf(results: EvalResult[], key: keyof EvalResult): number {
  return results.reduce((s, r) => {
    const v = r[key];
    return typeof v === 'number' ? s + v : s;
  }, 0);
}

export const ResultsDashboard: React.FC = () => {
  const { results } = useEval();

  const hasResults = results.length > 0;

  // ── Metric card values ──────────────────────────────────────────────────────
  const avgAccuracy  = hasResults ? (avgOf(results, 'accuracy') * 100).toFixed(1) : '—';
  const avgLatencyMs = hasResults
    ? results.reduce((s, r) => s + (r.latency?.mean_ms ?? 0), 0) / results.length
    : 0;
  const avgLatency   = hasResults ? Math.round(avgLatencyMs).toString() : '—';
  const totalTokens  = hasResults ? totalOf(results, 'total_tokens').toLocaleString() : '—';
  const totalCost    = hasResults
    ? `$${totalOf(results, 'total_cost_usd').toFixed(4)}`
    : '—';

  // ── Chart data from real results ────────────────────────────────────────────
  // Accuracy over runs (last 10)
  const accuracyData = results.slice(-10).map((r, i) => ({
    name: `#${i + 1} ${(r.provider ?? '').split('/')[0] ?? ''}`,
    accuracy: parseFloat(((r.accuracy ?? 0) * 100).toFixed(1)),
  }));

  // Latency per unique provider (last seen value)
  const latencyByProvider: Record<string, number> = {};
  results.forEach(r => {
    const p = (r.provider ?? 'unknown').split('/')[0];
    latencyByProvider[p] = Math.round(r.latency?.mean_ms ?? 0);
  });
  const latencyData = Object.entries(latencyByProvider).map(([provider, latency]) => ({
    provider,
    latency,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>ANALYTICS COMMAND</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          {hasResults
            ? `Live data from ${results.length} completed evaluation run${results.length !== 1 ? 's' : ''}.`
            : 'Run evaluations in The Forge to populate this dashboard.'}
        </p>
      </div>

      {/* ── Metric Cards ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
        <DataCard label="AVG ACCURACY"     value={avgAccuracy}  suffix={hasResults ? '%'  : ''} />
        <DataCard label="AVG LATENCY"      value={avgLatency}   suffix={hasResults ? 'MS' : ''} />
        <DataCard label="TOTAL TOKENS"     value={totalTokens}  suffix="" />
        <DataCard label="TOTAL COST"       value={totalCost}    suffix="" />
      </div>

      {/* ── Charts ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
        <div style={{ backgroundColor: 'var(--surface-container)', padding: '24px' }}>
          <span className="label-sm" style={{ marginBottom: '16px', display: 'block' }}>
            Accuracy Per Run
          </span>
          {accuracyData.length > 0 ? (
            <StatsChart type="area" data={accuracyData} dataKey="accuracy" categoryKey="name" />
          ) : (
            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No data yet — run an evaluation first
            </div>
          )}
        </div>
        <div style={{ backgroundColor: 'var(--surface-container)', padding: '24px' }}>
          <span className="label-sm" style={{ marginBottom: '16px', display: 'block' }}>
            Latency by Provider (MS)
          </span>
          {latencyData.length > 0 ? (
            <StatsChart type="bar" data={latencyData} dataKey="latency" categoryKey="provider" />
          ) : (
            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No data yet
            </div>
          )}
        </div>
      </div>

      {/* ── Results History ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 className="label-sm">Evaluation History</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', backgroundColor: 'var(--surface-container-high)' }}>
          {!hasResults ? (
            <div style={{ backgroundColor: 'var(--surface-dim)', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No evaluations recorded yet. Visit the Forge to start.
            </div>
          ) : (
            results.map((res, idx) => {
              const acc = typeof res.accuracy === 'number' ? (res.accuracy * 100).toFixed(0) + '%' : '—';
              const lat = res.latency?.mean_ms ? Math.round(res.latency.mean_ms) + 'ms' : '—';
              const tok = typeof res.total_tokens === 'number' ? res.total_tokens.toLocaleString() : '—';
              return (
                <div key={`${res.job_id}-${idx}`} style={{
                  backgroundColor: 'var(--surface-dim)',
                  padding: '14px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                    <span className="data-mono" style={{ fontSize: '11px', color: 'var(--accent)', minWidth: '72px' }}>
                      #{res.job_id.slice(0, 8)}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>{res.provider ?? 'unknown'}</span>
                      <span className="label-sm" style={{ fontSize: '9px' }}>{res.modality}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span className="label-sm">Accuracy</span>
                      <span className="data-mono" style={{
                        fontSize: '13px',
                        color: res.accuracy && res.accuracy > 0 ? 'var(--accent)' : 'var(--text-muted)',
                      }}>{acc}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span className="label-sm">Latency</span>
                      <span className="data-mono" style={{ fontSize: '13px' }}>{lat}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span className="label-sm">Tokens</span>
                      <span className="data-mono" style={{ fontSize: '13px' }}>{tok}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
