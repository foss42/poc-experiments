import { useCallback } from 'react';
import { useMcpStore } from '../../../stores/mcpStore';
import { PlusIcon } from './NodeIcons';

export function NodeAddButton({ nodeId }) {
  const { openAddNodePicker } = useMcpStore();

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    openAddNodePicker({ type: 'handle', nodeId });
  }, [nodeId, openAddNodePicker]);

  return (
    <div className="absolute -right-12 top-1/2 -translate-y-1/2 flex items-center">
      <div className="h-px w-4 bg-neutral-300" />
      <button
        onClick={handleClick}
        className="w-7 h-7 flex items-center justify-center rounded-full
          bg-white border-2 border-neutral-300 text-neutral-400
          hover:border-neutral-900 hover:bg-neutral-900 hover:text-white
          transition-all shadow-sm"
        title="Add node"
      >
        <PlusIcon />
      </button>
    </div>
  );
}
