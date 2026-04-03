import { useState } from 'react';

export function ToggleSection({ title, enabled, onToggle, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 hover:bg-neutral-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-neutral-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="text-sm font-medium text-neutral-700">{title}</span>
        </div>
        {onToggle && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onToggle(!enabled);
            }}
            className={`
              w-8 h-[18px] rounded-full relative cursor-pointer transition-colors
              ${enabled ? 'bg-neutral-900' : 'bg-neutral-300'}
            `}
          >
            <div
              className={`
                absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform
                ${enabled ? 'translate-x-[16px]' : 'translate-x-[2px]'}
              `}
            />
          </div>
        )}
      </button>

      {isOpen && (
        <div className="px-4 py-3 border-t border-border">
          {children}
        </div>
      )}
    </div>
  );
}
