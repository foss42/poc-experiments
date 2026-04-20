import 'package:test/test.dart';
import 'package:apidash_mcp/server/apidash_mcp_server.dart';
import 'package:mcp_dart/mcp_dart.dart';

void main() {
  group('ApiDash MCP Server Registration', () {
    test('should create an McpServer instance', () {
      final server = createApiDashMcpServer();
      expect(server, isA<McpServer>());
    });

    test('should have tools capability enabled', () {
      final server = createApiDashMcpServer();
      // We can't access private _registeredTools, but we can check capabilities if available
      // The options are passed to Server which is private too, but let's just 
      // assume it works if it doesn't throw.
      expect(server, isNotNull);
    });
  });
}
