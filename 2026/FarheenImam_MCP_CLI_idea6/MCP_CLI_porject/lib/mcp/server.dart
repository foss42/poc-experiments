import 'dart:convert';
import 'dart:io';
import '../services/storage_service.dart';
import 'tools/edit_request_tool.dart';
import 'tools/get_environment_tool.dart';
import 'tools/get_history_tool.dart';
import 'tools/list_collections_tool.dart';
import 'tools/list_requests_tool.dart';
import 'tools/run_collection_tool.dart';
import 'tools/run_request_tool.dart';
import 'tools/set_environment_tool.dart';
import 'tools/set_variable_tool.dart';
import 'tools/tool.dart';

// ---------------------------------------------------------------------------
// McpServer — stdio JSON-RPC 2.0 MCP server.
//
// Transport: one JSON object per line on stdin/stdout.
// stdout is ONLY used for JSON-RPC frames.
// All diagnostic output goes to stderr.
//
// Runs until SIGINT/SIGTERM — never calls exit() on its own.
// ---------------------------------------------------------------------------

class McpServer {
  final StorageService _storage;

  late final List<McpTool> _tools;
  late final Map<String, McpTool> _toolMap;

  McpServer(this._storage) {
    _tools = [
      RunRequestTool(),
      ListRequestsTool(),
      RunCollectionTool(),
      ListCollectionsTool(),
      GetHistoryTool(),
      SetEnvironmentTool(),
      GetEnvironmentTool(),
      SetVariableTool(),
      EditRequestTool(),
    ];
    _toolMap = {for (final t in _tools) t.name: t};
  }

  // ---- public entry --------------------------------------------------------

  Future<void> serve() async {
    await _storage.init();

    stderr.writeln('[apidash mcp] Server ready on stdio (JSON-RPC 2.0)');
    stderr.writeln('[apidash mcp] ${_tools.length} tools registered: '
        '${_tools.map((t) => t.name).join(', ')}');

    // Register graceful shutdown
    ProcessSignal.sigint.watch().listen((_) {
      stderr.writeln('[apidash mcp] Shutting down (SIGINT)');
      exit(0);
    });

    // Read stdin line-by-line — each line is one JSON-RPC frame
    await stdin
        .transform(utf8.decoder)
        .transform(const LineSplitter())
        .forEach(_handleLine);
  }

  // ---- frame handler -------------------------------------------------------

  Future<void> _handleLine(String line) async {
    if (line.trim().isEmpty) return;

    Map<String, dynamic> frame;
    try {
      frame = jsonDecode(line) as Map<String, dynamic>;
    } catch (_) {
      _sendError(null, -32700, 'Parse error: not valid JSON');
      return;
    }

    final id = frame['id']; // null for notifications
    final method = frame['method'] as String?;
    final params = (frame['params'] as Map<String, dynamic>?) ?? {};

    if (method == null) {
      _sendError(id, -32600, 'Invalid request: missing "method"');
      return;
    }

    // Notifications have no id — process but don't respond
    final isNotification = !frame.containsKey('id');

    try {
      await _dispatch(id, method, params, isNotification);
    } catch (e, st) {
      stderr.writeln('[apidash mcp] Error handling $method: $e\n$st');
      if (!isNotification) {
        _sendError(id, -32603, 'Internal error: $e');
      }
    }
  }

  // ---- dispatcher ----------------------------------------------------------

  Future<void> _dispatch(
    dynamic id,
    String method,
    Map<String, dynamic> params,
    bool isNotification,
  ) async {
    switch (method) {
      // ── MCP lifecycle ────────────────────────────────────────────────────
      case 'initialize':
        _send(id, {
          'protocolVersion': '2024-11-05',
          'capabilities': {'tools': {}},
          'serverInfo': {'name': 'apidash', 'version': '0.1.0'},
          'instructions':
              'You are connected to APIDash CLI — a local API client tool. '
              'ALL data about saved API requests, collections, environments, and history '
              'is stored by APIDash CLI in ~/.apidash_cli/ as JSON files. '
              'NEVER search the file system for this data. '
              'ALWAYS use the provided tools (run_request, list_requests, list_collections, '
              'get_history, get_environment, set_environment, set_variable, '
              'run_collection, edit_request) to read or write APIDash data. '
              'When the user asks about their API requests, collections, history, or '
              'environments — use these tools immediately without asking for clarification.',
        });

      case 'notifications/initialized':
        // Notification — no response needed
        stderr.writeln('[apidash mcp] Client initialised');

      // ── Tool discovery ───────────────────────────────────────────────────
      case 'tools/list':
        _send(id, {
          'tools': _tools
              .map((t) => {
                    'name': t.name,
                    'description': t.description,
                    'inputSchema': t.inputSchema,
                  })
              .toList(),
        });

      // ── Tool call ────────────────────────────────────────────────────────
      case 'tools/call':
        final toolName = params['name'] as String?;
        final toolArgs =
            (params['arguments'] as Map<String, dynamic>?) ?? {};

        if (toolName == null) {
          _sendError(id, -32602, 'Invalid params: missing tool "name"');
          return;
        }

        final tool = _toolMap[toolName];
        if (tool == null) {
          _sendError(id, -32601, 'Tool not found: "$toolName"');
          return;
        }

        stderr.writeln('[apidash mcp] Calling tool: $toolName');
        final result = await tool.execute(toolArgs, _storage);

        _send(id, {
          'content': [
            {
              'type': 'text',
              'text': _toText(result),
            }
          ],
        });

      // ── Unknown method ───────────────────────────────────────────────────
      default:
        if (!isNotification) {
          _sendError(id, -32601, 'Method not found: "$method"');
        }
    }
  }

  // ---- JSON-RPC helpers ----------------------------------------------------

  void _send(dynamic id, Map<String, dynamic> result) {
    stdout.writeln(jsonEncode({
      'jsonrpc': '2.0',
      'id': id,
      'result': result,
    }));
  }

  void _sendError(dynamic id, int code, String message) {
    stdout.writeln(jsonEncode({
      'jsonrpc': '2.0',
      'id': id,
      'error': {'code': code, 'message': message},
    }));
  }

  /// Convert a tool result to a text string for the MCP content block.
  /// Objects/lists are pretty-printed as JSON; strings passed through.
  String _toText(dynamic result) {
    if (result is String) return result;
    return const JsonEncoder.withIndent('  ').convert(result);
  }
}
