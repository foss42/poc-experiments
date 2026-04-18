import 'package:flutter_test/flutter_test.dart';
import 'package:agentic_api_testing/core/engine/diagnostics.dart';
import 'package:agentic_api_testing/core/engine/context_store.dart';
import 'package:agentic_api_testing/core/models/workflow_node.dart';
import 'package:agentic_api_testing/core/models/execution_result.dart';

void main() {
  late ContextStore store;

  setUp(() {
    store = ContextStore();
  });

  test('diagnoses 401 as auth failure with self-healing', () {
    final node = WorkflowNode(
      id: 'n1',
      name: 'Fetch Profile',
      method: HTTPMethod.get,
      url: 'https://api.com/profile',
    );
    final result = NodeExecutionResult(
      nodeId: 'n1',
      status: NodeStatus.failed,
      statusCode: 401,
    );
    final report = diagnoseFailure(node, result, store);
    expect(report.failureType, 'status_mismatch');
    expect(report.selfHealingProposal, isNotNull);
    expect(report.possibleCauses.any((c) => c.contains('Auth Token')), true);
  });

  test('diagnoses 404 with unresolved variables', () {
    final node = WorkflowNode(
      id: 'n2',
      name: 'Get Item',
      method: HTTPMethod.get,
      url: 'https://api.com/items/{{item_id}}',
    );
    final result = NodeExecutionResult(
      nodeId: 'n2',
      status: NodeStatus.failed,
      statusCode: 404,
    );
    final report = diagnoseFailure(node, result, store);
    expect(report.possibleCauses.any((c) => c.contains('item_id')), true);
  });

  test('diagnoses network error', () {
    final node = WorkflowNode(
      id: 'n3',
      name: 'Call API',
      method: HTTPMethod.get,
      url: 'https://unreachable.local',
    );
    final result = NodeExecutionResult(
      nodeId: 'n3',
      status: NodeStatus.failed,
      error: 'SocketException: Connection refused',
    );
    final report = diagnoseFailure(node, result, store);
    expect(report.failureType, 'network_error');
  });
}
