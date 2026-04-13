/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import { RuntimeConversation } from '../RuntimeConversation.jsx';
import { ToolCallCard } from '../ToolCallCard.jsx';
import { Button } from '../../ui/Button';
import { formatDateTime, formatDuration } from '../../../utils/evaluation/helpers.js';

function prettyJson(value) {
  if (value == null) return '—';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function JsonBlock({ value }) {
  if (value == null) {
    return (
      <pre className="overflow-x-auto border border-neutral-200 bg-neutral-50 p-3 text-[12px] leading-relaxed text-neutral-700">
        —
      </pre>
    );
  }
  
  let jsonString;
  try {
    jsonString = JSON.stringify(value, null, 2);
  } catch {
    jsonString = String(value);
  }

  // Simple regex-based syntax highlighting for JSON
  const coloredJson = jsonString.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = 'text-[#D35400]'; // number
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'text-[#2980B9] font-medium'; // key
        } else {
          cls = 'text-[#A67C00]'; // string
        }
      } else if (/true|false/.test(match)) {
        cls = 'text-[#8E44AD] font-medium'; // boolean
      } else if (/null/.test(match)) {
        cls = 'text-[#7F8C8D] font-medium'; // null
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );

  return (
    <pre 
      className="overflow-x-auto border border-neutral-200 bg-neutral-50 p-3 text-[12px] leading-relaxed text-neutral-700"
      dangerouslySetInnerHTML={{ __html: coloredJson }}
    />
  );
}

function tabButtonClasses(active) {
  return active
    ? 'border-neutral-900 bg-white text-neutral-900 shadow-sm'
    : 'border-transparent bg-transparent text-neutral-500 hover:text-neutral-900';
}

function statusClasses(status) {
  switch (status) {
    case 'passed':
    case 'completed':
    case 'matched':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'running':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'partial':
    case 'reordered':
    case 'support':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'failed':
    case 'unexpected':
    case 'distractor':
      return 'border-red-200 bg-red-50 text-red-700';
    default:
      return 'border-neutral-200 bg-neutral-50 text-neutral-600';
  }
}

function getSpanStatus(run, span) {
  if (span.kind !== 'tool_call') return span.status;
  const actualStatus = run.trajectory?.actualStepStatuses?.find(
    (entry) => entry.id === span.toolCallId
  );
  if (run.status === 'running') {
    const currentStatus = actualStatus?.status || span.status;
    if (currentStatus === 'failed' || currentStatus === 'unexpected') {
      return 'running';
    }
    return currentStatus || 'running';
  }
  return actualStatus?.status || span.status || null;
}



function SpanHoverCard({ span, run, actualStatus }) {
  const totalTokens = run.usage?.totalTokens;

  return (
    <div
      data-testid="evaluation-trace-hover-preview"
      className="absolute left-[calc(100%+16px)] top-0 z-20 min-w-[280px] rounded-md border border-neutral-200 bg-white p-3 shadow-lg"
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
        Time
      </div>
      <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-neutral-700">
        <span className="text-neutral-500">Start</span>
        <span>{formatDateTime(span.startedAt)}</span>
        <span className="text-neutral-500">End</span>
        <span>{formatDateTime(span.endedAt || span.startedAt)}</span>
      </div>

      <div className="mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
        Summary
      </div>
      <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-neutral-700">
        <span className="text-neutral-500">Duration</span>
        <span>{formatDuration(span.durationMs)}</span>
        <span className="text-neutral-500">Tokens</span>
        <span>{totalTokens ?? '—'}</span>
        <span className="text-neutral-500">Path</span>
        <span>{actualStatus || span.status || 'idle'}</span>
      </div>

      <div className="mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
        Meaning
      </div>
      <div className="mt-1 text-sm leading-relaxed text-neutral-700">
        {span.kind === 'tool_call'
          ? actualStatus === 'support'
            ? 'Allowed helper step that supported the main path.'
            : actualStatus === 'unexpected'
              ? 'Tool call diverged from the expected path.'
              : 'A recorded MCP tool execution step.'
          : span.kind === 'judge'
            ? 'Final output check against the expected user-visible result.'
            : span.label}
      </div>
    </div>
  );
}

function TimelineView({
  run,
  trace,
  selectedSpanId,
  setSelectedSpanId,
  zoomLevel,
  onZoomChange,
  onRevealInChat,
  onOpenToolInBuilder,
  testMode,
}) {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState('All');
  const [hoveredSpanId, setHoveredSpanId] = useState(null);

  const visibleSpans = useMemo(() => {
    const spans = trace || [];
    if (filter === 'All') return spans;
    return spans.filter((span) => span.kind === filter);
  }, [filter, trace]);

  const startTime = visibleSpans.length > 0
    ? Math.min(...visibleSpans.map((span) => new Date(span.startedAt).getTime()))
    : 0;
  const endTime = visibleSpans.length > 0
    ? Math.max(...visibleSpans.map((span) => new Date(span.endedAt || span.startedAt).getTime()))
    : startTime;
  const totalDuration = Math.max(1, endTime - startTime);
  const selectedSpan = visibleSpans.find((span) => span.id === selectedSpanId) || visibleSpans[0] || null;
  const selectedActualStatus = selectedSpan ? getSpanStatus(run, selectedSpan) : null;

  useEffect(() => {
    if (!selectedSpanId && visibleSpans[0]?.id) {
      setSelectedSpanId(visibleSpans[0].id);
    }
  }, [selectedSpanId, setSelectedSpanId, visibleSpans]);

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)] gap-4">
      <div className="flex min-h-0 flex-col border border-neutral-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="h-8 rounded-md border border-neutral-200 bg-white px-2 text-xs text-neutral-700 outline-none"
            >
              <option value="All">All</option>
              <option value="tool_call">Tool calls</option>
              <option value="assistant">Assistant</option>
              <option value="resource_read">Resources</option>
              <option value="judge">Judge</option>
              <option value="error">Errors</option>
            </select>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs"
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? 'Collapse' : 'Expand'} all
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onZoomChange(-0.2)}>
              −
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onZoomChange(0.2)}>
              +
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-2">
            {visibleSpans.map((span) => {
              const spanStart = new Date(span.startedAt).getTime();
              const spanEnd = new Date(span.endedAt || span.startedAt).getTime();
              const offset = ((spanStart - startTime) / totalDuration) * 100;
              const width = Math.max(2, ((spanEnd - spanStart) / totalDuration) * 100 * (1 + zoomLevel));
              const traceStatus = getSpanStatus(run, span) || span.status;
              const isActive = traceStatus === 'running';

              return (
                <button
                  key={span.id}
                  type="button"
                  onMouseEnter={() => setHoveredSpanId(span.id)}
                  onMouseLeave={() => setHoveredSpanId(null)}
                  onFocus={() => setHoveredSpanId(span.id)}
                  onBlur={() => setHoveredSpanId(null)}
                  onClick={() => setSelectedSpanId(span.id)}
                  data-testid={selectedSpanId === span.id ? 'evaluation-selected-trace-row' : undefined}
                  className={`relative w-full border px-3 py-3 text-left transition-colors ${
                    selectedSpanId === span.id
                      ? 'border-neutral-300 bg-neutral-50'
                      : isActive
                        ? 'border-blue-200 bg-blue-50/40'
                        : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }`}
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_180px_80px] items-center gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-neutral-900">{span.label}</div>
                      <div className="mt-1 text-[11px] text-neutral-500">
                        {span.kind.replace('_', ' ')}
                      </div>
                    </div>

                    <div className="h-7 rounded-md bg-neutral-100 px-2 py-1">
                      <div className="relative h-full">
                        <div
                          className={`absolute top-0 h-full rounded ${
                            traceStatus === 'failed' || traceStatus === 'unexpected'
                              ? 'bg-red-400/80'
                              : traceStatus === 'support'
                                ? 'bg-amber-300/90'
                                : 'bg-neutral-900/80'
                          }`}
                          style={{ left: `${offset}%`, width: `${Math.min(width, 100 - offset)}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-right text-[12px] text-neutral-500">
                      {formatDuration(span.durationMs)}
                    </div>
                  </div>

                  {expanded && span.payload ? (
                    <div className="mt-3 border border-neutral-200 bg-neutral-50 p-3 text-[11px] text-neutral-600">
                      <pre className="overflow-x-auto whitespace-pre-wrap">{prettyJson(span.payload)}</pre>
                    </div>
                  ) : null}

                  {hoveredSpanId === span.id ? (
                    <SpanHoverCard span={span} run={run} actualStatus={traceStatus} />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="min-h-0 border border-neutral-200 bg-white">
        {selectedSpan ? (
          <div className="flex h-full flex-col">
            <div className="border-b border-neutral-200 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-neutral-900">{selectedSpan.label}</div>
                  <div className="mt-1 text-[12px] text-neutral-500">
                    {formatDuration(selectedSpan.durationMs)} • {formatDateTime(selectedSpan.startedAt)}
                  </div>
                  {run.trajectory?.explanation ? (
                    <div className="mt-2 text-sm text-neutral-600">{run.trajectory.explanation}</div>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-xs"
                    data-testid="evaluation-reveal-in-chat"
                    onClick={onRevealInChat}
                  >
                    Reveal in Chat
                  </Button>
                  {selectedSpan.toolCallId && testMode === 'builder' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs"
                      onClick={() => onOpenToolInBuilder?.(
                        run.actualToolCalls.find((call) => call.callId === selectedSpan.toolCallId)?.toolName
                      )}
                    >
                      Open Tool in Builder
                    </Button>
                  ) : null}
                </div>
              </div>

              {selectedActualStatus ? (
                <div className="mt-3 flex items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClasses(selectedActualStatus)}`}>
                    {selectedActualStatus}
                  </span>
                  {run.trajectory?.actualStepStatuses?.find((entry) => entry.id === selectedSpan.toolCallId)?.explanation ? (
                    <span className="text-xs text-neutral-500">
                      {run.trajectory.actualStepStatuses.find((entry) => entry.id === selectedSpan.toolCallId)?.explanation}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto space-y-4 p-4">
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                  Input
                </div>
                <JsonBlock value={selectedSpan.payload?.input} />
              </div>

              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                  Output
                </div>
                <JsonBlock value={selectedSpan.payload?.output} />
              </div>

              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                  Raw payload
                </div>
                <JsonBlock value={selectedSpan.payload?.raw || selectedSpan.payload} />
              </div>

              {run.actualToolCalls.find((call) => call.callId === selectedSpan.toolCallId)?.widgetResourceUri ? (
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                    Widget resource
                  </div>
                  <div className="border border-neutral-200 bg-white px-3 py-2 text-[12px] text-neutral-700">
                    {run.actualToolCalls.find((call) => call.callId === selectedSpan.toolCallId)?.widgetResourceUri}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-neutral-500">
            Select a trace row to inspect the payloads.
          </div>
        )}
      </div>
    </div>
  );
}

function HistoricalChat({ run }) {
  const sessions = run.widgetSessionsById || {};
  const widgetCalls = (run.actualToolCalls || []).filter((call) => call.widgetResourceUri);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <RuntimeConversation
        messages={run.transcript || []}
        isStreaming={false}
        sessionsById={sessions}
        registerWidget={() => {}}
        unregisterWidget={() => {}}
        emptyTitle="No chat transcript"
        emptyBody="Run this scenario to capture a replayable assistant transcript."
      />

      {widgetCalls.length > 0 && Object.keys(sessions).length === 0 ? (
        <div className="border-t border-neutral-200 px-6 py-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
            Widget replay
          </div>
          <div className="space-y-2">
            {widgetCalls.map((call) => (
              <div
                key={`${call.callId}-widget`}
                className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] text-neutral-700"
              >
                {call.toolName} produced a widget at <span className="font-mono text-[11px]">{call.widgetResourceUri}</span>, but Forge could only keep the stored metadata for replay.
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ToolsView({ run, onOpenToolInBuilder, testMode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto space-y-3 p-4">
      {(run.actualToolCalls || []).length === 0 ? (
        <div className="border border-dashed border-neutral-200 bg-white px-4 py-8 text-center text-sm text-neutral-500">
          No tool calls were recorded for this run.
        </div>
      ) : (
        run.actualToolCalls.map((call) => {
          const actualStatus = run.trajectory?.actualStepStatuses?.find((entry) => entry.id === call.callId);
          const expectedStatus = run?.status === 'running' ? 'running' : (actualStatus?.status || (call.status === 'failed' ? 'failed' : 'unexpected'));
          const expectedStep = run.scenarioSnapshot?.expectedToolCalls?.find(
            (step) => step.id === actualStatus?.expectedStepId || step.toolName === call.toolName
          );

          return (
            <div key={call.callId} className="border border-neutral-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-neutral-900">{call.toolName}</div>
                  <div className="mt-1 text-[12px] text-neutral-500">
                    {formatDuration(call.durationMs)} • {formatDateTime(call.startedAt)}
                  </div>
                  {actualStatus?.explanation ? (
                    <div className="mt-2 text-sm text-neutral-600">{actualStatus.explanation}</div>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClasses(expectedStatus)}`}>
                    {expectedStatus}
                  </span>
                  {call.widgetResourceUri ? (
                    <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">
                      Widget
                    </span>
                  ) : null}
                  {testMode === 'builder' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs"
                      onClick={() => onOpenToolInBuilder?.(call.toolName)}
                    >
                      Open Tool in Builder
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="mt-3">
                <ToolCallCard
                  toolCall={{
                    callId: call.callId,
                    toolName: call.toolName,
                    args: call.args,
                    result: call.result,
                    status: call.status,
                    summary: expectedStatus,
                  }}
                />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export function EvaluationTraceWorkspace({
  run,
  liveMessages,
  liveIsStreaming,
  liveSessionsById,
  liveTrace,
  runHeaderRef,
  registerWidget,
  unregisterWidget,
  onClear,
  onUseActualPath,
  onOpenToolInBuilder,
  testMode,
}) {
  const [activeTab, setActiveTab] = useState('timeline');
  const [selectedSpanId, setSelectedSpanId] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(0);

  const displayMessages = run.status === 'running' ? liveMessages : run.transcript;
  const displayStreaming = run.status === 'running' ? liveIsStreaming : false;
  const displaySessions = run.status === 'running'
    ? (liveSessionsById || {})
    : (run.widgetSessionsById || {});
  const displayTrace = useMemo(
    () => (run.status === 'running' ? (liveTrace || []) : (run.trace || [])),
    [liveTrace, run.status, run.trace]
  );
  const totalTokens = run.usage?.totalTokens;
  const activeSpan = [...displayTrace].reverse().find((span) => span.status === 'running') || displayTrace.at(-1) || null;
  const activeToolName = activeSpan?.kind === 'tool_call'
    ? run.actualToolCalls?.find((call) => call.callId === activeSpan.toolCallId)?.toolName || activeSpan.label.replace(/^Tool · /, '')
    : null;

  useEffect(() => {
    setSelectedSpanId(displayTrace?.[0]?.id || null);
  }, [run?.id, displayTrace]);

  if (!run) {
    return null;
  }

  const summaryTitle = [
    `Started ${formatDateTime(run.startedAt)}`,
    `Ended ${formatDateTime(run.endedAt)}`,
    `Input tokens ${run.usage?.inputTokens ?? '—'}`,
    `Output tokens ${run.usage?.outputTokens ?? '—'}`,
  ].join(' • ');

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={runHeaderRef}
        tabIndex={-1}
        title={summaryTitle}
        className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-white px-5 py-4 outline-none"
      >
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-neutral-600">
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClasses(run.result === 'passed' ? 'passed' : run.status === 'running' ? 'running' : 'failed')}`}>
            {run.status === 'running' ? 'Running' : run.result === 'passed' ? 'Passed' : 'Failed'}
          </span>
          <span>{run.model?.provider}/{run.model?.modelId}</span>
          <span>{run.actualToolCalls?.length || 0} tool calls</span>
          <span>{totalTokens == null ? '— tokens' : `${totalTokens} tokens`}</span>
          <span>{formatDuration(run.durationMs)}</span>
          {activeToolName ? <span>Active {activeToolName}</span> : null}
          <span
            data-testid="evaluation-trajectory-score-chip"
            className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-semibold text-neutral-700"
          >
            Path score {Math.round((run.trajectory?.score || 0) * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-2">
          {(run.actualToolCalls || []).length > 0 ? (
            <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={onUseActualPath}>
              Use actual path as scenario baseline
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={onClear}>
            Clear
          </Button>
        </div>
      </div>

      {run.latestError ? (
        <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
          {run.latestError}
        </div>
      ) : null}

      {run.trajectory?.explanation ? (
        <div className="border-b border-neutral-200 bg-neutral-50 px-5 py-3 text-sm text-neutral-600">
          {run.trajectory.explanation}
        </div>
      ) : null}

      <div className="border-b border-neutral-200 bg-[#FAFAF8] px-5 py-3">
        <div className="flex items-center gap-1 border border-neutral-200 bg-neutral-50 p-1">
          {[
            ['timeline', 'Timeline'],
            ['chat', 'Chat'],
            ['tools', 'Tools'],
            ['raw', 'Raw'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              data-testid={`evaluation-trace-tab-${key}`}
              onClick={() => setActiveTab(key)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${tabButtonClasses(activeTab === key)}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[440px] flex-1 bg-[#FAFAF8] p-4">
        {activeTab === 'timeline' ? (
          <TimelineView
            run={run}
            trace={displayTrace}
            selectedSpanId={selectedSpanId}
            setSelectedSpanId={setSelectedSpanId}
            zoomLevel={zoomLevel}
            onZoomChange={(delta) => setZoomLevel((value) => Math.max(0, value + delta))}
            onRevealInChat={() => setActiveTab('chat')}
            onOpenToolInBuilder={onOpenToolInBuilder}
            testMode={testMode}
          />
        ) : null}

        {activeTab === 'chat' ? (
          <div className="h-full border border-neutral-200 bg-white">
            {run.status === 'running' ? (
              <RuntimeConversation
                messages={displayMessages || []}
                isStreaming={displayStreaming}
                sessionsById={displaySessions}
                registerWidget={registerWidget}
                unregisterWidget={unregisterWidget}
                emptyTitle="Run in progress"
                emptyBody="The conversation will appear here as the evaluation runs."
              />
            ) : (
              <HistoricalChat run={{ ...run, transcript: displayMessages || [] }} />
            )}
          </div>
        ) : null}

        {activeTab === 'raw' ? (
          <div className="grid h-full gap-4 md:grid-cols-2">
            <div className="border border-neutral-200 bg-white p-4">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Run payload
              </div>
              <div className="h-[520px] overflow-auto">
                <JsonBlock value={run} />
              </div>
            </div>
            <div className="border border-neutral-200 bg-white p-4">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Transcript
              </div>
              <div className="h-[520px] overflow-auto">
                <JsonBlock value={displayMessages} />
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'tools' ? (
          <div className="h-full border border-neutral-200 bg-neutral-50">
            <ToolsView
              run={run}
              onOpenToolInBuilder={onOpenToolInBuilder}
              testMode={testMode}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
