import { useTestStore } from '../../stores/testStore';
import { Button } from '../ui/Button';

export function PromptsTestPanel() {
  const {
    getSelectedPrompt,
    promptInputValues,
    setPromptInputValue,
    executePrompt,
    isExecuting,
    lastPromptResponse,
  } = useTestStore();

  const prompt = getSelectedPrompt();

  if (!prompt) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-neutral-100 flex items-center justify-center border border-neutral-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h3 className="text-base font-medium text-neutral-900 mb-1">Select a Prompt</h3>
          <p className="text-sm text-neutral-500">Choose a prompt from the sidebar to test its arguments and view generated messages.</p>
        </div>
      </div>
    );
  }

  const hasArguments = prompt.arguments && prompt.arguments.length > 0;

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Prompt Header */}
      <div className="px-6 py-5 border-b border-neutral-200 shrink-0 flex items-center justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-medium text-neutral-900 truncate">{prompt.name}</h2>
            <span className="text-[11px] font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">
              Prompt Template
            </span>
          </div>
          {prompt.description && (
            <p className="text-sm text-neutral-500 mt-1 truncate">{prompt.description}</p>
          )}
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Input Panel */}
        <div className="w-1/2 border-r border-neutral-200 flex flex-col overflow-hidden bg-neutral-50/30">
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
            <h3 className="text-sm font-medium text-neutral-900">Configuration</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Messages Preview */}
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-4">
                Message Structure ({prompt.messages?.length || 0})
              </label>
              
              <div className="space-y-3">
                {(prompt.messages || []).map((msg, idx) => (
                  <div key={idx} className="p-3 bg-white border border-neutral-200 rounded-lg text-sm shadow-sm">
                    <span className={`inline-block font-medium text-xs mb-1 ${
                      msg.role === 'system' ? 'text-purple-600' : 
                      msg.role === 'assistant' ? 'text-blue-600' : 'text-neutral-900'
                    }`}>
                      {msg.role}
                    </span>
                    <p className="text-neutral-600 line-clamp-3 leading-relaxed">{msg.content}</p>
                  </div>
                ))}
                {(!prompt.messages || prompt.messages.length === 0) && (
                  <div className="px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                    <p className="text-sm text-neutral-500 italic">No message templates defined.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Arguments Input */}
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-4">
                {hasArguments ? 'Arguments' : 'Variables'}
              </label>
              
              {hasArguments ? (
                <div className="space-y-4">
                  {prompt.arguments.map((arg) => (
                    <div key={arg.name} className="space-y-1.5">
                      <label className="block text-sm font-medium text-neutral-700">
                        {arg.name}
                        {arg.required && <span className="text-red-500 ml-1">*</span>}
                        {arg.description && (
                          <span className="font-normal text-neutral-500 ml-2">
                            {arg.description}
                          </span>
                        )}
                      </label>
                      {arg.type === 'boolean' ? (
                        <select
                          value={promptInputValues[arg.name] || ''}
                          onChange={(e) => setPromptInputValue(arg.name, e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow appearance-none"
                        >
                          <option value="">Select value...</option>
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </select>
                      ) : (
                        <input
                          type={arg.type === 'number' ? 'number' : 'text'}
                          value={promptInputValues[arg.name] || ''}
                          onChange={(e) => setPromptInputValue(arg.name, e.target.value)}
                          placeholder={`Value for ${arg.name}`}
                          className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow"
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                  <p className="text-sm text-neutral-500">
                    This prompt has no arguments. Messages will be returned as-is.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-4 border-t border-neutral-200 bg-white">
            <Button
              onClick={executePrompt}
              disabled={isExecuting}
              className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
            >
              {isExecuting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Generate Prompt'
              )}
            </Button>
          </div>
        </div>

        {/* Output Panel */}
        <div className="w-1/2 flex flex-col overflow-hidden bg-white">
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
            <h3 className="text-sm font-medium text-neutral-900">Output</h3>
            {lastPromptResponse && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                lastPromptResponse.success 
                  ? 'bg-green-50 text-green-700 border border-green-200/50' 
                  : 'bg-red-50 text-red-700 border border-red-200/50'
              }`}>
                {lastPromptResponse.success ? `${lastPromptResponse.responseTime}ms` : 'Error'}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {!lastPromptResponse ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-neutral-400">Generate prompt to view result</p>
              </div>
            ) : lastPromptResponse.success ? (
              <div className="space-y-6">
                
                {/* Resolved Messages */}
                <div>
                  <h4 className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-4">Resolved Messages</h4>
                  <div className="space-y-3">
                    {lastPromptResponse.data.messages.map((msg, idx) => (
                      <div key={idx} className={`p-4 rounded-xl border ${
                        msg.role === 'system' ? 'bg-purple-50/50 border-purple-100' :
                        msg.role === 'assistant' ? 'bg-blue-50/50 border-blue-100' :
                        'bg-white border-neutral-200 shadow-sm'
                      }`}>
                        <div className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${
                          msg.role === 'system' ? 'text-purple-600' :
                          msg.role === 'assistant' ? 'text-blue-600' :
                          'text-neutral-700'
                        }`}>
                          {msg.role}
                        </div>
                        <div className="text-sm text-neutral-800 whitespace-pre-wrap leading-relaxed">
                          {msg.content?.text || msg.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Raw JSON */}
                <div className="bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 shadow-sm">
                  <div className="px-4 py-2 border-b border-neutral-800 bg-neutral-950/50 flex justify-between items-center">
                    <span className="text-[11px] font-mono text-neutral-400">Raw JSON Payload</span>
                  </div>
                  <div className="p-4 overflow-x-auto">
                    <pre className="text-xs font-mono text-green-400/90 whitespace-pre-wrap leading-relaxed">
                      {JSON.stringify(lastPromptResponse.data, null, 2)}
                    </pre>
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <h4 className="text-sm font-medium text-red-800 mb-1">Execution Failed</h4>
                <p className="text-sm text-red-600/90 whitespace-pre-wrap font-mono">
                  {lastPromptResponse.error}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
