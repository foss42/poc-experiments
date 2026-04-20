enum NodeStatus { pending, running, success, failed, skipped }

class NodeExecutionResult {
  final String nodeId;
  final NodeStatus status;
  final int? statusCode;
  final String? responseBody;
  final Map<String, String>? responseHeaders;
  final Duration? duration;
  final String? error;
  final Map<String, String> extractedVariables;

  const NodeExecutionResult({
    required this.nodeId,
    required this.status,
    this.statusCode,
    this.responseBody,
    this.responseHeaders,
    this.duration,
    this.error,
    this.extractedVariables = const {},
  });
}

class WorkflowExecutionResult {
  final String workflowId;
  final String workflowName;
  final String status;
  final List<NodeExecutionResult> nodeResults;
  final Map<String, String> contextSnapshot;
  final Duration totalDuration;

  const WorkflowExecutionResult({
    required this.workflowId,
    required this.workflowName,
    required this.status,
    required this.nodeResults,
    required this.contextSnapshot,
    required this.totalDuration,
  });
}
