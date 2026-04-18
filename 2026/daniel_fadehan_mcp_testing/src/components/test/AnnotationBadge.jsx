export function AnnotationBadge({ type }) {
  const styles = {
    readOnlyHint: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Read-only' },
    destructiveHint: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Destructive' },
    idempotentHint: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: 'Idempotent' },
    openWorldHint: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: 'Open-world' },
  };

  const style = styles[type];
  if (!style) return null;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}
    >
      {style.label}
    </span>
  );
}
