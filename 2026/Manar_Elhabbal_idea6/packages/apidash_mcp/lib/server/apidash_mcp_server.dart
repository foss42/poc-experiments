import 'package:mcp_dart/mcp_dart.dart';
import 'package:apidash_cli/services/hive_cli_services.dart';
import 'package:apidash_cli/services/http_service.dart';
import 'package:apidash_cli/services/config_service.dart';
import 'package:apidash_cli/models/request_model.dart';
import 'package:apidash_cli/models/name_value_model.dart';
import 'dart:io';
import 'dart:convert';

McpServer createApiDashMcpServer() {
  McpServer server = McpServer(
    Implementation(name: "apidash_mcp", version: "1.0.0"),
    options: McpServerOptions(
      capabilities: ServerCapabilities(
        resources: ServerCapabilitiesResources(),
        tools: ServerCapabilitiesTools(),
      ),
    ),
  );

  final configService = ConfigService();

  server.registerTool(
    "init_workspace",
    description: "Initialize a new ApiDash workspace at the given path",
    inputSchema: ToolInputSchema(
      properties: {
        "path": JsonSchema.string(description: "Path where the .apidash workspace should be created"),
        "name": JsonSchema.string(description: "Optional project name"),
        "force": JsonSchema.boolean(description: "Overwrite existing configuration if present", defaultValue: false),
      },
      required: ["path"],
    ),
    callback: (args, extra) async {
      final path = args["path"] as String;
      final name = args["name"] as String?;
      final force = args["force"] as bool? ?? false;
      
      try {
        final result = await configService.initProject(
          workingDirectory: Directory(path),
          projectName: name,
          force: force,
        );

        if (!result.created && !force) {
          return CallToolResult(
            content: [TextContent(text: "Workspace already exists at $path. Use force: true to overwrite.")],
            isError: true,
          );
        }

        // After creating/initializing config, also init the hive store
        await hiveHandler.initWorkspaceStore('$path/.apidash');

        return CallToolResult(
          content: [TextContent(text: "Workspace ${result.overwritten ? 're-initialized' : 'initialized'} at $path. Config at ${result.configPath}")],
        );
      } catch (e) {
        return CallToolResult(
          content: [TextContent(text: "Failed to initialize workspace: $e")],
          isError: true,
        );
      }
    },
  );

  server.registerTool(
    "list_history",
    description: "List API requests from the workspace history",
    inputSchema: ToolInputSchema(
      properties: {
        "limit": JsonSchema.integer(description: "Maximum number of requests to return"),
      },
    ),
    callback: (args, extra) async {
      final limit = args["limit"] as int?;
      try {
        final ids = hiveHandler.getIds();
        if (ids == null || ids.isEmpty) {
          return CallToolResult(
            content: [TextContent(text: "No history found.")],
          );
        }

        final uniqueIds = ids.toSet().toList();
        final displayIds = limit != null ? uniqueIds.take(limit) : uniqueIds;

        final requests = <Map<String, dynamic>>[];
        for (var id in displayIds) {
          final request = await hiveHandler.getRequestModel(id);
          if (request != null) {
            requests.add({
              "id": id,
              "name": request["name"],
              "method": request["method"],
              "url": request["url"],
            });
          }
        }

        return CallToolResult(
          content: [TextContent(text: jsonEncode(requests))],
        );
      } catch (e) {
        return CallToolResult(
          content: [TextContent(text: "Error listing history: $e")],
          isError: true,
        );
      }
    },
  );

  server.registerTool(
    "send_request",
    description: "Send an API request and save it to history",
    inputSchema: ToolInputSchema(
      properties: {
        "method": JsonSchema.string(
            description: "HTTP method (GET, POST, PUT, DELETE, PATCH)"),
        "url": JsonSchema.string(description: "The URL of the request"),
        "headers": JsonSchema.object(
            description: "Request headers as a key-value object",
            additionalProperties: JsonSchema.string()),
        "body": JsonSchema.string(description: "Request body (optional)"),
        "name": JsonSchema.string(description: "Custom name for the request"),
      },
      required: ["method", "url"],
    ),
    callback: (args, extra) async {
      final methodStr = (args["method"] as String).toLowerCase();
      final url = args["url"] as String;
      final body = args["body"] as String?;
      final name = args["name"] as String? ?? url;
      final headersMap = args["headers"] as Map<String, dynamic>? ?? {};

      RequestMethod method;
      try {
        method = RequestMethod.values.firstWhere((v) => v.name == methodStr);
      } catch (_) {
        return CallToolResult(
          content: [TextContent(text: "Invalid HTTP method: $methodStr")],
          isError: true,
        );
      }

      final headers = headersMap.entries
          .map((e) => NameValueModel(name: e.key, value: e.value.toString()))
          .toList();

      final httpService = HttpService();
      try {
        final response = await httpService.sendRequest(
          method: method,
          url: url,
          headers: headers,
          body: body,
        );

        final requestId = DateTime.now().millisecondsSinceEpoch.toString();
        final requestModel = RequestModel(
          id: requestId,
          name: name,
          url: url,
          method: method,
          headers: headers,
          body: body,
          response: response,
        );

        // Save to history
        try {
          await hiveHandler.setRequestModel(requestId, requestModel.toJson());
        } catch (e) {
          // It's okay if it fails to save, we still return the response
        }

        return CallToolResult(
          content: [
            TextContent(
                text: jsonEncode({
                  "status": response.statusCode,
                  "body": response.body,
                  "headers": {for (var h in response.headers ?? []) h.name: h.value},
                  "requestId": requestId
                }))
          ],
        );
      } catch (e) {
        return CallToolResult(
          content: [TextContent(text: "Failed to execute request: $e")],
          isError: true,
        );
      }
    },
  );

  server.registerTool(
    "get_request",
    description: "Get full details of a specific API request from history",
    inputSchema: ToolInputSchema(
      properties: {
        "id": JsonSchema.string(description: "The ID of the request"),
      },
      required: ["id"],
    ),
    callback: (args, extra) async {
      final id = args["id"] as String;
      try {
        final request = await hiveHandler.getRequestModel(id);
        if (request == null) {
          return CallToolResult(
            content: [TextContent(text: "Request with ID $id not found.")],
            isError: true,
          );
        }
        return CallToolResult(
          content: [TextContent(text: jsonEncode(request))],
        );
      } catch (e) {
        return CallToolResult(
          content: [TextContent(text: "Error getting request: $e")],
          isError: true,
        );
      }
    },
  );

  server.registerTool(
    "delete_request",
    description: "Delete a specific API request from history",
    inputSchema: ToolInputSchema(
      properties: {
        "id": JsonSchema.string(description: "The ID of the request to delete"),
      },
      required: ["id"],
    ),
    callback: (args, extra) async {
      final id = args["id"] as String;
      try {
        final ids = hiveHandler.getIds() ?? [];
        if (!ids.contains(id)) {
          return CallToolResult(
            content: [TextContent(text: "Request with ID $id not found.")],
            isError: true,
          );
        }
        await hiveHandler.delete(id);
        return CallToolResult(
          content: [TextContent(text: "Request $id deleted successfully.")],
        );
      } catch (e) {
        return CallToolResult(
          content: [TextContent(text: "Error deleting request: $e")],
          isError: true,
        );
      }
    },
  );

  return server;
}
