import { useState } from 'react';
import { useMcpStore } from '../../stores/mcpStore';
import { NODE_TYPE_META } from '../../utils/constants';

// ─── Icons ────────────────────────────────────────────────────────────────────

const CheckIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ChevronIcon = ({ open }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s ease', flexShrink: 0 }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const CopyIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

const PanelIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <line x1="3" y1="15" x2="21" y2="15"/>
  </svg>
);

// ─── Node color map ───────────────────────────────────────────────────────────

const NODE_COLORS = {
  input:        { dot: '#22c55e', ring: 'rgba(34,197,94,0.2)',  text: '#15803d',  bg: 'rgba(240,253,244,0.6)' },
  apiCall:      { dot: '#a855f7', ring: 'rgba(168,85,247,0.2)', text: '#7e22ce',  bg: 'rgba(250,245,255,0.6)' },
  transform:    { dot: '#3b82f6', ring: 'rgba(59,130,246,0.2)', text: '#1d4ed8',  bg: 'rgba(239,246,255,0.6)' },
  condition:    { dot: '#f97316', ring: 'rgba(249,115,22,0.2)', text: '#c2410c',  bg: 'rgba(255,247,237,0.6)' },
  code:         { dot: '#10b981', ring: 'rgba(16,185,129,0.2)', text: '#065f46',  bg: 'rgba(236,253,245,0.6)' },
  output:       { dot: '#f43f5e', ring: 'rgba(244,63,94,0.2)',  text: '#be123c',  bg: 'rgba(255,241,242,0.6)' },
  errorHandler: { dot: '#f59e0b', ring: 'rgba(245,158,11,0.2)', text: '#92400e', bg: 'rgba(255,251,235,0.6)' },
};

function getNC(type) {
  return NODE_COLORS[type] || { dot: '#6b7280', ring: 'rgba(107,114,128,0.2)', text: '#374151', bg: '#f9fafb' };
}

function getLabel(type) {
  return NODE_TYPE_META[type]?.label || type;
}

function copyText(text) {
  try { navigator.clipboard.writeText(text); } catch {}
}

function fmt(val) {
  if (val === undefined || val === null) return 'null';
  if (typeof val === 'string') return val;
  return JSON.stringify(val, null, 2);
}

// ─── Step row ─────────────────────────────────────────────────────────────────

function StepRow({ step, index, total }) {
  const [open, setOpen] = useState(false);
  const [copiedIn, setCopiedIn] = useState(false);
  const [copiedOut, setCopiedOut] = useState(false);

  const isErr = !!step.error;
  const c = getNC(step.type);
  const label = getLabel(step.type);
  const isLast = index === total - 1;

  const doCopy = (text, which) => {
    copyText(text);
    if (which === 'in') { setCopiedIn(true); setTimeout(() => setCopiedIn(false), 1400); }
    else { setCopiedOut(true); setTimeout(() => setCopiedOut(false), 1400); }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Vertical connector line */}
      {!isLast && (
        <div style={{
          position: 'absolute', left: 15, top: 28, bottom: -2, width: 1,
          background: 'linear-gradient(to bottom,#d1d5db 80%,transparent)',
          zIndex: 0,
        }} />
      )}

      {/* Header row */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position: 'relative', zIndex: 1,
          display: 'flex', alignItems: 'center', gap: 9,
          width: '100%', padding: '5px 12px 5px 10px',
          background: open ? c.bg : 'transparent',
          border: 'none', cursor: 'pointer', textAlign: 'left',
          borderRadius: 6, transition: 'background 0.12s',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent'; }}
      >
        {/* Status bubble */}
        <div style={{
          width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
          border: `1.5px solid ${isErr ? '#fca5a5' : c.ring}`,
          background: isErr ? '#fee2e2' : c.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: isErr ? '#ef4444' : c.dot, display: 'flex' }}>
            {isErr ? <XIcon /> : <CheckIcon />}
          </span>
        </div>

        {/* Node label + id */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: isErr ? '#dc2626' : c.text, whiteSpace: 'nowrap' }}>
            {label}
          </span>
          <span style={{
            fontSize: 10, fontFamily: 'monospace', color: '#9ca3af',
            background: '#f3f4f6', border: '1px solid #e5e7eb',
            padding: '0 5px', borderRadius: 3, maxWidth: 130,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {step.nodeId}
          </span>
          {isErr && (
            <span style={{ fontSize: 10, color: '#ef4444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              – {step.error}
            </span>
          )}
        </div>

        {/* Duration */}
        {step.durationMs !== undefined && (
          <span style={{
            fontSize: 10, fontWeight: 500, color: '#9ca3af',
            background: '#f9fafb', border: '1px solid #e5e7eb',
            padding: '1px 6px', borderRadius: 8, flexShrink: 0, whiteSpace: 'nowrap',
          }}>
            {step.durationMs}ms
          </span>
        )}

        <span style={{ color: '#9ca3af', flexShrink: 0 }}>
          <ChevronIcon open={open} />
        </span>
      </button>

      {/* Expanded detail */}
      {open && (
        <div style={{
          marginLeft: 30, marginBottom: 4,
          border: '1px solid #e5e7eb', borderRadius: 7,
          overflow: 'hidden', background: '#fafafa',
        }}>

          {/* Input state */}
          <JsonSection
            label="Input"
            data={step.input}
            accent={c.text}
            copied={copiedIn}
            onCopy={() => doCopy(fmt(step.input), 'in')}
          />

          {/* Error or Output */}
          {isErr ? (
            <div style={{ borderTop: '1px solid #fee2e2', background: '#fff5f5', padding: '8px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                Error
              </div>
              <div style={{ fontSize: 11, color: '#dc2626', fontFamily: 'monospace', lineHeight: 1.5 }}>
                {step.error}
              </div>
            </div>
          ) : (
            step.output !== undefined && (
              <JsonSection
                label="Output"
                data={step.output}
                accent={c.text}
                copied={copiedOut}
                onCopy={() => doCopy(fmt(step.output), 'out')}
                topBorder
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

function JsonSection({ label, data, accent, copied, onCopy, topBorder }) {
  return (
    <div style={{ borderTop: topBorder ? '1px solid #e5e7eb' : 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px 4px' }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {label}
        </span>
        <button
          onClick={onCopy}
          style={{
            display: 'flex', alignItems: 'center', gap: 3, fontSize: 9,
            color: copied ? '#22c55e' : '#9ca3af', background: 'none',
            border: 'none', cursor: 'pointer', padding: '1px 3px',
          }}
        >
          <CopyIcon />
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre style={{
        margin: 0, padding: '0 12px 10px',
        fontSize: 10.5, fontFamily: 'monospace', lineHeight: 1.65,
        color: '#374151', background: 'transparent',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        maxHeight: 180, overflowY: 'auto',
      }}>
        {fmt(data)}
      </pre>
    </div>
  );
}

// ─── Final output bar ─────────────────────────────────────────────────────────

function FinalOutputBar({ result }) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const text = fmt(result.success ? result.data : result.error);

  const doCopy = () => {
    copyText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div style={{
      borderTop: '1px solid #e5e7eb',
      background: result.success ? 'rgba(240,253,244,0.8)' : 'rgba(254,242,242,0.8)',
      flexShrink: 0,
    }}>
      <button
        onClick={() => setCollapsed(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 14px', background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          color: result.success ? '#15803d' : '#dc2626',
        }}>
          {result.success ? '✓ Final Output' : '✗ Execution Failed'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={e => { e.stopPropagation(); doCopy(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 3, fontSize: 10,
              color: copied ? '#22c55e' : '#9ca3af', background: 'none',
              border: 'none', cursor: 'pointer', padding: '1px 3px',
            }}
          >
            <CopyIcon />
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <span style={{ color: '#9ca3af' }}><ChevronIcon open={!collapsed} /></span>
        </div>
      </button>
      {!collapsed && (
        <pre style={{
          margin: 0, padding: '0 14px 12px',
          fontSize: 11, fontFamily: 'monospace', lineHeight: 1.65,
          color: result.success ? '#166534' : '#991b1b',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          maxHeight: 160, overflowY: 'auto',
        }}>
          {text}
        </pre>
      )}
    </div>
  );
}

// ─── Skeleton while running ───────────────────────────────────────────────────

function RunningPlaceholder() {
  return (
    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
      {[75, 55, 85, 50].map((w, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, opacity: 0.6 + i * 0.1 }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#e5e7eb', flexShrink: 0 }} />
          <div style={{ height: 11, width: `${w}%`, background: '#e5e7eb', borderRadius: 5 }} />
        </div>
      ))}
    </div>
  );
}

// ─── Main panel ──────────────────────────────────────────────────────────────

const PANEL_HEIGHT = 280;

export function WorkflowDebugPanel() {
  const { executionState, lastExecutionResult, resetExecutionState } = useMcpStore();
  const [collapsed, setCollapsed] = useState(false);

  const isRunning = executionState.status === 'running';
  const isDone = executionState.status === 'completed' || executionState.status === 'failed';
  const isSuccess = executionState.status === 'completed';

  // Total elapsed ms
  const elapsedMs = executionState.startTime && executionState.endTime
    ? executionState.endTime - executionState.startTime
    : null;

  const steps = lastExecutionResult?.steps || [];

  // Don't render until there's something to show
  if (executionState.status === 'idle' && !lastExecutionResult) return null;

  return (
    <div style={{
      height: collapsed ? 36 : PANEL_HEIGHT,
      minHeight: collapsed ? 36 : PANEL_HEIGHT,
      transition: 'height 0.22s cubic-bezier(0.4,0,0.2,1)',
      borderTop: '1px solid #e5e7eb',
      background: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* ── Panel header bar ── */}
      <div style={{
        height: 36, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px',
        borderBottom: collapsed ? 'none' : '1px solid #f3f4f6',
        background: '#fafafa',
      }}>
        {/* Left: status + counts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PanelIcon />

          {/* Animated dot */}
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: isRunning ? '#f59e0b' : isSuccess ? '#22c55e' : '#ef4444',
            display: 'inline-block', flexShrink: 0,
            animation: isRunning ? 'debugPulse 1s ease-in-out infinite' : 'none',
          }} />

          <span style={{ fontSize: 11, fontWeight: 600, color: '#374151', userSelect: 'none' }}>
            {isRunning ? 'Executing…' : isSuccess ? 'Execution Completed' : 'Execution Failed'}
          </span>

          {elapsedMs !== null && (
            <span style={{
              fontSize: 10, color: '#6b7280',
              background: '#f3f4f6', border: '1px solid #e5e7eb',
              padding: '1px 6px', borderRadius: 8,
            }}>
              {elapsedMs}ms
            </span>
          )}

          {steps.length > 0 && (
            <span style={{
              fontSize: 10, color: '#6b7280',
              background: '#f3f4f6', border: '1px solid #e5e7eb',
              padding: '1px 6px', borderRadius: 8,
            }}>
              {steps.length} step{steps.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Right: collapse + clear */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isDone && (
            <button
              onClick={() => { resetExecutionState(); }}
              style={{
                fontSize: 10, color: '#9ca3af',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '2px 6px', borderRadius: 4,
                fontFamily: 'inherit',
              }}
              title="Clear execution"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setCollapsed(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 22, height: 22, borderRadius: 4,
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#9ca3af',
            }}
            title={collapsed ? 'Expand debug panel' : 'Collapse debug panel'}
          >
            <ChevronIcon open={!collapsed} />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      {!collapsed && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {isRunning && !steps.length ? (
            <RunningPlaceholder />
          ) : (
            <>
              {/* Steps list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '6px 4px 0' }}>
                {steps.map((step, i) => (
                  <StepRow key={step.nodeId + i} step={step} index={i} total={steps.length} />
                ))}
                {isRunning && steps.length > 0 && (
                  <div style={{ padding: '4px 10px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#f3f4f6', flexShrink: 0, animation: 'debugPulse 1s ease-in-out infinite' }} />
                    <div style={{ height: 10, width: '40%', background: '#f3f4f6', borderRadius: 5, animation: 'debugPulse 1s ease-in-out infinite' }} />
                  </div>
                )}
              </div>

              {/* Final output */}
              {lastExecutionResult && isDone && (
                <FinalOutputBar result={lastExecutionResult} />
              )}
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes debugPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
