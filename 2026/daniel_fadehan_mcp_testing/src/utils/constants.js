// Workflow node types (internal to tools)
export const WORKFLOW_NODE_TYPES = {
  INPUT: 'input',
  API_CALL: 'apiCall',
  TRANSFORM: 'transform',
  CONDITION: 'condition',
  OUTPUT: 'output',
  CODE: 'code',
  LOOP: 'loop',
  MERGE: 'merge',
  ERROR_HANDLER: 'errorHandler',
};

// Node type metadata for the picker
export const NODE_TYPE_META = {
  [WORKFLOW_NODE_TYPES.INPUT]: {
    label: 'Input',
    description: 'Entry point - defines tool parameters',
    icon: '→',
    bgColor: 'bg-green-600',
    category: 'core',
    deletable: false,
  },
  [WORKFLOW_NODE_TYPES.API_CALL]: {
    label: 'HTTP Request',
    description: 'Make HTTP requests to external APIs',
    icon: '⚡',
    bgColor: 'bg-purple-600',
    category: 'data',
    deletable: true,
  },
  [WORKFLOW_NODE_TYPES.TRANSFORM]: {
    label: 'Transform',
    description: 'Transform and map data',
    icon: '⟲',
    bgColor: 'bg-blue-600',
    category: 'data',
    deletable: true,
  },
  [WORKFLOW_NODE_TYPES.CONDITION]: {
    label: 'Condition',
    description: 'Branch logic with if/else',
    icon: '◇',
    bgColor: 'bg-orange-500',
    category: 'flow',
    deletable: true,
  },
  [WORKFLOW_NODE_TYPES.OUTPUT]: {
    label: 'Output',
    description: 'Return value to caller',
    icon: '←',
    bgColor: 'bg-rose-600',
    category: 'core',
    deletable: false,
  },
  [WORKFLOW_NODE_TYPES.CODE]: {
    label: 'Code',
    description: 'Run custom JavaScript code',
    icon: '{ }',
    bgColor: 'bg-emerald-600',
    category: 'data',
    deletable: true,
  },
  [WORKFLOW_NODE_TYPES.LOOP]: {
    label: 'Loop',
    description: 'Iterate over array items',
    icon: '↻',
    bgColor: 'bg-teal-600',
    category: 'flow',
    deletable: true,
  },
  [WORKFLOW_NODE_TYPES.MERGE]: {
    label: 'Merge',
    description: 'Combine multiple branches',
    icon: '⊕',
    bgColor: 'bg-slate-600',
    category: 'flow',
    deletable: true,
  },
  [WORKFLOW_NODE_TYPES.ERROR_HANDLER]: {
    label: 'Error Handler',
    description: 'Try/catch wrapper for errors',
    icon: '⚠',
    bgColor: 'bg-amber-500',
    category: 'flow',
    deletable: true,
  },
};

// Node categories for picker
export const NODE_CATEGORIES = {
  core: { label: 'Core', order: 0 },
  flow: { label: 'Flow Control', order: 1 },
  data: { label: 'Data', order: 2 },
};

// Authentication types for HTTP requests
export const AUTH_TYPES = {
  NONE: 'none',
  API_KEY: 'apiKey',
  BEARER_TOKEN: 'bearerToken',
  BASIC_AUTH: 'basicAuth',
  OAUTH2: 'oauth2',
};

// Body content types for HTTP requests
export const BODY_CONTENT_TYPES = {
  JSON: 'application/json',
  FORM_DATA: 'multipart/form-data',
  FORM_URLENCODED: 'application/x-www-form-urlencoded',
  RAW: 'text/plain',
};

// Parameter types for tool inputs
export const PARAM_TYPES = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  ARRAY: 'array',
  OBJECT: 'object',
};

// Transport types for MCP servers
export const TRANSPORT_TYPES = {
  STDIO: 'stdio',
  HTTP: 'http',
};

// HTTP methods for API calls
export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

// Default node dimensions
export const NODE_DIMENSIONS = {
  width: 220,
  minHeight: 80,
};
