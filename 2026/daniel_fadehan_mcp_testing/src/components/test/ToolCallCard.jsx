import { useEffect, useState } from 'react';
import { formatToolDisplay } from '../../utils/toolDisplay.js';

function StatusIcon({ status }) {
  if (status === 'running') {
    return <div className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-amber-200 border-t-amber-500 animate-spin" />;
  }

  if (status === 'failed') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-red-500">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    );
  }

  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-emerald-500">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function statusClasses(status) {
  if (status === 'running') {
    return 'border-amber-200 bg-[#fffaf0]';
  }

  if (status === 'failed') {
    return 'border-red-200 bg-red-50/80';
  }

  return 'border-neutral-200 bg-white';
}

function statusLabel(status) {
  if (status === 'running') return 'Running';
  if (status === 'failed') return 'Failed';
  return 'Completed';
}

function summarizeResult(toolCall) {
  if (toolCall.status === 'running') {
    return 'Waiting for the tool to finish before showing details.';
  }

  if (toolCall.status === 'failed') {
    return toolCall.result?.error?.message || 'The tool returned an error.';
  }

  return formatToolDisplay({ args: toolCall.args, result: toolCall.result }).toolResultDisplay.summary || 'Finished successfully.';
}

function formatPreview(value) {
  if (value == null) return 'No data.';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function PreviewBlock({ title, label, value, emptyMessage }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{title}</div>
        {label ? <div className="text-[10px] font-medium text-neutral-400">{label}</div> : null}
      </div>
      {value == null ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-white px-3 py-3 text-xs text-neutral-500">
          {emptyMessage}
        </div>
      ) : (
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-neutral-200 bg-white p-3 font-mono text-xs text-neutral-700 shadow-sm">
          {formatPreview(value)}
        </pre>
      )}
    </div>
  );
}

export function ToolCallCard({ toolCall, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const display = formatToolDisplay({ args: toolCall.args, result: toolCall.result });
  const hasPreview = display.toolResultDisplay.value != null;
  const hasInput = display.toolInputDisplay.value != null;

  useEffect(() => {
    if (toolCall.status === 'running') {
      setExpanded(false);
    }
  }, [toolCall.status]);

  return (
    <div className={`overflow-hidden rounded-2xl border shadow-sm transition-colors ${statusClasses(toolCall.status)}`}>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.02]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-neutral-400">
              <path d="m18 16 4-4-4-4" />
              <path d="m6 8-4 4 4 4" />
              <path d="m14.5 4-5 16" />
            </svg>
            <code className="truncate font-mono text-[12px] font-medium text-neutral-800">
              {toolCall.toolName}
            </code>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${
              toolCall.status === 'running'
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : toolCall.status === 'failed'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-emerald-200 bg-white text-emerald-700'
            }`}>
              {statusLabel(toolCall.status)}
            </span>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-neutral-600">
            {toolCall.summary || summarizeResult(toolCall)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {hasInput ? (
              <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[10px] font-medium text-neutral-500">
                {display.toolInputDisplay.summary}
              </span>
            ) : null}
            {display.isMcpAppResult ? (
              <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                Opens app view
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <StatusIcon status={toolCall.status} />
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`text-neutral-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </button>

      {expanded ? (
        <div className="space-y-4 border-t border-black/5 bg-black/[0.02] px-4 py-3">
          <PreviewBlock
            title="Input"
            label={display.toolInputDisplay.label}
            value={display.toolInputDisplay.value}
            emptyMessage="No input arguments were passed to this tool call."
          />

          {toolCall.status === 'running' && !toolCall.result ? (
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Result</div>
              <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-3 text-xs text-neutral-500">
                <div className="h-3.5 w-3.5 rounded-full border-2 border-amber-200 border-t-amber-500 animate-spin" />
                Waiting for tool response…
              </div>
            </div>
          ) : (
            <PreviewBlock
              title="Result"
              label={display.toolResultDisplay.label}
              value={display.toolResultDisplay.value}
              emptyMessage="This tool completed without a user-facing result payload."
            />
          )}

          {display.hasRawDetails ? (
            <details className="rounded-xl border border-neutral-200 bg-white shadow-sm">
              <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                Raw MCP Response
              </summary>
              <div className="border-t border-neutral-200 px-3 py-3">
                <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs text-neutral-700">
                  {formatPreview(display.rawResult)}
                </pre>
              </div>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
