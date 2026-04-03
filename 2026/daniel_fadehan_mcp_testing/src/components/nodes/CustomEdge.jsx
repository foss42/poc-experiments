import { memo } from 'react';
import { getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { useMcpStore } from '../../stores/mcpStore';
import { PlusIcon } from './shared/NodeIcons';

// Unique marker IDs for different states
const MARKER_IDS = {
  default: 'edge-arrow-default',
  running: 'edge-arrow-running',
  completed: 'edge-arrow-completed',
};

export const CustomEdge = memo(({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  sourceHandleId,
  targetHandleId,
  style = {},
}) => {
  const { openAddNodePicker, executionState } = useMcpStore();

  // Check if source node has completed execution
  const sourceNodeState = executionState.nodeStates[source];
  const isSourceCompleted = sourceNodeState?.status === 'completed';
  const isSourceRunning = sourceNodeState?.status === 'running';

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleAddNode = (e) => {
    e.stopPropagation();
    openAddNodePicker({
      type: 'edge',
      sourceId: source,
      targetId: target,
      sourceHandle: sourceHandleId,
      targetHandle: targetHandleId,
      position: { x: labelX, y: labelY },
    });
  };

  // Determine edge color based on execution state
  const getEdgeClass = () => {
    if (isSourceCompleted) {
      return 'stroke-green-500';
    }
    if (isSourceRunning) {
      return 'stroke-blue-400 animate-pulse';
    }
    return 'stroke-neutral-300';
  };

  // Get the appropriate marker ID based on execution state
  const getMarkerId = () => {
    if (isSourceCompleted) {
      return `url(#${MARKER_IDS.completed})`;
    }
    if (isSourceRunning) {
      return `url(#${MARKER_IDS.running})`;
    }
    return `url(#${MARKER_IDS.default})`;
  };

  return (
    <>
      {/* SVG Marker Definitions */}
      <defs>
        <marker
          id={MARKER_IDS.default}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#d4d4d4" />
        </marker>
        <marker
          id={MARKER_IDS.running}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#60a5fa" />
        </marker>
        <marker
          id={MARKER_IDS.completed}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#22c55e" />
        </marker>
      </defs>

      {/* Invisible wider path for easier hover */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
      />

      {/* Visible edge path */}
      <path
        id={id}
        style={style}
        className={`react-flow__edge-path fill-none stroke-2 ${getEdgeClass()} transition-colors duration-300`}
        d={edgePath}
        markerEnd={getMarkerId()}
      />

      {/* Edge label renderer */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan flex items-center gap-2"
        >
          {/* Item count label - shown when source node completed */}
          {isSourceCompleted && (
            <div className="px-2 py-0.5 text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 rounded-full shadow-sm animate-fade-in">
              1 item
            </div>
          )}

          {/* Add node button - always visible, positioned after "1 item" label like n8n */}
          <button
            onClick={handleAddNode}
            className={`w-6 h-6 flex items-center justify-center
              rounded-full bg-white border-2 text-neutral-400
              hover:border-neutral-900 hover:bg-neutral-900 hover:text-white
              shadow-sm transition-all
              ${isSourceCompleted || isSourceRunning 
                ? 'border-neutral-300 opacity-70 hover:opacity-100' 
                : 'border-neutral-300 opacity-70 hover:opacity-100'}`}
            title="Add node"
          >
            <PlusIcon />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

CustomEdge.displayName = 'CustomEdge';
