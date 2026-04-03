import { useCallback } from 'react';

export function KeyValueEditor({ items = [], onChange, keyPlaceholder = 'Key', valuePlaceholder = 'Value' }) {
  const handleAdd = useCallback(() => {
    onChange([...items, { key: '', value: '' }]);
  }, [items, onChange]);

  const handleRemove = useCallback((index) => {
    onChange(items.filter((_, i) => i !== index));
  }, [items, onChange]);

  const handleChange = useCallback((index, field, value) => {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange(updated);
  }, [items, onChange]);

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="text"
            value={item.key}
            onChange={(e) => handleChange(index, 'key', e.target.value)}
            placeholder={keyPlaceholder}
            className="flex-1 px-3 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-white"
          />
          <input
            type="text"
            value={item.value}
            onChange={(e) => handleChange(index, 'value', e.target.value)}
            placeholder={valuePlaceholder}
            className="flex-1 px-3 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-white"
          />
          <button
            onClick={() => handleRemove(index)}
            className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors"
            title="Remove"
          >
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
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}

      <button
        onClick={handleAdd}
        className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-700 transition-colors py-1"
      >
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
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add item
      </button>
    </div>
  );
}
