import { useTestStore } from '../../stores/testStore';

export function PromptListItem({ prompt }) {
  const { selectedPromptName, selectPrompt } = useTestStore();
  const isSelected = selectedPromptName === prompt.name;

  return (
    <button
      onClick={() => selectPrompt(prompt.name)}
      className={`
        w-full text-left px-4 py-2.5 transition-colors
        ${isSelected ? 'bg-neutral-100' : 'hover:bg-neutral-50'}
      `}
    >
      <p className={`text-sm truncate ${isSelected ? 'font-medium text-neutral-900' : 'text-neutral-700'}`}>
        {prompt.name}
      </p>
      {prompt.description && (
        <p className="text-xs text-muted-foreground truncate mt-0.5">{prompt.description}</p>
      )}
    </button>
  );
}
