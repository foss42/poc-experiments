import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WORKFLOW_NODE_TYPES, TRANSPORT_TYPES } from '../utils/constants';

// Generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 15);

// Get all downstream node IDs from a starting node
function getDownstreamNodeIds(startId, edges) {
  const visited = new Set();
  const queue = [startId];
  while (queue.length > 0) {
    const id = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    edges.filter(e => e.source === id).forEach(e => queue.push(e.target));
  }
  return visited;
}

// Create initial Input and Output nodes for a new tool
const createInitialNodes = () => {
  const inputId = generateId();
  const outputId = generateId();

  return {
    nodes: [
      {
        id: inputId,
        type: WORKFLOW_NODE_TYPES.INPUT,
        position: { x: 100, y: 200 },
        data: {
          parameters: [],
        },
      },
      {
        id: outputId,
        type: WORKFLOW_NODE_TYPES.OUTPUT,
        position: { x: 500, y: 200 },
        data: {
          returnPath: '',
        },
      },
    ],
    edges: [
      { id: `${inputId}-${outputId}`, source: inputId, target: outputId },
    ],
  };
};

export const useMcpStore = create(
  persist(
    (set, get) => ({
      // State
      servers: [],
      selectedServerId: null,
      selectedItemId: null,
      selectedItemType: null, // 'tool' | 'resource' | 'prompt'

      // Modal states
      isCreateServerModalOpen: false,
      isCreateToolModalOpen: false,
      isCreateResourceModalOpen: false,
      isCreatePromptModalOpen: false,
      isAddNodePickerOpen: false,
      isExportServerModalOpen: false,
      isImportServerModalOpen: false,
      importError: null,
      exportServerId: null,
      createToolForServerId: null,
      createResourceForServerId: null,
      createPromptForServerId: null,

      // Node picker context for edge/handle insertion
      nodePickerContext: null, // { type: 'edge' | 'handle', sourceId?, targetId?, nodeId?, handleId?, position? }

      // Node Detail View (NDV) state
      selectedNodeId: null,
      isNDVOpen: false,
      nodeExecutionData: {}, // { [nodeId]: { input, output } }
      nodeMockData: {}, // { [nodeId]: { input, output } }

      // UI state
      activeTab: 'create', // 'create' or 'test'
      previousTab: 'create', // 'create' or 'test'
      expandedServers: [], // Array of expanded server IDs

      // Execution state
      executionState: {
        status: 'idle', // 'idle' | 'running' | 'completed' | 'failed'
        nodeStates: {}, // { [nodeId]: { status, input, output, error, duration } }
        currentNodeId: null,
        startTime: null,
        endTime: null,
        error: null,
      },

      // Last full execution result (steps, data, error)
      lastExecutionResult: null,

      // Getters
      getSelectedServer: () => {
        const { servers, selectedServerId } = get();
        return servers.find(s => s.id === selectedServerId) || null;
      },

      getSelectedTool: () => { // Keeps compatibility for purely tool-specific logic if needed, but consider getSelectedItem instead
        const { servers, selectedServerId, selectedItemId, selectedItemType } = get();
        if (selectedItemType !== 'tool') return null;
        const server = servers.find(s => s.id === selectedServerId);
        if (!server) return null;
        return server.tools.find(t => t.id === selectedItemId) || null;
      },

      getSelectedItem: () => {
        const { servers, selectedServerId, selectedItemId, selectedItemType } = get();
        const server = servers.find(s => s.id === selectedServerId);
        if (!server || !selectedItemId || !selectedItemType) return null;

        if (selectedItemType === 'tool') {
          return server.tools.find(t => t.id === selectedItemId) || null;
        } else if (selectedItemType === 'resource') {
          return server.resources.find(r => r.id === selectedItemId) || null;
        } else if (selectedItemType === 'prompt') {
          return server.prompts.find(p => p.id === selectedItemId) || null;
        }
        return null;
      },

      // Tab actions
      setActiveTab: (tab) => set((state) => ({
        activeTab: tab,
        previousTab: state.activeTab !== 'settings' ? state.activeTab : state.previousTab
      })),

      // Server expansion actions
      toggleServerExpanded: (serverId) => {
        set((state) => {
          const isExpanded = state.expandedServers.includes(serverId);
          return {
            expandedServers: isExpanded
              ? state.expandedServers.filter(id => id !== serverId)
              : [...state.expandedServers, serverId]
          };
        });
      },

      expandServer: (serverId) => {
        set((state) => {
          if (state.expandedServers.includes(serverId)) return state;
          return { expandedServers: [...state.expandedServers, serverId] };
        });
      },

      // Modal actions
      openCreateServerModal: () => set({ isCreateServerModalOpen: true }),
      closeCreateServerModal: () => set({ isCreateServerModalOpen: false }),

      openCreateToolModal: (serverId) => set({
        isCreateToolModalOpen: true,
        createToolForServerId: serverId
      }),
      closeCreateToolModal: () => set({
        isCreateToolModalOpen: false,
        createToolForServerId: null
      }),

      openCreateResourceModal: (serverId) => set({
        isCreateResourceModalOpen: true,
        createResourceForServerId: serverId
      }),
      closeCreateResourceModal: () => set({
        isCreateResourceModalOpen: false,
        createResourceForServerId: null
      }),

      openCreatePromptModal: (serverId) => set({
        isCreatePromptModalOpen: true,
        createPromptForServerId: serverId
      }),
      closeCreatePromptModal: () => set({
        isCreatePromptModalOpen: false,
        createPromptForServerId: null
      }),

      openAddNodePicker: (context = null) => set({ isAddNodePickerOpen: true, nodePickerContext: context }),
      closeAddNodePicker: () => set({ isAddNodePickerOpen: false, nodePickerContext: null }),

      openExportServerModal: (serverId) => set({
        isExportServerModalOpen: true,
        exportServerId: serverId
      }),
      closeExportServerModal: () => set({
        isExportServerModalOpen: false,
        exportServerId: null
      }),

      getExportServer: () => {
        const { servers, exportServerId } = get();
        return servers.find(s => s.id === exportServerId) || null;
      },

      openImportServerModal: () => set({ isImportServerModalOpen: true, importError: null }),
      closeImportServerModal: () => set({ isImportServerModalOpen: false, importError: null }),
      setImportError: (error) => set({ importError: error }),

      importServerFromManifest: (manifest) => {
        const { servers } = get();

        // Validate manifest structure
        if (!manifest || !manifest.server) {
          set({ importError: 'Invalid manifest: missing server data' });
          return false;
        }

        const serverData = manifest.server;

        // Generate new IDs to avoid conflicts
        const newServerId = generateId();

        // Handle duplicate names by appending (1), (2), etc.
        let baseName = serverData.name || 'Imported Server';
        let finalName = baseName;
        let counter = 1;
        while (servers.some(s => s.name === finalName)) {
          finalName = `${baseName} (${counter})`;
          counter++;
        }

        // Deep clone and regenerate IDs for tools
        const newTools = (serverData.tools || []).map(tool => {
          const newToolId = generateId();
          const idMap = {};

          // Map old node IDs to new ones
          const newNodes = (tool.nodes || []).map(node => {
            const newNodeId = generateId();
            idMap[node.id] = newNodeId;
            return { ...node, id: newNodeId };
          });

          // Update edge source/target to use new node IDs
          const newEdges = (tool.edges || []).map(edge => ({
            ...edge,
            id: `${idMap[edge.source] || edge.source}-${idMap[edge.target] || edge.target}`,
            source: idMap[edge.source] || edge.source,
            target: idMap[edge.target] || edge.target,
          }));

          return {
            ...tool,
            id: newToolId,
            nodes: newNodes,
            edges: newEdges,
          };
        });

        // Deep clone and regenerate IDs for resources
        const newResources = (serverData.resources || []).map(resource => ({
          ...resource,
          id: generateId(),
        }));

        // Deep clone and regenerate IDs for prompts
        const newPrompts = (serverData.prompts || []).map(prompt => ({
          ...prompt,
          id: generateId(),
        }));

        const newServer = {
          id: newServerId,
          name: finalName,
          description: serverData.description || '',
          transport: serverData.transport || 'stdio',
          tools: newTools,
          resources: newResources,
          prompts: newPrompts,
        };

        set((state) => ({
          servers: [...state.servers, newServer],
          expandedServers: [...state.expandedServers, newServerId],
          isImportServerModalOpen: false,
          importError: null,
        }));

        return true;
      },

      // NDV actions
      openNDV: (nodeId) => set({ selectedNodeId: nodeId, isNDVOpen: true }),
      closeNDV: () => set({ isNDVOpen: false }),
      setNodeMockData: (nodeId, type, data) => set((state) => ({
        nodeMockData: {
          ...state.nodeMockData,
          [nodeId]: {
            ...state.nodeMockData[nodeId],
            [type]: data,
          },
        },
      })),

      // Server actions
      addServer: (name, transport = TRANSPORT_TYPES.STDIO) => {
        const newServer = {
          id: generateId(),
          name,
          transport,
          tools: [],
          resources: [],
          prompts: [],
        };

        set((state) => ({
          servers: [...state.servers, newServer],
          expandedServers: [...state.expandedServers, newServer.id], // Auto-expand new server
          isCreateServerModalOpen: false,
        }));

        return newServer;
      },

      updateServer: (serverId, updates) => {
        set((state) => ({
          servers: state.servers.map(server =>
            server.id === serverId
              ? { ...server, ...updates }
              : server
          ),
        }));
      },

      deleteServer: (serverId) => {
        set((state) => ({
          servers: state.servers.filter(s => s.id !== serverId),
          selectedServerId: state.selectedServerId === serverId ? null : state.selectedServerId,
          selectedItemId: state.selectedServerId === serverId ? null : state.selectedItemId,
          selectedItemType: state.selectedServerId === serverId ? null : state.selectedItemType,
        }));
      },

      selectServer: (serverId) => {
        set({ selectedServerId: serverId, selectedItemId: null, selectedItemType: null, isNDVOpen: false });
      },

      // Tool actions
      addTool: (serverId, name, description = '') => {
        const { nodes, edges } = createInitialNodes();

        const newTool = {
          id: generateId(),
          name,
          description,
          nodes,
          edges,
        };

        set((state) => ({
          servers: state.servers.map(server =>
            server.id === serverId
              ? { ...server, tools: [...server.tools, newTool] }
              : server
          ),
          selectedServerId: serverId,
          selectedItemId: newTool.id,
          selectedItemType: 'tool',
          isCreateToolModalOpen: false,
          createToolForServerId: null,
        }));

        return newTool;
      },

      deleteTool: (serverId, toolId) => {
        set((state) => ({
          servers: state.servers.map(server =>
            server.id === serverId
              ? { ...server, tools: server.tools.filter(t => t.id !== toolId) }
              : server
          ),
          selectedItemId: state.selectedItemId === toolId && state.selectedItemType === 'tool' ? null : state.selectedItemId,
          selectedItemType: state.selectedItemId === toolId && state.selectedItemType === 'tool' ? null : state.selectedItemType,
        }));
      },

      addResource: (serverId, name, description, uriTemplate, mimeType, resourceType = 'template') => {
        const newResource = {
          id: generateId(),
          name,
          description,
          uriTemplate,
          mimeType,
          resourceType,
          content: '', // Initialize content field
          variables: [], // Initialize variables metadata array
        };

        set((state) => ({
          servers: state.servers.map(server =>
            server.id === serverId
              ? { ...server, resources: [...server.resources, newResource] }
              : server
          ),
          selectedServerId: serverId,
          selectedItemId: newResource.id,
          selectedItemType: 'resource',
          isCreateResourceModalOpen: false,
          createResourceForServerId: null,
        }));

        return newResource;
      },

      deleteResource: (serverId, resourceId) => {
        set((state) => ({
          servers: state.servers.map(server =>
            server.id === serverId
              ? { ...server, resources: server.resources.filter(r => r.id !== resourceId) }
              : server
          ),
          selectedItemId: state.selectedItemId === resourceId && state.selectedItemType === 'resource' ? null : state.selectedItemId,
          selectedItemType: state.selectedItemId === resourceId && state.selectedItemType === 'resource' ? null : state.selectedItemType,
        }));
      },

      addPrompt: (serverId, name, description, args = []) => {
        const newPrompt = {
          id: generateId(),
          name,
          description,
          arguments: args,
          messages: [], // Initialize messages array
        };

        set((state) => ({
          servers: state.servers.map(server =>
            server.id === serverId
              ? { ...server, prompts: [...server.prompts, newPrompt] }
              : server
          ),
          selectedServerId: serverId,
          selectedItemId: newPrompt.id,
          selectedItemType: 'prompt',
          isCreatePromptModalOpen: false,
          createPromptForServerId: null,
        }));

        return newPrompt;
      },

      deletePrompt: (serverId, promptId) => {
        set((state) => ({
          servers: state.servers.map(server =>
            server.id === serverId
              ? { ...server, prompts: server.prompts.filter(p => p.id !== promptId) }
              : server
          ),
          selectedItemId: state.selectedItemId === promptId && state.selectedItemType === 'prompt' ? null : state.selectedItemId,
          selectedItemType: state.selectedItemId === promptId && state.selectedItemType === 'prompt' ? null : state.selectedItemType,
        }));
      },

      selectItem: (serverId, itemId, itemType) => {
        set({ selectedServerId: serverId, selectedItemId: itemId, selectedItemType: itemType, isNDVOpen: false });
      },

      selectTool: (serverId, toolId) => {
        set({ selectedServerId: serverId, selectedItemId: toolId, selectedItemType: 'tool', isNDVOpen: false });
      },

      updateItem: (updates) => {
        const { selectedServerId, selectedItemId, selectedItemType, servers } = get();
        if (!selectedServerId || !selectedItemId || !selectedItemType) return;
        set({
          servers: servers.map(server =>
            server.id === selectedServerId
              ? {
                ...server,
                [selectedItemType + 's']: server[selectedItemType + 's'].map(item =>
                  item.id === selectedItemId
                    ? { ...item, ...updates }
                    : item
                ),
              }
              : server
          ),
        });
      },

      updateTool: (updates) => {
        get().updateItem(updates);
      },

      // Node actions (only for tools - resources don't have nodes)
      addNode: (nodeType, position = { x: 250, y: 250 }) => {
        const { selectedServerId, selectedItemId, selectedItemType, servers, nodePickerContext } = get();
        if (!selectedServerId || !selectedItemId || selectedItemType !== 'tool') return null;

        const server = servers.find(s => s.id === selectedServerId);
        const item = server?.tools?.find(t => t.id === selectedItemId);
        if (!item) return null;

        const newNode = {
          id: generateId(),
          type: nodeType,
          position: { ...position },
          data: getDefaultNodeData(nodeType),
        };

        let newEdges = [...item.edges];
        let updatedNodes = [...item.nodes];

        if (nodePickerContext?.type === 'edge' && nodePickerContext.sourceId && nodePickerContext.targetId) {
          // Inserting on an edge — split the edge
          const sourceNode = item.nodes.find(n => n.id === nodePickerContext.sourceId);
          const targetNode = item.nodes.find(n => n.id === nodePickerContext.targetId);

          if (sourceNode && targetNode) {
            newNode.position = {
              x: sourceNode.position.x + 300,
              y: sourceNode.position.y,
            };

            // Shift the target and all its downstream nodes right by 300
            const downstreamIds = getDownstreamNodeIds(nodePickerContext.targetId, item.edges);
            updatedNodes = updatedNodes.map(n => {
              if (downstreamIds.has(n.id)) {
                return { ...n, position: { ...n.position, x: n.position.x + 300 } };
              }
              return n;
            });
          }

          // Remove old edge
          const edgeId = `${nodePickerContext.sourceId}-${nodePickerContext.targetId}`;
          newEdges = newEdges.filter(e => e.id !== edgeId);

          // Add source → new node
          newEdges.push({
            id: `${nodePickerContext.sourceId}-${newNode.id}`,
            source: nodePickerContext.sourceId,
            target: newNode.id,
            sourceHandle: nodePickerContext.sourceHandle || null,
          });

          // Add new node → target
          newEdges.push({
            id: `${newNode.id}-${nodePickerContext.targetId}`,
            source: newNode.id,
            target: nodePickerContext.targetId,
            targetHandle: nodePickerContext.targetHandle || null,
          });

        } else if (nodePickerContext?.type === 'handle' && nodePickerContext.nodeId) {
          // Inserting after a specific node via + button
          const sourceId = nodePickerContext.nodeId;
          const sourceNode = item.nodes.find(n => n.id === sourceId);

          if (sourceNode) {
            // Find outgoing edges from this node
            const outgoingEdges = newEdges.filter(e => e.source === sourceId);

            if (outgoingEdges.length > 0) {
              // There's an existing connection — insert between
              const targetEdge = outgoingEdges[0];
              const targetId = targetEdge.target;

              newNode.position = {
                x: sourceNode.position.x + 300,
                y: sourceNode.position.y,
              };

              // Shift target and downstream nodes right by 300
              const downstreamIds = getDownstreamNodeIds(targetId, item.edges);
              updatedNodes = updatedNodes.map(n => {
                if (downstreamIds.has(n.id)) {
                  return { ...n, position: { ...n.position, x: n.position.x + 300 } };
                }
                return n;
              });

              // Remove old edge
              newEdges = newEdges.filter(e => e.id !== targetEdge.id);

              // Add source → new node
              newEdges.push({
                id: `${sourceId}-${newNode.id}`,
                source: sourceId,
                target: newNode.id,
                sourceHandle: targetEdge.sourceHandle || null,
              });

              // Add new node → old target
              newEdges.push({
                id: `${newNode.id}-${targetId}`,
                source: newNode.id,
                target: targetId,
                targetHandle: targetEdge.targetHandle || null,
              });
            } else {
              // No outgoing edge — just append after
              newNode.position = {
                x: sourceNode.position.x + 300,
                y: sourceNode.position.y,
              };

              // Add edge from source to new node
              newEdges.push({
                id: `${sourceId}-${newNode.id}`,
                source: sourceId,
                target: newNode.id,
              });
            }
          }
        } else {
          // No context — find last node in chain before Output and insert before Output
          const outputNode = item.nodes.find(n => n.type === WORKFLOW_NODE_TYPES.OUTPUT);
          if (outputNode) {
            // Find the node that connects to Output
            const edgeToOutput = newEdges.find(e => e.target === outputNode.id);
            if (edgeToOutput) {
              const sourceNode = item.nodes.find(n => n.id === edgeToOutput.source);
              if (sourceNode) {
                newNode.position = {
                  x: sourceNode.position.x + 300,
                  y: sourceNode.position.y,
                };

                // Shift Output right
                updatedNodes = updatedNodes.map(n => {
                  if (n.id === outputNode.id) {
                    return { ...n, position: { ...n.position, x: n.position.x + 300 } };
                  }
                  return n;
                });

                // Remove edge to Output
                newEdges = newEdges.filter(e => e.id !== edgeToOutput.id);

                // Add source → new node
                newEdges.push({
                  id: `${edgeToOutput.source}-${newNode.id}`,
                  source: edgeToOutput.source,
                  target: newNode.id,
                  sourceHandle: edgeToOutput.sourceHandle || null,
                });

                // Add new node → Output
                newEdges.push({
                  id: `${newNode.id}-${outputNode.id}`,
                  source: newNode.id,
                  target: outputNode.id,
                });
              } else {
                newNode.position = position;
              }
            } else {
              newNode.position = position;
            }
          }
        }

        // Now update the specific tool or resource
        const targetCollection = 'tools'; // Node operations only apply to tools

        set({
          servers: servers.map(s =>
            s.id === selectedServerId
              ? {
                ...s,
                [targetCollection]: s[targetCollection].map(t =>
                  t.id === selectedItemId
                    ? {
                      ...t,
                      nodes: [...updatedNodes, newNode],
                      edges: newEdges,
                    }
                    : t
                ),
              }
              : s
          ),
          isAddNodePickerOpen: false,
          nodePickerContext: null,
        });

        return newNode;
      },

      updateNode: (nodeId, updates) => {
        const { selectedServerId, selectedItemId, selectedItemType, servers } = get();
        if (!selectedServerId || !selectedItemId || selectedItemType !== 'tool') return;

        set({
          servers: servers.map(server =>
            server.id === selectedServerId
              ? {
                ...server,
                tools: server.tools.map(item =>
                  item.id === selectedItemId
                    ? {
                      ...item,
                      nodes: item.nodes.map(node =>
                        node.id === nodeId
                          ? { ...node, ...updates }
                          : node
                      ),
                    }
                    : item
                ),
              }
              : server
          ),
        });
      },

      updateNodeData: (nodeId, dataUpdates) => {
        const { selectedServerId, selectedItemId, selectedItemType, servers } = get();
        if (!selectedServerId || !selectedItemId || selectedItemType !== 'tool') return;

        set({
          servers: servers.map(server =>
            server.id === selectedServerId
              ? {
                ...server,
                tools: server.tools.map(item =>
                  item.id === selectedItemId
                    ? {
                      ...item,
                      nodes: item.nodes.map(node =>
                        node.id === nodeId
                          ? { ...node, data: { ...node.data, ...dataUpdates } }
                          : node
                      ),
                    }
                    : item
                ),
              }
              : server
          ),
        });
      },

      deleteNode: (nodeId) => {
        const { selectedServerId, selectedItemId, selectedItemType, servers } = get();
        if (!selectedServerId || !selectedItemId || selectedItemType !== 'tool') return;

        set({
          servers: servers.map(server =>
            server.id === selectedServerId
              ? {
                ...server,
                tools: server.tools.map(item =>
                  item.id === selectedItemId
                    ? {
                      ...item,
                      nodes: item.nodes.filter(n => n.id !== nodeId),
                      edges: item.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
                    }
                    : item
                ),
              }
              : server
          ),
        });
      },

      // Update node positions (for React Flow drag)
      updateNodePosition: (nodeId, position) => {
        const { selectedServerId, selectedItemId, selectedItemType, servers } = get();
        if (!selectedServerId || !selectedItemId || selectedItemType !== 'tool') return;

        set({
          servers: servers.map(server =>
            server.id === selectedServerId
              ? {
                ...server,
                tools: server.tools.map(item =>
                  item.id === selectedItemId
                    ? {
                      ...item,
                      nodes: item.nodes.map(node =>
                        node.id === nodeId
                          ? { ...node, position }
                          : node
                      ),
                    }
                    : item
                ),
              }
              : server
          ),
        });
      },

      // Edge actions (only for tools)
      addEdge: (edge) => {
        const { selectedServerId, selectedItemId, selectedItemType, servers } = get();
        if (!selectedServerId || !selectedItemId || selectedItemType !== 'tool') return;

        const server = servers.find(s => s.id === selectedServerId);
        const item = server?.tools?.find(t => t.id === selectedItemId);
        if (!item) return;

        const newEdgeId = `${edge.source}-${edge.target}`;
        // Skip if this edge already exists
        if (item.edges.some(e => e.id === newEdgeId)) return;

        const newEdge = {
          id: newEdgeId,
          ...edge,
        };

        set({
          servers: servers.map(s =>
            s.id === selectedServerId
              ? {
                ...s,
                tools: s.tools.map(t =>
                  t.id === selectedItemId
                    ? { ...t, edges: [...t.edges, newEdge] }
                    : t
                ),
              }
              : s
          ),
        });
      },

      deleteEdge: (edgeId) => {
        const { selectedServerId, selectedItemId, selectedItemType, servers } = get();
        if (!selectedServerId || !selectedItemId || selectedItemType !== 'tool') return;

        set({
          servers: servers.map(server =>
            server.id === selectedServerId
              ? {
                ...server,
                tools: server.tools.map(item =>
                  item.id === selectedItemId
                    ? { ...item, edges: item.edges.filter(e => e.id !== edgeId) }
                    : item
                ),
              }
              : server
          ),
        });
      },

      // Execution actions
      resetExecutionState: () => {
        set({
          executionState: {
            status: 'idle',
            nodeStates: {},
            currentNodeId: null,
            startTime: null,
            endTime: null,
            error: null,
          },
          lastExecutionResult: null,
        });
      },

      setExecutionStatus: (status, error = null) => {
        set((state) => ({
          executionState: {
            ...state.executionState,
            status,
            error,
            endTime: status === 'completed' || status === 'failed' ? Date.now() : state.executionState.endTime,
          },
        }));
      },

      setNodeExecutionState: (nodeId, nodeState) => {
        set((state) => ({
          executionState: {
            ...state.executionState,
            currentNodeId: nodeState.status === 'running' ? nodeId : state.executionState.currentNodeId,
            nodeStates: {
              ...state.executionState.nodeStates,
              [nodeId]: {
                ...state.executionState.nodeStates[nodeId],
                ...nodeState,
              },
            },
          },
        }));
      },

      setNodeExecutionData: (nodeId, data) => {
        set((state) => ({
          nodeExecutionData: {
            ...state.nodeExecutionData,
            [nodeId]: {
              ...state.nodeExecutionData[nodeId],
              ...data,
            },
          },
        }));
      },

      startExecution: () => {
        set({
          lastExecutionResult: null,
          executionState: {
            status: 'running',
            nodeStates: {},
            currentNodeId: null,
            startTime: Date.now(),
            endTime: null,
            error: null,
          },
        });
      },

      setLastExecutionResult: (result) => set({ lastExecutionResult: result }),

      // Update edges (for React Flow - only for tools)
      setEdges: (edges) => {
        const { selectedServerId, selectedItemId, selectedItemType, servers } = get();
        if (!selectedServerId || !selectedItemId || selectedItemType !== 'tool') return;

        set({
          servers: servers.map(server =>
            server.id === selectedServerId
              ? {
                ...server,
                tools: server.tools.map(item =>
                  item.id === selectedItemId
                    ? { ...item, edges }
                    : item
                ),
              }
              : server
          ),
        });
      },
    }),
    {
      name: 'mcp-builder-storage',
      partialize: (state) => ({ servers: state.servers }),
    }
  )
);

// Helper: Get default data for a node type
function getDefaultNodeData(nodeType) {
  switch (nodeType) {
    case WORKFLOW_NODE_TYPES.INPUT:
      return { parameters: [] };
    case WORKFLOW_NODE_TYPES.API_CALL:
      return {
        method: 'GET',
        url: '',
        authentication: {
          type: 'none',
          apiKey: { key: '', value: '', addTo: 'header' },
          bearerToken: { token: '' },
          basicAuth: { username: '', password: '' },
          oauth2: { accessToken: '' },
        },
        headers: { enabled: false, items: [] },
        queryParams: { enabled: false, items: [] },
        body: { enabled: false, contentType: 'application/json', content: '' },
        options: { enabled: false, timeout: 30000, followRedirects: true, validateSSL: true },
      };
    case WORKFLOW_NODE_TYPES.TRANSFORM:
      return { expression: '' };
    case WORKFLOW_NODE_TYPES.CONDITION:
      return { expression: '' };
    case WORKFLOW_NODE_TYPES.OUTPUT:
      return { returnPath: '' };
    case WORKFLOW_NODE_TYPES.CODE:
      return { code: '// Write your JavaScript code here\nreturn data;', language: 'javascript' };
    case WORKFLOW_NODE_TYPES.LOOP:
      return { arrayPath: 'data.items', itemVariable: 'item', indexVariable: 'index' };
    case WORKFLOW_NODE_TYPES.MERGE:
      return { mode: 'append', inputCount: 2 }; // append, combine, waitAll
    case WORKFLOW_NODE_TYPES.ERROR_HANDLER:
      return { continueOnError: false };
    default:
      return {};
  }
}
