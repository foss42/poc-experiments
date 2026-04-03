import { AnnotationBadge } from './AnnotationBadge';
import { Button } from '../ui/Button';

export function ToolHeader({ tool }) {
  const annotations = tool.annotations || {};
  const annotationKeys = Object.entries(annotations)
    .filter(([, value]) => value === true)
    .map(([key]) => key);

  const handleCopyName = () => {
    navigator.clipboard.writeText(tool.name);
  };

  return (
    <div className="px-6 py-4 border-b border-border bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-neutral-900 truncate">{tool.name}</h2>
          {tool.description && (
            <p className="text-sm text-muted-foreground mt-0.5">{tool.description}</p>
          )}
          {annotationKeys.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {annotationKeys.map((key) => (
                <AnnotationBadge key={key} type={key} />
              ))}
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={handleCopyName} className="shrink-0">
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
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
