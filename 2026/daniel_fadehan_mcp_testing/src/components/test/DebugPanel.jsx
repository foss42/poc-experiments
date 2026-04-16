import { useState } from 'react';
import { useTestStore } from '../../stores/testStore';
import { NODE_TYPE_META } from '../../utils/constants';

// ─── Icons ────────────────────────────────────────────────────────────────────

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ChevronDownIcon = ({ open }) => (
  <svg
    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

const CollapseIcon = ({ collapsed }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// ─── Node type visual config ──────────────────────────────────────────────────

const NODE_COLORS = {
  input:        { dot: '#22c55e', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.2)',  label: '#15803d' },
  apiCall:      { dot: '#a855f7', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)', label: '#7e22ce' },
  transform:    { dot: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', label: '#1d4ed8' },
  condition:    { dot: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)', label: '#c2410c' },
  code:         { dot: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', label: '#065f46' },
  output:       { dot: '#f43f5e', bg: 'rgba(244,63,94,0.08)',  border: 'rgba(244,63,94,0.2)',  label: '#be123c' },
  errorHandler: { dot: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', label: '#92400e' },
};

function getNodeColor(type) {
  return NODE_COLORS[type] || { dot: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)', label: '#374151' };
}

function getNodeLabel(type) {
  return NODE_TYPE_META[type]?.label || type;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatJson(val) {
  if (val === undefined || val === null) return 'null';
  if (typeof val === 'string') return val;
  return JSON.stringify(val, null, 2);
}

function copyText(text) {
  try { navigator.clipboard.writeText(text); } catch {}
}

// ─── StepRow ─────────────────────────────────────────────────────────────────

function StepRow({ step, index, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);

  const colors = getNodeColor(step.type);
  const label = getNodeLabel(step.type);
  const isError = !!step.error;

  const handleCopy = (text, which) => {
    copyText(text);
    if (which === 'input') { setCopiedInput(true); setTimeout(() => setCopiedInput(false), 1500); }
    else { setCopiedOutput(true); setTimeout(() => setCopiedOutput(false), 1500); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Connector line */}
      {!isLast && (
        <div style={{
          position: 'absolute', left: 19, top: 40, width: 1, bottom: -2,
          background: 'linear-gradient(to bottom, #e5e7eb, transparent)',
          zIndex: 0,
        }} />
      )}

      {/* Row header */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
          background: expanded ? colors.bg : 'transparent',
          border: 'none', cursor: 'pointer', textAlign: 'left',
          borderRadius: 8, transition: 'background 0.15s ease', position: 'relative', zIndex: 1,
          width: '100%',
        }}
        onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = 'rgba(0,0,0,0.025)'; }}
        onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = 'transparent'; }}
      >
        {/* Status dot */}
        <div style={{
          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
          background: isError ? '#fee2e2' : colors.bg,
          border: `1.5px solid ${isError ? '#fca5a5' : colors.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isError
            ? <span style={{ color: '#ef4444' }}><XIcon /></span>
            : <span style={{ color: colors.dot }}><CheckIcon /></span>
          }
        </div>

        {/* Step index + label */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 12, fontWeight: 600, color: isError ? '#dc2626' : colors.label,
              fontFamily: 'inherit',
            }}>
              {label}
            </span>
            <span style={{
              fontSize: 10, fontFamily: 'monospace', color: '#9ca3af',
              background: '#f9fafb', border: '1px solid #e5e7eb',
              padding: '1px 5px', borderRadius: 4, maxWidth: 120,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {step.nodeId}
            </span>
          </div>
          {isError && (
            <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2, lineHeight: 1.4 }}>
              {step.error}
            </div>
          )}
        </div>

        {/* Duration badge */}
        {step.durationMs !== undefined && (
          <span style={{
            fontSize: 11, fontWeight: 500, color: '#6b7280',
            background: '#f3f4f6', border: '1px solid #e5e7eb',
            padding: '1px 7px', borderRadius: 10, flexShrink: 0,
          }}>
            {step.durationMs}ms
          </span>
        )}

        {/* Expand chevron */}
        <span style={{ color: '#9ca3af', flexShrink: 0 }}>
          <ChevronDownIcon open={expanded} />
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          marginLeft: 42, marginBottom: 6,
          background: '#fafafa', border: '1px solid #e5e7eb',
          borderRadius: 8, overflow: 'hidden',
        }}>
          {/* Input tab */}
          <ExpandedSection
            label="Input State"
            data={step.input}
            copied={copiedInput}
            onCopy={() => handleCopy(formatJson(step.input), 'input')}
            accent={colors.label}
          />

          {isError ? (
            <div style={{ padding: '10px 14px', borderTop: '1px solid #fee2e2', background: '#fff5f5' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Error
              </div>
              <div style={{ fontSize: 12, color: '#dc2626', fontFamily: 'monospace', lineHeight: 1.5 }}>
                {step.error}
              </div>
            </div>
          ) : (
            step.output !== undefined && (
              <ExpandedSection
                label="Output State"
                data={step.output}
                copied={copiedOutput}
                onCopy={() => handleCopy(formatJson(step.output), 'output')}
                accent={colors.label}
                borderTop
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

function ExpandedSection({ label, data, copied, onCopy, accent, borderTop }) {
  return (
    <div style={{ borderTop: borderTop ? '1px solid #e5e7eb' : 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 14px 6px',
      }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: accent, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
        <button
          onClick={onCopy}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 10, color: copied ? '#22c55e' : '#9ca3af',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '2px 4px', borderRadius: 4, transition: 'color 0.2s',
          }}
        >
          <CopyIcon />
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre style={{
        margin: 0, padding: '6px 14px 12px',
        fontSize: 11, fontFamily: 'monospace', lineHeight: 1.6,
        color: '#374151', background: 'transparent',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        maxHeight: 200, overflowY: 'auto',
      }}>
        {formatJson(data)}
      </pre>
    </div>
  );
}

// ─── Final Output Bar ─────────────────────────────────────────────────────────

function FinalOutputBar({ response }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const data = response.success ? response.data : response.error;
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  const handleCopy = () => {
    copyText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{
      borderTop: '1px solid #e5e7eb',
      background: response.success ? 'rgba(240,253,244,0.7)' : 'rgba(254,242,242,0.7)',
    }}>
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: response.success ? '#15803d' : '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {response.success ? '✓ Final Output' : '✗ Execution Failed'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={e => { e.stopPropagation(); handleCopy(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 10, color: copied ? '#22c55e' : '#9ca3af',
              background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
            }}
          >
            <CopyIcon />
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <span style={{ color: '#9ca3af' }}>
            <CollapseIcon collapsed={!expanded} />
          </span>
        </div>
      </button>

      {expanded && (
        <pre style={{
          margin: 0, padding: '0 14px 12px',
          fontSize: 11, fontFamily: 'monospace', lineHeight: 1.6,
          color: response.success ? '#166534' : '#991b1b',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          maxHeight: 200, overflowY: 'auto',
        }}>
          {text}
        </pre>
      )}
    </div>
  );
}

// ─── Main DebugPanel ──────────────────────────────────────────────────────────

export function DebugPanel({ isCollapsed, onToggle }) {
  const { lastResponse, isExecuting, testMode } = useTestStore();

  // Only show in builder mode (has steps), or when there is a response
  if (testMode !== 'builder') return null;

  const steps = lastResponse?.steps;
  const totalMs = lastResponse?.responseTime;
  const hasData = !!lastResponse || isExecuting;

  if (!hasData) return null;

  return (
    <div style={{
      borderTop: '1px solid #e5e7eb',
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      maxHeight: isCollapsed ? 38 : 340,
      transition: 'max-height 0.25s cubic-bezier(0.4,0,0.2,1)',
      overflow: 'hidden',
    }}>
      {/* Panel header */}
      <button
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 14px', height: 38, flexShrink: 0,
          background: 'none', border: 'none', cursor: 'pointer',
          borderBottom: isCollapsed ? 'none' : '1px solid #f3f4f6',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Animated status dot */}
          <span style={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
            background: isExecuting ? '#f59e0b'
              : lastResponse?.success ? '#22c55e' : '#ef4444',
            boxShadow: isExecuting ? '0 0 0 2px #fef3c7' : 'none',
            display: 'inline-block',
          }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#374151', letterSpacing: '0.03em' }}>
            {isExecuting ? 'Executing…' : lastResponse?.success ? 'Execution Completed' : 'Execution Failed'}
          </span>
          {!isExecuting && totalMs !== undefined && (
            <span style={{
              fontSize: 10, color: '#9ca3af', background: '#f9fafb',
              border: '1px solid #e5e7eb', padding: '1px 6px', borderRadius: 8,
            }}>
              {totalMs}ms total
            </span>
          )}
          {!isExecuting && steps && (
            <span style={{
              fontSize: 10, color: '#9ca3af', background: '#f9fafb',
              border: '1px solid #e5e7eb', padding: '1px 6px', borderRadius: 8,
            }}>
              {steps.length} step{steps.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <span style={{ color: '#9ca3af' }}>
          <CollapseIcon collapsed={isCollapsed} />
        </span>
      </button>

      {/* Body */}
      {!isCollapsed && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {isExecuting ? (
            <ExecutingPlaceholder />
          ) : (
            <>
              {/* Step list */}
              {steps && steps.length > 0 && (
                <div style={{ padding: '8px 4px 4px' }}>
                  {steps.map((step, i) => (
                    <StepRow key={step.nodeId + i} step={step} index={i} isLast={i === steps.length - 1} />
                  ))}
                </div>
              )}

              {/* Final output */}
              {lastResponse && (
                <FinalOutputBar response={lastResponse} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ExecutingPlaceholder() {
  return (
    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[80, 60, 90, 50].map((w, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#f3f4f6', flexShrink: 0 }} />
          <div style={{ height: 12, width: `${w}%`, background: '#f3f4f6', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
      ))}
    </div>
  );
}
