class MCPToolDefinition {
  final String name;
  final String description;
  final List<String> visibility;

  const MCPToolDefinition({
    required this.name,
    required this.description,
    required this.visibility,
  });
}

class MCPAppResource {
  final String uri;
  final String description;

  const MCPAppResource({required this.uri, required this.description});
}

final mcpTools = [
  MCPToolDefinition(
    name: 'run_api_request',
    description: 'Execute a request via API Dash networking',
    visibility: ['model', 'app'],
  ),
  MCPToolDefinition(
    name: 'execute_workflow',
    description: 'Run a full DCG workflow graph',
    visibility: ['model', 'app'],
  ),
  MCPToolDefinition(
    name: 'generate_workflow_graph',
    description: 'Generate DCG from OpenAPI spec',
    visibility: ['model', 'app'],
  ),
  MCPToolDefinition(
    name: 'list_workspaces',
    description: 'Query developer API collections',
    visibility: ['model', 'app'],
  ),
  MCPToolDefinition(
    name: 'get_request_history',
    description: 'Access past request/response pairs',
    visibility: ['model', 'app'],
  ),
];

final mcpAppResources = [
  MCPAppResource(
    uri: 'ui://apidash/workflow-graph',
    description: 'Interactive DCG visualization in chat',
  ),
  MCPAppResource(
    uri: 'ui://apidash/request-builder',
    description: 'Mini API Dash request editor',
  ),
  MCPAppResource(
    uri: 'ui://apidash/update-model-context',
    description: 'Push response data to AI context',
  ),
  MCPAppResource(
    uri: 'ui://apidash/execution-timeline',
    description: 'Visual multi-step execution trace',
  ),
];
