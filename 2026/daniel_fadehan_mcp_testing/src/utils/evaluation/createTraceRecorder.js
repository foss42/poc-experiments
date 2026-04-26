function createId(prefix = 'trace') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function diffMs(startedAt, endedAt = nowIso()) {
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  return Math.max(0, end - start);
}

export function createTraceRecorder() {
  let spans = [];
  let assistantSpanId = null;
  const resourceSpanIds = new Map();
  const toolSpanIds = new Map();
  let judgeSpanId = null;

  const pushSpan = (span) => {
    spans = [...spans, span];
    return span;
  };

  const patchSpan = (id, patch) => {
    spans = spans.map((span) => (
      span.id === id
        ? {
            ...span,
            ...patch,
          }
        : span
    ));
  };

  return {
    reset() {
      spans = [];
      assistantSpanId = null;
      judgeSpanId = null;
      resourceSpanIds.clear();
      toolSpanIds.clear();
    },
    startPrompt(promptText) {
      return pushSpan({
        id: createId('prompt'),
        kind: 'prompt',
        label: 'User prompt',
        startedAt: nowIso(),
        endedAt: nowIso(),
        durationMs: 0,
        status: 'completed',
        payload: {
          input: promptText,
        },
      });
    },
    ensureAssistantSpan() {
      if (assistantSpanId) {
        return assistantSpanId;
      }

      const span = pushSpan({
        id: createId('assistant'),
        kind: 'assistant',
        label: 'Assistant reasoning',
        startedAt: nowIso(),
        status: 'running',
        payload: {
          output: '',
        },
      });

      assistantSpanId = span.id;
      return assistantSpanId;
    },
    appendAssistantText(delta = '') {
      const spanId = this.ensureAssistantSpan();
      const existingSpan = spans.find((span) => span.id === spanId);
      patchSpan(spanId, {
        payload: {
          ...(existingSpan?.payload || {}),
          output: `${existingSpan?.payload?.output || ''}${delta}`,
        },
      });
    },
    finishAssistantSpan(status = 'completed') {
      if (!assistantSpanId) return;
      const endedAt = nowIso();
      const span = spans.find((entry) => entry.id === assistantSpanId);
      patchSpan(assistantSpanId, {
        status,
        endedAt,
        durationMs: diffMs(span?.startedAt, endedAt),
      });
      assistantSpanId = null;
    },
    startToolCall({ callId, toolName, args }) {
      const span = pushSpan({
        id: createId('tool'),
        kind: 'tool_call',
        label: `Tool · ${toolName}`,
        startedAt: nowIso(),
        status: 'running',
        toolCallId: callId,
        payload: {
          input: args,
        },
      });

      toolSpanIds.set(callId, span.id);
      return span.id;
    },
    finishToolCall({ callId, result, status = 'completed' }) {
      const spanId = toolSpanIds.get(callId);
      if (!spanId) return;

      const span = spans.find((entry) => entry.id === spanId);
      const endedAt = nowIso();

      patchSpan(spanId, {
        status,
        endedAt,
        durationMs: diffMs(span?.startedAt, endedAt),
        payload: {
          ...(span?.payload || {}),
          output: result,
        },
      });
    },
    startResourceRead(resourceUri) {
      const span = pushSpan({
        id: createId('resource'),
        kind: 'resource_read',
        label: `Resource · ${resourceUri}`,
        startedAt: nowIso(),
        status: 'running',
        payload: {
          input: resourceUri,
        },
      });

      resourceSpanIds.set(resourceUri, span.id);
      return span.id;
    },
    finishResourceRead(resourceUri, output, status = 'completed') {
      const spanId = resourceSpanIds.get(resourceUri);
      if (!spanId) return;

      const span = spans.find((entry) => entry.id === spanId);
      const endedAt = nowIso();

      patchSpan(spanId, {
        status,
        endedAt,
        durationMs: diffMs(span?.startedAt, endedAt),
        payload: {
          ...(span?.payload || {}),
          output,
        },
      });

      resourceSpanIds.delete(resourceUri);
    },
    addWidgetRender({ widgetId, resourceUri, toolCallId }) {
      pushSpan({
        id: createId('widget'),
        kind: 'widget_render',
        label: `Widget · ${resourceUri || widgetId}`,
        startedAt: nowIso(),
        endedAt: nowIso(),
        durationMs: 0,
        status: 'completed',
        toolCallId: toolCallId || null,
        payload: {
          input: {
            widgetId,
            resourceUri,
          },
        },
      });
    },
    startJudge(payload) {
      const span = pushSpan({
        id: createId('judge'),
        kind: 'judge',
        label: 'Output judge',
        startedAt: nowIso(),
        status: 'running',
        payload: {
          input: payload,
        },
      });

      judgeSpanId = span.id;
      return span.id;
    },
    finishJudge(payload, status = 'completed') {
      if (!judgeSpanId) return;

      const span = spans.find((entry) => entry.id === judgeSpanId);
      const endedAt = nowIso();

      patchSpan(judgeSpanId, {
        status,
        endedAt,
        durationMs: diffMs(span?.startedAt, endedAt),
        payload: {
          ...(span?.payload || {}),
          output: payload,
        },
      });

      judgeSpanId = null;
    },
    addError(errorMessage, payload = null) {
      pushSpan({
        id: createId('error'),
        kind: 'error',
        label: 'Error',
        startedAt: nowIso(),
        endedAt: nowIso(),
        durationMs: 0,
        status: 'failed',
        payload: {
          input: payload,
          output: errorMessage,
        },
      });
    },
    getSpans() {
      return spans;
    },
  };
}
