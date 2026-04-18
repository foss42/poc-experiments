import { NODE_TYPE_META } from '../../utils/constants';

export function NDVHeader({ nodeType, onClose }) {
  const meta = NODE_TYPE_META[nodeType];

  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-white">
      <div className="flex items-center gap-3">
        <span className="text-lg text-neutral-400">{meta?.icon}</span>
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">{meta?.label || nodeType}</h2>
          <p className="text-xs text-neutral-500 mt-0.5">{meta?.description}</p>
        </div>
      </div>

      <button
        onClick={onClose}
        className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
        title="Close"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
