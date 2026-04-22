import { useTestStore } from '../../stores/testStore';

export function HistoryPanel() {
  const { history, isHistoryOpen, toggleHistory, loadHistoryEntry, clearHistory } = useTestStore();

  if (history.length === 0) return null;

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="border-t border-neutral-200 shrink-0 bg-white">
      {/* Toggle header */}
      <button
        onClick={toggleHistory}
        className="w-full flex items-center justify-between px-6 py-3 hover:bg-neutral-50/50 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-neutral-400 group-hover:text-neutral-600 transition-transform duration-200 ${isHistoryOpen ? 'rotate-0' : '-rotate-90'}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <span className="text-sm font-medium text-neutral-700">
            Execution History
            <span className="ml-2 text-[11px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded-full border border-neutral-200">
              {history.length} {history.length === 1 ? 'run' : 'runs'}
            </span>
          </span>
        </div>
        {isHistoryOpen && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearHistory();
            }}
            className="text-xs font-medium text-neutral-400 hover:text-red-600 transition-colors px-2 py-1 rounded"
          >
            Clear History
          </button>
        )}
      </button>

      {/* History cards */}
      {isHistoryOpen && (
        <div className="px-6 pb-4 pt-1 flex gap-3 overflow-x-auto scrollbar-thin">
          {history.map((entry) => (
            <button
              key={entry.id}
              onClick={() => loadHistoryEntry(entry.id)}
              className="shrink-0 p-3 rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm transition-all text-left min-w-[140px] flex flex-col gap-1.5 group"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      entry.response.success ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                    }`}
                  />
                  <span className="text-[11px] font-medium text-neutral-600">
                    {entry.response.success ? 'Success' : 'Failed'}
                  </span>
                </div>
                {entry.response.success && (
                  <span className="text-[10px] font-mono text-neutral-400">
                    {entry.response.responseTime}ms
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 font-medium group-hover:text-neutral-500 transition-colors">{formatTime(entry.timestamp)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
