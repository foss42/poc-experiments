/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTestStore } from '../../../stores/testStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useEvaluationStore } from '../../../stores/evaluationStore';
import { Button } from '../../ui/Button';
import { TestEmptyState } from '../TestEmptyState';
import {
  createTransportAdapter,
  getAssistantMessageText,
  getWidgetResourceUri,
  useMcpChatRuntime,
} from '../mcp-apps/useMcpChatRuntime.js';
import { createTrajectoryTransportProxy } from '../../../utils/evaluation/trajectoryTransportProxy.js';
import { createTraceRecorder } from '../../../utils/evaluation/createTraceRecorder.js';
import { scoreTrajectory } from '../../../utils/evaluation/scoreTrajectory.js';
import { judgeOutput } from '../../../utils/evaluation/judgeOutput.js';
import {
  buildArgsFromSchema,
  formatDateTime,
  formatDuration,
  getEvaluationDisplayTags,
  getMatchModeDescription,
  getSchemaProperties,
  inferToolPurpose,
  stableStringify,
} from '../../../utils/evaluation/helpers.js';
import { EvaluationTraceWorkspace } from './EvaluationTraceWorkspace.jsx';

const MODEL_PRESET = {
  provider: 'google',
  modelId: 'gemini-2.5-flash',
};

const ClipboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  </svg>
);

function prettyJson(value) {
  if (value == null) return '{}';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '{}';
  }
}

function parseArgsJson(value) {
  if (!value.trim()) return {};
  return JSON.parse(value);
}

function findLatestAssistantResponse(messages = []) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== 'assistant') continue;
    const text = getAssistantMessageText(message);
    if (text) return text;
  }
  return '';
}

function findLatestError(messages = [], spans = []) {
  const traceError = [...spans].reverse().find((span) => span.kind === 'error');
  if (traceError?.payload?.output) {
    const output = traceError.payload.output;
    if (typeof output === 'object') {
      return output.message || JSON.stringify(output);
    }
    return String(output);
  }

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== 'assistant') continue;
    const errorPart = (message.parts || []).find((part) => part.type === 'error' && part.text);
    if (errorPart?.text) {
      if (typeof errorPart.text === 'object') {
        return errorPart.text.message || JSON.stringify(errorPart.text);
      }
      return String(errorPart.text).replace(/^Error:\s*/i, '');
    }
  }

  return null;
}

function mergeToolTelemetry(actualToolCalls, transportEvents) {
  const unmatched = [...transportEvents];

  return actualToolCalls.map((call) => {
    const eventIndex = unmatched.findIndex((event) => (
      event.toolName === call.toolName &&
      stableStringify(event.args || {}) === stableStringify(call.args || {})
    ));

    if (eventIndex < 0) {
      return call;
    }

    const [event] = unmatched.splice(eventIndex, 1);
    return {
      ...call,
      startedAt: call.startedAt || event.startedAt,
      endedAt: call.endedAt || event.endedAt,
      durationMs: call.durationMs ?? event.durationMs,
      widgetResourceUri: call.widgetResourceUri || event.widgetResourceUri || null,
    };
  });
}

function extractActualToolCalls(messages = [], trace = [], tools = [], transportEvents = []) {
  const calls = [];

  for (const message of messages) {
    if (message.role !== 'assistant') continue;

    for (const part of message.parts || []) {
      if (part.type !== 'tool' || !part.toolCall?.callId) continue;

      const span = trace.find((entry) => (
        entry.kind === 'tool_call' && entry.toolCallId === part.toolCall.callId
      ));
      const toolDef = tools.find((tool) => tool.name === part.toolCall.toolName);

      calls.push({
        callId: part.toolCall.callId,
        toolName: part.toolCall.toolName,
        args: part.toolCall.args || {},
        result: part.toolCall.result,
        status: part.toolCall.status === 'failed' ? 'failed' : 'completed',
        startedAt: span?.startedAt,
        endedAt: span?.endedAt,
        durationMs: span?.durationMs,
        widgetResourceUri: getWidgetResourceUri(
          part.toolCall.result,
          toolDef,
          true
        ),
      });
    }
  }

  return mergeToolTelemetry(calls, transportEvents);
}

function stepHasBuilderTool(toolName, tools) {
  return tools.some((tool) => tool.name === toolName);
}

function statusChipClasses(kind = 'default') {
  switch (kind) {
    case 'negative':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'generated':
      return 'border-neutral-200 bg-neutral-100 text-neutral-700';
    default:
      return 'border-neutral-200 bg-white text-neutral-600';
  }
}

function ScenarioSection({ label, children, description = null }) {
  return (
    <section className="border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-5 py-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
          {label}
        </div>
        {description ? (
          <div className="mt-1 text-sm text-neutral-500">{description}</div>
        ) : null}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function ToolSelect({ value, tools, onChange, testId }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      data-testid={testId}
      className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-800 outline-none transition-colors focus:border-neutral-400"
    >
      <option value="">Select a tool</option>
      {tools.map((tool) => (
        <option key={tool.name} value={tool.name}>
          {tool.name}
        </option>
      ))}
    </select>
  );
}

function ExpectedArgsEditor({
  call,
  tool,
  rawValue,
  rawError,
  onRawChange,
  onRawCommit,
  onExpectedArgsChange,
}) {
  const schemaProperties = useMemo(() => getSchemaProperties(tool), [tool]);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  if (!tool) {
    return (
      <div className="rounded-md border border-dashed border-neutral-200 bg-neutral-50 px-3 py-3 text-sm text-neutral-500">
        Pick a tool to scaffold its expected arguments.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {schemaProperties.length === 0 ? (
        <div className="w-full rounded-md border border-dashed border-neutral-200 bg-neutral-50 px-3 py-3 text-sm text-neutral-500">
          This tool has no declared schema fields.
        </div>
      ) : (
        schemaProperties.map(({ name, schema, required }) => {
          const value = call.expectedArgs?.[name];
          const label = (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-800">{name}</span>
              {required ? (
                <span className="text-[10px] uppercase tracking-wide text-neutral-400">required</span>
              ) : null}
            </div>
          );

          const baseFieldClasses = 'mt-2 w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 outline-none transition-colors focus:border-neutral-400';

          if (schema.type === 'boolean') {
            return (
              <div key={name} className="flex-1 min-w-[280px] border border-neutral-200 bg-white px-3 py-3">
                {label}
                {schema.description ? (
                  <div className="mt-1 text-xs text-neutral-500">{schema.description}</div>
                ) : null}
                <label className="mt-3 flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(event) => onExpectedArgsChange(name, event.target.checked)}
                  />
                  Enabled
                </label>
              </div>
            );
          }

          if (schema.enum?.length) {
            return (
              <div key={name} className="flex-1 min-w-[280px] border border-neutral-200 bg-white px-3 py-3">
                {label}
                {schema.description ? (
                  <div className="mt-1 text-xs text-neutral-500">{schema.description}</div>
                ) : null}
                <select
                  value={value ?? ''}
                  onChange={(event) => onExpectedArgsChange(name, event.target.value)}
                  className={baseFieldClasses}
                >
                  <option value="">Select a value</option>
                  {schema.enum.map((optionValue) => (
                    <option key={String(optionValue)} value={String(optionValue)}>
                      {String(optionValue)}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          if (schema.type === 'object' || schema.type === 'array') {
            return (
              <div key={name} className="w-full border border-neutral-200 bg-white px-3 py-3">
                {label}
                {schema.description ? (
                  <div className="mt-1 text-xs text-neutral-500">{schema.description}</div>
                ) : null}
                <textarea
                  value={prettyJson(value ?? buildArgsFromSchema(schema))}
                  onChange={(event) => {
                    try {
                      onExpectedArgsChange(name, parseArgsJson(event.target.value));
                    } catch {
                      onRawChange(prettyJson({ ...call.expectedArgs, [name]: event.target.value }));
                    }
                  }}
                  className="mt-2 min-h-[96px] w-full resize-y rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-[12px] text-neutral-800 outline-none transition-colors focus:border-neutral-400"
                />
              </div>
            );
          }

          return (
            <div key={name} className="flex-1 min-w-[280px] border border-neutral-200 bg-white px-3 py-3">
              {label}
              {schema.description ? (
                <div className="mt-1 text-xs text-neutral-500">{schema.description}</div>
              ) : null}
              <input
                type={schema.type === 'number' || schema.type === 'integer' ? 'number' : 'text'}
                value={value ?? ''}
                onChange={(event) => {
                  const nextValue = schema.type === 'number' || schema.type === 'integer'
                    ? (event.target.value === '' ? '' : Number(event.target.value))
                    : event.target.value;
                  onExpectedArgsChange(name, nextValue);
                }}
                className={baseFieldClasses}
              />
            </div>
          );
        })
      )}

      <div className="w-full border border-neutral-200 bg-neutral-50">
        <button
          type="button"
          onClick={() => setAdvancedOpen((value) => !value)}
          className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500"
        >
          Raw JSON
          <span>{advancedOpen ? 'Hide' : 'Show'}</span>
        </button>
        {advancedOpen ? (
          <div className="border-t border-neutral-200 px-3 py-3">
            <textarea
              value={rawValue}
              onChange={(event) => onRawChange(event.target.value)}
              onBlur={onRawCommit}
              className={`min-h-[120px] w-full resize-y rounded-md border bg-white px-3 py-2 font-mono text-[12px] text-neutral-800 outline-none ${
                rawError ? 'border-red-300' : 'border-neutral-200 focus:border-neutral-400'
              }`}
            />
            {rawError ? (
              <div className="mt-2 text-xs text-red-600">{rawError}</div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function EvaluationsPanel() {
  const {
    tools,
    serverInfo,
    client,
    testMode,
    selectTool,
    setSelectedPrimitiveType,
  } = useTestStore();
  const { geminiApiKey } = useSettingsStore();
  const {
    currentScopeKey,
    scenariosByScope,
    runsByScenario,
    generationByScope,
    selectedScenarioIdByScope,
    selectScenario,
    updateScenario,
    duplicateScenario,
    addExpectedToolCall,
    removeExpectedToolCall,
    deleteScenario,
    startRun,
    finishRun,
    clearScenarioRuns,
    replaceScenarioWithActualPath,
  } = useEvaluationStore();

  const [selectedRunId, setSelectedRunId] = useState(null);
  const [argsDrafts, setArgsDrafts] = useState({});
  const [argErrors, setArgErrors] = useState({});
  const [runDockOpen, setRunDockOpen] = useState(false);
  const [liveTraceTick, setLiveTraceTick] = useState(0);
  const traceRecorderRef = useRef(createTraceRecorder());
  const transportEventsRef = useRef([]);
  const activeRunRef = useRef(null);
  const finalizingRunRef = useRef(false);
  const scrollAreaRef = useRef(null);
  const runDockRef = useRef(null);
  const runHeaderRef = useRef(null);

  const scenarios = useMemo(
    () => (currentScopeKey ? (scenariosByScope[currentScopeKey] || []) : []),
    [currentScopeKey, scenariosByScope]
  );
  const selectedScenarioId = currentScopeKey ? selectedScenarioIdByScope[currentScopeKey] : null;
  const selectedScenario = scenarios.find((scenario) => scenario.id === selectedScenarioId) || null;
  const runs = useMemo(
    () => (selectedScenario ? (runsByScenario[selectedScenario.id] || []) : []),
    [runsByScenario, selectedScenario]
  );
  const generationState = currentScopeKey ? generationByScope[currentScopeKey] : null;

  useEffect(() => {
    if (!selectedScenario && scenarios.length > 0) {
      selectScenario(scenarios[0].id);
    }
  }, [scenarios, selectedScenario, selectScenario]);

  useEffect(() => {
    setSelectedRunId(runs[0]?.id || null);
    if (runs.length > 0) {
      setRunDockOpen(true);
    }
  }, [selectedScenario?.id, runs]);

  useEffect(() => {
    if (!selectedScenario) {
      setArgsDrafts({});
      setArgErrors({});
      return;
    }

    setArgsDrafts(
      selectedScenario.expectedToolCalls.reduce((acc, call) => {
        acc[call.id] = prettyJson(call.expectedArgs || {});
        return acc;
      }, {})
    );
    setArgErrors({});
  }, [selectedScenario]);

  useEffect(() => {
    if (!isFinite(liveTraceTick)) {
      setLiveTraceTick(0);
    }
  }, [liveTraceTick]);

  const selectedRun = runs.find((run) => run.id === selectedRunId) || runs[0] || null;
  const transportBase = useMemo(
    () => createTransportAdapter(testMode, client, tools),
    [testMode, client, tools]
  );
  const transportOverride = useMemo(() => {
    if (!transportBase) return null;

    return createTrajectoryTransportProxy(transportBase, {
      onToolCallResult: (event) => {
        transportEventsRef.current = [...transportEventsRef.current, event];
        setLiveTraceTick((value) => value + 1);
      },
    });
  }, [transportBase]);

  const {
    messages,
    isStreaming,
    sessionsById,
    sendMessage,
    clearConversation,
    registerWidget,
    unregisterWidget,
    lastUsage,
  } = useMcpChatRuntime({
    tools,
    serverInfo,
    client,
    geminiApiKey,
    testMode,
    transportOverride,
    traceRecorder: traceRecorderRef.current,
    modelPreset: MODEL_PRESET,
  });

  useEffect(() => {
    if (!isStreaming || !activeRunRef.current) return undefined;
    const intervalId = window.setInterval(() => {
      setLiveTraceTick((value) => value + 1);
    }, 120);
    return () => window.clearInterval(intervalId);
  }, [isStreaming]);

  const liveTrace = useMemo(() => {
    void liveTraceTick;
    return traceRecorderRef.current.getSpans();
  }, [liveTraceTick]);

  useEffect(() => {
    if (!activeRunRef.current || isStreaming || finalizingRunRef.current === true) {
      return;
    }
    if (messages.length === 0 && transportEventsRef.current.length === 0 && !lastUsage) {
      return;
    }

    const activeRun = activeRunRef.current;
    finalizingRunRef.current = true;

    void (async () => {
      const trace = traceRecorderRef.current.getSpans();
      const actualToolCalls = extractActualToolCalls(
        messages,
        trace,
        tools,
        transportEventsRef.current
      );
      const trajectory = scoreTrajectory(activeRun.scenario, actualToolCalls);
      const assistantResponse = findLatestAssistantResponse(messages);

      traceRecorderRef.current.startJudge({
        scenarioText: activeRun.scenario.scenarioText,
        userPrompt: activeRun.scenario.userPrompt,
        expectedOutput: activeRun.scenario.expectedOutput,
      });

      const outputEvaluation = await judgeOutput({
        scenarioText: activeRun.scenario.scenarioText,
        userPrompt: activeRun.scenario.userPrompt,
        expectedOutput: activeRun.scenario.expectedOutput,
        assistantResponse,
        actualToolCalls,
        apiKey: geminiApiKey,
      });

      traceRecorderRef.current.finishJudge(
        outputEvaluation,
        outputEvaluation.passed ? 'completed' : 'failed'
      );

      const latestError = findLatestError(messages, traceRecorderRef.current.getSpans());
      const passed = trajectory.passed && outputEvaluation.score >= (
        activeRun.scenario.passCriteria?.minOutputScore ?? 0.7
      );
      const endedAt = new Date().toISOString();

      finishRun(activeRun.scenarioId, activeRun.runId, {
        status: latestError ? 'failed' : 'completed',
        result: passed ? 'passed' : 'failed',
        endedAt,
        durationMs: new Date(endedAt).getTime() - new Date(activeRun.startedAt).getTime(),
        usage: lastUsage || {
          inputTokens: undefined,
          outputTokens: undefined,
          totalTokens: undefined,
        },
        transcript: messages,
        actualToolCalls,
        trace: traceRecorderRef.current.getSpans(),
        widgetSessionsById: sessionsById,
        trajectory: {
          ...trajectory,
          outputScore: outputEvaluation.score,
        },
        outputEvaluation,
        latestError,
      });

      activeRunRef.current = null;
      transportEventsRef.current = [];
      finalizingRunRef.current = false;
      setLiveTraceTick((value) => value + 1);
    })();
  }, [finishRun, geminiApiKey, isStreaming, lastUsage, messages, sessionsById, tools]);

  const focusRunDock = (behavior = 'smooth') => {
    requestAnimationFrame(() => {
      runDockRef.current?.scrollIntoView({ behavior, block: 'start' });
      window.setTimeout(() => {
        runHeaderRef.current?.focus();
      }, behavior === 'smooth' ? 180 : 0);
    });
  };

  const handleOpenToolInBuilder = (toolName) => {
    if (!toolName || !stepHasBuilderTool(toolName, tools)) return;
    selectTool(toolName);
    setSelectedPrimitiveType('tools');
  };

  const handleRun = async () => {
    if (!selectedScenario || !selectedScenario.userPrompt.trim()) {
      return;
    }

    const run = startRun(selectedScenario.id, MODEL_PRESET);
    if (!run) return;

    setSelectedRunId(run.id);
    setRunDockOpen(true);
    activeRunRef.current = {
      runId: run.id,
      scenarioId: selectedScenario.id,
      scenario: JSON.parse(JSON.stringify(selectedScenario)),
      startedAt: run.startedAt,
    };
    finalizingRunRef.current = false;
    transportEventsRef.current = [];
    traceRecorderRef.current.reset();
    traceRecorderRef.current.startPrompt(selectedScenario.userPrompt);
    setLiveTraceTick((value) => value + 1);
    clearConversation();
    focusRunDock('smooth');

    const submitted = await sendMessage(selectedScenario.userPrompt);
    if (!submitted) {
      const latestError = geminiApiKey
        ? 'Unable to start the evaluation run.'
        : 'Configure a Gemini API key in Settings to run evaluations.';

      finishRun(selectedScenario.id, run.id, {
        status: 'failed',
        result: 'failed',
        endedAt: new Date().toISOString(),
        durationMs: 0,
        latestError,
      });
      activeRunRef.current = null;
    }
  };

  const mutateExpectedCall = (callId, patch) => {
    if (!selectedScenario) return;
    const nextCalls = selectedScenario.expectedToolCalls.map((entry) => (
      entry.id === callId ? { ...entry, ...patch } : entry
    ));
    updateScenario(selectedScenario.id, { expectedToolCalls: nextCalls });
  };

  const handleToolChange = (call, toolName) => {
    const tool = tools.find((entry) => entry.name === toolName);
    mutateExpectedCall(call.id, {
      toolName,
      expectedArgs: buildArgsFromSchema(tool?.inputSchema || {}),
      purpose: inferToolPurpose(toolName),
    });
    setArgsDrafts((prev) => ({
      ...prev,
      [call.id]: prettyJson(buildArgsFromSchema(tool?.inputSchema || {})),
    }));
  };

  const displayTags = getEvaluationDisplayTags(selectedScenario);
  const isFreshGenerated = (
    selectedScenario?.source === 'generated' &&
    generationState?.batchId &&
    generationState.batchId === selectedScenario.generationBatchId
  );

  if (!currentScopeKey) {
    return (
      <div className="flex-1 bg-white">
        <TestEmptyState
          icon={<ClipboardIcon />}
          heading="Connect a server to evaluate it"
          subtitle="Evaluations are scoped to the current connected server or builder preview."
        />
      </div>
    );
  }

  if (!selectedScenario) {
    return (
      <div className="flex-1 bg-white">
        <TestEmptyState
          icon={<ClipboardIcon />}
          heading="No evaluation selected"
          subtitle={
            generationState?.status === 'generating'
              ? 'Forge is generating scenarios in the background. Open one when it appears.'
              : 'Create a scenario from the sidebar or wait for generated scenarios to arrive.'
          }
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F7F7F5]">
      <div className="border-b border-neutral-200 bg-white px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={selectedScenario.title}
                onChange={(event) => updateScenario(selectedScenario.id, { title: event.target.value })}
                className="min-w-[280px] flex-1 border-none bg-transparent p-0 text-[22px] font-semibold tracking-tight text-neutral-900 outline-none"
              />

              {displayTags.map((tag) => (
                <span
                  key={`${selectedScenario.id}-${tag}`}
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    tag === 'NEG'
                      ? statusChipClasses('negative')
                      : tag === 'Generated'
                        ? statusChipClasses('generated')
                        : statusChipClasses()
                  }`}
                >
                  {tag}
                </span>
              ))}

              {isFreshGenerated ? (
                <span className="rounded-full border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-700">
                  New batch
                </span>
              ) : null}
            </div>

            <div className="mt-2 text-sm text-neutral-500">
              {selectedScenario.generationMetadata?.workflowSummary || 'Define the path you expect the agent to take.'}
            </div>
            <div className="mt-1 text-[12px] text-neutral-400">
              Last updated {formatDateTime(selectedScenario.updatedAt)}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              data-testid="evaluation-model-selector"
              value={MODEL_PRESET.modelId}
              onChange={() => {}}
              className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            </select>

            <Button variant="outline" size="sm" onClick={() => duplicateScenario(selectedScenario.id)}>
              Duplicate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => deleteScenario(selectedScenario.id)}
            >
              Delete
            </Button>
            <Button
              size="sm"
              onClick={handleRun}
              data-testid="evaluation-run-button"
              disabled={!geminiApiKey || isStreaming || !selectedScenario.userPrompt.trim()}
            >
              {isStreaming ? 'Running...' : 'Run'}
            </Button>
          </div>
        </div>
      </div>

      <div ref={scrollAreaRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        {!geminiApiKey ? (
          <div className="mb-6 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Configure API key to auto-generate evaluations and run this scenario.
          </div>
        ) : null}

        <div className="space-y-4">
          <ScenarioSection label="Scenario">
            <textarea
              value={selectedScenario.scenarioText}
              onChange={(event) => updateScenario(selectedScenario.id, { scenarioText: event.target.value })}
              className="min-h-[88px] w-full resize-y border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm leading-relaxed text-neutral-800 outline-none transition-colors focus:border-neutral-400"
            />
            {selectedScenario.source === 'generated' ? (
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-xs"
                  onClick={() => updateScenario(selectedScenario.id, { source: 'user' })}
                >
                  Convert to user scenario
                </Button>
              </div>
            ) : null}
          </ScenarioSection>

          <ScenarioSection label="User Prompt">
            <textarea
              value={selectedScenario.userPrompt}
              onChange={(event) => updateScenario(selectedScenario.id, { userPrompt: event.target.value })}
              className="min-h-[104px] w-full resize-y border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm leading-relaxed text-neutral-800 outline-none transition-colors focus:border-neutral-400"
            />
          </ScenarioSection>

          <ScenarioSection label="Expected Tool Path" description={selectedScenario.allowedToolNames?.length ? `Allowed helper tools: ${selectedScenario.allowedToolNames.join(', ')}` : null}>
            {selectedScenario.mode === 'negative' ? (
              <div className="border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                Expected tool calls: none
              </div>
            ) : (
              <div className="space-y-4">
                {selectedScenario.expectedToolCalls.map((call, index) => {
                  const tool = tools.find((entry) => entry.name === call.toolName);
                  return (
                    <div key={call.id} className="border border-neutral-200 bg-[#FAFAF8] p-4">
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                            Step {index + 1}
                          </div>
                          <div className="mt-1 text-sm text-neutral-500">
                            {call.importance === 'optional' ? 'Optional support step' : 'Required step'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {testMode === 'builder' && stepHasBuilderTool(call.toolName, tools) ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-xs"
                              onClick={() => handleOpenToolInBuilder(call.toolName)}
                            >
                              Open Tool in Builder
                            </Button>
                          ) : null}
                          {tool?._meta?.ui?.resourceUri ? (
                            <span className="rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-neutral-600">
                              Widget
                            </span>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => removeExpectedToolCall(selectedScenario.id, call.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_180px_180px]">
                        <div>
                          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                            Tool
                          </div>
                          <ToolSelect
                            value={call.toolName}
                            tools={tools}
                            onChange={(toolName) => handleToolChange(call, toolName)}
                          />
                          {tool?.description ? (
                            <div className="mt-2 text-xs text-neutral-500">{tool.description}</div>
                          ) : null}
                        </div>

                        <div>
                          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                            Match mode
                          </div>
                          <select
                            value={call.argMatchMode}
                            onChange={(event) => mutateExpectedCall(call.id, { argMatchMode: event.target.value })}
                            className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-800 outline-none transition-colors focus:border-neutral-400"
                          >
                            <option value="exact">Exact</option>
                            <option value="subset">Subset</option>
                            <option value="keys-only">Keys only</option>
                          </select>
                          <div className="mt-2 text-xs text-neutral-500">
                            {getMatchModeDescription(call.argMatchMode)}
                          </div>
                        </div>

                        <div>
                          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                            Importance
                          </div>
                          <select
                            value={call.importance || 'required'}
                            onChange={(event) => mutateExpectedCall(call.id, { importance: event.target.value })}
                            className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-800 outline-none transition-colors focus:border-neutral-400"
                          >
                            <option value="required">Required</option>
                            <option value="optional">Optional</option>
                          </select>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                          Expected arguments
                        </div>
                        <ExpectedArgsEditor
                          call={call}
                          tool={tool}
                          rawValue={argsDrafts[call.id] ?? prettyJson(call.expectedArgs)}
                          rawError={argErrors[call.id]}
                          onRawChange={(value) => {
                            setArgsDrafts((prev) => ({ ...prev, [call.id]: value }));
                            setArgErrors((prev) => ({ ...prev, [call.id]: null }));
                          }}
                          onRawCommit={() => {
                            try {
                              const parsed = parseArgsJson(argsDrafts[call.id] ?? prettyJson(call.expectedArgs));
                              mutateExpectedCall(call.id, { expectedArgs: parsed });
                              setArgErrors((prev) => ({ ...prev, [call.id]: null }));
                            } catch (error) {
                              setArgErrors((prev) => ({ ...prev, [call.id]: error.message }));
                            }
                          }}
                          onExpectedArgsChange={(fieldName, value) => {
                            const nextArgs = {
                              ...(call.expectedArgs || {}),
                              [fieldName]: value,
                            };
                            mutateExpectedCall(call.id, { expectedArgs: nextArgs });
                            setArgsDrafts((prev) => ({ ...prev, [call.id]: prettyJson(nextArgs) }));
                          }}
                        />
                      </div>
                    </div>
                  );
                })}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const firstTool = tools[0];
                    addExpectedToolCall(
                      selectedScenario.id,
                      firstTool?.name || '',
                      buildArgsFromSchema(firstTool?.inputSchema || {}),
                      { purpose: inferToolPurpose(firstTool?.name || '') }
                    );
                  }}
                >
                  Add expected tool call
                </Button>
              </div>
            )}
          </ScenarioSection>

          <ScenarioSection label="Expected Output">
            <textarea
              value={selectedScenario.expectedOutput}
              onChange={(event) => updateScenario(selectedScenario.id, { expectedOutput: event.target.value })}
              className="min-h-[96px] w-full resize-y border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm leading-relaxed text-neutral-800 outline-none transition-colors focus:border-neutral-400"
            />
          </ScenarioSection>

          <details className="border border-neutral-200 bg-white">
            <summary className="cursor-pointer list-none px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Advanced pass criteria
            </summary>
            <div className="grid gap-3 border-t border-neutral-200 px-5 py-4 md:grid-cols-3">
              <label className="space-y-2 text-sm text-neutral-700">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                  Min path score
                </div>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={selectedScenario.passCriteria.minTrajectoryScore}
                  onChange={(event) => updateScenario(selectedScenario.id, {
                    passCriteria: {
                      ...selectedScenario.passCriteria,
                      minTrajectoryScore: Number(event.target.value),
                    },
                  })}
                  className="h-10 w-full border border-neutral-200 bg-neutral-50 px-3 outline-none transition-colors focus:border-neutral-400"
                />
              </label>

              <label className="space-y-2 text-sm text-neutral-700">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                  Min output score
                </div>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={selectedScenario.passCriteria.minOutputScore}
                  onChange={(event) => updateScenario(selectedScenario.id, {
                    passCriteria: {
                      ...selectedScenario.passCriteria,
                      minOutputScore: Number(event.target.value),
                    },
                  })}
                  className="h-10 w-full border border-neutral-200 bg-neutral-50 px-3 outline-none transition-colors focus:border-neutral-400"
                />
              </label>

              <label className="flex items-end gap-2 border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={selectedScenario.passCriteria.failOnUnexpectedTools}
                  onChange={(event) => updateScenario(selectedScenario.id, {
                    passCriteria: {
                      ...selectedScenario.passCriteria,
                      failOnUnexpectedTools: event.target.checked,
                    },
                  })}
                />
                <span>Fail on unexpected tools</span>
              </label>
            </div>
          </details>
        </div>

        <div
          ref={runDockRef}
          className={`mt-6 border border-neutral-200 bg-white transition-all duration-300 ${
            runDockOpen ? 'opacity-100' : 'opacity-100'
          }`}
        >
          {!selectedRun ? (
            <div className="px-5 py-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Run dock
              </div>
              <div className="mt-2 max-w-2xl text-sm text-neutral-500">
                Run a scenario to open Forge&apos;s live execution dock. The trace will stay anchored here while the agent works.
              </div>
            </div>
          ) : (
            <EvaluationTraceWorkspace
              run={selectedRun}
              liveMessages={messages}
              liveIsStreaming={isStreaming}
              liveSessionsById={sessionsById}
              liveTrace={liveTrace}
              runHeaderRef={runHeaderRef}
              registerWidget={registerWidget}
              unregisterWidget={unregisterWidget}
              onClear={() => {
                clearScenarioRuns(selectedScenario.id);
                setRunDockOpen(false);
              }}
              onUseActualPath={() => replaceScenarioWithActualPath(selectedScenario.id, selectedRun.id)}
              onOpenToolInBuilder={handleOpenToolInBuilder}
              testMode={testMode}
            />
          )}
        </div>

        {runs.length > 0 ? (
          <div className="mt-6 border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Run history
              </div>
            </div>
            <div className="divide-y divide-neutral-100">
              {runs.map((run) => (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => {
                    setSelectedRunId(run.id);
                    setRunDockOpen(true);
                    focusRunDock('smooth');
                  }}
                  className={`flex w-full flex-wrap items-center justify-between gap-3 px-5 py-3 text-left transition-colors ${
                    selectedRun?.id === run.id ? 'bg-neutral-50' : 'hover:bg-neutral-50'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-neutral-900">
                      {formatDateTime(run.startedAt)}
                    </div>
                    <div className="mt-1 text-[12px] text-neutral-500">
                      {run.actualToolCalls?.length || 0} tool calls • {formatDuration(run.durationMs)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[12px] text-neutral-500">
                    {run.status === 'running' ? (
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                        Running...
                      </span>
                    ) : (
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                        run.result === 'passed'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-red-200 bg-red-50 text-red-700'
                      }`}>
                        {run.result === 'passed' ? 'Pass' : 'Fail'}
                      </span>
                    )}
                    <span>Path {Math.round((run.trajectory?.score || 0) * 100)}%</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
