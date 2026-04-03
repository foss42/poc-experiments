import { useEffect, useRef, useState } from 'react';
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

export function McpAppsPanel() {
  const { tools, serverInfo, client, testMode, selectTool } = useTestStore();
  const { geminiApiKey } = useSettingsStore();

  const [chatInput, setChatInput] = useState('');
  const [isLogsCollapsed, setIsLogsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedToolSidebar, setExpandedToolSidebar] = useState(null);
  const [viewport, setViewport] = useState('desktop');
  const scrollRef = useRef(null);

  const {
    messages,
    isStreaming,
    logs,
    sessionsById,
    sendMessage,
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

  const filteredTools = (tools || []).filter((tool) =>
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tool.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const apiKeyMissing = !geminiApiKey;
  const isBuilder = testMode === 'builder';

  return (
    <div className="flex h-full flex-1 overflow-hidden bg-white text-sm">
      <div className="relative z-20 flex w-[360px] shrink-0 flex-col border-r border-neutral-200 bg-white shadow-[1px_0_10px_rgba(0,0,0,0.01)]">
        <div className="border-b border-neutral-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className={`mt-1 h-2.5 w-2.5 rounded-full ${(client || isBuilder) ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.35)]' : 'bg-neutral-300'}`} />
                <div>
                  <div className="truncate text-[14px] font-semibold tracking-tight text-neutral-900">
                    {serverInfo?.name || 'MCP Apps'}
                  </div>
                  <div className="truncate text-[11px] text-neutral-500">
                    {isBuilder ? 'Builder tools in app view' : 'App canvas and tool fallback view'}
                  </div>
                </div>
              </div>
            </div>
            <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-500">
              Apps
            </span>
          </div>
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

        <div className="px-6 pt-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Tools</span>
              <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-neutral-500">
                {filteredTools.length}
              </span>
            </div>
          </div>
          <div className="relative pb-4">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400">
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full h-8 rounded-md border-none bg-neutral-100 pl-8 pr-3 text-xs text-neutral-900 shadow-none placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredTools.length === 0 ? (
            <div className="px-6 py-8 text-center text-[12px] text-neutral-400 italic">
              {(client || isBuilder) ? 'No tools found.' : 'Connect to a server to see tools.'}
            </div>
          ) : (
            filteredTools.map((tool) => {
              const isExpanded = expandedToolSidebar === tool.name;

              return (
                <div
                  key={tool.name}
                  className={`border-b border-neutral-100 transition-colors ${isExpanded ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative z-10' : 'hover:bg-white'}`}
                >
                  <div
                    className="px-6 py-3 cursor-pointer group flex items-start gap-3"
                    onClick={() => setExpandedToolSidebar(isExpanded ? null : tool.name)}
                  >
                    <div className={`mt-0.5 text-neutral-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[13px] text-neutral-900 font-medium tracking-tight truncate">
                          {tool.name}
                        </span>
                      </div>
                      {!isExpanded && (
                        <div className="text-[12px] text-neutral-500 line-clamp-1 leading-relaxed pr-4">
                          {tool.description}
                        </div>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="pl-12 pr-6 pb-4 space-y-4 bg-white">
                      <div className="text-[12px] text-neutral-600 leading-relaxed">{tool.description}</div>
                      <div className="space-y-3">
                        <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Parameters</div>
                        {tool.inputSchema?.properties && Object.keys(tool.inputSchema.properties).length > 0 ? (
                          <div className="space-y-3">
                            {Object.entries(tool.inputSchema.properties).map(([propName, propDetails]) => (
                              <div key={propName} className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <label className="font-mono text-[12px] text-neutral-800">{propName}</label>
                                  {tool.inputSchema?.required?.includes(propName) && (
                                    <span className="text-[9px] font-semibold text-orange-600 bg-orange-50 px-1 py-0.5 rounded-sm">REQ</span>
                                  )}
                                  {propDetails.type && (
                                    <span className="text-[10px] text-neutral-400 uppercase">{propDetails.type}</span>
                                  )}
                                </div>
                                {propDetails.description && (
                                  <div className="text-[11px] text-neutral-500">{propDetails.description}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[11px] text-neutral-400 italic">No parameters required.</div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => selectTool(tool.name)}
                        className="inline-flex items-center rounded-md border border-neutral-200 bg-white px-3 py-2 text-[12px] font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
                      >
                        Open in main Tools tab
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div
          onClick={() => setIsLogsCollapsed((value) => !value)}
          className="flex cursor-pointer items-center justify-between border-t border-neutral-200 bg-white px-5 py-3 transition-colors hover:bg-neutral-50"
        >
          <div className="flex items-center gap-2">
            <div className={`text-neutral-400 transition-transform duration-200 ${isLogsCollapsed ? '' : 'rotate-90'}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
            <span className="text-[13px] font-semibold tracking-tight text-neutral-900">Activity log</span>
          </div>
          <span className="text-[11px] font-mono text-neutral-400">{logs.length}</span>
        </div>

        <div className={`shrink-0 overflow-hidden bg-white transition-all duration-300 ease-in-out ${isLogsCollapsed ? 'h-0' : 'h-48'}`}>
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
      </div>

      <div className="relative flex h-full min-w-0 flex-1 flex-col bg-[#FAFAFA]">
        <div className="relative z-10 flex h-14 items-center justify-between border-b border-border/60 bg-white px-6 shrink-0">
          <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-100/80 p-1">
            {viewports.map((vp) => (
              <button
                key={vp.id}
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
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Working...
              </div>
            ) : null}
            <button
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
