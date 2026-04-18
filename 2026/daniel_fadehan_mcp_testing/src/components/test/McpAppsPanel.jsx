/* eslint-disable react/prop-types */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTestStore } from '../../stores/testStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { RuntimeComposer } from './RuntimeComposer.jsx';
import { RuntimeConversation } from './RuntimeConversation.jsx';
import { assistantMessageHasWidgetPart, useMcpChatRuntime } from './mcp-apps/useMcpChatRuntime.js';

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

const DesktopIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="14" x="2" y="3" rx="2" />
    <line x1="8" x2="16" y1="21" y2="21" />
    <line x1="12" x2="12" y1="17" y2="21" />
  </svg>
);

const MobileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
    <path d="M12 18h.01" />
  </svg>
);

const TabletIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
    <line x1="12" x2="12.01" y1="18" y2="18" />
  </svg>
);

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const KeyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const requiredBadgeClassName = 'rounded bg-orange-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-orange-700';

function parseParamValue(rawValue, type = 'string') {
  if (rawValue == null) return undefined;
  const normalized = String(rawValue).trim();
  if (!normalized) return undefined;

  switch (type) {
    case 'number':
    case 'integer': {
      const value = Number(normalized);
      if (Number.isNaN(value)) {
        throw new Error(`Expected a ${type} value.`);
      }
      return value;
    }
    case 'boolean':
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
      return undefined;
    case 'object':
    case 'array':
      return JSON.parse(normalized);
    default:
      return rawValue;
  }
}

function buildArgs(properties = {}, rawParams = {}) {
  const args = {};

  Object.entries(properties || {}).forEach(([name, schema]) => {
    const value = parseParamValue(rawParams[name], schema?.type);
    if (value !== undefined) {
      args[name] = value;
    }
  });

  return args;
}

function JsonViewer({ data, isLast = true, name = null }) {
  const isObject = data !== null && typeof data === 'object';
  const isArray = Array.isArray(data);

  if (!isObject) {
    let valueColor = 'text-neutral-600';
    if (typeof data === 'string') valueColor = 'text-emerald-600';
    else if (typeof data === 'number') valueColor = 'text-amber-600';
    else if (typeof data === 'boolean') valueColor = 'text-rose-500';
    else if (data === null) valueColor = 'text-neutral-400';

    return (
      <div className="font-mono text-[11px] leading-relaxed">
        {name && <span className="text-sky-600">&quot;{name}&quot;</span>}
        {name && <span className="text-neutral-400">: </span>}
        <span className={valueColor}>
          {typeof data === 'string' ? <>&quot;{data}&quot;</> : String(data)}
        </span>
        {!isLast && <span className="text-neutral-400">,</span>}
      </div>
    );
  }

  const keys = Object.keys(data);
  const isEmpty = keys.length === 0;
  const openBracket = isArray ? '[' : '{';
  const closeBracket = isArray ? ']' : '}';

  if (isEmpty) {
    return (
      <div className="font-mono text-[11px] leading-relaxed">
        {name && <span className="text-sky-600">&quot;{name}&quot;</span>}
        {name && <span className="text-neutral-400">: </span>}
        <span className="text-neutral-400">{openBracket}{closeBracket}</span>
        {!isLast && <span className="text-neutral-400">,</span>}
      </div>
    );
  }

  return (
    <div className="font-mono text-[11px] leading-relaxed">
      <div className="flex items-start">
        <div className="flex-1">
          {name && <span className="text-sky-600">&quot;{name}&quot;</span>}
          {name && <span className="text-neutral-400">: </span>}
          <span className="text-neutral-400">{openBracket}</span>
        </div>
      </div>
      <>
        <div className="mb-0.5 ml-[22px] mt-0.5">
          {keys.map((key, index) => (
            <JsonViewer
              key={key}
              name={isArray ? null : key}
              data={data[key]}
              isLast={index === keys.length - 1}
            />
          ))}
        </div>
        <div className="ml-1.5">
          <span className="text-neutral-400">{closeBracket}</span>
          {!isLast && <span className="text-neutral-400">,</span>}
        </div>
      </>
    </div>
  );
}

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

function CollapsibleHeader({ title, isExpanded, onClick }) {
  return (
    <div 
      className="mb-2 flex cursor-pointer items-center justify-between"
      onClick={onClick}
    >
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{title}</h3>
      <div className={`text-neutral-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
        <ChevronDownIcon />
      </div>
    </div>
  );
}

export function McpAppsPanel() {
  const { tools, serverInfo, client, testMode, selectTool } = useTestStore();
  const { geminiApiKey } = useSettingsStore();

  const [chatInput, setChatInput] = useState('');
  const [isLogsCollapsed, setIsLogsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTool, setSelectedTool] = useState(null);
  const [toolParams, setToolParams] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [viewport, setViewport] = useState('desktop');
  const [runError, setRunError] = useState('');
  
  const [isToolSwitcherOpen, setIsToolSwitcherOpen] = useState(false);
  const [descCollapsed, setDescCollapsed] = useState(false);
  const [schemaCollapsed, setSchemaCollapsed] = useState(true);
  const [paramsCollapsed, setParamsCollapsed] = useState(false);

  const scrollRef = useRef(null);
  const sidebarIsResizing = useRef(false);
  const sidebarRef = useRef(null);

  const {
    messages,
    isStreaming,
    logs,
    sessionsById,
    sendMessage,
    executeDirectTool,
    clearConversation,
    registerWidget,
    unregisterWidget,
    supportsWidgets,
  } = useMcpChatRuntime({
    tools,
    serverInfo,
    client,
    geminiApiKey,
    testMode,
  });

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    if (lastMessage.role === 'assistant' && assistantMessageHasWidgetPart(lastMessage)) {
      const element = scrollRef.current?.querySelector(`[data-msg-id="${lastMessage.id}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const resizeSidebar = useCallback((event) => {
    if (!sidebarIsResizing.current) return;

    const panelLeft = sidebarRef.current
      ?.closest('[data-mcpapps]')
      ?.getBoundingClientRect()
      ?.left || 0;

    let newWidth = event.clientX - panelLeft;
    newWidth = Math.max(260, Math.min(500, newWidth));
    setSidebarWidth(newWidth);

    if (isSidebarCollapsed && newWidth > 260) {
      setIsSidebarCollapsed(false);
    }
  }, [isSidebarCollapsed]);

  const stopSidebarResizing = useCallback(() => {
    sidebarIsResizing.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', resizeSidebar);
    window.addEventListener('mouseup', stopSidebarResizing);

    return () => {
      window.removeEventListener('mousemove', resizeSidebar);
      window.removeEventListener('mouseup', stopSidebarResizing);
    };
  }, [resizeSidebar, stopSidebarResizing]);

  const startSidebarResizing = (event) => {
    event.preventDefault();
    sidebarIsResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const viewports = [
    { id: 'mobile', icon: <MobileIcon />, label: 'Mobile' },
    { id: 'tablet', icon: <TabletIcon />, label: 'Tablet' },
    { id: 'desktop', icon: <DesktopIcon />, label: 'Desktop' },
  ];

  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (!chatInput.trim()) return;

    const submitted = await sendMessage(chatInput);
    if (submitted) {
      setChatInput('');
    }
  };

  const openToolDetail = (tool) => {
    setSelectedTool(tool);
    setToolParams({});
    setRunError('');
    setIsRunning(false);
    setIsToolSwitcherOpen(false);
    setDescCollapsed(false);
    setSchemaCollapsed(true);
    setParamsCollapsed(false);
  };

  const resetDetailView = () => {
    setSelectedTool(null);
    setToolParams({});
    setRunError('');
    setIsRunning(false);
    setIsToolSwitcherOpen(false);
  };

  const handleRunTool = async () => {
    if (!selectedTool || isRunning) return;

    setRunError('');
    setIsRunning(true);

    try {
      const args = buildArgs(selectedTool.inputSchema?.properties, toolParams);
      await executeDirectTool(selectedTool.name, args);
    } catch (error) {
      setRunError(error.message || 'Unable to parse the provided parameters.');
    } finally {
      setIsRunning(false);
    }
  };

  const filteredTools = (tools || []).filter((tool) =>
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tool.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedToolProperties = Object.entries(selectedTool?.inputSchema?.properties || {});
  const requiredParams = selectedTool?.inputSchema?.required || [];
  const allRequiredFilled = requiredParams.every((name) => {
    const value = toolParams[name];
    return typeof value === 'string' ? value.trim().length > 0 : String(value ?? '').trim().length > 0;
  });
  const canRun = allRequiredFilled && !isRunning && !isStreaming && (!!client || testMode === 'builder');

  const apiKeyMissing = !geminiApiKey;
  const isBuilder = testMode === 'builder';

  return (
    <div data-mcpapps className="flex h-full flex-1 overflow-hidden bg-white text-sm">
      <div
        ref={sidebarRef}
        style={{
          width: isSidebarCollapsed ? 0 : sidebarWidth,
          overflow: 'hidden',
          transition: 'width 0.2s ease-out',
        }}
        className="relative z-20 flex shrink-0 flex-col border-r border-neutral-200 bg-white"
      >
        <div className="border-b border-neutral-200 bg-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${(client || isBuilder) ? 'bg-emerald-500' : 'bg-neutral-300'}`} />
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">Tools</span>
            <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-neutral-500">
              {filteredTools.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(true)}
            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800"
            title="Collapse sidebar"
          >
            <ChevronLeftIcon />
          </button>
        </div>

        {apiKeyMissing ? (
          <div className="mx-4 mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800">
            <div className="flex items-start gap-2">
              <KeyIcon />
              <span>Configure an API key in Settings to use the assistant in this canvas.</span>
            </div>
          </div>
        ) : null}

        {isBuilder ? (
          <div className="mx-4 mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-[12px] text-sky-800">
            Builder tools can run here even without MCP widgets. Regular results will stay visible as cards in the canvas.
          </div>
        ) : null}

        <div className="border-b border-neutral-200 px-4 py-3 shrink-0">
          <div className="relative">
            <span className="absolute inset-y-0 left-2.5 flex items-center text-neutral-400">
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-8 w-full rounded border border-neutral-200 bg-white pl-8 pr-3 text-xs text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {selectedTool ? (
            <div className="flex h-full flex-col">
              <div className="relative border-b border-neutral-100 px-4 py-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIsToolSwitcherOpen(!isToolSwitcherOpen)}
                    className="flex items-center gap-2 rounded-md hover:bg-neutral-50 px-2 py-1 -ml-2 transition-colors"
                  >
                    <span className="truncate font-mono text-[13px] font-medium text-neutral-900">
                      {selectedTool.name}
                    </span>
                    <div className="text-neutral-400">
                      <ChevronDownIcon />
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={resetDetailView}
                    className="text-[11px] font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
                  >
                    Close
                  </button>
                </div>

                {isToolSwitcherOpen && (
                  <div className="absolute left-4 right-4 top-full mt-1 z-50 max-h-[300px] overflow-y-auto rounded-md border border-neutral-200 bg-white shadow-lg">
                    {filteredTools.map((t) => (
                      <button
                        key={t.name}
                        className={`w-full text-left px-4 py-2 font-mono text-[12px] hover:bg-neutral-50 transition-colors ${t.name === selectedTool.name ? 'bg-neutral-50 font-medium text-neutral-900' : 'text-neutral-600'}`}
                        onClick={() => openToolDetail(t)}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
                {selectedTool.description ? (
                  <div>
                    <CollapsibleHeader 
                      title="Description" 
                      isExpanded={!descCollapsed} 
                      onClick={() => setDescCollapsed(!descCollapsed)} 
                    />
                    {!descCollapsed && (
                      <p className="text-[13px] leading-relaxed text-neutral-700">
                        {selectedTool.description}
                      </p>
                    )}
                  </div>
                ) : null}

                {selectedTool.inputSchema ? (
                  <div>
                    <CollapsibleHeader 
                      title="Input Schema" 
                      isExpanded={!schemaCollapsed} 
                      onClick={() => setSchemaCollapsed(!schemaCollapsed)} 
                    />
                    {!schemaCollapsed && (
                      <div className="overflow-hidden rounded-md border border-neutral-200 bg-neutral-50">
                        <div className="overflow-x-auto p-3">
                          <JsonViewer data={selectedTool.inputSchema} />
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {selectedToolProperties.length > 0 ? (
                  <div>
                    <CollapsibleHeader 
                      title="Parameters" 
                      isExpanded={!paramsCollapsed} 
                      onClick={() => setParamsCollapsed(!paramsCollapsed)} 
                    />
                    {!paramsCollapsed && (
                      <div className="space-y-4">
                        {selectedToolProperties.map(([name, schema]) => {
                          const type = schema?.type || 'string';
                          const isRequired = requiredParams.includes(name);
                          const value = toolParams[name] ?? '';

                          return (
                            <div key={name} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <label className="font-mono text-[12px] font-medium text-neutral-800" htmlFor={`tool-param-${name}`}>
                                  {name}
                                </label>
                                {isRequired ? <span className={requiredBadgeClassName}>Required</span> : null}
                                <span className="text-[10px] uppercase tracking-wide text-neutral-400">{type}</span>
                              </div>

                              {schema?.description ? (
                                <p className="text-[12px] leading-relaxed text-neutral-500">{schema.description}</p>
                              ) : null}

                              {type === 'object' || type === 'array' ? (
                                <textarea
                                  id={`tool-param-${name}`}
                                  rows="3"
                                  value={value}
                                  onChange={(event) => setToolParams((prev) => ({ ...prev, [name]: event.target.value }))}
                                  placeholder={type === 'array' ? '[...]' : '{...}'}
                                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-[12px] text-neutral-800 shadow-sm outline-none transition focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400"
                                />
                              ) : type === 'boolean' ? (
                                <select
                                  id={`tool-param-${name}`}
                                  value={value}
                                  onChange={(event) => setToolParams((prev) => ({ ...prev, [name]: event.target.value }))}
                                  className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-[12px] text-neutral-800 shadow-sm outline-none transition focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400"
                                >
                                  <option value="">Select value</option>
                                  <option value="true">true</option>
                                  <option value="false">false</option>
                                </select>
                              ) : (
                                <input
                                  id={`tool-param-${name}`}
                                  type={type === 'number' || type === 'integer' ? 'number' : 'text'}
                                  inputMode={type === 'number' || type === 'integer' ? 'decimal' : undefined}
                                  value={value}
                                  onChange={(event) => setToolParams((prev) => ({ ...prev, [name]: event.target.value }))}
                                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-[12px] text-neutral-800 shadow-sm outline-none transition focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}

                {runError ? (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                    {runError}
                  </div>
                ) : null}

                <div className="pt-2 border-t border-neutral-200/60 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => selectTool(selectedTool.name)}
                    className="inline-flex items-center rounded-md border border-neutral-200 bg-white px-3 py-2 text-[12px] font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
                  >
                    Open in main tab
                  </button>

                  <button
                    type="button"
                    onClick={handleRunTool}
                    disabled={!canRun}
                    className={`rounded-md px-4 py-2 text-[12px] font-medium transition-colors ${
                      canRun
                        ? 'bg-neutral-900 text-white hover:bg-neutral-800'
                        : 'cursor-not-allowed bg-neutral-200 text-neutral-400'
                    }`}
                  >
                    {isRunning ? 'Running...' : 'Run Tool'}
                  </button>
                </div>
              </div>
            </div>
          ) : filteredTools.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12px] italic text-neutral-400">
              {(client || isBuilder) ? 'No tools found.' : 'Connect to a server to see tools.'}
            </div>
          ) : (
            filteredTools.map((tool) => (
              <div key={tool.name} className="border-b border-neutral-100">
                <button
                  type="button"
                  onClick={() => openToolDetail(tool)}
                  className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 truncate font-mono text-[13px] font-medium tracking-tight text-neutral-900">
                      {tool.name}
                    </div>
                    <div className="text-[12px] leading-relaxed text-neutral-500 line-clamp-2">
                      {tool.description || 'No description provided for this tool yet.'}
                    </div>
                  </div>
                </button>
              </div>
            ))
          )}
        </div>

        <div
          onClick={() => setIsLogsCollapsed((value) => !value)}
          className="flex cursor-pointer items-center justify-between border-t border-neutral-200 bg-white px-4 py-3 transition-colors hover:bg-neutral-50"
        >
          <div className="flex items-center gap-2">
            <div className={`text-neutral-400 transition-transform duration-200 ${isLogsCollapsed ? '' : 'rotate-90'}`}>
              <ChevronRightIcon />
            </div>
            <span className="text-[13px] font-semibold tracking-tight text-neutral-900">Activity log</span>
          </div>
          <span className="text-[11px] font-mono text-neutral-400">{logs.length}</span>
        </div>

        <div className={`shrink-0 bg-white transition-all duration-300 ease-in-out flex flex-col ${isLogsCollapsed ? 'h-0 overflow-hidden' : 'h-48'}`}>
          <div className="flex-1 overflow-y-auto py-1">
            {logs.length === 0 ? (
              <div className="px-5 py-4 text-[11px] italic text-neutral-400">No activity yet.</div>
            ) : null}
            {logs.map((log) => (
              <div key={log.id} className="group flex items-start gap-3 px-5 py-1 font-mono text-[11px] hover:bg-neutral-50">
                <span className="w-16 shrink-0 text-neutral-400">{new Date(log.at).toLocaleTimeString()}</span>
                <span className={`w-3 shrink-0 text-center font-bold ${log.status === 'error' ? 'text-red-500' : log.status === 'success' ? 'text-emerald-500' : 'text-neutral-400'}`}>
                  {log.dir === '<-' ? '↓' : log.dir === '->' ? '↑' : '!'}
                </span>
                <span className="flex-1 truncate text-neutral-700">{log.type}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="absolute right-0 top-0 bottom-0 z-10 w-1.5 cursor-col-resize transition-colors hover:bg-neutral-300"
          onMouseDown={startSidebarResizing}
        />
      </div>

      {isSidebarCollapsed ? (
        <button
          type="button"
          onClick={() => setIsSidebarCollapsed(false)}
          className="z-30 flex w-6 shrink-0 flex-col items-center justify-center border-r border-neutral-200 bg-neutral-50 transition-colors hover:bg-neutral-100"
          title="Expand sidebar"
        >
          <ChevronRightIcon />
        </button>
      ) : null}

      <div className="relative flex h-full min-w-0 flex-1 flex-col bg-[#FAFAFA]">
        <div className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-white px-6">
          <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-100/80 p-1">
            {viewports.map((vp) => (
              <button
                key={vp.id}
                type="button"
                onClick={() => setViewport(vp.id)}
                className={`flex items-center justify-center rounded-lg p-1.5 transition-all ${
                  viewport === vp.id
                    ? 'bg-white text-neutral-900 shadow-[0_1px_3px_rgba(0,0,0,0.1)]'
                    : 'text-neutral-500 hover:bg-neutral-200/60 hover:text-neutral-700'
                }`}
                title={vp.label}
              >
                {vp.icon}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-neutral-400">
            {isStreaming ? (
              <div className="flex items-center gap-1.5 text-[12px] text-neutral-500">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Working...
              </div>
            ) : null}
            <button
              type="button"
              className="transition-colors hover:text-red-500"
              onClick={() => {
                setChatInput('');
                clearConversation();
              }}
              title="Clear conversation"
            >
              <TrashIcon />
            </button>
          </div>
        </div>

        <div className="relative flex flex-1 justify-center overflow-hidden bg-neutral-100/50">
          <div
            className="relative flex h-full flex-col bg-[#FAFAFA] shadow-lg shadow-neutral-900/5 transition-all duration-500 ease-in-out"
            style={{
              width: viewport === 'desktop' ? '100%' : viewport === 'tablet' ? '768px' : '375px',
              borderLeft: viewport !== 'desktop' ? '1px solid rgba(0,0,0,0.05)' : 'none',
              borderRight: viewport !== 'desktop' ? '1px solid rgba(0,0,0,0.05)' : 'none',
            }}
          >
            <RuntimeConversation
              messages={messages}
              isStreaming={isStreaming}
              sessionsById={sessionsById}
              registerWidget={registerWidget}
              unregisterWidget={unregisterWidget}
              emptyTitle="Run MCP apps and regular tools side by side"
              emptyBody="Prompt the assistant to open widgets, call plain tools, and explain each step before and after it runs."
              emptyNote={!supportsWidgets ? 'This connection does not expose widget resources, but regular tool results will still appear here.' : null}
              scrollRef={scrollRef}
            />

            <RuntimeComposer
              value={chatInput}
              onChange={setChatInput}
              onSubmit={handleSendMessage}
              disabled={isStreaming || apiKeyMissing}
              placeholder={
                apiKeyMissing
                  ? 'Configure an API key in Settings...'
                  : isBuilder
                    ? 'Ask the assistant to run builder tools or simulate app flows...'
                    : 'Ask the assistant to render apps or run connected tools...'
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
