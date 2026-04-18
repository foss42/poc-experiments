export function ResponseViewer({ data, isError }) {
  const formatted = (() => {
    if (data == null) return '';
    if (typeof data === 'string') return data;
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  })();

  return (
    <pre
      className={`
        text-sm font-mono rounded-lg p-4 overflow-auto max-h-[500px] scrollbar-thin whitespace-pre-wrap break-words
        ${isError ? 'bg-red-950 text-red-200' : 'bg-neutral-900 text-neutral-100'}
      `}
    >
      {formatted}
    </pre>
  );
}
