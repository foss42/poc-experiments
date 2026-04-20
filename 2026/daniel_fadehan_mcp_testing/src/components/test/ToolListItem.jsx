import { useTestStore } from '../../stores/testStore';

export function ToolListItem({ tool }) {
  const { selectedToolName, selectTool } = useTestStore();
  const isSelected = selectedToolName === tool.name;

  return (
    <button
      onClick={() => selectTool(tool.name)}
      className={`
        w-full text-left px-4 py-2.5 transition-colors
        ${isSelected ? 'bg-neutral-100' : 'hover:bg-neutral-50'}
      `}
    >
      <p className={`text-sm truncate ${isSelected ? 'font-medium text-neutral-900' : 'text-neutral-700'}`}>
        {tool.name}
      </p>
      {tool.description && (
        <p className="text-xs text-muted-foreground truncate mt-0.5">{tool.description}</p>
      )}
    </button>
  );
}
