import '../../services/storage_service.dart';
import 'tool.dart';

class GetHistoryTool extends McpTool {
  @override
  String get name => 'get_history';

  @override
  String get description =>
      'Get recent API request history from APIDash CLI (~/.apidash_cli/history.json). '
      'Use this when the user asks about past requests, request history, or what APIs were called recently. '
      'Returns the last N entries with method, URL, status, and timestamp.';

  @override
  Map<String, dynamic> get inputSchema => {
        'type': 'object',
        'properties': {
          'limit': {
            'type': 'integer',
            'description': 'Number of entries to return (default 20, max 100)',
            'default': 20,
          },
        },
      };

  @override
  Future<List<Map<String, dynamic>>> execute(
    Map<String, dynamic> args,
    StorageService storage,
  ) async {
    final limit = (args['limit'] as num?)?.toInt() ?? 20;
    final capped = limit.clamp(1, 100);

    final history = await storage.loadHistory();
    final recent = history.reversed.take(capped).toList();

    return recent
        .map((h) => {
              'id': h.id.substring(0, 8),
              'name': h.savedAs ?? '(unnamed)',
              'method': h.request.method,
              'url': h.request.url,
              'status': h.response.statusCode,
              'statusText': h.response.statusMessage,
              'durationMs': h.response.durationMs,
              'timestamp': h.timestamp.toIso8601String(),
            })
        .toList();
  }
}
