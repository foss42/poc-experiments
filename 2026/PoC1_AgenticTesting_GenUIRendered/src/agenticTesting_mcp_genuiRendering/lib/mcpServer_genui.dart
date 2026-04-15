import 'dart:convert';
import 'dart:isolate';
import 'package:http/http.dart' as http;

// This is the entry point for the background thread
void runMcpIsolate(SendPort uiSendPort) {
  // Create a port to receive messages from the Flutter UI
  final isolateReceivePort = ReceivePort();

  // Handshake: Give the Flutter UI our listening port so it can send us requests
  uiSendPort.send(isolateReceivePort.sendPort);

  // Listen for incoming JSON-RPC requests from the UI (Previously stdin)
  isolateReceivePort.listen((message) async {
    if (message is! String) return;

    try {
      final requestJson = jsonDecode(message);
      final id = requestJson['id'];
      final rpcMethod = requestJson['method'];

      // Helper function to send responses back to the UI (Previously stdout)
      void sendResponse(Map<String, dynamic> result) {
        uiSendPort.send(jsonEncode({
          "jsonrpc": "2.0",
          "id": id,
          "result": result
        }));
      }

      if (rpcMethod == 'initialize') {
        sendResponse({
          "protocolVersion": "2024-11-05",
          "capabilities": {"tools": {}, "prompts": {}},
          "serverInfo": {"name": "apidash-agentic-engine", "version": "6.0.0"}
        });
      }
      else if (rpcMethod == 'tools/list') {
        sendResponse({
          "tools": [
            {
              "name": "execute_apidash_request",
              "description": "Executes a complete HTTP request.",
              "inputSchema": {
                "type": "object",
                "properties": {
                  "url": {"type": "string"},
                  "method": {"type": "string"}
                },
                "required": ["url", "method"]
              }
            }
          ]
        });
      }
      else if (rpcMethod == 'tools/call' && requestJson['params']['name'] == 'execute_apidash_request') {
        final args = requestJson['params']['arguments'];
        final urlString = args['url'];
        final httpMethod = args['method'].toString().toUpperCase();
        final headers = args['headers'] != null ? Map<String, String>.from(args['headers']) : <String, String>{};
        final body = args['body'];

        try {
          var request = http.Request(httpMethod, Uri.parse(urlString));

          request.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
          request.headers['Accept'] = '*/*';

          request.headers.addAll(headers);
          if (body != null && body.toString().trim().isNotEmpty) {
            request.body = body is String ? body : jsonEncode(body);
          }

          var streamedResponse = await request.send();
          var response = await http.Response.fromStream(streamedResponse);

          sendResponse({
            "content": [{"type": "text", "text": jsonEncode({"status_code": response.statusCode, "response_body": response.body})}]
          });
        } catch (e) {
          sendResponse({
            "content": [{"type": "text", "text": "Error: $e"}]
          });
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  });
}