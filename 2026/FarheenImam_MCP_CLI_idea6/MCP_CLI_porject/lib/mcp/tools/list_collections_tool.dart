import '../../services/storage_service.dart';
import 'tool.dart';

class ListCollectionsTool extends McpTool {
  @override
  String get name => 'list_collections';

  @override
  String get description =>
      'List all API collections saved in APIDash CLI (~/.apidash_cli/collections.json). '
      'Use this when the user asks about their saved collections, API groups, or wants to know what APIs are saved.';

  @override
  Map<String, dynamic> get inputSchema => {
        'type': 'object',
        'properties': {},
      };

  @override
  Future<List<Map<String, dynamic>>> execute(
    Map<String, dynamic> args,
    StorageService storage,
  ) async {
    final collections = await storage.loadCollections();
    return collections
        .map((c) => {
              'name': c.name,
              'requestCount': c.requests.length,
              if (c.description != null) 'description': c.description,
            })
        .toList();
  }
}
