import '../models/workflow_node.dart';
import '../models/execution_result.dart';
import '../models/diagnostic_report.dart';
import 'context_store.dart';

DiagnosticReport diagnoseFailure(
  WorkflowNode node,
  NodeExecutionResult result,
  ContextStore store,
) {
  final causes = <String>[];
  final fixes = <String>[];
  String failureType = 'status_mismatch';
  String? selfHealing;

  final code = result.statusCode;
  final bodyPreview = result.responseBody != null
      ? (result.responseBody!.length > 300
          ? '${result.responseBody!.substring(0, 300)}...'
          : result.responseBody!)
      : null;

  if (result.error != null && code == null) {
    failureType = 'network_error';
    causes.add('Network request failed: ${result.error}');
    causes.add('The target server may be unreachable');
    fixes.add('Verify the URL is correct and the server is running');
    fixes.add('Check network connectivity and DNS resolution');
  } else if (code == 401 || code == 403) {
    failureType = 'status_mismatch';
    causes.add(
      'Auth Token missing or expired. The request header references '
      '{{auth_token}} but the Context Store has no valid token.',
    );
    causes.add(
      'The Login node must execute first to populate auth_token.',
    );
    fixes.add(
      'Ensure a Login/Auth node runs before "${node.name}" '
      'and extracts the token to Context Store.',
    );
    selfHealing =
        'Insert a "Login" node before "${node.name}" to populate the '
        'Context Store with a fresh auth_token. '
        'Graph mutation: Add edge Login -> ${node.name}';
  } else if (code == 404) {
    failureType = 'status_mismatch';
    causes.add('Resource not found at the requested URL.');
    causes.add(
      'A {{variable}} in the URL may not have resolved correctly.',
    );
    final unresolvedVars = RegExp(r'\{\{(\w+)\}\}')
        .allMatches(node.url)
        .map((m) => m.group(1)!)
        .where((v) => store.get(v) == null)
        .toList();
    if (unresolvedVars.isNotEmpty) {
      causes.add(
        'Unresolved variables: ${unresolvedVars.map((v) => '{{$v}}').join(', ')}',
      );
    }
    fixes.add('Verify the preceding node extracted the required ID/slug');
    fixes.add('Check that the extraction jsonPath is correct');
  } else if (code != null && code >= 500) {
    failureType = 'status_mismatch';
    causes.add('Server returned $code — internal server error.');
    causes.add('The request payload may be malformed or the server is down.');
    fixes.add('Review the request body and headers');
    fixes.add('Check server logs for the root cause');
  } else {
    failureType = 'status_mismatch';
    causes.add(
      'Expected HTTP ${node.expectedStatus} but got $code.',
    );
    fixes.add('Review the request configuration');
  }

  return DiagnosticReport(
    nodeId: node.id,
    nodeName: node.name,
    failureType: failureType,
    expectedStatus: node.expectedStatus,
    actualStatus: code,
    responsePreview: bodyPreview,
    possibleCauses: causes,
    suggestedFixes: fixes,
    selfHealingProposal: selfHealing,
    contextAtFailure: store.getAll(),
  );
}
