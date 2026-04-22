import '../../services/storage_service.dart';
import '../mcp_http.dart';
import 'tool.dart';

class RunRequestTool extends McpTool {
  @override
  String get name => 'run_request';

  @override
  String get description =>
      'Run a saved API request by name. '
      'Applies the active environment variables and appends the result to history.';

  @override
  Map<String, dynamic> get inputSchema => {
        'type': 'object',
        'properties': {
          'name': {
            'type': 'string',
            'description': 'Exact name of the saved request (case-insensitive)',
          },
        },
        'required': ['name'],
      };

  @override
  Future<Map<String, dynamic>> execute(
    Map<String, dynamic> args,
    StorageService storage,
  ) async {
    final name = args['name'] as String? ?? '';

    final found = await storage.findRequest(name);
    if (found == null) {
      throw Exception('Request not found: "$name"');
    }

    final (_, req) = found;
    final activeEnv = await storage.loadActiveEnvironment();
    final envVars = activeEnv?.variables ?? {};

    final result = await McpHttp(storage).fire(
      req,
      envVars: envVars,
      saveHistory: true,
    );

    return result.toJson();
  }
}
