import React from 'react';

interface LeaderboardEntry {
  model: string;
  provider: string;
  tfs: number;
  success_rate: number;
  avg_latency: number;
}

const mockLeaderboard: LeaderboardEntry[] = [
  { model: 'gpt-4o', provider: 'OpenAI', tfs: 0.94, success_rate: 0.96, avg_latency: 420 },
  { model: 'claude-3-5-sonnet', provider: 'Anthropic', tfs: 0.91, success_rate: 0.92, avg_latency: 680 },
  { model: 'gemini-1.5-pro', provider: 'Google', tfs: 0.88, success_rate: 0.89, avg_latency: 510 },
  { model: 'llama-3-70b', provider: 'Meta (HF)', tfs: 0.82, success_rate: 0.85, avg_latency: 890 },
];

export const AgentLeaderboard: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h3 className="label-sm">Trajectory Fidelity Leaderboard (TFS)</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>Ranking models by their ability to follow gold-standard tool-call sequences.</p>
      </div>

      <div style={{ backgroundColor: 'var(--surface-container)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--surface-container-high)' }}>
              <th className="label-sm" style={{ padding: '16px 24px' }}>Rank</th>
              <th className="label-sm" style={{ padding: '16px 24px' }}>Model</th>
              <th className="label-sm" style={{ padding: '16px 24px' }}>TFS Score</th>
              <th className="label-sm" style={{ padding: '16px 24px' }}>Success</th>
              <th className="label-sm" style={{ padding: '16px 24px' }}>Latency</th>
            </tr>
          </thead>
          <tbody>
            {mockLeaderboard.map((entry, i) => (
              <tr key={entry.model} style={{ 
                borderBottom: i === mockLeaderboard.length - 1 ? 'none' : '1px solid var(--surface-container-high)',
                backgroundColor: i === 0 ? 'rgba(232, 255, 0, 0.05)' : 'transparent'
              }}>
                <td className="data-mono" style={{ padding: '16px 24px', fontSize: '14px' }}>0{i+1}</td>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>{entry.model}</span>
                    <span className="label-sm" style={{ fontSize: '9px' }}>{entry.provider}</span>
                  </div>
                </td>
                <td className="data-mono" style={{ padding: '16px 24px', color: 'var(--accent)', fontSize: '16px', fontWeight: 600 }}>
                  {(entry.tfs * 100).toFixed(1)}%
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', backgroundColor: entry.success_rate >= 0.9 ? 'var(--accent)' : '#ffb4ab' }} />
                    <span className="data-mono" style={{ fontSize: '13px' }}>{(entry.success_rate * 100).toFixed(1)}%</span>
                  </div>
                </td>
                <td className="data-mono" style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  {entry.avg_latency}ms
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
