export function NDVFooter() {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-neutral-50">
      <p className="text-xs text-neutral-400">
        Changes auto-save
      </p>
      <button
        className="text-xs px-4 py-2 bg-neutral-900 text-white rounded-md hover:bg-neutral-800 transition-colors opacity-50 cursor-not-allowed"
        disabled
        title="Execution coming soon"
      >
        Execute step
      </button>
    </div>
  );
}
