import { useTestStore } from '../../stores/testStore';

export function JsonEditor() {
  const { rawJsonInput, setRawJsonInput } = useTestStore();

  return (
    <textarea
      value={rawJsonInput}
      onChange={(e) => setRawJsonInput(e.target.value)}
      placeholder='{ }'
      spellCheck={false}
      className="w-full h-full min-h-[200px] px-4 py-3 text-sm font-mono text-neutral-900 placeholder:text-neutral-400 bg-muted border-none rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none"
    />
  );
}
