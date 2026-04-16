import { useCallback, useMemo, useEffect, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useMcpStore } from '../../stores/mcpStore';
import { WORKFLOW_NODE_TYPES, NODE_TYPE_META } from '../../utils/constants';
import { InputNode } from '../nodes/InputNode';
import { ApiCallNode } from '../nodes/ApiCallNode';
import { TransformNode } from '../nodes/TransformNode';
import { ConditionNode } from '../nodes/ConditionNode';
import { OutputNode } from '../nodes/OutputNode';
import { CodeNode } from '../nodes/CodeNode';
import { LoopNode } from '../nodes/LoopNode';
import { MergeNode } from '../nodes/MergeNode';
import { ErrorHandlerNode } from '../nodes/ErrorHandlerNode';
import { CustomEdge } from '../nodes/CustomEdge';
import { CanvasToolbar } from './CanvasToolbar';
import { TestWorkbench } from '../test/TestWorkbench';
import { PromptBuilder } from '../prompts/PromptBuilder';
import { ResourceEditor } from '../resources/ResourceEditor';
import { WorkflowDebugPanel } from './WorkflowDebugPanel';

const nodeTypes = {
  [WORKFLOW_NODE_TYPES.INPUT]: InputNode,
  [WORKFLOW_NODE_TYPES.API_CALL]: ApiCallNode,
  [WORKFLOW_NODE_TYPES.TRANSFORM]: TransformNode,
  [WORKFLOW_NODE_TYPES.CONDITION]: ConditionNode,
  [WORKFLOW_NODE_TYPES.OUTPUT]: OutputNode,
  [WORKFLOW_NODE_TYPES.CODE]: CodeNode,
  [WORKFLOW_NODE_TYPES.LOOP]: LoopNode,
  [WORKFLOW_NODE_TYPES.MERGE]: MergeNode,
  [WORKFLOW_NODE_TYPES.ERROR_HANDLER]: ErrorHandlerNode,
};

const edgeTypes = {
  default: CustomEdge,
};

export function Canvas() {
  const {
    getSelectedItem,
    selectedItemId,
    selectedItemType,
    updateNodePosition,
    addEdge: storeAddEdge,
    setEdges,
    deleteNode,
    isNDVOpen,
    activeTab,
    executionState,
  } = useMcpStore();

  const [selectedNodes, setSelectedNodes] = useState([]);
  const item = getSelectedItem();

  // Convert store nodes/edges to React Flow format (only for tools)
  const flowNodes = useMemo(() => {
    if (!item || selectedItemType !== 'tool' || !item.nodes) return [];
    return item.nodes.map((node) => {
      // Get execution status for this node
      const nodeExecutionState = executionState.nodeStates[node.id];
      const executionStatus = nodeExecutionState?.status || null;

      return {
        id: node.id,
        type: node.type,
        position: node.position,
        data: {
          ...node.data,
          executionStatus, // Pass execution status to node
        },
        selected: selectedNodes.includes(node.id),
      };
    });
  }, [item, selectedItemType, selectedNodes, executionState.nodeStates]);

  const flowEdges = useMemo(() => {
    if (!item || selectedItemType !== 'tool' || !item.edges) return [];
    return item.edges;
  }, [item, selectedItemType]);

  const onNodesChange = useCallback((changes) => {
    changes.forEach((change) => {
      if (change.type === 'position' && change.position) {
        updateNodePosition(change.id, change.position);
      }
      if (change.type === 'select') {
        setSelectedNodes((prev) => {
          if (change.selected) {
            return [...prev.filter((id) => id !== change.id), change.id];
          }
          return prev.filter((id) => id !== change.id);
        });
      }
    });
  }, [updateNodePosition]);

  const onEdgesChange = useCallback((changes) => {
    // Handle edge deletions (only for tools)
    const deletions = changes.filter((c) => c.type === 'remove');
    if (deletions.length > 0 && item && selectedItemType === 'tool' && item.edges) {
      const remainingEdges = item.edges.filter(
        (e) => !deletions.some((d) => d.id === e.id)
      );
      setEdges(remainingEdges);
    }
  }, [item, selectedItemType, setEdges]);

  const onConnect = useCallback((params) => {
    storeAddEdge(params);
  }, [storeAddEdge]);

  // Handle keyboard shortcuts for deletion
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't handle if NDV is open or if user is in an input/textarea
      if (isNDVOpen) return;
      const target = e.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodes.length > 0) {
        e.preventDefault();
        selectedNodes.forEach((nodeId) => {
          // Find the node to check if it's deletable
          const node = item?.nodes?.find((n) => n.id === nodeId);
          if (node) {
            const meta = NODE_TYPE_META[node.type];
            if (meta?.deletable !== false) {
              deleteNode(nodeId);
            }
          }
        });
        setSelectedNodes([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodes, deleteNode, item, isNDVOpen]);

  // Show Test Workbench when in test mode
  if (activeTab === 'test') {
    return <TestWorkbench />;
  }

  // Show empty state when no item is selected
  if (!selectedItemId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground"
            >
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-neutral-900 mb-1">
            No item selected
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Create a server and add a tool, resource, or prompt from the sidebar to start building.
          </p>
        </div>
      </div>
    );
  }

  if (selectedItemType === 'prompt') {
    return <PromptBuilder />;
  }

  if (selectedItemType === 'resource') {
    return <ResourceEditor />;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Canvas area */}
      <div className="flex-1 relative min-h-0">
        <CanvasToolbar />

        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          className="bg-white"
          deleteKeyCode={null}
        >
          <Background color="#e5e5e5" gap={20} size={1} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor="#e5e5e5"
            maskColor="rgba(255,255,255,0.8)"
            className="!bg-muted"
          />
        </ReactFlow>
      </div>

      {/* Debug panel — split pane below canvas */}
      <WorkflowDebugPanel />
    </div>
  );
}
