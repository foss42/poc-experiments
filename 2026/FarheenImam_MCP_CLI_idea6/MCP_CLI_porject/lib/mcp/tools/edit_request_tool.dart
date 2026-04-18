import '../../services/storage_service.dart';
import 'tool.dart';

class EditRequestTool extends McpTool {
  @override
  String get name => 'edit_request';

  @override
  String get description =>
      'Edit fields of a saved request. '
      'Only the fields you provide will be updated — others stay unchanged.';

  @override
  Map<String, dynamic> get inputSchema => {
        'type': 'object',
        'properties': {
          'name': {
            'type': 'string',
            'description': 'Current name of the request to edit',
          },
          'method': {
            'type': 'string',
            'description': 'New HTTP method (GET, POST, PUT, PATCH, DELETE)',
          },
          'url': {
            'type': 'string',
            'description': 'New URL',
          },
          'headers': {
            'type': 'object',
            'description': 'Headers to add or overwrite (key-value pairs)',
            'additionalProperties': {'type': 'string'},
          },
          'body': {
            'type': 'string',
            'description': 'New request body',
          },
        },
        'required': ['name'],
      };

  @override
  Future<Map<String, dynamic>> execute(
    Map<String, dynamic> args,
    StorageService storage,
  ) async {
    final reqName = args['name'] as String? ?? '';

    final collections = await storage.loadCollections();
    bool found = false;
    Map<String, dynamic>? updated;

    outer:
    for (final col in collections) {
      for (var i = 0; i < col.requests.length; i++) {
        final req = col.requests[i];
        if (req.id != reqName &&
            req.name.toLowerCase() != reqName.toLowerCase()) {
          continue;
        }

        // Merge headers
        final newHeaders = Map<String, String>.from(req.headers);
        if (args['headers'] is Map) {
          (args['headers'] as Map).forEach((k, v) {
            newHeaders[k.toString()] = v.toString();
          });
        }

        col.requests[i] = req.copyWith(
          method: (args['method'] as String?)?.toUpperCase(),
          url: args['url'] as String?,
          headers: newHeaders,
          body: args['body'] as String?,
        );

        updated = col.requests[i].toJson();
        found = true;
        break outer;
      }
    }

    if (!found) throw Exception('Request not found: "$reqName"');

    await storage.saveCollections(collections);
    return {'success': true, 'request': updated};
  }
}
