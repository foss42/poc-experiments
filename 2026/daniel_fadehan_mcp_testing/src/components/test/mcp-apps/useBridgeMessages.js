/**
 * useBridgeMessages
 * Handles the postMessage channel between the host and embedded iframe widgets.
 */
import { useEffect } from 'react';
import { classifyToolOutcome, getToolErrorMessage } from '../../../utils/toolOutcome.js';

function downloadBlob(data, filename, mimeType) {
  const blob = new Blob([data], { type: mimeType || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'download';
  link.click();
  URL.revokeObjectURL(url);
}

function decodeBase64(base64) {
  try {
    return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

function handleDownloadRequest(params) {
  if (params?.contents?.length) {
    const item = params.contents[0];

    if (item.type === 'resource') {
      const resource = item.resource || {};
      const filename = resource.uri?.split('/').pop() || 'download';

      if (resource.blob) {
        const bytes = decodeBase64(resource.blob);
        if (bytes) {
          downloadBlob(bytes, filename, resource.mimeType);
          return { success: true };
        }
      }

      if (resource.text != null) {
        downloadBlob(resource.text, filename, resource.mimeType);
        return { success: true };
      }
    }
  }

  if (params?.data != null) {
    downloadBlob(params.data, params.filename, params.mimeType);
    return { success: true };
  }

  throw new Error('Unsupported download payload');
}

function buildToolInputArguments(session) {
  const explicitArgs = session?.invocationArgs;
  if (explicitArgs && typeof explicitArgs === 'object' && !Array.isArray(explicitArgs)) {
    return explicitArgs;
  }
  return {};
}

function buildToolResultPayload(session) {
  return session?.toolResult ?? null;
}

function buildModelContextPayload(session) {
  if (session?.modelContext == null) return null;
  if (typeof session.modelContext === 'object' && !Array.isArray(session.modelContext)) {
    return session.modelContext;
  }
  return { structuredContent: session.modelContext };
}

function buildWidgetState(session) {
  if (!session) return null;
  return {
    widgetId: session.widgetId,
    traceId: session.traceId,
    toolName: session.toolName,
    resourceUri: session.resourceUri,
    status: session.status,
    source: session.source,
    compatibility: session.compatibility,
    warnings: session.warnings || [],
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

function buildHostCapabilities(session) {
  return {
    logging: {},
    openLinks: {},
    downloadFile: {},
    serverTools: {},
    serverResources: {},
    sandbox: {
      permissions: session?.resourceMeta?.ui?.permissions || {},
      csp: session?.resourceMeta?.ui?.csp || {},
    },
  };
}

function buildHostContext(session) {
  return {
    theme: 'light',
    displayMode: 'inline',
    availableDisplayModes: ['inline'],
    platform: 'web',
    userAgent: 'Forge',
    toolInfo: session
      ? {
        id: session.traceId,
        tool: {
          name: session.toolName,
          description: '',
          inputSchema: { type: 'object', properties: {} },
          _meta: { ui: { resourceUri: session.resourceUri } },
        },
      }
      : undefined,
    toolInfoWidgetId: session?.widgetId,
    locale: navigator.language,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

function postWidgetNotification(source, method, params, addLog, widgetId) {
  const payload = { jsonrpc: '2.0', method, params };
  console.log(`[Bridge] Sending ${method} to widget ${widgetId}:`, payload);
  addLog?.({
    dir: '->',
    type: `bridge notify: ${method}`,
    source: 'mcp-apps-bridge',
  });
  source.postMessage(payload, '*');
}

function postWidgetState(source, session, status, addLog) {
  if (!source || !session?.widgetId) return;
  postWidgetNotification(
    source,
    'ui/notifications/widget-state',
    { ...buildWidgetState(session), status: status || session.status },
    addLog,
    session.widgetId
  );
}

function findWidgetIdFromSource(widgetRegistry, source) {
  for (const [widgetId, entry] of widgetRegistry.current.entries()) {
    if (entry.checkSource(source)) {
      return widgetId;
    }
  }
  return null;
}

function deliverSessionSnapshot(source, session, helpers) {
  const {
    addLog,
    setWidgetStatus,
    appendWidgetEvent,
    updateWidgetSession,
    addWidgetWarning,
  } = helpers;

  if (!session) return;

  const widgetStateBase = buildWidgetState(session);

  setWidgetStatus(session.widgetId, 'awaiting_tool_input');
  appendWidgetEvent(session.widgetId, {
    kind: 'lifecycle',
    source: 'host',
    message: 'View initialized; delivering host snapshot',
  });

  postWidgetNotification(
    source,
    'ui/notifications/widget-state',
    { ...widgetStateBase, status: 'awaiting_tool_input' },
    addLog,
    session.widgetId
  );

  const modelContextPayload = buildModelContextPayload(session);
  if (modelContextPayload) {
    postWidgetNotification(
      source,
      'ui/notifications/model-context',
      modelContextPayload,
      addLog,
      session.widgetId
    );
    updateWidgetSession(session.widgetId, {
      notifications: { modelContextSentAt: new Date().toISOString() },
    });
  }

  const toolInputParams = { arguments: buildToolInputArguments(session) };
  if (
    session.compatibility?.legacyStructuredContentInToolInput &&
    session.toolResult?.structuredContent != null
  ) {
    toolInputParams.structuredContent = session.toolResult.structuredContent;
    addWidgetWarning(session.widgetId, {
      code: 'legacy-tool-input-structured-content',
      message: 'Legacy compatibility injected structuredContent into tool-input.',
    });
  }

  postWidgetNotification(
    source,
    'ui/notifications/tool-input',
    toolInputParams,
    addLog,
    session.widgetId
  );
  updateWidgetSession(session.widgetId, {
    notifications: { toolInputSentAt: new Date().toISOString() },
  });

  const toolResultPayload = buildToolResultPayload(session);
  if (toolResultPayload) {
    setWidgetStatus(session.widgetId, 'awaiting_tool_result');
    postWidgetNotification(
      source,
      'ui/notifications/widget-state',
      { ...buildWidgetState(session), status: 'awaiting_tool_result' },
      addLog,
      session.widgetId
    );

    postWidgetNotification(
      source,
      'ui/notifications/tool-result',
      toolResultPayload,
      addLog,
      session.widgetId
    );

    updateWidgetSession(session.widgetId, {
      notifications: { toolResultSentAt: new Date().toISOString() },
    });
    setWidgetStatus(session.widgetId, 'ready');
    postWidgetNotification(
      source,
      'ui/notifications/widget-state',
      { ...buildWidgetState({ ...session, status: 'ready' }), status: 'ready' },
      addLog,
      session.widgetId
    );
  } else {
    setWidgetStatus(session.widgetId, 'awaiting_tool_result');
    postWidgetNotification(
      source,
      'ui/notifications/widget-state',
      { ...buildWidgetState(session), status: 'awaiting_tool_result' },
      addLog,
      session.widgetId
    );
  }
}

export function useBridgeMessages({
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
  onContextUpdate,
}) {
  useEffect(() => {
    const helpers = {
      addLog,
      getWidgetSession,
      setWidgetStatus,
      setWidgetModelContext,
      updateWidgetSession,
      appendWidgetEvent,
      startProxyToolCall,
      finishProxyToolCall,
      addWidgetWarning,
      onContextUpdate,
    };

    const handleMessage = async (event) => {
      const { jsonrpc, id, method, params } = event.data || {};
      if (jsonrpc !== '2.0') return;

      addLog({ dir: '<-', type: `bridge: ${method}`, source: 'mcp-apps-bridge' });

      const widgetId = findWidgetIdFromSource(widgetRegistry, event.source);
      const session = widgetId ? getWidgetSession(widgetId) : null;

      if (!widgetId) {
        console.warn('CRITICAL: widgetId is null for method', method, 'Registry size:', widgetRegistry.current.size);
      }

      console.log('bridge received:', method, { widgetId, params });

      if (widgetId) {
        appendWidgetEvent(widgetId, {
          kind: 'bridge-message',
          source: 'widget',
          message: method,
          data: params,
        });
      }

      try {
        let result;

        if (method === 'tools/call' && params?.name) {
          const proxyTraceId = widgetId
            ? startProxyToolCall(widgetId, params.name, params.arguments ?? {}, 'widget')
            : null;

          if (widgetId) {
            setWidgetStatus(widgetId, 'tool_running');
            postWidgetState(event.source, session, 'tool_running', addLog);
          }

          console.log(`[Bridge] Calling tool: ${params.name}`, params.arguments);
          try {
            const toolResult = await client.callTool(params.name, params.arguments ?? {});
            console.log(`[Bridge] Tool result for ${params.name}:`, toolResult);
            const outcome = classifyToolOutcome(toolResult);

            if (widgetId && proxyTraceId) {
              finishProxyToolCall(widgetId, proxyTraceId, {
                status: outcome.ok ? 'completed' : 'failed',
                result: outcome.ok ? toolResult : null,
                error: outcome.ok ? null : getToolErrorMessage(toolResult),
              });
              appendWidgetEvent(widgetId, {
                kind: 'proxy-tool-result',
                source: 'host',
                message: `${params.name} ${outcome.ok ? 'completed' : 'failed'}`,
                data: toolResult,
              });
              const nextStatus = session?.toolResult ? 'ready' : 'awaiting_tool_result';
              setWidgetStatus(widgetId, nextStatus);
              postWidgetState(event.source, session, nextStatus, addLog);
            }

            if (!outcome.ok) {
              if (id !== undefined) {
                event.source.postMessage(
                  {
                    jsonrpc: '2.0',
                    id,
                    error: { code: -32000, message: getToolErrorMessage(toolResult) },
                  },
                  '*'
                );
              }
              addLog({ dir: '->', type: `bridge error: ${params.name}`, source: 'mcp-apps-bridge' });
              return;
            }

            result = toolResult;
            addLog({ dir: '->', type: `bridge result: ${params.name}`, source: 'mcp-apps-bridge' });
          } catch (error) {
            console.error(`[Bridge] Tool call failed for ${params.name}:`, error);
            if (widgetId && proxyTraceId) {
              finishProxyToolCall(widgetId, proxyTraceId, {
                status: 'failed',
                error: error.message,
              });
              const nextStatus = session?.toolResult ? 'ready' : 'error';
              setWidgetStatus(widgetId, nextStatus);
              postWidgetState(event.source, session, nextStatus, addLog);
            }
            if (id !== undefined) {
              event.source.postMessage(
                { jsonrpc: '2.0', id, error: { code: -32000, message: error.message } },
                '*'
              );
            }
            addLog({ dir: '->', type: `bridge error: ${params.name}`, source: 'mcp-apps-bridge' });
            return;
          }
        } else if (method === 'resources/read') {
          result = await client.readResource(params.uri);

        } else if (method === 'ui/update-model-context') {
          const modelContext =
            params && (Object.prototype.hasOwnProperty.call(params, 'structuredContent') || Object.prototype.hasOwnProperty.call(params, 'content'))
              ? params
              : { structuredContent: params };
          if (widgetId) {
            setWidgetModelContext(widgetId, modelContext);
            appendWidgetEvent(widgetId, {
              kind: 'model-context',
              source: 'widget',
              message: 'View updated model context',
              data: modelContext,
            });
          }
          onContextUpdate?.(modelContext, widgetId);
          result = {};

        } else if (method === 'ui/download-file') {
          result = handleDownloadRequest(params);

        } else if (method === 'ui/open-link') {
          const url = params?.url;
          if (!url || typeof url !== 'string') {
            throw new Error('Invalid URL');
          }
          window.open(url, '_blank', 'noopener,noreferrer');
          result = {};

        } else if (method === 'ui/request-display-mode') {
          const requestedMode = params?.mode;
          if (widgetId) {
            appendWidgetEvent(widgetId, {
              kind: 'display-mode-request',
              source: 'widget',
              message: `View requested display mode: ${requestedMode || 'unknown'}`,
              data: params,
            });
          }
          result = { mode: 'inline' };

        } else if (method === 'ui/initialize') {
          if (widgetId) {
            setWidgetStatus(widgetId, 'iframe_initializing');
          }
          result = {
            protocolVersion: params?.protocolVersion || '2025-11-21',
            hostInfo: {
              name: serverInfo?.name ? `Forge (${serverInfo.name})` : 'Forge',
              version: '1.0.0',
            },
            hostCapabilities: buildHostCapabilities(session),
            hostContext: buildHostContext(session),
          };

        } else if (method === 'ui/notifications/initialized') {
          if (widgetId) {
            updateWidgetSession(widgetId, {
              notifications: { initializedAt: new Date().toISOString() },
            });
          }
          deliverSessionSnapshot(event.source, session, helpers);
          return;

        } else if (method === 'ui/notifications/size-changed') {
          if (widgetId) {
            appendWidgetEvent(widgetId, {
              kind: 'size-changed',
              source: 'widget',
              message: 'View reported size change',
              data: params,
            });
          }
          return;

        } else if (method === 'ui/notifications/request-teardown') {
          if (widgetId) {
            appendWidgetEvent(widgetId, {
              kind: 'teardown-request',
              source: 'widget',
              message: 'View requested teardown',
            });
          }
          return;

        } else if (method === 'notifications/message') {
          if (widgetId) {
            appendWidgetEvent(widgetId, {
              kind: 'widget-log',
              source: 'widget',
              message: params?.data || params?.message || 'Widget log',
              data: params,
            });
          }
          addLog({
            dir: '<-',
            type: `widget log: ${params?.level || 'info'}`,
            source: 'mcp-apps-bridge',
          });
          return;

        } else if (method === 'ping') {
          result = {};

        } else if (typeof method === 'string' && method.startsWith('ui/notifications/')) {
          return;
        }

        if (id !== undefined) {
          event.source.postMessage({ jsonrpc: '2.0', id, result }, '*');
        }
      } catch (err) {
        if (widgetId) {
          setWidgetStatus(widgetId, 'error', { lastError: err.message });
          postWidgetState(event.source, session, 'error', addLog);
          appendWidgetEvent(widgetId, {
            kind: 'bridge-error',
            source: 'host',
            message: err.message,
          });
        }
        if (id !== undefined) {
          event.source.postMessage(
            { jsonrpc: '2.0', id, error: { code: -32603, message: err.message } },
            '*'
          );
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [
    addLog,
    client,
    serverInfo,
    widgetRegistry,
    getWidgetSession,
    setWidgetStatus,
    setWidgetModelContext,
    updateWidgetSession,
    appendWidgetEvent,
    startProxyToolCall,
    finishProxyToolCall,
    addWidgetWarning,
    onContextUpdate,
  ]);
}
