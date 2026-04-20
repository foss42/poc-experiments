import { useTestStore } from '../../stores/testStore';
import { ResponseViewer } from './ResponseViewer';

export function OutputPanel() {
  const { lastResponse, isExecuting } = useTestStore();

  const handleCopyResponse = () => {
    if (!lastResponse) return;
    const data = lastResponse.success ? lastResponse.data : lastResponse.error;
    const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(text);
  };

  // Empty state
  if (!lastResponse && !isExecuting) {
    return (
      <div className="w-1/2 flex items-center justify-center bg-white min-w-0">
        <div className="text-center max-w-[240px]">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-neutral-50 flex items-center justify-center border border-neutral-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
          <p className="text-sm text-neutral-500">Run the tool to see output here</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isExecuting) {
    return (
      <div className="w-1/2 p-6 bg-white min-w-0 space-y-4">
        <div className="h-5 w-32 bg-neutral-100 rounded-md animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 bg-neutral-50 rounded animate-pulse" />
          <div className="h-4 bg-neutral-50 rounded animate-pulse w-4/5" />
          <div className="h-4 bg-neutral-50 rounded animate-pulse w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-1/2 flex flex-col min-w-0 bg-white overflow-hidden">
      {/* Status Header */}
      <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-neutral-900">Output</h3>
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium ${
            lastResponse.success 
              ? 'bg-green-50 text-green-700 border border-green-200/50' 
              : 'bg-red-50 text-red-700 border border-red-200/50'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${lastResponse.success ? 'bg-green-500' : 'bg-red-500'}`} />
            {lastResponse.success ? 'Success' : 'Error'}
          </span>
          <span className="text-[11px] font-medium text-neutral-500 bg-neutral-50 px-2 py-0.5 rounded-md border border-neutral-200">
            {lastResponse.responseTime}ms
          </span>
        </div>
        
        <button 
          onClick={handleCopyResponse}
          className="text-neutral-400 hover:text-neutral-900 transition-colors"
          title="Copy output"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
        </button>
      </div>

      {/* Response body */}
      <div className="flex-1 overflow-auto scrollbar-thin p-6">
        <ResponseViewer
          data={lastResponse.success ? lastResponse.data : lastResponse.error}
          isError={!lastResponse.success}
        />
      </div>
    </div>
  );
}
