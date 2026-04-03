/**
 * ChatWidget — renders a single MCP UI widget session in an iframe with:
 * - Generic runtime status
 * - Data / Context / Runtime inspect tabs
 * - Live bridge registration by widget session
 */
import { useState, useRef, useEffect, useMemo } from 'react';
import { buildCspString, buildOpenaiCompatScript, buildIframeSrcdoc } from './iframeUtils.js';
import { JsonView } from './JsonView.jsx';
import { formatModelContextDisplay, formatToolDisplay } from '../../../utils/toolDisplay.js';

const STATUS_LABELS = {
  resource_loading: 'Loading Resource',
  iframe_initializing: 'Initializing View',
  awaiting_tool_input: 'Sending Input',
  tool_running: 'Tool Running',
  awaiting_tool_result: 'Waiting Result',
  ready: 'Ready',
  error: 'Error',
};

const STATUS_STYLES = {
  resource_loading: 'bg-amber-50 text-amber-700 border-amber-200',
  iframe_initializing: 'bg-sky-50 text-sky-700 border-sky-200',
  awaiting_tool_input: 'bg-sky-50 text-sky-700 border-sky-200',
  tool_running: 'bg-violet-50 text-violet-700 border-violet-200',
  awaiting_tool_result: 'bg-violet-50 text-violet-700 border-violet-200',
  ready: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  error: 'bg-red-50 text-red-700 border-red-200',
};

function formatStatus(status) {
  return STATUS_LABELS[status] || status || 'Unknown';
}

function formatPreview(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function ChatWidget({ session, registerWidget, unregisterWidget }) {
  const [activeTab, setActiveTab] = useState(null); // null | 'data' | 'context' | 'runtime'
  const iframeRef = useRef(null);
  const display = useMemo(
    () => formatToolDisplay({ args: session?.invocationArgs, result: session?.toolResult }),
    [session?.invocationArgs, session?.toolResult]
  );
  const modelContextDisplay = useMemo(
    () => formatModelContextDisplay(session?.modelContext),
    [session?.modelContext]
  );

  useEffect(() => {
    if (!registerWidget || !session?.widgetId) return undefined;

    registerWidget(session.widgetId, {
      checkSource: (source) => iframeRef.current && source === iframeRef.current.contentWindow,
      getSession: () => session,
    });

    return () => {
      if (unregisterWidget && session.widgetId) {
        unregisterWidget(session.widgetId);
      }
    };
  }, [registerWidget, unregisterWidget, session]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || activeTab || !session?.html) return undefined;
    let resizeObserver = null;
    let mutObserver = null;

    const fitHeight = () => {
      try {
        const root = iframe.contentDocument?.documentElement;
        if (!root) return;
        let targetHeight = root.scrollHeight;

        const width = iframe.offsetWidth;
        const hasCharts = iframe.contentDocument.querySelector('canvas, svg');
        const isPdfViewer = iframe.contentDocument.querySelector('#viewer, #canvasContainer');

        if (isPdfViewer) {
          targetHeight = Math.max(targetHeight, width * 1.3);
        } else if (hasCharts) {
          targetHeight = Math.max(targetHeight, width * 1.1);
        }

        if (targetHeight > 0) {
          iframe.style.height = `${targetHeight + 10}px`;
        }
      } catch {
        // cross-origin guard
      }
    };

    const onLoad = () => {
      fitHeight();
      try {
        resizeObserver = new ResizeObserver(fitHeight);
        resizeObserver.observe(iframe.contentDocument.documentElement);
        setTimeout(fitHeight, 300);
        setTimeout(fitHeight, 800);
        mutObserver = new MutationObserver(fitHeight);
        mutObserver.observe(iframe.contentDocument.body, { childList: true, subtree: true });
      } catch {
        // cross-origin guard
      }
    };

    iframe.addEventListener('load', onLoad);
    return () => {
      iframe.removeEventListener('load', onLoad);
      resizeObserver?.disconnect();
      mutObserver?.disconnect();
    };
  }, [activeTab, session?.html]);

  const srcdoc = useMemo(() => {
    if (!session?.html) return null;

    const cspObj = session?.resourceMeta?.ui?.csp;
    const cspString = buildCspString(cspObj);
    const cspMetaTag = `<meta http-equiv="Content-Security-Policy" content="${cspString}">`;

    // Keep the iframe bootstrap static after first render.
    // Authoritative lifecycle updates are delivered through bridge notifications.
    const configData = {
      toolInput: null,
      modelContext: null,
      widgetState: {
        widgetId: session?.widgetId,
        status: 'bootstrapping',
        traceId: session?.traceId,
        toolName: session?.toolName,
        source: session?.source,
      },
      theme: 'light',
      displayMode: 'inline',
      viewMode: 'inline',
      viewParams: {},
    };

    const { contextScript, polyfillScript } = buildOpenaiCompatScript(configData);
    return buildIframeSrcdoc({
      html: session.html,
      cspMetaTag,
      contextScript,
      polyfillScript,
    });
  }, [
    session?.html,
    session?.resourceMeta,
    session?.widgetId,
    session?.traceId,
    session?.toolName,
    session?.source,
  ]);

  return (
    <div className="w-full mt-3 flex flex-col">
      <div className="bg-white rounded-xl border border-neutral-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden w-full">
        <div className="h-10 px-4 bg-neutral-50/80 border-b border-neutral-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-neutral-400">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 17 22 22 17" />
            </svg>
            <span className="text-[12px] font-mono text-neutral-600 font-medium">{session.toolName}</span>
            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-mono ${STATUS_STYLES[session.status] || STATUS_STYLES.resource_loading}`}>
              {formatStatus(session.status)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-medium font-mono text-neutral-500">
            <button
              onClick={() => setActiveTab(activeTab === 'data' ? null : 'data')}
              className={`px-2 py-1 rounded transition-colors ${activeTab === 'data' ? 'bg-neutral-200 text-neutral-800' : 'hover:bg-neutral-200/60'}`}
            >
              Data
            </button>
            <button
              onClick={() => setActiveTab(activeTab === 'context' ? null : 'context')}
              className={`px-2 py-1 rounded transition-colors ${activeTab === 'context' ? 'bg-neutral-200 text-neutral-800' : 'hover:bg-neutral-200/60'}`}
            >
              Context
            </button>
            <button
              onClick={() => setActiveTab(activeTab === 'runtime' ? null : 'runtime')}
              className={`px-2 py-1 rounded transition-colors ${activeTab === 'runtime' ? 'bg-neutral-200 text-neutral-800' : 'hover:bg-neutral-200/60'}`}
            >
              Runtime
            </button>
          </div>
        </div>

        {activeTab === 'data' && (
          <div className="p-4 bg-neutral-50 border-b border-neutral-200/80 overflow-x-auto max-h-[420px] overflow-y-auto text-[12px] font-mono leading-loose">
            <div className="mb-4">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Invocation Args</div>
              {display.toolInputDisplay.value != null
                ? <JsonView data={display.toolInputDisplay.value} />
                : <span className="text-neutral-400 italic">No input arguments were passed to this tool call.</span>}
            </div>
            <div>
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Originating Result</div>
              {display.toolResultDisplay.value != null
                ? <JsonView data={display.toolResultDisplay.value} />
                : <span className="text-neutral-400 italic">No user-facing result payload was returned.</span>}
            </div>
            {display.hasRawDetails ? (
              <details className="mt-4 rounded-lg border border-neutral-200 bg-white">
                <summary className="cursor-pointer list-none px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Raw MCP Response
                </summary>
                <div className="border-t border-neutral-200 p-3 text-[11px] text-neutral-700">
                  <pre className="overflow-x-auto whitespace-pre-wrap">{formatPreview(display.rawResult)}</pre>
                </div>
              </details>
            ) : null}
            {display.isMcpAppResult ? (
              <div className="mt-4 text-[11px] text-sky-700 font-sans bg-sky-50 p-2 rounded border border-sky-200">
                This tool result opened an MCP App view via <span className="font-mono">{display.uiResourceUri}</span>.
              </div>
            ) : null}
            {session.warnings?.length ? (
              <div className="mt-4 space-y-2">
                {session.warnings.map((warning) => (
                  <div key={warning.code} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-sans text-amber-800">
                    {warning.message}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {activeTab === 'context' && (
          <div className="p-4 bg-neutral-50 border-b border-neutral-200/80 overflow-x-auto max-h-[420px] overflow-y-auto text-[12px] font-mono leading-loose">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Model Context</div>
              {session.modelContext && <div className="text-[10px] text-neutral-400">Updated: {new Date(session.updatedAt).toLocaleTimeString()}</div>}
            </div>
            <div className="mb-4">
              {modelContextDisplay.value != null
                ? <JsonView data={modelContextDisplay.value} />
                : <span className="text-neutral-400 italic">{modelContextDisplay.summary}</span>}
            </div>
            <div className="text-[11px] text-neutral-500 font-sans bg-white p-2 rounded border border-neutral-200">
              This payload is stored for later model turns and is separate from the tool result shown in the Data tab.
            </div>
          </div>
        )}

        {activeTab === 'runtime' && (
          <div className="p-4 bg-neutral-50 border-b border-neutral-200/80 overflow-x-auto max-h-[420px] overflow-y-auto text-[12px] font-mono leading-loose space-y-4">
            <div>
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Widget State</div>
              <JsonView
                data={{
                  widgetId: session.widgetId,
                  traceId: session.traceId,
                  toolName: session.toolName,
                  source: session.source,
                  status: session.status,
                  resourceUri: session.resourceUri,
                  notifications: session.notifications,
                  compatibility: session.compatibility,
                  warnings: session.warnings,
                }}
              />
            </div>

            <div>
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Proxy Tool Calls</div>
              {session.proxyToolCalls?.length
                ? <JsonView data={session.proxyToolCalls} />
                : <span className="text-neutral-400 italic">No proxied tool calls from this widget yet.</span>}
            </div>

            <div>
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Timeline</div>
              <div className="space-y-2">
                {(session.timeline || []).map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-neutral-200 bg-white px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-semibold text-neutral-700">{entry.message}</span>
                      <span className="text-[10px] text-neutral-400">{new Date(entry.at).toLocaleTimeString()}</span>
                    </div>
                    <div className="mt-1 text-[10px] text-neutral-500 uppercase tracking-wide">
                      {entry.kind} · {entry.source}
                    </div>
                    {entry.data && (
                      <div className="mt-2">
                        <JsonView data={entry.data} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className={activeTab ? 'hidden' : 'block'}>
          {!session.html ? (
            <div className="px-5 py-6 bg-white">
              <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-5">
                <div className="text-[12px] font-mono text-neutral-700">{formatStatus(session.status)}</div>
                <div className="mt-2 text-[12px] text-neutral-500">
                  Forge is preparing this MCP app session before rendering the iframe.
                </div>
              </div>
            </div>
          ) : (
            <>
              {session.status !== 'ready' && (
                <div className="px-4 py-2 text-[11px] font-mono border-b border-neutral-200/80 bg-neutral-50 text-neutral-600">
                  Runtime state: {formatStatus(session.status)}
                </div>
              )}
              <iframe
                ref={iframeRef}
                srcDoc={srcdoc}
                sandbox="allow-scripts allow-forms allow-popups allow-downloads allow-modals allow-same-origin"
                className="w-full border-0 bg-white"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
