import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ToolCallCard } from './ToolCallCard';
import { ChatWidget } from './mcp-apps/ChatWidget.jsx';

const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1-1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);

function AssistantAvatar() {
  return (
    <div className="mt-1 mr-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-white text-orange-500 shadow-sm">
      <SparklesIcon />
    </div>
  );
}

function EmptyState({ title, body, note }) {
  return (
    <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center text-center opacity-90">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-neutral-200 bg-white text-orange-400 shadow-sm">
        <SparklesIcon />
      </div>
      <h3 className="mb-2 text-lg font-semibold tracking-tight text-neutral-900">{title}</h3>
      <p className="text-[14px] leading-relaxed text-neutral-500">{body}</p>
      {note ? <p className="mt-3 text-[12px] text-neutral-400">{note}</p> : null}
    </div>
  );
}

function LoadingDots() {
  return (
    <div className="mt-1 flex h-[22px] items-center gap-1">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="h-1.5 w-1.5 rounded-full bg-neutral-300 animate-bounce"
          style={{ animationDelay: `${index * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function renderAssistantText(part, { isStreaming, isLastMessage, showCursor }) {
  if (!part?.text) return null;

  return (
    <div className={`prose prose-sm max-w-none text-[14px] leading-relaxed ${part.type === 'error' ? 'text-red-600' : 'text-neutral-700'}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {part.text}
      </ReactMarkdown>
      {isStreaming && isLastMessage && showCursor ? (
        <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-[pulse_1s_infinite] bg-orange-500" />
      ) : null}
    </div>
  );
}

export function RuntimeConversation({
  messages,
  isStreaming,
  sessionsById,
  registerWidget,
  unregisterWidget,
  emptyTitle,
  emptyBody,
  emptyNote = null,
  className = '',
  scrollRef = null,
}) {
  const visibleMessages = messages.filter((message) => !message.isHidden);

  if (visibleMessages.length === 0) {
    return (
      <div className={`flex-1 overflow-y-auto px-6 py-6 md:px-8 ${className}`}>
        <EmptyState title={emptyTitle} body={emptyBody} note={emptyNote} />
      </div>
    );
  }

  return (
    <div ref={scrollRef} className={`flex-1 overflow-y-auto px-6 py-6 md:px-8 ${className}`}>
      <div className="mx-auto max-w-4xl space-y-8">
        {visibleMessages.map((message) => {
          const isLastMessage = visibleMessages[visibleMessages.length - 1]?.id === message.id;
          const assistantParts = message.role === 'assistant'
            ? (Array.isArray(message.parts) ? message.parts : [])
            : [];
          const hasAssistantParts = assistantParts.length > 0;
          const lastAssistantPart = hasAssistantParts
            ? assistantParts[assistantParts.length - 1]
            : null;
          const lastPartIsText = lastAssistantPart?.type === 'text' || lastAssistantPart?.type === 'error';
          const lastTextPartIndex = assistantParts.reduce((lastIndex, part, index) => (
            part.type === 'text' || part.type === 'error' ? index : lastIndex
          ), -1);
          const showTrailingLoader = (
            message.role === 'assistant' &&
            isStreaming &&
            isLastMessage &&
            hasAssistantParts &&
            !lastPartIsText
          );

          return (
            <div key={message.id} data-msg-id={message.id} className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' ? <AssistantAvatar /> : null}

                <div className={`max-w-[85%] ${message.role === 'assistant' ? 'w-full' : ''}`}>
                  {message.role === 'user' ? (
                    <div className="inline-block whitespace-pre-wrap rounded-2xl rounded-tr-sm border border-neutral-200 bg-white px-5 py-3 text-[14px] font-medium text-neutral-900 shadow-sm">
                      {message.content}
                    </div>
                  ) : null}

                  {message.role === 'assistant' && hasAssistantParts ? (
                    <div className="space-y-4">
                      {assistantParts.map((part, index) => {
                        if (part.type === 'text' || part.type === 'error') {
                          return (
                            <div key={part.id || `${part.type}-${index}`}>
                              {renderAssistantText(part, {
                                isStreaming,
                                isLastMessage,
                                showCursor: lastPartIsText && index === lastTextPartIndex,
                              })}
                            </div>
                          );
                        }

                        if (part.type === 'tool' && part.toolCall) {
                          return (
                            <ToolCallCard
                              key={part.id || part.toolCall.callId || `${part.toolCall.toolName}-${index}`}
                              toolCall={part.toolCall}
                            />
                          );
                        }

                        if (part.type === 'widget' && part.widgetId) {
                          const session = sessionsById[part.widgetId];
                          if (!session) return null;

                          return (
                            <ChatWidget
                              key={part.id || part.widgetId}
                              session={session}
                              registerWidget={registerWidget}
                              unregisterWidget={unregisterWidget}
                            />
                          );
                        }

                        return null;
                      })}

                      {showTrailingLoader ? (
                        <div className="flex items-center gap-2 text-neutral-400">
                          <LoadingDots />
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {message.role === 'assistant' && !hasAssistantParts && isStreaming && isLastMessage ? (
                    <LoadingDots />
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}

        {isStreaming && visibleMessages[visibleMessages.length - 1]?.role !== 'assistant' ? (
          <div className="flex w-full justify-start">
            <AssistantAvatar />
            <LoadingDots />
          </div>
        ) : null}
      </div>
    </div>
  );
}
