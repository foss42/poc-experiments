import 'dart:convert';
import 'dart:isolate';
import 'package:http/http.dart' as http;

void runMcpIsolate(SendPort uiSendPort) {
  final isolateReceivePort = ReceivePort();
  uiSendPort.send(isolateReceivePort.sendPort);

  isolateReceivePort.listen((message) async {
    if (message is! String) return;
    try {
      final requestJson = jsonDecode(message);
      final id = requestJson['id'];
      final rpcMethod = requestJson['method'];

      void sendResponse(Map<String, dynamic> result) {
        uiSendPort.send(jsonEncode({"jsonrpc": "2.0", "id": id, "result": result}));
      }

      void sendError(String errorMessage) {
        uiSendPort.send(jsonEncode({"jsonrpc": "2.0", "id": id, "error": errorMessage}));
      }

      if (rpcMethod == 'initialize') {
        sendResponse({
          "protocolVersion": "2024-11-05",
          "capabilities": {"tools": {}, "prompts": {}},
          "serverInfo": {"name": "apidash-agentic-engine", "version": "6.0.0"}
        });
      }
      else if (rpcMethod == 'prompts/list') {
        sendResponse({
          "prompts": [
            {
              "name": "run_agentic_tests",
              "description": "Runs the full end-to-end autonomous API testing workflow.",
              "arguments": [{"name": "api_spec_url", "description": "The URL of the real OpenAPI JSON file to test.", "required": true}]
            }
          ]
        });
      }
      else if (rpcMethod == 'prompts/get' && requestJson['params']['name'] == 'run_agentic_tests') {
        final specUrl = requestJson['params']['arguments']['api_spec_url'];

        // FIXED PROMPT: Now asks for Markdown, no longer asks for the render_test_report tool
        final promptText = """
You are the API Dash Autonomous Testing Agent. Spec: $specUrl

Step 1: Understand & Strategize
Use the `read_openapi_spec` tool to analyze the API.

Step 2: Execute a Multi-Step Chained Workflow
Execute a multi-step workflow end-to-end using the `execute_apidash_request` tool. Extract dynamic IDs from responses to pass to the next request.

Step 3: Adapt & Self-Heal
If you encounter unexpected errors, analyze the response, adapt your payload/headers, and retry the request to self-heal.

Step 4: Comprehensive Test Report
Once all steps are complete, output a beautifully formatted Markdown report detailing the workflow. Include the total tests run, passed/failed counts, and a step-by-step table of executions with endpoints and status codes. Do NOT call any tools to render this report, just output the raw Markdown text directly.
""";
        sendResponse({
          "description": "Agentic Testing Workflow",
          "messages": [{"role": "user", "content": {"type": "text", "text": promptText}}]
        });
      }
      else if (rpcMethod == 'tools/list') {
        sendResponse({
          "tools": [
            {
              "name": "read_openapi_spec",
              "description": "Fetches a real OpenAPI JSON specification from a URL.",
              "inputSchema": {
                "type": "object",
                "properties": {"url": {"type": "string"}},
                "required": ["url"]
              }
            },
            {
              "name": "execute_apidash_request",
              "description": "Executes a complete HTTP request.",
              "inputSchema": {
                "type": "object",
                "properties": {
                  "url": {"type": "string"},
                  "method": {"type": "string"},
                  "headers": {"type": "object", "additionalProperties": {"type": "string"}},
                  "body": {"type": "string"}
                },
                "required": ["url", "method"]
              }
            }
          ]
        });
      }
      else if (rpcMethod == 'tools/call') {
        final params = requestJson['params'];
        final args = params['arguments'];
        final toolName = params['name'];

        if (toolName == 'read_openapi_spec') {
          try {
            final response = await http.get(Uri.parse(args['url']));
            sendResponse({"content": [{"type": "text", "text": response.body}]});
          } catch (e) {
            sendResponse({"content": [{"type": "text", "text": "Error fetching spec: $e"}]});
          }
        }
        else if (toolName == 'execute_apidash_request') {
          final urlString = args['url'];
          final httpMethod = args['method'].toString().toUpperCase();
          final headers = args['headers'] != null ? Map<String, String>.from(args['headers']) : <String, String>{};
          final body = args['body'];

          var httpRequest = http.Request(httpMethod, Uri.parse(urlString));
          httpRequest.headers.addAll(headers);
          if (body != null) httpRequest.body = body is String ? body : jsonEncode(body);

          try {
            var streamedResponse = await httpRequest.send();
            var response = await http.Response.fromStream(streamedResponse);
            final resultReport = {"status_code": response.statusCode, "response_body": response.body};

            sendResponse({"content": [{"type": "text", "text": jsonEncode(resultReport)}]});
          } catch (e) {
            sendResponse({"content": [{"type": "text", "text": "Error: $e"}]});
          }
        } else {
          // SAFETY NET: Send error back if tool doesn't exist
          sendError("Tool '$toolName' is not recognized or implemented on this server.");
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  });
}