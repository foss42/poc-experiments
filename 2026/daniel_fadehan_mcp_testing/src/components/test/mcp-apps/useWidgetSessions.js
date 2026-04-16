import { useCallback, useMemo, useReducer } from 'react';

function nowIso() {
  return new Date().toISOString();
}

export function createRuntimeId(prefix = 'rt') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function hashArgs(args) {
  try {
    return JSON.stringify(args ?? {});
  } catch {
    return '[unserializable-args]';
  }
}

function createTimelineEntry(entry) {
  return {
    id: createRuntimeId('event'),
    at: nowIso(),
    ...entry,
  };
}

function createSession(data) {
  const createdAt = nowIso();
  return {
    widgetId: data.widgetId,
    traceId: data.traceId || createRuntimeId('trace'),
    source: data.source || 'model',
    toolName: data.toolName,
    resourceUri: data.resourceUri,
    invocationArgs: data.invocationArgs || {},
    toolCallState: data.toolCallState || 'completed',
    toolResult: data.toolResult ?? null,
    modelContext: data.modelContext ?? null,
    resourceMeta: data.resourceMeta ?? null,
    html: data.html ?? null,
    status: data.status || 'resource_loading',
    compatibility: {
      legacyStructuredContentInToolInput: !!data.compatibility?.legacyStructuredContentInToolInput,
    },
    warnings: data.warnings || [],
    proxyToolCalls: [],
    notifications: {},
    timeline: [
      createTimelineEntry({
        kind: 'session-created',
        source: data.source || 'model',
        message: `Created widget session for ${data.toolName}`,
        data: {
          resourceUri: data.resourceUri,
          argsHash: hashArgs(data.invocationArgs),
        },
      }),
    ],
    createdAt,
    updatedAt: createdAt,
  };
}

function updateSessionRecord(session, patch) {
  return {
    ...session,
    ...patch,
    notifications: patch.notifications
      ? { ...session.notifications, ...patch.notifications }
      : session.notifications,
    compatibility: patch.compatibility
      ? { ...session.compatibility, ...patch.compatibility }
      : session.compatibility,
    updatedAt: nowIso(),
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'session/create': {
      const session = createSession(action.data);
      return {
        ...state,
        sessionsById: {
          ...state.sessionsById,
          [session.widgetId]: session,
        },
      };
    }

    case 'session/update': {
      const current = state.sessionsById[action.widgetId];
      if (!current) return state;
      return {
        ...state,
        sessionsById: {
          ...state.sessionsById,
          [action.widgetId]: updateSessionRecord(current, action.patch),
        },
      };
    }

    case 'session/status': {
      const current = state.sessionsById[action.widgetId];
      if (!current) return state;
      return {
        ...state,
        sessionsById: {
          ...state.sessionsById,
          [action.widgetId]: updateSessionRecord(current, {
            status: action.status,
            ...(action.extra || {}),
          }),
        },
      };
    }

    case 'session/model-context': {
      const current = state.sessionsById[action.widgetId];
      if (!current) return state;
      return {
        ...state,
        sessionsById: {
          ...state.sessionsById,
          [action.widgetId]: updateSessionRecord(current, {
            modelContext: action.modelContext,
          }),
        },
      };
    }

    case 'session/warning': {
      const current = state.sessionsById[action.widgetId];
      if (!current) return state;
      if (current.warnings.some((warning) => warning.code === action.warning.code)) {
        return state;
      }
      return {
        ...state,
        sessionsById: {
          ...state.sessionsById,
          [action.widgetId]: updateSessionRecord(current, {
            warnings: [...current.warnings, action.warning],
          }),
        },
      };
    }

    case 'session/event': {
      const current = state.sessionsById[action.widgetId];
      if (!current) return state;
      return {
        ...state,
        sessionsById: {
          ...state.sessionsById,
          [action.widgetId]: updateSessionRecord(current, {
            timeline: [...current.timeline, createTimelineEntry(action.event)],
          }),
        },
      };
    }

    case 'session/proxy-start': {
      const current = state.sessionsById[action.widgetId];
      if (!current) return state;
      return {
        ...state,
        sessionsById: {
          ...state.sessionsById,
          [action.widgetId]: updateSessionRecord(current, {
            proxyToolCalls: [...current.proxyToolCalls, action.proxyCall],
          }),
        },
      };
    }

    case 'session/proxy-finish': {
      const current = state.sessionsById[action.widgetId];
      if (!current) return state;
      return {
        ...state,
        sessionsById: {
          ...state.sessionsById,
          [action.widgetId]: updateSessionRecord(current, {
            proxyToolCalls: current.proxyToolCalls.map((proxyCall) =>
              proxyCall.traceId === action.traceId
                ? { ...proxyCall, ...action.patch, finishedAt: nowIso() }
                : proxyCall
            ),
          }),
        },
      };
    }

    case 'sessions/reset':
      return { sessionsById: {} };

    default:
      return state;
  }
}

export function useWidgetSessions() {
  const [state, dispatch] = useReducer(reducer, { sessionsById: {} });

  const createWidgetSession = useCallback((data) => {
    const widgetId = data.widgetId || createRuntimeId('widget');
    dispatch({
      type: 'session/create',
      data: { ...data, widgetId },
    });
    return widgetId;
  }, []);

  const updateWidgetSession = useCallback((widgetId, patch) => {
    dispatch({ type: 'session/update', widgetId, patch });
  }, []);

  const setWidgetStatus = useCallback((widgetId, status, extra) => {
    dispatch({ type: 'session/status', widgetId, status, extra });
  }, []);

  const setWidgetModelContext = useCallback((widgetId, modelContext) => {
    dispatch({ type: 'session/model-context', widgetId, modelContext });
  }, []);

  const addWidgetWarning = useCallback((widgetId, warning) => {
    dispatch({ type: 'session/warning', widgetId, warning });
  }, []);

  const appendWidgetEvent = useCallback((widgetId, event) => {
    dispatch({ type: 'session/event', widgetId, event });
  }, []);

  const startProxyToolCall = useCallback((widgetId, toolName, args, source = 'widget') => {
    const traceId = createRuntimeId('proxy');
    dispatch({
      type: 'session/proxy-start',
      widgetId,
      proxyCall: {
        traceId,
        toolName,
        args,
        argsHash: hashArgs(args),
        source,
        status: 'running',
        startedAt: nowIso(),
      },
    });
    return traceId;
  }, []);

  const finishProxyToolCall = useCallback((widgetId, traceId, patch) => {
    dispatch({ type: 'session/proxy-finish', widgetId, traceId, patch });
  }, []);

  const resetWidgetSessions = useCallback(() => {
    dispatch({ type: 'sessions/reset' });
  }, []);

  const sessions = useMemo(
    () => Object.values(state.sessionsById).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [state.sessionsById]
  );

  const getWidgetSession = useCallback((widgetId) => state.sessionsById[widgetId] || null, [state.sessionsById]);

  return {
    sessions,
    sessionsById: state.sessionsById,
    getWidgetSession,
    createWidgetSession,
    updateWidgetSession,
    setWidgetStatus,
    setWidgetModelContext,
    addWidgetWarning,
    appendWidgetEvent,
    startProxyToolCall,
    finishProxyToolCall,
    resetWidgetSessions,
  };
}
