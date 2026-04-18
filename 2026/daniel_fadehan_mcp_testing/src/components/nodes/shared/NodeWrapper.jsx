import { useState, useCallback } from 'react';
import { useMcpStore } from '../../../stores/mcpStore';
import { NODE_TYPE_META } from '../../../utils/constants';

export function NodeWrapper({ nodeId, nodeType, selected, children, executionStatus }) {
  const [isHovered, setIsHovered] = useState(false);
  const { deleteNode, openNDV } = useMcpStore();

  const meta = NODE_TYPE_META[nodeType];
  const isDeletable = meta?.deletable !== false;

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    if (isDeletable) {
      deleteNode(nodeId);
    }
  }, [nodeId, isDeletable, deleteNode]);

  const handleDoubleClick = useCallback((e) => {
    e.stopPropagation();
    openNDV(nodeId);
  }, [nodeId, openNDV]);

  // Show the floating toolbar if the node is hovered OR selected
  const showToolbar = (isHovered || selected) && isDeletable;

  // Execution status styling
  const isRunning = executionStatus === 'running';
  const isCompleted = executionStatus === 'completed';
  const isFailed = executionStatus === 'failed';

  return (
    <div
      className="relative flex flex-col items-center group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={handleDoubleClick}
      onClick={() => openNDV(nodeId)}
    >
      {/* Floating Action Menu */}
      <div
        className={`absolute -top-12 z-20 flex items-center gap-1 p-1 bg-white border border-neutral-200 rounded-lg shadow-sm transition-all duration-200 ${showToolbar ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
      >
        {isDeletable && (
          <button
            onClick={handleDelete}
            className="w-8 h-8 flex items-center justify-center rounded-md text-neutral-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Delete node"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
        )}
      </div>

      {/* Node Content */}
      <div className="relative flex flex-col items-center">
        {children}

        {/* Execution status badge - positioned at bottom-right corner of inner icon like n8n */}
        {isCompleted && (
          <div className="absolute top-[42px] left-[calc(50%+20px)] w-[16px] h-[16px] bg-green-500 rounded-full flex items-center justify-center shadow-sm z-10 animate-scale-in">
            <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
        {isFailed && (
          <div className="absolute top-[42px] left-[calc(50%+20px)] w-[16px] h-[16px] bg-red-500 rounded-full flex items-center justify-center shadow-sm z-10 animate-scale-in">
            <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
        )}
        {isRunning && (
          <div className="absolute top-[42px] left-[calc(50%+20px)] w-[16px] h-[16px] bg-blue-500 rounded-full flex items-center justify-center shadow-sm z-10">
            <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
