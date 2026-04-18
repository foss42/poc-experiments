import 'package:apidash_mcp/server/apidash_mcp_server.dart';
import 'package:mcp_dart/mcp_dart.dart';
import 'package:apidash_cli/services/hive_cli_services.dart';
import 'dart:io';

void main(List<String> args) async {
  final server = createApiDashMcpServer();

  // Initialize workspace if it exists in current directory or use default
  final defaultWorkspace = '.apidash';
  if (Directory(defaultWorkspace).existsSync()) {
    try {
      await hiveHandler.initWorkspaceStore(defaultWorkspace);
    } catch (e) {
      // Ignore initialization errors at startup
    }
  }

  server.connect(StdioServerTransport());
}
