import '../../services/storage_service.dart';
import '../mcp_http.dart';
import 'tool.dart';

class RunCollectionTool extends McpTool {
  @override
  String get name => 'run_collection';

  @override
  String get description =>
      'Run all requests in a collection in order. '
      'Applies active environment variables to each request. '
      'Returns per-request results and an overall summary.';

  @override
  Map<String, dynamic> get inputSchema => {
        'type': 'object',
        'properties': {
          'collection': {
            'type': 'string',
            'description': 'Collection name to run',
          },
        },
        'required': ['collection'],
      };

  @override
  Future<Map<String, dynamic>> execute(
    Map<String, dynamic> args,
    StorageService storage,
  ) async {
    final colName = args['collection'] as String? ?? '';

    final collections = await storage.loadCollections();
    final matches = collections.where((c) =>
        c.name.toLowerCase() == colName.toLowerCase() || c.id == colName);

    if (matches.isEmpty) {
      throw Exception('Collection not found: "$colName"');
    }

    final col = matches.first;
    if (col.requests.isEmpty) {
      return {
        'results': [],
        'summary': {'total': 0, 'passed': 0, 'failed': 0},
      };
    }

    final activeEnv = await storage.loadActiveEnvironment();
    final envVars = activeEnv?.variables ?? {};
    final mcpHttp = McpHttp(storage);

    final results = <Map<String, dynamic>>[];
    int passed = 0;
    int failed = 0;

    for (final req in col.requests) {
      try {
        final result = await mcpHttp.fire(
          req,
          envVars: envVars,
          saveHistory: true,
        );
        final ok = result.statusCode >= 200 && result.statusCode < 400;
        if (ok) passed++; else failed++;
        results.add({
          'name': req.name,
          'status': result.statusCode,
          'statusText': result.statusText,
          'passed': ok,
          'durationMs': result.durationMs,
        });
      } catch (e) {
        failed++;
        results.add({
          'name': req.name,
          'status': 0,
          'statusText': 'Error',
          'passed': false,
          'durationMs': 0,
          'error': e.toString(),
        });
      }
    }

    return {
      'results': results,
      'summary': {
        'total': col.requests.length,
        'passed': passed,
        'failed': failed,
      },
    };
  }
}
