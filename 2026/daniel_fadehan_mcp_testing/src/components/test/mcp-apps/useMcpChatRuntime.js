import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sendChatMessage } from '../../../utils/aiChatService.js';
import { createBuilderChatAdapter } from '../../../utils/builderChatAdapter.js';
import { createChatLogEntry } from '../../../utils/chatRuntimeLog.js';
import { classifyToolOutcome, getToolErrorMessage } from '../../../utils/toolOutcome.js';
import { formatToolDisplay } from '../../../utils/toolDisplay.js';
import { useBridgeMessages } from './useBridgeMessages.js';
import { createRuntimeId, useWidgetSessions } from './useWidgetSessions.js';

export function getWidgetResourceUri(toolResult, toolDef, supportsWidgets = true) {
  if (!supportsWidgets) return null;
  const meta = toolResult?._meta || toolDef?._meta;
  return meta?.ui?.resourceUri || null;
}

function createTransportAdapter(testMode, client, tools) {
  if (testMode === 'builder') {
    return createBuilderChatAdapter(tools);
  }

  if (!client) return null;

  return {
    supportsWidgets: true,
    callTool: (...args) => client.callTool(...args),
    readResource: (...args) => client.readResource(...args),
  };
}

function createAssistantMessage(overrides = {}) {
  return {
    id: createRuntimeId('assistant'),
    role: 'assistant',
    parts: [],
    ...overrides,
  };
}

function createTextPart(text = '', kind = 'text') {
  return {
    id: createRuntimeId(kind),
    type: kind,
    text,
  };
}

function createToolPart(toolCall) {
  return {
    id: createRuntimeId('tool'),
    type: 'tool',
    toolCall,
  };
}

function createWidgetPart(toolCallId, widgetId) {
  return {
    id: createRuntimeId('widget-part'),
    type: 'widget',
    toolCallId,
    widgetId,
  };
}

function withAssistantMessage(messages, assistantMessageId, updater) {
  return messages.map((message) => {
    if (message.id !== assistantMessageId) return message;
    return updater(message);
  });
}

function ensureAssistantMessage(messages, assistantMessageId) {
  const exists = messages.some((message) => message.id === assistantMessageId);
  return exists
    ? messages
    : [...messages, createAssistantMessage({ id: assistantMessageId })];
}

export function summarizeToolResult(toolResult) {
  const outcome = classifyToolOutcome(toolResult);
  if (!outcome.ok) {
    return getToolErrorMessage(toolResult);
  }

  return formatToolDisplay({ result: toolResult }).toolResultDisplay.summary || 'Completed successfully.';
}

export function appendAssistantTextDelta(messages, assistantMessageId, delta, kind = 'text') {
  if (!delta) return messages;

  const nextMessages = ensureAssistantMessage(messages, assistantMessageId);
  return withAssistantMessage(nextMessages, assistantMessageId, (message) => {
    const parts = [...(message.parts || [])];
    const lastPart = parts[parts.length - 1];

    if (lastPart?.type === kind) {
      parts[parts.length - 1] = { ...lastPart, text: `${lastPart.text}${delta}` };
    } else {
      parts.push(createTextPart(delta, kind));
    }

    return { ...message, parts };
  });
}

export function appendAssistantToolPart(messages, assistantMessageId, toolCall) {
  const nextMessages = ensureAssistantMessage(messages, assistantMessageId);
  return withAssistantMessage(nextMessages, assistantMessageId, (message) => {
    const parts = [...(message.parts || [])];
    const existingIndex = parts.findIndex(
      (part) => part.type === 'tool' && part.toolCall?.callId === toolCall.callId
    );

    if (existingIndex >= 0) {
      parts[existingIndex] = {
        ...parts[existingIndex],
        toolCall: {
          ...parts[existingIndex].toolCall,
          ...toolCall,
        },
      };
    } else {
      parts.push(createToolPart(toolCall));
    }

    return { ...message, parts };
  });
}

export function updateAssistantToolPart(messages, assistantMessageId, callId, patch) {
  const nextMessages = ensureAssistantMessage(messages, assistantMessageId);
  return withAssistantMessage(nextMessages, assistantMessageId, (message) => {
    const parts = [...(message.parts || [])];
    const index = parts.findIndex(
      (part) => part.type === 'tool' && part.toolCall?.callId === callId
    );

    if (index >= 0) {
      parts[index] = {
        ...parts[index],
        toolCall: {
          ...parts[index].toolCall,
          ...patch,
        },
      };
    } else {
      parts.push(createToolPart({
        callId,
        toolName: patch.toolName || 'tool',
        args: patch.args || {},
        status: patch.status || 'completed',
        ...patch,
      }));
    }

    return { ...message, parts };
  });
}

export function appendAssistantWidgetPart(messages, assistantMessageId, callId, widgetId) {
  const nextMessages = ensureAssistantMessage(messages, assistantMessageId);
  return withAssistantMessage(nextMessages, assistantMessageId, (message) => {
    const parts = [...(message.parts || [])];
    const existing = parts.some(
      (part) => part.type === 'widget' && part.toolCallId === callId && part.widgetId === widgetId
    );

    if (existing) {
      return message;
    }

    const toolIndex = parts.findIndex(
      (part) => part.type === 'tool' && part.toolCall?.callId === callId
    );

    const widgetPart = createWidgetPart(callId, widgetId);
    if (toolIndex >= 0) {
      parts.splice(toolIndex + 1, 0, widgetPart);
    } else {
      parts.push(widgetPart);
    }

    return { ...message, parts };
  });
}

export function appendAssistantNote(messages, assistantMessageId, content, kind = 'text') {
  if (!content) return messages;
  return appendAssistantTextDelta(messages, assistantMessageId, content, kind);
}

export function assistantMessageHasWidgetPart(message) {
  return !!message?.parts?.some((part) => part.type === 'widget');
}

export function getAssistantMessageText(message) {
  if (!message?.parts?.length) return '';

  return message.parts
    .filter((part) => part.type === 'text' || part.type === 'error')
    .map((part) => part.text || '')
    .join('')
    .trim();
}

function rebuildAssistantPartsFromSteps(message, steps = []) {
  if (!message) return message;

  const textSteps = (steps || []).filter(
    (step) => step?.text?.trim() || (Array.isArray(step?.toolCalls) && step.toolCalls.length > 0)
  );

  if (textSteps.length === 0) {
    return message;
  }

  const toolSegments = [];
  const trailingParts = [];

  for (const part of message.parts || []) {
    if (part.type === 'tool') {
      toolSegments.push({
        toolCallId: part.toolCall?.callId,
        parts: [part],
      });
      continue;
    }

    if (part.type === 'widget') {
      const lastSegment = toolSegments[toolSegments.length - 1];
      if (lastSegment && lastSegment.toolCallId === part.toolCallId) {
        lastSegment.parts.push(part);
      } else {
        trailingParts.push(part);
      }
      continue;
    }

    if (part.type !== 'text' && part.type !== 'error') {
      trailingParts.push(part);
    }
  }

  const remainingSegments = [...toolSegments];
  const orderedParts = [];

  for (const step of textSteps) {
    if (step?.text?.trim()) {
      orderedParts.push(createTextPart(step.text.trim()));
    }

    for (const toolCall of step.toolCalls || []) {
      const segmentIndex = remainingSegments.findIndex(
        (segment) => segment.toolCallId === toolCall.toolCallId
      );

      if (segmentIndex >= 0) {
        orderedParts.push(...remainingSegments[segmentIndex].parts);
        remainingSegments.splice(segmentIndex, 1);
      }
    }
  }

  remainingSegments.forEach((segment) => {
    orderedParts.push(...segment.parts);
  });
  orderedParts.push(...trailingParts);

  return {
    ...message,
    parts: orderedParts,
  };
}

function applyAssistantStreamPart(messages, assistantMessageId, part) {
  switch (part?.type) {
    case 'text-delta':
      return appendAssistantTextDelta(
        messages,
        assistantMessageId,
        part.text ?? part.delta ?? ''
      );
    case 'tool-call':
      try {
        return appendAssistantToolPart(messages, assistantMessageId, {
          callId: part.toolCallId,
          toolName: part.toolName,
          args: typeof part.input === 'string'
            ? (part.input ? JSON.parse(part.input) : {})
            : (part.input || {}),
          status: 'running',
          summary: `Working on ${part.toolName}.`,
        });
      } catch {
        return appendAssistantToolPart(messages, assistantMessageId, {
          callId: part.toolCallId,
          toolName: part.toolName,
          args: {},
          status: 'running',
          summary: `Working on ${part.toolName}.`,
        });
      }
    case 'tool-result':
      return appendAssistantToolPart(messages, assistantMessageId, {
        callId: part.toolCallId,
        toolName: part.toolName,
        status: part.isError ? 'failed' : 'completed',
      });
    case 'error':
      return appendAssistantNote(
        messages,
        assistantMessageId,
        `Error: ${part.error?.message || String(part.error || 'Unknown stream error')}`,
        'error'
      );
    default:
      return messages;
  }
}

async function maybeCreateWidgetSessionFromToolResult({
  appendWidgetEvent,
  createWidgetSession,
  fetchWidgetResource,
  setWidgetStatus,
  setMessages,
  updateWidgetSession,
  assistantMessageId,
  callId,
  toolName,
  args,
  toolResult,
  tools,
  supportsWidgets,
  source,
  traceId,
  startedAt,
  completionMessage,
}) {
  const toolDef = tools.find((tool) => tool.name === toolName);
  const resourceUri = getWidgetResourceUri(toolResult, toolDef, supportsWidgets);
  if (!resourceUri) return null;

  const completedAt = new Date().toISOString();
  const widgetId = createWidgetSession({
    traceId,
    toolName,
    resourceUri,
    invocationArgs: args,
    toolResult,
    source,
    status: 'resource_loading',
  });

  appendWidgetEvent(widgetId, {
    kind: 'tool-origin',
    source,
    message: completionMessage,
    data: {
      traceId,
      startedAt,
      completedAt,
    },
  });

  setMessages((prev) => appendAssistantWidgetPart(prev, assistantMessageId, callId, widgetId));

  try {
    const resource = await fetchWidgetResource(resourceUri);
    if (resource?.text) {
      updateWidgetSession(widgetId, {
        html: resource.text,
        resourceMeta: resource._meta || null,
      });
      setWidgetStatus(widgetId, 'iframe_initializing');
      appendWidgetEvent(widgetId, {
        kind: 'resource-ready',
        source: 'host',
        message: 'UI resource loaded and ready for iframe initialization',
        data: { resourceUri },
      });
    } else {
      setWidgetStatus(widgetId, 'error', {
        lastError: 'UI resource was empty or unavailable',
      });
    }
  } catch (error) {
    setWidgetStatus(widgetId, 'error', { lastError: error.message });
  }

  return widgetId;
}

export function useMcpChatRuntime({
  tools,
  serverInfo,
  client,
  geminiApiKey,
  testMode = 'external',
}) {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [clientLogs, setClientLogs] = useState([]);
  const [runtimeLogs, setRuntimeLogs] = useState([]);

  const messagesRef = useRef([]);
  const widgetRegistry = useRef(new Map());
  const toolTraceRef = useRef(new Map());
  const resourceCacheRef = useRef(new Map());
  const resourcePromiseRef = useRef(new Map());
  const currentAssistantMessageIdRef = useRef(null);

  const transport = useMemo(
    () => createTransportAdapter(testMode, client, tools),
    [testMode, client, tools]
  );

  const logs = useMemo(
    () => [...clientLogs, ...runtimeLogs].sort((a, b) => a.at.localeCompare(b.at)),
    [clientLogs, runtimeLogs]
  );

  const {
    sessionsById,
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
  } = useWidgetSessions();

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const addLog = useCallback(({ dir, type, source = 'chat-runtime', status = 'info' }) => {
    setRuntimeLogs((prev) => [
      ...prev,
      createChatLogEntry({ dir, type, source, status }),
    ]);
  }, []);

  useEffect(() => {
    if (testMode !== 'external' || !client) {
      setClientLogs([]);
      return undefined;
    }

    setClientLogs(client.getLogs ? client.getLogs() : []);

    if (!client.subscribeLogs) return undefined;

    return client.subscribeLogs((entry, allLogs) => {
      setClientLogs(allLogs || [entry]);
    });
  }, [client, testMode]);

  const appendContextMessage = useCallback((modelContext, widgetId = null) => {
    const modelVisibleContext =
      modelContext?.structuredContent ??
      modelContext?.content ??
      modelContext;

    const contextMsg = {
      id: createRuntimeId('ctx'),
      role: 'user',
      isHidden: true,
      content: `[System Note: The MCP app updated its model context${widgetId ? ` (widget ${widgetId})` : ''}]\n${JSON.stringify(modelVisibleContext, null, 2)}`,
    };

    setMessages((prev) => [...prev, contextMsg]);
  }, []);

  const fetchWidgetResource = useCallback(async (resourceUri, { preload = false } = {}) => {
    if (!transport?.supportsWidgets || !resourceUri) return null;

    if (resourceCacheRef.current.has(resourceUri)) {
      return resourceCacheRef.current.get(resourceUri);
    }

    if (resourcePromiseRef.current.has(resourceUri)) {
      return resourcePromiseRef.current.get(resourceUri);
    }

    addLog({
      dir: '->',
      type: preload ? `widget/preload: ${resourceUri}` : `widget/load: ${resourceUri}`,
      source: 'chat-runtime',
    });

    const promise = transport.readResource(resourceUri)
      .then((result) => {
        const resource = result.contents?.[0] || null;
        if (resource) {
          resourceCacheRef.current.set(resourceUri, resource);
        }

        addLog({
          dir: resource ? '<-' : '!',
          type: resource ? `widget/ready: ${resourceUri}` : `widget/missing: ${resourceUri}`,
          source: 'chat-runtime',
          status: resource ? 'success' : 'error',
        });

        return resource;
      })
      .catch((error) => {
        addLog({
          dir: '!',
          type: `widget/error: ${resourceUri} (${error.message})`,
          source: 'chat-runtime',
          status: 'error',
        });
        throw error;
      })
      .finally(() => {
        resourcePromiseRef.current.delete(resourceUri);
      });

    resourcePromiseRef.current.set(resourceUri, promise);
    return promise;
  }, [addLog, transport]);

  useEffect(() => {
    if (!transport?.supportsWidgets || !(tools || []).length) return;

    const uris = Array.from(new Set(
      tools
        .map((tool) => tool?._meta?.ui?.resourceUri)
        .filter(Boolean)
    ));

    uris.forEach((resourceUri) => {
      fetchWidgetResource(resourceUri, { preload: true }).catch(() => {
        // Preload failures are surfaced later when the tool is invoked.
      });
    });
  }, [fetchWidgetResource, tools, transport]);

  useBridgeMessages({
    client,
    serverInfo,
    widgetRegistry,
    addLog,
    getWidgetSession,
    setWidgetStatus,
    setWidgetModelContext,
    updateWidgetSession,
    appendWidgetEvent,
    startProxyToolCall,
    finishProxyToolCall,
    addWidgetWarning,
    onContextUpdate: appendContextMessage,
  });

  const clearConversation = useCallback(() => {
    setMessages([]);
    setClientLogs([]);
    setRuntimeLogs([]);
    widgetRegistry.current.clear();
    resourceCacheRef.current.clear();
    resourcePromiseRef.current.clear();
    toolTraceRef.current.clear();
    currentAssistantMessageIdRef.current = null;
    resetWidgetSessions();
  }, [resetWidgetSessions]);

  const runAI = useCallback(async (messagesToSend) => {
    if (!transport || !geminiApiKey) return;

    const assistantMessageId = createRuntimeId('assistant');
    currentAssistantMessageIdRef.current = assistantMessageId;
    setMessages((prev) => [...prev, createAssistantMessage({ id: assistantMessageId })]);
    setIsStreaming(true);
    addLog({ dir: '->', type: 'chat/send', source: 'model' });

    try {
      const response = await sendChatMessage({
        messages: messagesToSend,
        mcpTools: tools,
        mcpClient: transport,
        apiKey: geminiApiKey,
        onStreamPart: async (part) => {
          if (!part) return;

          if (part.type === 'start-step') {
            addLog({ dir: '·', type: 'model/step-start', source: 'model' });
            return;
          }

          if (part.type === 'finish-step') {
            addLog({
              dir: '·',
              type: `model/step-finish: ${part.finishReason || 'complete'}`,
              source: 'model',
            });
            return;
          }

          setMessages((prev) =>
            applyAssistantStreamPart(prev, assistantMessageId, part)
          );
        },
        onToolCall: (name, args, callId) => {
          toolTraceRef.current.set(callId, {
            traceId: createRuntimeId('trace'),
            startedAt: new Date().toISOString(),
            source: testMode === 'builder' ? 'builder' : 'model',
            toolName: name,
            args,
          });

          addLog({
            dir: '->',
            type: `tools/call: ${name}`,
            source: testMode === 'builder' ? 'builder' : 'model',
          });
        },
        onToolResult: async (name, args, toolResult, callId) => {
          const outcome = classifyToolOutcome(toolResult);
          const outcomeMessage = outcome.ok ? null : getToolErrorMessage(toolResult);
          const toolTrace = toolTraceRef.current.get(callId) || {
            traceId: createRuntimeId('trace'),
            startedAt: new Date().toISOString(),
            source: testMode === 'builder' ? 'builder' : 'model',
            toolName: name,
            args,
          };

          addLog({
            dir: outcome.ok ? '<-' : '!',
            type: outcome.ok
              ? `tools/result: ${name}`
              : `tools/error: ${name}${outcomeMessage ? ` (${outcomeMessage})` : ''}`,
            source: testMode === 'builder' ? 'builder' : 'model',
            status: outcome.ok ? 'success' : 'error',
          });

          setMessages((prev) =>
            updateAssistantToolPart(prev, assistantMessageId, callId, {
              callId,
              toolName: name,
              args,
              status: outcome.ok ? 'completed' : 'failed',
              result: toolResult,
              summary: outcome.ok ? summarizeToolResult(toolResult) : outcomeMessage,
            })
          );

          if (!outcome.ok) {
            setMessages((prev) =>
              appendAssistantNote(
                prev,
                assistantMessageId,
                `Tool error (${name}): ${outcomeMessage}`,
                'error'
              )
            );
            toolTraceRef.current.delete(callId);
            return;
          }

          await maybeCreateWidgetSessionFromToolResult({
            appendWidgetEvent,
            createWidgetSession,
            fetchWidgetResource,
            setWidgetStatus,
            setMessages,
            updateWidgetSession,
            assistantMessageId,
            callId,
            toolName: name,
            args,
            toolResult,
            tools,
            supportsWidgets: transport.supportsWidgets,
            source: testMode === 'builder' ? 'builder' : 'model',
            traceId: toolTrace.traceId,
            startedAt: toolTrace.startedAt,
            completionMessage: `Model completed ${name}`,
          });

          toolTraceRef.current.delete(callId);
        },
      });

      const fallbackText = response?.text?.trim();
      const fallbackSteps = Array.isArray(response?.steps) ? response.steps : [];
      if (fallbackText || fallbackSteps.length > 0) {
        setMessages((prev) => {
          const assistantMessage = prev.find((message) => message.id === assistantMessageId);
          const streamedText = getAssistantMessageText(assistantMessage);

          if (!assistantMessage) {
            return prev;
          }

          if (streamedText) {
            return prev;
          }

          const rebuiltMessage = rebuildAssistantPartsFromSteps(assistantMessage, fallbackSteps);
          if (rebuiltMessage !== assistantMessage) {
            return prev.map((message) =>
              message.id === assistantMessageId ? rebuiltMessage : message
            );
          }

          if (fallbackText) {
            return appendAssistantTextDelta(prev, assistantMessageId, fallbackText);
          }

          return prev;
        });
      }

      addLog({ dir: '<-', type: 'chat/result', source: 'model', status: 'success' });
    } catch (error) {
      setMessages((prev) =>
        appendAssistantNote(
          prev,
          assistantMessageId,
          `Error: ${error.message}`,
          'error'
        )
      );
      addLog({
        dir: '!',
        type: `chat/error: ${error.message}`,
        source: 'model',
        status: 'error',
      });
    } finally {
      currentAssistantMessageIdRef.current = null;
      setIsStreaming(false);
    }
  }, [
    addLog,
    appendWidgetEvent,
    createWidgetSession,
    fetchWidgetResource,
    geminiApiKey,
    setWidgetStatus,
    testMode,
    tools,
    transport,
    updateWidgetSession,
  ]);

  const executeDirectTool = useCallback(async (toolName, args = {}) => {
    if (!transport) return false;

    const assistantMessageId = createRuntimeId('assistant');
    const callId = createRuntimeId('direct-tool');
    const traceId = createRuntimeId('trace');
    const startedAt = new Date().toISOString();

    setMessages((prev) => [
      ...prev,
      {
        id: createRuntimeId('user'),
        role: 'user',
        content: `Direct run: ${toolName}`,
        isDirectRun: true,
        isHidden: true,
      },
      createAssistantMessage({
        id: assistantMessageId,
        isDirectRun: true,
        parts: [
          createToolPart({
            callId,
            toolName,
            args,
            status: 'running',
            summary: `Running ${toolName}.`,
          }),
        ],
      }),
    ]);

    addLog({
      dir: '->',
      type: `tools/call: ${toolName}`,
      source: 'direct-run',
    });

    try {
      const toolResult = await transport.callTool(toolName, args);
      const outcome = classifyToolOutcome(toolResult);
      const outcomeMessage = outcome.ok ? null : getToolErrorMessage(toolResult);

      addLog({
        dir: outcome.ok ? '<-' : '!',
        type: outcome.ok
          ? `tools/result: ${toolName}`
          : `tools/error: ${toolName}${outcomeMessage ? ` (${outcomeMessage})` : ''}`,
        source: 'direct-run',
        status: outcome.ok ? 'success' : 'error',
      });

      setMessages((prev) =>
        updateAssistantToolPart(prev, assistantMessageId, callId, {
          callId,
          toolName,
          args,
          status: outcome.ok ? 'completed' : 'failed',
          result: toolResult,
          summary: outcome.ok ? summarizeToolResult(toolResult) : outcomeMessage,
        })
      );

      if (!outcome.ok) {
        setMessages((prev) =>
          appendAssistantNote(
            prev,
            assistantMessageId,
            `Tool error (${toolName}): ${outcomeMessage}`,
            'error'
          )
        );
        return false;
      }

      await maybeCreateWidgetSessionFromToolResult({
        appendWidgetEvent,
        createWidgetSession,
        fetchWidgetResource,
        setWidgetStatus,
        setMessages,
        updateWidgetSession,
        assistantMessageId,
        callId,
        toolName,
        args,
        toolResult,
        tools,
        supportsWidgets: transport.supportsWidgets,
        source: 'direct-run',
        traceId,
        startedAt,
        completionMessage: `Direct run completed ${toolName}`,
      });

      return true;
    } catch (error) {
      const message = error.message || `Failed to run ${toolName}`;

      addLog({
        dir: '!',
        type: `tools/error: ${toolName} (${message})`,
        source: 'direct-run',
        status: 'error',
      });

      setMessages((prev) =>
        updateAssistantToolPart(prev, assistantMessageId, callId, {
          callId,
          toolName,
          args,
          status: 'failed',
          summary: message,
        })
      );
      setMessages((prev) =>
        appendAssistantNote(
          prev,
          assistantMessageId,
          `Tool error (${toolName}): ${message}`,
          'error'
        )
      );

      return false;
    }
  }, [
    addLog,
    appendWidgetEvent,
    createWidgetSession,
    fetchWidgetResource,
    setWidgetStatus,
    tools,
    transport,
    updateWidgetSession,
  ]);

  const sendMessage = useCallback(async (content) => {
    if (!content?.trim() || isStreaming || !transport || !geminiApiKey) return false;

    const userMessage = {
      id: createRuntimeId('user'),
      role: 'user',
      content: content.trim(),
    };

    const nextMessages = [...messagesRef.current, userMessage];
    setMessages(nextMessages);
    await runAI(nextMessages);
    return true;
  }, [geminiApiKey, isStreaming, runAI, transport]);

  const registerWidget = useCallback((id, fns) => {
    widgetRegistry.current.set(id, fns);
  }, []);

  const unregisterWidget = useCallback((id) => {
    widgetRegistry.current.delete(id);
  }, []);

  return {
    messages,
    isStreaming,
    logs,
    sessionsById,
    sendMessage,
    executeDirectTool,
    clearConversation,
    registerWidget,
    unregisterWidget,
    canSend: !!transport && !!geminiApiKey && !isStreaming,
    supportsWidgets: !!transport?.supportsWidgets,
  };
}

export const __test = {
  appendAssistantTextDelta,
  appendAssistantToolPart,
  updateAssistantToolPart,
  appendAssistantWidgetPart,
  assistantMessageHasWidgetPart,
  getAssistantMessageText,
  rebuildAssistantPartsFromSteps,
  summarizeToolResult,
};
