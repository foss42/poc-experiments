import '../../services/storage_service.dart';

// ---------------------------------------------------------------------------
// Base class for all MCP tools.
// Each tool declares its name, description, JSON Schema, and execute().
// ---------------------------------------------------------------------------

abstract class McpTool {
  /// Tool name as it appears in tools/list and tools/call.
  String get name;

  /// Human-readable description sent to the AI client.
  String get description;

  /// JSON Schema object for the tool's input (MCP inputSchema field).
  Map<String, dynamic> get inputSchema;

  /// Execute the tool and return a JSON-serialisable result.
  Future<dynamic> execute(
    Map<String, dynamic> args,
    StorageService storage,
  );
}
