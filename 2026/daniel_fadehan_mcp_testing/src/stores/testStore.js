import { create } from 'zustand';
import { useMcpStore } from './mcpStore';
import { McpClient } from '../utils/mcpClient';
import { executeWorkflow } from '../utils/workflowExecutor';
import { WORKFLOW_NODE_TYPES } from '../utils/constants';

const generateId = () => Math.random().toString(36).substring(2, 15);

// --- Mock data ---
const MOCK_TOOLS = [
  {
    name: 'get_user',
    description: 'Retrieve a user profile by their unique ID. Returns full profile data including contact info and preferences.',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'string', description: 'The unique identifier of the user (e.g. "usr_a1b2c3")' },
        include_metadata: { type: 'boolean', description: 'Include extended metadata like login history and device info' },
      },
      required: ['user_id'],
    },
    annotations: { readOnlyHint: true, idempotentHint: true },
  },
  {
    name: 'search_products',
    description: 'Search the product catalog with filters. Supports full-text search, category filtering, and pagination.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query string' },
        category: {
          type: 'string',
          description: 'Product category to filter by',
          enum: ['electronics', 'clothing', 'books', 'home', 'sports', 'toys'],
        },
        min_price: { type: 'number', description: 'Minimum price in USD' },
        max_price: { type: 'number', description: 'Maximum price in USD' },
        in_stock: { type: 'boolean', description: 'Only show items currently in stock' },
        limit: { type: 'integer', description: 'Max number of results (1-100, default 20)' },
      },
      required: ['query'],
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'create_order',
    description: 'Create a new order for a customer. Validates inventory, calculates totals, and reserves stock.',
    inputSchema: {
      type: 'object',
      properties: {
        customer_id: { type: 'string', description: 'Customer ID to place the order for' },
        items: { type: 'array', description: 'Array of order items: [{ "product_id": "...", "quantity": 1 }]' },
        shipping_address: { type: 'object', description: 'Shipping address object: { "street": "...", "city": "...", "state": "...", "zip": "..." }' },
        coupon_code: { type: 'string', description: 'Optional discount coupon code' },
        express_shipping: { type: 'boolean', description: 'Use express 2-day shipping' },
      },
      required: ['customer_id', 'items', 'shipping_address'],
    },
    annotations: { destructiveHint: true },
  },
];

const MOCK_RESOURCES = [
  {
    uri: 'file:///logs/app.log',
    name: 'Application Logs',
    description: 'Recent application log entries for debugging',
    mimeType: 'text/plain',
    resourceType: 'file',
    content: '[INFO] Server started on port 8080\n[WARN] High memory usage detected\n[ERROR] Failed to connect to database at 10.0.0.4',
  },
  {
    uri: 'postgres://db/users/schema',
    name: 'Users Table Schema',
    description: 'Database schema for the users table',
    mimeType: 'application/json',
    resourceType: 'database',
    content: '{\n  "table": "users",\n  "columns": [\n    {"name": "id", "type": "uuid", "primary": true},\n    {"name": "email", "type": "varchar(255)", "unique": true},\n    {"name": "created_at", "type": "timestamp"}\n  ]\n}',
  },
  {
    uri: 'api://github.com/repos/{owner}/{repo}/issues',
    name: 'GitHub Issues',
    description: 'Template for fetching GitHub issues for a repository',
    mimeType: 'application/json',
    resourceType: 'template',
    variables: [
      { name: 'owner', description: 'Repository owner (e.g., octocat)' },
      { name: 'repo', description: 'Repository name (e.g., Hello-World)' }
    ],
    content: '[\n  { "id": 1, "title": "Bug: Cannot login", "state": "open", "repo": "{{owner}}/{{repo}}" },\n  { "id": 2, "title": "Feature: Add dark mode", "state": "closed", "repo": "{{owner}}/{{repo}}" }\n]',
  }
];

const MOCK_PROMPTS = [
  {
    name: 'analyze_error',
    description: 'Analyze an error message and suggest fixes',
    arguments: [
      { name: 'error_message', description: 'The error message to analyze', required: true },
      { name: 'context', description: 'Surrounding code or context', required: false }
    ],
    messages: [
      {
        role: 'user',
        content: 'Please analyze this error message:\n\n```\n{{error_message}}\n```\n\nContext:\n```\n{{context}}\n```\n\nWhat could be causing this and how do I fix it?'
      }
    ]
  },
  {
    name: 'code_review',
    description: 'Perform a code review on a specific component or function',
    arguments: [
      { name: 'code', description: 'The code to review', required: true },
      { name: 'language', description: 'Programming language (e.g., python, javascript)', required: true }
    ],
    messages: [
      {
        role: 'system',
        content: 'You are an expert {{language}} developer performing a thorough code review. Focus on readability, performance, security, and best practices.'
      },
      {
        role: 'user',
        content: 'Please review the following {{language}} code:\n\n```{{language}}\n{{code}}\n```'
      }
    ]
  }
];

// Mock responses keyed by tool name
const MOCK_RESPONSES = {
  get_user: (args) => ({
    user: {
      id: args.user_id || 'usr_a1b2c3',
      name: 'Sarah Chen',
      email: 'sarah.chen@example.com',
    },
  }),
  search_products: (args) => ({
    results: [],
    query: args.query,
  }),
  create_order: (args) => ({
    order: {
      id: 'ord_' + generateId(),
      status: 'confirmed',
    },
  }),
};

// Derive server name from URL
function serverNameFromUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'localhost'
      ? `Local Dev Server (${parsed.port || 80})`
      : parsed.hostname;
  } catch {
    return 'MCP Server';
  }
}

// --- Store ---

export const useTestStore = create((set, get) => ({
  // Test mode
  testMode: 'external', // 'external' | 'builder'

  // Connection
  client: null,
  serverUrl: '',
  transportType: 'stdio',
  connectionStatus: 'disconnected',
  connectionError: null,
  serverInfo: null,
  selectedBuilderServerId: null, // Server ID selected for builder preview

  // Primitive type selection (sub-tabs)
  selectedPrimitiveType: 'tools', // 'tools' | 'resources' | 'prompts'

  // Tools
  tools: [],
  selectedToolName: null,
  searchQuery: '',

  // Resources
  resources: [],
  selectedResourceUri: null,
  resourceInputValues: {}, // For template variables
  lastResourceResponse: null,

  // Prompts
  prompts: [],
  selectedPromptName: null,
  promptInputValues: {}, // For prompt arguments
  lastPromptResponse: null,

  // Execution
  inputValues: {},
  inputMode: 'form',
  rawJsonInput: '',
  isExecuting: false,
  lastResponse: null,

  // History
  history: [],
  isHistoryOpen: true,

  // Getters
  getSelectedTool: () => {
    const { tools, selectedToolName } = get();
    return tools.find((t) => t.name === selectedToolName) || null;
  },

  getFilteredTools: () => {
    const { tools, searchQuery } = get();
    if (!searchQuery.trim()) return tools;
    const q = searchQuery.toLowerCase();
    return tools.filter(
      (t) => t.name.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q)
    );
  },

  getFilteredResources: () => {
    const { resources, searchQuery } = get();
    if (!searchQuery.trim()) return resources;
    const q = searchQuery.toLowerCase();
    return resources.filter(
      (r) => r.name.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q)
    );
  },

  getFilteredPrompts: () => {
    const { prompts, searchQuery } = get();
    if (!searchQuery.trim()) return prompts;
    const q = searchQuery.toLowerCase();
    return prompts.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
    );
  },

  getSelectedResource: () => {
    const { resources, selectedResourceUri } = get();
    return resources.find((r) => r.uri === selectedResourceUri) || null;
  },

  getSelectedPrompt: () => {
    const { prompts, selectedPromptName } = get();
    return prompts.find((p) => p.name === selectedPromptName) || null;
  },

  // Actions
  setTestMode: (mode) => set({ testMode: mode }),
  setSelectedPrimitiveType: (type) => set({ selectedPrimitiveType: type }),

  setServerUrl: (url) => set({ serverUrl: url }),
  setTransportType: (type) => set({ transportType: type }),
  setSelectedBuilderServerId: (id) => set({ selectedBuilderServerId: id }),

  connectBuilder: () => {
    const { selectedBuilderServerId } = get();
    const mcpState = useMcpStore.getState();
    
    // Use the explicitly selected server for builder preview
    const builderServer = selectedBuilderServerId 
      ? mcpState.servers.find(s => s.id === selectedBuilderServerId)
      : mcpState.getSelectedServer();

    if (!builderServer) {
      set({ connectionStatus: 'disconnected', connectionError: 'No builder server found. Select a server first.', testMode: 'builder', serverInfo: null, tools: [], resources: [], prompts: [] });
      return;
    }

    // Map builder tools into mock tools with inputSchema
    const builderTools = builderServer.tools.map(t => {
      const inputNode = t.nodes?.find(n => n.type === WORKFLOW_NODE_TYPES.INPUT);
      const parameters = inputNode?.data?.parameters || [];
      const properties = {};
      const required = [];

      parameters.forEach(p => {
        properties[p.name] = { type: p.type || 'string', description: p.description || '' };
        if (p.required) required.push(p.name);
      });

      return {
        name: t.name || 'Unnamed tool',
        description: t.description || '',
        inputSchema: {
          type: 'object',
          properties,
          required,
        },
        originalTool: t,
      };
    });

    // Map builder resources
    const builderResources = (builderServer.resources || []).map(r => {
      // Extract variables from URI template {param}
      const variables = [];
      const regex = /\{([^}]+)\}/g;
      let match;
      while ((match = regex.exec(r.uriTemplate || '')) !== null) {
        variables.push({
          name: match[1],
          type: 'string',
          description: (r.variables || []).find(v => v.name === match[1])?.description || '',
        });
      }

      return {
        name: r.name || 'Unnamed resource',
        uri: r.uriTemplate || '',
        description: r.description || '',
        mimeType: r.mimeType || 'application/json',
        resourceType: r.resourceType || 'template',
        variables,
        content: r.content || '',
        original: r,
      };
    });

    // Map builder prompts
    const builderPrompts = (builderServer.prompts || []).map(p => ({
      name: p.name || 'Unnamed prompt',
      description: p.description || '',
      arguments: (p.arguments || []).map(arg => ({
        name: arg.name,
        type: arg.type || 'string',
        description: arg.description || '',
        required: arg.required || false,
      })),
      messages: p.messages || [],
      original: p,
    }));

    set({
      testMode: 'builder',
      connectionStatus: 'connected',
      serverInfo: {
        name: builderServer.name + ' (Builder)',
        version: 'dev',
        protocolVersion: '2024-11-05',
      },
      tools: builderTools,
      resources: builderResources,
      prompts: builderPrompts,
      connectionError: null,
      selectedToolName: null,
      selectedResourceUri: null,
      selectedPromptName: null,
      searchQuery: '',
    });
  },

  connect: async () => {
    const { serverUrl, testMode } = get();

    if (testMode === 'builder') {
      get().connectBuilder();
      return;
    }

    if (!serverUrl.trim()) return;

    set({ connectionStatus: 'connecting', connectionError: null });

    try {
      const transportType = get().transportType === 'stdio' ? 'http' : get().transportType;
      const client = new McpClient(serverUrl, transportType);
      const { serverInfo, tools } = await client.connect();

      let resources = [];
      try { resources = await client.listResources(); } catch { /* server may not support resources */ }

      set({
        client,
        connectionStatus: 'connected',
        serverInfo,
        tools,
        resources,
        prompts: [],
        connectionError: null,
      });
    } catch (err) {
      set({
        connectionStatus: 'disconnected',
        connectionError: err.message,
      });
    }
  },

  disconnect: () => {
    const { client } = get();
    if (client) client.disconnect();
    set({
      client: null,
      connectionStatus: 'disconnected',
      connectionError: null,
      serverInfo: null,
      tools: [],
      resources: [],
      prompts: [],
      selectedToolName: null,
      selectedResourceUri: null,
      selectedPromptName: null,
      searchQuery: '',
      inputValues: {},
      inputMode: 'form',
      rawJsonInput: '',
      resourceInputValues: {},
      promptInputValues: {},
      isExecuting: false,
      lastResponse: null,
      lastResourceResponse: null,
      lastPromptResponse: null,
      history: [],
    });
  },

  selectTool: (name, options = {}) => {
    const tool = get().tools.find((t) => t.name === name);
    const skeleton = {};
    if (tool?.inputSchema?.properties) {
      Object.keys(tool.inputSchema.properties).forEach((key) => {
        skeleton[key] = '';
      });
    }
    set({
      selectedToolName: name,
      selectedPrimitiveType: options.navigate === false ? get().selectedPrimitiveType : 'tools',
      inputValues: skeleton,
      inputMode: 'form',
      rawJsonInput: JSON.stringify(skeleton, null, 2),
      lastResponse: null,
      history: [],
    });
  },

  // Resource selection and execution
  selectResource: (uri) => {
    const resource = get().resources.find((r) => r.uri === uri);
    const skeleton = {};
    if (resource?.variables) {
      resource.variables.forEach((v) => {
        skeleton[v.name] = '';
      });
    }
    set({
      selectedResourceUri: uri,
      resourceInputValues: skeleton,
      lastResourceResponse: null,
    });
  },

  setResourceInputValue: (field, value) =>
    set((state) => ({
      resourceInputValues: { ...state.resourceInputValues, [field]: value },
    })),

  executeResource: async () => {
    const { selectedResourceUri, resourceInputValues } = get();
    const resource = get().getSelectedResource();
    if (!resource) return;

    set({ isExecuting: true });
    const startTime = performance.now();

    try {
      // Interpolate URI template with variables
      let resolvedUri = resource.uri;
      Object.entries(resourceInputValues).forEach(([key, value]) => {
        resolvedUri = resolvedUri.replace(new RegExp(`\\{${key}\\}`, 'g'), value || `{${key}}`);
      });

      // Interpolate content with {{variable}} syntax
      let resolvedContent = resource.content || '';
      Object.entries(resourceInputValues).forEach(([key, value]) => {
        resolvedContent = resolvedContent.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `{{${key}}}`);
      });

      const responseTime = Math.round(performance.now() - startTime);

      // Return MCP-style response
      const response = {
        success: true,
        data: {
          contents: [{
            uri: resolvedUri,
            mimeType: resource.mimeType || 'application/json',
            text: resolvedContent,
          }]
        },
        responseTime,
      };

      set({
        isExecuting: false,
        lastResourceResponse: response,
      });
    } catch (err) {
      set({
        isExecuting: false,
        lastResourceResponse: {
          success: false,
          error: err.message || 'Resource execution failed',
          responseTime: Math.round(performance.now() - startTime),
        },
      });
    }
  },

  // Prompt selection and execution
  selectPrompt: (name) => {
    const prompt = get().prompts.find((p) => p.name === name);
    const skeleton = {};
    if (prompt?.arguments) {
      prompt.arguments.forEach((arg) => {
        skeleton[arg.name] = '';
      });
    }
    set({
      selectedPromptName: name,
      promptInputValues: skeleton,
      lastPromptResponse: null,
    });
  },

  setPromptInputValue: (field, value) =>
    set((state) => ({
      promptInputValues: { ...state.promptInputValues, [field]: value },
    })),

  executePrompt: async () => {
    const { selectedPromptName, promptInputValues } = get();
    const prompt = get().getSelectedPrompt();
    if (!prompt) return;

    set({ isExecuting: true });
    const startTime = performance.now();

    try {
      // Interpolate messages with {{argument}} syntax
      const resolvedMessages = (prompt.messages || []).map((msg) => {
        let content = msg.content || '';
        Object.entries(promptInputValues).forEach(([key, value]) => {
          content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `{{${key}}}`);
        });
        return {
          role: msg.role,
          content: {
            type: 'text',
            text: content,
          },
        };
      });

      const responseTime = Math.round(performance.now() - startTime);

      // Return MCP-style response
      const response = {
        success: true,
        data: {
          messages: resolvedMessages,
        },
        responseTime,
      };

      set({
        isExecuting: false,
        lastPromptResponse: response,
      });
    } catch (err) {
      set({
        isExecuting: false,
        lastPromptResponse: {
          success: false,
          error: err.message || 'Prompt execution failed',
          responseTime: Math.round(performance.now() - startTime),
        },
      });
    }
  },

  setInputValue: (field, value) =>
    set((state) => {
      const newInputValues = { ...state.inputValues, [field]: value };
      return {
        inputValues: newInputValues,
        rawJsonInput: JSON.stringify(newInputValues, null, 2),
      };
    }),

  setInputMode: (mode) => set({ inputMode: mode }),
  setRawJsonInput: (json) => {
    // Try to parse and sync to inputValues for bidirectional sync
    try {
      const parsed = JSON.parse(json);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        set({ rawJsonInput: json, inputValues: parsed });
      } else {
        // Not a valid object, just update the raw json
        set({ rawJsonInput: json });
      }
    } catch {
      // Invalid JSON, just update the raw string (user might be mid-edit)
      set({ rawJsonInput: json });
    }
  },

  executeTool: async () => {
    const { selectedToolName, inputValues, inputMode, rawJsonInput, testMode } = get();
    if (!selectedToolName) return;

    set({ isExecuting: true });

    let args;
    if (inputMode === 'json') {
      try {
        args = JSON.parse(rawJsonInput);
      } catch {
        set({
          isExecuting: false,
          lastResponse: {
            success: false,
            data: null,
            error: 'Invalid JSON input — check your syntax and try again.',
            responseTime: 0,
          },
        });
        return;
      }
    } else {
      args = { ...inputValues };
      // Parse array/object strings
      const tool = get().getSelectedTool();
      if (tool?.inputSchema?.properties) {
        Object.entries(tool.inputSchema.properties).forEach(([key, schema]) => {
          const val = args[key];
          if (typeof val === 'string' && val.trim()) {
            const trimmed = val.trim();
            if (schema.type === 'array' || schema.type === 'object' || trimmed.startsWith('{') || trimmed.startsWith('[')) {
              try { args[key] = JSON.parse(val); } catch { /* leave as string */ }
            }
          }
        });
      }
      // Clean empty values
      Object.keys(args).forEach((key) => {
        if (args[key] === '' || args[key] == null) delete args[key];
      });
    }

    const startTime = performance.now();
    let response;

    // BUILDER MODE 
    if (testMode === 'builder') {
      const tool = get().getSelectedTool();
      if (tool && tool.originalTool) {
        try {
          const result = await executeWorkflow(tool.originalTool.nodes, tool.originalTool.edges, args);
          const responseTime = Math.round(performance.now() - startTime);

          response = {
            success: result.success,
            data: result.success ? result.data : null,
            error: result.success ? null : result.error,
            responseTime,
            steps: result.steps
          };
        } catch (err) {
          response = {
            success: false,
            data: null,
            error: err.message || 'Execution failed',
            responseTime: Math.round(performance.now() - startTime),
          };
        }
      } else {
        response = {
          success: false,
          error: 'Original builder tool not found',
          responseTime: 0
        };
      }
    } else {
      // EXTERNAL MODE — use real MCP client if connected
      const { client } = get();
      if (client) {
        try {
          const toolResult = await client.callTool(selectedToolName, args);
          const responseTime = Math.round(performance.now() - startTime);
          
          let errorMessage = toolResult.error?.message || 'Tool execution failed';
          if (toolResult.isError && toolResult.content && Array.isArray(toolResult.content)) {
            const textContent = toolResult.content.find(c => c.type === 'text')?.text;
            if (textContent) {
              errorMessage = textContent;
            }
          }

          response = {
            success: !toolResult.isError,
            data: toolResult.isError ? null : toolResult,
            error: toolResult.isError ? errorMessage : null,
            _meta: toolResult._meta,
            responseTime,
          };
        } catch (err) {
          const responseTime = Math.round(performance.now() - startTime);
          response = {
            success: false,
            data: null,
            error: err.message || 'Tool execution failed',
            responseTime,
          };
        }
      } else {
        const delay = 200 + Math.random() * 400;
        await new Promise((r) => setTimeout(r, delay));
        const responseTime = Math.round(performance.now() - startTime);
        const mockFn = MOCK_RESPONSES[selectedToolName];
        const mockData = mockFn ? mockFn(args) : { message: 'Tool executed successfully', input: args };
        const isError = mockData?.__error === true;
        response = {
          success: !isError,
          data: isError ? null : mockData,
          error: isError ? mockData.message : null,
          responseTime,
        };
      }
    }

    const historyEntry = {
      id: generateId(),
      toolName: selectedToolName,
      input: args,
      response,
      timestamp: new Date(),
    };

    set((state) => ({
      isExecuting: false,
      lastResponse: response,
      history: [historyEntry, ...state.history],
    }));
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  loadHistoryEntry: (id) => {
    const { history } = get();
    const entry = history.find((h) => h.id === id);
    if (!entry) return;

    set({
      inputValues: entry.input,
      rawJsonInput: JSON.stringify(entry.input, null, 2),
      lastResponse: entry.response,
    });
  },

  clearHistory: () => set({ history: [] }),
  toggleHistory: () => set((state) => ({ isHistoryOpen: !state.isHistoryOpen })),
}));
