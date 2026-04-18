const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1-1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);

export function RuntimeComposer({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder,
}) {
  return (
    <div className="w-full px-4 pb-6 md:px-6 shrink-0">
      <div className="mx-auto max-w-4xl rounded-2xl border border-neutral-200 bg-white p-2 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
        <form onSubmit={onSubmit} className="relative flex min-h-12 items-center">
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            placeholder={placeholder}
            className={`w-full bg-transparent py-3 pl-4 pr-24 font-mono text-[14px] text-neutral-900 placeholder:font-normal placeholder:text-neutral-400 focus:outline-none ${disabled ? 'opacity-50' : ''}`}
          />
          <div className="absolute right-2 flex items-center gap-2">
            <div className="hidden items-center gap-1.5 text-[12px] font-medium text-neutral-400 sm:flex">
              <SparklesIcon />
              <span>Configured model</span>
            </div>
            <button
              type="submit"
              disabled={!value.trim() || disabled}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all ${
                value.trim() && !disabled
                  ? 'bg-neutral-900 text-white shadow-sm hover:bg-neutral-800'
                  : 'bg-neutral-100 text-neutral-300'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
