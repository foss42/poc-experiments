import { useState } from 'react';

export function DataPreview({ data, title = 'Data' }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const renderValue = (value, depth = 0) => {
    if (value === null || value === undefined) {
      return <span className="text-neutral-400 italic">null</span>;
    }

    if (typeof value === 'string') {
      return <span className="text-green-700">"{value}"</span>;
    }

    if (typeof value === 'number') {
      return <span className="text-blue-700">{value}</span>;
    }

    if (typeof value === 'boolean') {
      return <span className="text-purple-700">{value.toString()}</span>;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-neutral-500">[]</span>;

      return (
        <div className="ml-3">
          <span className="text-neutral-500">[</span>
          {value.map((item, i) => (
            <div key={i} className="ml-3">
              {renderValue(item, depth + 1)}
              {i < value.length - 1 && <span className="text-neutral-400">,</span>}
            </div>
          ))}
          <span className="text-neutral-500">]</span>
        </div>
      );
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value);
      if (entries.length === 0) return <span className="text-neutral-500">{'{}'}</span>;

      return (
        <div className="ml-3">
          <span className="text-neutral-500">{'{'}</span>
          {entries.map(([key, val], i) => (
            <div key={key} className="ml-3">
              <span className="text-red-700">"{key}"</span>
              <span className="text-neutral-400">: </span>
              {renderValue(val, depth + 1)}
              {i < entries.length - 1 && <span className="text-neutral-400">,</span>}
            </div>
          ))}
          <span className="text-neutral-500">{'}'}</span>
        </div>
      );
    }

    return <span>{String(value)}</span>;
  };

  const hasData = data !== undefined && data !== null;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-neutral-50 hover:bg-neutral-100 transition-colors"
      >
        <span className="text-xs font-medium text-neutral-600">{title}</span>
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
          className={`text-neutral-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-3 bg-white overflow-auto max-h-60">
          {hasData ? (
            <pre className="text-xs font-mono leading-relaxed">
              {renderValue(data)}
            </pre>
          ) : (
            <p className="text-xs text-neutral-400 italic">
              No data available. Execute the workflow or pin mock data.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
