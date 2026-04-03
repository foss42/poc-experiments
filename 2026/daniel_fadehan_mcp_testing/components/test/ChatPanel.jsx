import { useEffect, useRef, useState } from 'react';
import { useTestStore } from '../../stores/testStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { LogBusPanel } from './LogBusPanel';
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

export function ChatPanel() {
  const { tools, serverInfo, client, testMode } = useTestStore();
  const { geminiApiKey } = useSettingsStore();
  const [chatInput, setChatInput] = useState('');
  const [isLogsCollapsed, setIsLogsCollapsed] = useState(false);
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

    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    if (lastMessage.role === 'assistant' && assistantMessageHasWidgetPart(lastMessage)) {
      const element = scrollContainer.querySelector(`[data-msg-id="${lastMessage.id}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    scrollContainer.scrollTop = scrollContainer.scrollHeight;
  }, [messages]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!chatInput.trim()) return;

    const submitted = await sendMessage(chatInput);
    if (submitted) {
      setChatInput('');
    }
  };

  const apiKeyMissing = !geminiApiKey;
  const isBuilder = testMode === 'builder';

  return (
    <div className="flex flex-1 overflow-hidden bg-white">
      <div className="flex min-w-0 flex-1 flex-col bg-[#FAFAFA]">
        <div className="flex h-14 items-center justify-between border-b border-border/60 bg-white px-6 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className={`h-2.5 w-2.5 rounded-full ${(client || isBuilder) ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.35)]' : 'bg-neutral-300'}`} />
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold tracking-tight text-neutral-900">
                  {serverInfo?.name || 'Assistant chat'}
                </div>
                <div className="truncate text-[11px] text-neutral-500">
                  {isBuilder ? 'Builder tools preview' : 'Connected MCP workspace'}
                </div>
              </div>
            </div>
          </div>

          <button
            className="rounded-md p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-red-500"
            onClick={() => {
              setChatInput('');
              clearConversation();
            }}
            title="Clear conversation"
          >
            <TrashIcon />
          </button>
        </div>

        {apiKeyMissing ? (
          <div className="mx-6 mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-800">
            Configure an API key in <span className="font-mono">Settings → API Keys</span> to use the assistant.
          </div>
        ) : null}

        <RuntimeConversation
          messages={messages}
          isStreaming={isStreaming}
          sessionsById={sessionsById}
          registerWidget={registerWidget}
          unregisterWidget={unregisterWidget}
          emptyTitle="Talk directly to your MCP tools"
          emptyBody="Ask in plain language. The assistant will explain what it is about to do, run the right tools, and then summarize the outcome."
          scrollRef={scrollRef}
        />

        <RuntimeComposer
          value={chatInput}
          onChange={setChatInput}
          onSubmit={handleSubmit}
          disabled={isStreaming || apiKeyMissing}
          placeholder={
            apiKeyMissing
              ? 'Configure an API key in Settings...'
              : isBuilder
                ? 'Ask the assistant to run one of your builder tools...'
                : 'Ask the assistant to use your connected MCP tools...'
          }
        />
      </div>

      <LogBusPanel
        logs={logs}
        isCollapsed={isLogsCollapsed}
        onToggle={() => setIsLogsCollapsed((value) => !value)}
      />
    </div>
  );
}
