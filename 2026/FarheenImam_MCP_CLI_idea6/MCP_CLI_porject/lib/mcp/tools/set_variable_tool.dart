import '../../models/models.dart';
import '../../services/storage_service.dart';
import 'tool.dart';

class SetVariableTool extends McpTool {
  @override
  String get name => 'set_variable';

  @override
  String get description =>
      'Set or update a variable in a named environment. '
      'Creates the environment if it does not exist.';

  @override
  Map<String, dynamic> get inputSchema => {
        'type': 'object',
        'properties': {
          'env': {
            'type': 'string',
            'description': 'Environment name to update',
          },
          'key': {
            'type': 'string',
            'description': 'Variable name',
          },
          'value': {
            'type': 'string',
            'description': 'Variable value',
          },
        },
        'required': ['env', 'key', 'value'],
      };

  @override
  Future<Map<String, dynamic>> execute(
    Map<String, dynamic> args,
    StorageService storage,
  ) async {
    final envName = args['env'] as String? ?? '';
    final key = args['key'] as String? ?? '';
    final value = args['value'] as String? ?? '';

    if (key.isEmpty) throw Exception('key must not be empty');

    final envs = await storage.loadEnvironments();
    final idx = envs.indexWhere(
        (e) => e.name.toLowerCase() == envName.toLowerCase() || e.id == envName);

    if (idx >= 0) {
      envs[idx].variables[key] = value;
    } else {
      // Create new environment
      final newEnv = ApiEnvironment.create(name: envName);
      newEnv.variables[key] = value;
      envs.add(newEnv);
    }

    await storage.saveEnvironments(envs);

    return {'success': true, 'env': envName, 'key': key, 'value': value};
  }
}
