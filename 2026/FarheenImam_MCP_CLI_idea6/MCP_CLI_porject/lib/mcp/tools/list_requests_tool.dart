import '../../services/storage_service.dart';
import 'tool.dart';

class ListRequestsTool extends McpTool {
  @override
  String get name => 'list_requests';

  @override
  String get description =>
      'List all API requests saved in APIDash CLI (~/.apidash_cli/collections.json). '
      'Use this when the user asks to see their saved requests, endpoints, or APIs. '
      'Optionally filter by collection name.';

  @override
  Map<String, dynamic> get inputSchema => {
        'type': 'object',
        'properties': {
          'collection': {
            'type': 'string',
            'description': 'Filter by collection name (optional)',
          },
        },
      };

  @override
  Future<List<Map<String, dynamic>>> execute(
    Map<String, dynamic> args,
    StorageService storage,
  ) async {
    final filterCol = args['collection'] as String?;
    final collections = await storage.loadCollections();

    final results = <Map<String, dynamic>>[];

    for (final col in collections) {
      if (filterCol != null &&
          col.name.toLowerCase() != filterCol.toLowerCase() &&
          col.id != filterCol) {
        continue;
      }
      for (final req in col.requests) {
        results.add({
          'name': req.name,
          'method': req.method,
          'url': req.url,
          'collection': col.name,
        });
      }
    }

    return results;
  }
}
