import '../../services/storage_service.dart';
import 'tool.dart';

class SetEnvironmentTool extends McpTool {
  @override
  String get name => 'set_environment';

  @override
  String get description =>
      'Switch the active environment by name. '
      'All subsequent requests will use variables from this environment.';

  @override
  Map<String, dynamic> get inputSchema => {
        'type': 'object',
        'properties': {
          'name': {
            'type': 'string',
            'description': 'Environment name to activate',
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

    final envs = await storage.loadEnvironments();
    final matches = envs.where(
        (e) => e.name.toLowerCase() == name.toLowerCase() || e.id == name);

    if (matches.isEmpty) {
      throw Exception(
          'Environment not found: "$name". '
          'Available: ${envs.map((e) => e.name).join(', ')}');
    }

    final env = matches.first;
    await storage.saveActiveEnvId(env.id);

    return {'success': true, 'active': env.name};
  }
}
