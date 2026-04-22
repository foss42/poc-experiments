import '../../services/storage_service.dart';
import 'tool.dart';

class GetEnvironmentTool extends McpTool {
  @override
  String get name => 'get_environment';

  @override
  String get description =>
      'Get the currently active APIDash environment and all its variables from ~/.apidash_cli/environments.json. '
      'Use this when the user asks about their active environment, API keys, base URLs, or environment variables.';

  @override
  Map<String, dynamic> get inputSchema => {
        'type': 'object',
        'properties': {},
      };

  @override
  Future<Map<String, dynamic>> execute(
    Map<String, dynamic> args,
    StorageService storage,
  ) async {
    final env = await storage.loadActiveEnvironment();

    if (env == null) {
      return {
        'active': null,
        'variables': {},
        'message': 'No active environment set.',
      };
    }

    return {
      'active': env.name,
      'variables': env.variables,
    };
  }
}
