import { useState, useMemo } from 'react';
import { useMcpStore } from '../../stores/mcpStore';
import { WORKFLOW_NODE_TYPES, NODE_TYPE_META, NODE_CATEGORIES } from '../../utils/constants';
import {
  HttpRequestIcon,
  TransformIcon,
  ConditionIcon,
  CodeIcon,
  LoopIcon,
  MergeIcon,
  ErrorHandlerIcon,
} from '../nodes/shared/NodeIcons';

const nodeIconComponents = {
  [WORKFLOW_NODE_TYPES.API_CALL]: HttpRequestIcon,
  [WORKFLOW_NODE_TYPES.TRANSFORM]: TransformIcon,
  [WORKFLOW_NODE_TYPES.CONDITION]: ConditionIcon,
  [WORKFLOW_NODE_TYPES.CODE]: CodeIcon,
  [WORKFLOW_NODE_TYPES.LOOP]: LoopIcon,
  [WORKFLOW_NODE_TYPES.MERGE]: MergeIcon,
  [WORKFLOW_NODE_TYPES.ERROR_HANDLER]: ErrorHandlerIcon,
};

// All node types that can be added (exclude Input/Output - they're created automatically)
const addableNodeTypes = Object.values(WORKFLOW_NODE_TYPES).filter(
  (type) => NODE_TYPE_META[type]?.deletable !== false
);

// Group by category
const groupedNodes = Object.entries(NODE_CATEGORIES)
  .sort(([, a], [, b]) => a.order - b.order)
  .map(([categoryKey, category]) => ({
    key: categoryKey,
    label: category.label,
    nodes: addableNodeTypes.filter(
      (type) => NODE_TYPE_META[type]?.category === categoryKey
    ),
  }))
  .filter((group) => group.nodes.length > 0);

export function AddNodePicker() {
  const { isAddNodePickerOpen, closeAddNodePicker, addNode } = useMcpStore();
  const [search, setSearch] = useState('');

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groupedNodes;
    const q = search.toLowerCase();
    return groupedNodes
      .map((group) => ({
        ...group,
        nodes: group.nodes.filter((type) => {
          const meta = NODE_TYPE_META[type];
          return (
            meta.label.toLowerCase().includes(q) ||
            meta.description.toLowerCase().includes(q)
          );
        }),
      }))
      .filter((group) => group.nodes.length > 0);
  }, [search]);

  const handleAddNode = (nodeType) => {
    addNode(nodeType);
    setSearch('');
  };

  const handleClose = () => {
    closeAddNodePicker();
    setSearch('');
  };

  if (!isAddNodePickerOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={handleClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 w-[360px] bg-white shadow-xl z-50
        flex flex-col animate-slide-in">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <h2 className="text-base font-semibold text-neutral-900">What happens next?</h2>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded-md
              text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-neutral-200">
          <input
            type="text"
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
              placeholder:text-neutral-400"
            autoFocus
          />
        </div>

        {/* Categorized node list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin">
          {filteredGroups.map((group) => (
            <div key={group.key}>
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 px-1">
                {group.label}
              </h3>
              <div className="space-y-1.5">
                {group.nodes.map((nodeType) => {
                  const meta = NODE_TYPE_META[nodeType];
                  const IconComponent = nodeIconComponents[nodeType];
                  return (
                    <button
                      key={nodeType}
                      onClick={() => handleAddNode(nodeType)}
                      className="w-full flex items-center gap-3 p-3
                        text-left rounded-lg border border-neutral-100
                        hover:border-neutral-300 hover:bg-neutral-50
                        transition-colors group"
                    >
                      <div className={`w-8 h-8 rounded-lg ${meta.bgColor} flex items-center justify-center flex-shrink-0`}>
                        {IconComponent ? (
                          <IconComponent className="w-4 h-4 text-white" />
                        ) : (
                          <span className="text-sm text-white">{meta.icon}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-neutral-900">{meta.label}</h4>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {meta.description}
                        </p>
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className="text-neutral-300 group-hover:text-neutral-500 flex-shrink-0 transition-colors">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {filteredGroups.length === 0 && (
            <div className="text-center py-8 text-sm text-neutral-400">
              No nodes match your search.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
