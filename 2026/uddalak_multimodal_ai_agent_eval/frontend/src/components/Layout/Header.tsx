import React from 'react';
import { useEval } from '../../context/EvalContext';

export const Header: React.FC = () => {
  const { results } = useEval();

  // Derive live stats from real results
  const totalJobs = results.length;
  const providers = [...new Set(results.map(r => r.provider).filter(Boolean))];
  const avgAccuracy =
    totalJobs > 0
      ? (results.reduce((s, r) => s + (r.accuracy ?? 0), 0) / totalJobs) * 100
      : null;

  return (
    <header style={{
      height: '64px',
      backgroundColor: 'var(--surface-dim)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      position: 'sticky',
      top: 0,
      zIndex: 10,
      borderBottom: '1px solid var(--surface-container-high)',
    }}>
      {/* Left: project context */}
      <div style={{ display: 'flex', gap: '32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="label-sm">Active Project</span>
          <span style={{ fontSize: '14px' }}>GSoC 2026 PoC</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="label-sm">Eval Jobs Run</span>
          <span style={{ fontSize: '14px', fontFamily: 'var(--font-mono)' }}>
            {totalJobs > 0 ? totalJobs : '—'}
          </span>
        </div>
        {avgAccuracy !== null && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="label-sm">Avg Accuracy</span>
            <span style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
              {avgAccuracy.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Right: live active providers from actual eval results */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {providers.length === 0 ? (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No evals run yet</span>
        ) : (
          providers.slice(0, 3).map(p => (
            <div key={p} style={{
              padding: '4px 12px',
              backgroundColor: 'var(--surface-container-high)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              <div style={{ width: '4px', height: '4px', backgroundColor: 'var(--accent)' }} />
              {p}
            </div>
          ))
        )}
      </div>
    </header>
  );
};
