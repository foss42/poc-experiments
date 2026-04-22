import 'package:directed_graph/directed_graph.dart';
import 'package:http/http.dart' as http;

import '../models/workflow.dart';
import '../models/workflow_node.dart';
import '../models/execution_result.dart';
import 'context_store.dart';
import 'node_state_machine.dart';

typedef LogCallback = void Function(String nodeId, String message);
typedef StateCallback = void Function(String nodeId, NodeStatus status);

class WorkflowEngine {
  final ContextStore contextStore;
  final http.Client _client;
  final Duration requestTimeout;
  bool simulateFailure;
  String? _lastNodeId;

  WorkflowEngine({
    required this.contextStore,
    http.Client? client,
    this.simulateFailure = false,
    this.requestTimeout = const Duration(seconds: 15),
  }) : _client = client ?? http.Client();

  List<String> getExecutionOrder(Workflow workflow) {
    final edges = <String, Set<String>>{
      for (final node in workflow.nodes)
        node.id: workflow.getDependents(node.id).toSet(),
    };
    final nodeIds = workflow.nodes.map((n) => n.id).toList();
    final graph = DirectedGraph<String>(
      edges,
      comparator: (a, b) => nodeIds.indexOf(a).compareTo(nodeIds.indexOf(b)),
    );
    final sorted = graph.topologicalOrdering();
    if (sorted == null) throw StateError('Workflow contains a cycle');
    return sorted.toList();
  }

  Future<NodeExecutionResult> executeNode(
    WorkflowNode node, {
    LogCallback? onLog,
  }) async {
    final url = contextStore.substitute(node.url);
    final headers = contextStore.substituteMap(node.headers);
    final body = node.body != null ? contextStore.substitute(node.body!) : null;

    onLog?.call(node.id, 'Executing ${node.method.label} $url');

    if (simulateFailure && node.id == _lastNodeId) {
      onLog?.call(node.id, '[SIMULATED] Forcing 401 failure');
      return NodeExecutionResult(
        nodeId: node.id,
        status: NodeStatus.failed,
        statusCode: 401,
        responseBody: '{"error": "Simulated auth failure"}',
        duration: const Duration(milliseconds: 50),
        error: 'Simulated failure for diagnostic demo',
      );
    }

    final stopwatch = Stopwatch()..start();
    try {
      final response = await _dispatch(node.method, Uri.parse(url), headers, body)
          .timeout(requestTimeout);
      stopwatch.stop();

      final extracted = contextStore.extractFromResponse(
        response.body, node.extractionRules, node.id,
      );
      for (final e in extracted.entries) {
        onLog?.call(node.id, 'Extracted {{${e.key}}} → ${e.value} → Context Store');
      }

      final passed = response.statusCode == node.expectedStatus;
      onLog?.call(node.id, '${passed ? "SUCCESS" : "FAILED"}: HTTP ${response.statusCode}');

      return NodeExecutionResult(
        nodeId: node.id,
        status: passed ? NodeStatus.success : NodeStatus.failed,
        statusCode: response.statusCode,
        responseBody: response.body,
        responseHeaders: response.headers,
        duration: stopwatch.elapsed,
        extractedVariables: extracted,
      );
    } catch (e) {
      stopwatch.stop();
      onLog?.call(node.id, 'ERROR: $e');
      return NodeExecutionResult(
        nodeId: node.id,
        status: NodeStatus.failed,
        duration: stopwatch.elapsed,
        error: e.toString(),
      );
    }
  }

  Future<WorkflowExecutionResult> executeWorkflow(
    Workflow workflow, {
    LogCallback? onLog,
    StateCallback? onStateChange,
  }) async {
    contextStore.clear();

    final machines = {
      for (final n in workflow.nodes) n.id: NodeStateMachine(n.id),
    };
    final results = <NodeExecutionResult>[];
    final skipped = <String>{};
    final timer = Stopwatch()..start();

    onLog?.call('system', 'Initializing DCG Workflow Engine...');
    onLog?.call('system', 'Graph parsed: ${workflow.nodes.length} nodes, ${workflow.edges.length} edges');

    List<String> order;
    try {
      order = getExecutionOrder(workflow);
    } catch (e) {
      timer.stop();
      onLog?.call('system', 'ERROR: $e');
      return WorkflowExecutionResult(
        workflowId: workflow.id,
        workflowName: workflow.name,
        status: 'failed',
        nodeResults: [],
        contextSnapshot: contextStore.getAll(),
        totalDuration: timer.elapsed,
      );
    }

    _lastNodeId = order.isNotEmpty ? order.last : null;

    for (final nodeId in order) {
      final node = workflow.getNode(nodeId);
      if (node == null) continue;

      if (skipped.contains(nodeId)) {
        machines[nodeId]!.skip();
        onStateChange?.call(nodeId, NodeStatus.skipped);
        onLog?.call(nodeId, 'SKIPPED (dependency failed)');
        results.add(NodeExecutionResult(nodeId: nodeId, status: NodeStatus.skipped));
        continue;
      }

      machines[nodeId]!.start();
      onStateChange?.call(nodeId, NodeStatus.running);
      await Future.delayed(const Duration(milliseconds: 100));

      final result = await executeNode(node, onLog: onLog);
      results.add(result);

      if (result.status == NodeStatus.success) {
        machines[nodeId]!.succeed();
        onStateChange?.call(nodeId, NodeStatus.success);
      } else {
        machines[nodeId]!.fail();
        onStateChange?.call(nodeId, NodeStatus.failed);
        _cascadeSkip(workflow, nodeId, skipped);
      }
    }

    timer.stop();
    final status = _resolveStatus(results);
    onLog?.call('system', 'Workflow execution completed: $status');

    return WorkflowExecutionResult(
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: status,
      nodeResults: results,
      contextSnapshot: contextStore.getAll(),
      totalDuration: timer.elapsed,
    );
  }

  Future<http.Response> _dispatch(
    HTTPMethod method, Uri uri, Map<String, String> headers, String? body,
  ) {
    switch (method) {
      case HTTPMethod.post:
        return _client.post(uri, headers: headers, body: body);
      case HTTPMethod.put:
        return _client.put(uri, headers: headers, body: body);
      case HTTPMethod.patch:
        return _client.patch(uri, headers: headers, body: body);
      case HTTPMethod.delete:
        return _client.delete(uri, headers: headers);
      case HTTPMethod.get:
        return _client.get(uri, headers: headers);
    }
  }

  void _cascadeSkip(Workflow workflow, String failedId, Set<String> skipped) {
    for (final dep in workflow.getDependents(failedId)) {
      if (skipped.add(dep)) _cascadeSkip(workflow, dep, skipped);
    }
  }

  String _resolveStatus(List<NodeExecutionResult> results) {
    final hasFail = results.any((r) => r.status == NodeStatus.failed);
    final hasPass = results.any((r) => r.status == NodeStatus.success);
    if (!hasFail) return 'success';
    return hasPass ? 'partial' : 'failed';
  }
}
