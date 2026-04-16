import React from 'react';

interface DataCardProps {
  label: string;
  value: string | number;
  suffix?: string;
  trend?: {
    value: number;
    isUp: boolean;
  };
}

export const DataCard: React.FC<DataCardProps> = ({ label, value, suffix, trend }) => {
  return (
    <div style={{
      backgroundColor: 'var(--surface-container)',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      position: 'relative'
    }}>
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '2px', 
        height: '100%', 
        backgroundColor: 'var(--surface-container-highest)' 
      }} />
      <span className="label-sm">{label}</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span className="data-mono" style={{ fontSize: '24px', fontWeight: 500 }}>{value}</span>
        {suffix && <span className="label-sm" style={{ fontSize: '10px' }}>{suffix}</span>}
      </div>
      {trend && (
        <div style={{ 
          fontSize: '11px', 
          color: trend.isUp ? 'var(--accent)' : '#ffb4ab',
          marginTop: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          {trend.isUp ? '↑' : '↓'} {trend.value}%
          <span style={{ color: 'var(--text-muted)' }}>vs last run</span>
        </div>
      )}
    </div>
  );
};
