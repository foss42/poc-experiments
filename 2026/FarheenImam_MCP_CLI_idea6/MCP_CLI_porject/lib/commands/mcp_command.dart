import '../mcp/server.dart';
import '../services/storage_service.dart';

// ---------------------------------------------------------------------------
// mcp serve / mcp — thin entry point.
// All logic lives in lib/mcp/server.dart and lib/mcp/tools/.
// Never calls exit() — the server runs until SIGINT/SIGTERM.
// ---------------------------------------------------------------------------

Future<void> mcpCommand(List<String> args) async {
  final storage = StorageService();
  await storage.init();
  await McpServer(storage).serve();
}
