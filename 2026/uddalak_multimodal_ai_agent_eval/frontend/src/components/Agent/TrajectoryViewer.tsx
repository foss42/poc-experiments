import React from 'react';
import { Check, X, ArrowRight } from 'lucide-react';

interface ToolCall {
  name: string;
  arguments: any;
}

interface TrajectoryProps {
  expected: string[];
  actual: ToolCall[];
}

export const TrajectoryViewer: React.FC<TrajectoryProps> = ({ expected, actual }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="label-sm">Trajectory Trace Diff</div>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr auto 1fr', 
        gap: '24px',
        backgroundColor: 'var(--surface-container)',
        padding: '24px'
      }}>
        {/* Expected Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span className="label-sm" style={{ color: 'var(--primary)', opacity: 0.6 }}>Expected Sequence</span>
          {expected.map((name, i) => (
            <div key={i} style={{ 
              backgroundColor: 'var(--surface-dim)', 
              padding: '12px', 
              fontSize: '13px',
              fontFamily: 'var(--font-mono)',
              borderLeft: '2px solid var(--accent)'
            }}>
              {name}()
            </div>
          ))}
        </div>

        {/* Diff Separator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '32px' }}>
          {expected.map((_, i) => (
            <div key={i} style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowRight size={16} color="var(--text-muted)" />
            </div>
          ))}
        </div>

        {/* Actual Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span className="label-sm" style={{ color: 'var(--primary)', opacity: 0.6 }}>Actual Output</span>
          {expected.map((name, i) => {
            const actualCall = actual[i];
            const isMatch = actualCall && actualCall.name === name;
            
            return (
              <div key={i} style={{ 
                backgroundColor: 'var(--surface-dim)', 
                padding: '12px', 
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                borderLeft: `2px solid ${isMatch ? 'var(--accent)' : '#ffb4ab'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: isMatch ? 'var(--primary)' : '#ffb4ab'
              }}>
                <span>{actualCall ? `${actualCall.name}()` : 'MISSING'}</span>
                {isMatch ? <Check size={14} color="var(--accent)" /> : <X size={14} color="#ffb4ab" />}
              </div>
            );
          })}
        </div>
      </div>
      
      {actual.length > expected.length && (
        <div style={{ backgroundColor: 'rgba(255, 180, 171, 0.1)', padding: '12px', fontSize: '12px', color: '#ffb4ab' }}>
          Warning: Model produced {actual.length - expected.length} extraneous tool calls.
        </div>
      )}
    </div>
  );
};
