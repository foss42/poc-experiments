import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

void main() {
  stdin.transform(utf8.decoder).transform(const LineSplitter()).listen((
    line,
  ) async {
    try {
      final requestJson = jsonDecode(line);
      final id = requestJson['id'];
      final rpcMethod = requestJson['method'];

      // 1. HANDSHAKE (Now includes 'prompts' capability)
      if (rpcMethod == 'initialize') {
        stdout.writeln(
          jsonEncode({
            "jsonrpc": "2.0",
            "id": id,
            "result": {
              "protocolVersion": "2024-11-05",
              "capabilities": {"tools": {}, "prompts": {}},
              "serverInfo": {
                "name": "apidash-agentic-engine",
                "version": "6.0.0",
              },
            },
          }),
        );
      }
      // 2. EXPOSE PROMPTS
      else if (rpcMethod == 'prompts/list') {
        stdout.writeln(
          jsonEncode({
            "jsonrpc": "2.0",
            "id": id,
            "result": {
              "prompts": [
                {
                  "name": "run_agentic_tests",
                  "description":
                      "Runs the full end-to-end autonomous API testing workflow.",
                  "arguments": [
                    {
                      "name": "api_spec_url",
                      "description":
                          "The URL of the real OpenAPI JSON file to test.",
                      "required": true,
                    },
                  ],
                },
              ],
            },
          }),
        );
      }
      // 3. RETURN THE PROMPT TEXT
      else if (rpcMethod == 'prompts/get' &&
          requestJson['params']['name'] == 'run_agentic_tests') {
        final specUrl = requestJson['params']['arguments']['api_spec_url'];

        final promptText =
            """
You are the API Dash Autonomous Testing Agent. I want you to perform an advanced, end-to-end Agentic API testing workflow based on the following specification: $specUrl

Step 1: Understand & Strategize
Use the `read_openapi_spec` tool to fetch and analyze the API documentation. Do not just look at individual endpoints; understand the relationships and contracts. Autonomously design a test strategy covering functional correctness, edge cases, and error handling.

Step 2: Execute a Multi-Step Chained Workflow
Do not execute isolated tests. Execute a multi-step API workflow end-to-end using the `execute_apidash_request` tool. You must maintain context across calls. For example: Create a resource -> Extract its dynamic ID or token from the response -> Use that dynamic data to update or fetch the resource -> Delete the resource. 

Step 3: Adapt & Self-Heal
If you encounter an expected failure (like deliberately testing an edge case) or an unexpected API error (e.g., 400 Bad Request, 401 Unauthorized), analyze the intermediate response. Autonomously adapt your test path by updating schemas, parameters, or headers, and retry the request to "self-heal" the test without manual intervention.

Step 4: Comprehensive Test Report
Print out a final Test Coverage Report detailing:
- The multi-step workflow executed (and how state was passed between calls).
- The edge cases and error handling scenarios tested.
- Any self-healing actions you took to fix failed requests.
- Final pass/fail outcomes.
""";

        stdout.writeln(
          jsonEncode({
            "jsonrpc": "2.0",
            "id": id,
            "result": {
              "description": "Agentic Testing Workflow",
              "messages": [
                {
                  "role": "user",
                  "content": {"type": "text", "text": promptText},
                },
              ],
            },
          }),
        );
      }
      // 4. EXPOSE TOOLS (Upgraded read_openapi_spec to take a URL)
      else if (rpcMethod == 'tools/list') {
        stdout.writeln(
          jsonEncode({
            "jsonrpc": "2.0",
            "id": id,
            "result": {
              "tools": [
                {
                  "name": "read_openapi_spec",
                  "description":
                      "Fetches a real OpenAPI JSON specification from a URL.",
                  "inputSchema": {
                    "type": "object",
                    "properties": {
                      "url": {"type": "string"},
                    },
                    "required": ["url"],
                  },
                },
                {
                  "name": "execute_apidash_request",
                  "description": "Executes a complete HTTP request.",
                  "inputSchema": {
                    "type": "object",
                    "properties": {
                      "url": {"type": "string"},
                      "method": {"type": "string"},
                      "headers": {
                        "type": "object",
                        "additionalProperties": {"type": "string"},
                      },
                      "body": {"type": "string"},
                    },
                    "required": ["url", "method"],
                  },
                },
              ],
            },
          }),
        );
      }
      // 5. EXECUTE TOOLS
      else if (rpcMethod == 'tools/call' &&
          requestJson['params']['name'] == 'read_openapi_spec') {
        final url = requestJson['params']['arguments']['url'];
        try {
          final response = await http.get(Uri.parse(url));
          stdout.writeln(
            jsonEncode({
              "jsonrpc": "2.0",
              "id": id,
              "result": {
                "content": [
                  {"type": "text", "text": response.body},
                ],
              },
            }),
          );
        } catch (e) {
          stdout.writeln(
            jsonEncode({
              "jsonrpc": "2.0",
              "id": id,
              "result": {
                "content": [
                  {"type": "text", "text": "Error fetching spec: $e"},
                ],
              },
            }),
          );
        }
      } else if (rpcMethod == 'tools/call' &&
          requestJson['params']['name'] == 'execute_apidash_request') {
        // [Same execution code as the previous step goes here]
        final args = requestJson['params']['arguments'];
        final urlString = args['url'];
        final httpMethod = args['method'].toString().toUpperCase();
        final headers = args['headers'] != null
            ? Map<String, String>.from(args['headers'])
            : <String, String>{};
        final body = args['body'];

        var uri = Uri.parse(urlString);
        var httpRequest = http.Request(httpMethod, uri);
        httpRequest.headers.addAll(headers);
        if (body != null) httpRequest.body = body;

        try {
          var streamedResponse = await httpRequest.send();
          var response = await http.Response.fromStream(streamedResponse);
          final resultReport = {
            "status_code": response.statusCode,
            "response_body": response.body,
          };
          stdout.writeln(
            jsonEncode({
              "jsonrpc": "2.0",
              "id": id,
              "result": {
                "content": [
                  {"type": "text", "text": jsonEncode(resultReport)},
                ],
              },
            }),
          );
        } catch (e) {
          stdout.writeln(
            jsonEncode({
              "jsonrpc": "2.0",
              "id": id,
              "result": {
                "content": [
                  {"type": "text", "text": "Error: $e"},
                ],
              },
            }),
          );
        }
      }
    } catch (e) {}
  });
}
