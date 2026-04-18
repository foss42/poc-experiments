import { useTestStore } from '../../stores/testStore';

export function ResourceListItem({ resource }) {
  const { selectedResourceUri, selectResource } = useTestStore();
  const isSelected = selectedResourceUri === resource.uri;

  return (
    <button
      onClick={() => selectResource(resource.uri)}
      className={`
        w-full text-left px-4 py-2.5 transition-colors
        ${isSelected ? 'bg-neutral-100' : 'hover:bg-neutral-50'}
      `}
    >
      <p className={`text-sm truncate ${isSelected ? 'font-medium text-neutral-900' : 'text-neutral-700'}`}>
        {resource.name}
      </p>
      {resource.uri && (
        <p className="text-xs text-muted-foreground truncate mt-0.5 font-mono">{resource.uri}</p>
      )}
    </button>
  );
}
