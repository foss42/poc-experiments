import 'dart:convert';
import 'dart:async';
import 'dart:isolate';
import 'package:flutter/material.dart';
import 'package:google_generative_ai/google_generative_ai.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'mcpServer_genui.dart';

void main() {
  runApp(const ApiDashAgentApp());
}

class ApiDashAgentApp extends StatelessWidget {
  const ApiDashAgentApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'API Dash Agent Console',
      theme: ThemeData.dark(useMaterial3: true).copyWith(
        scaffoldBackgroundColor: const Color(0xFF1E1E1E),
        cardColor: const Color(0xFF2D2D2D),
      ),
      home: const AgentWorkflowScreen(),
      debugShowCheckedModeBanner: false,
    );
  }
}

class FeedItem {
  final String? text;
  final FunctionCall? pendingToolCall;
  Map<String, dynamic>? toolResult;
  bool isPending;

  FeedItem({this.text, this.pendingToolCall, this.toolResult, this.isPending = false});
}

class AgentWorkflowScreen extends StatefulWidget {
  const AgentWorkflowScreen({super.key});

  @override
  State<AgentWorkflowScreen> createState() => _AgentWorkflowScreenState();
}

class _AgentWorkflowScreenState extends State<AgentWorkflowScreen> {
  final TextEditingController _apiKeyController = TextEditingController();
  final TextEditingController _specUrlController = TextEditingController();

  bool _isProcessing = false;
  ChatSession? _chatSession;
  final List<FeedItem> _feed = [];
  final ScrollController _scrollController = ScrollController();

  final List<Tool> _geminiTools = [
    Tool(functionDeclarations: [
      FunctionDeclaration(
          'read_openapi_spec',
          'Fetches a real OpenAPI JSON specification from a URL.',
          Schema(SchemaType.object, properties: {
            'url': Schema(SchemaType.string, description: 'URL of the spec')
          }, requiredProperties: ['url'])
      ),
      FunctionDeclaration(
          'execute_apidash_request',
          'Executes a complete HTTP request.',
          Schema(SchemaType.object, properties: {
            'url': Schema(SchemaType.string),
            'method': Schema(SchemaType.string),
            'headers': Schema(SchemaType.object),
            'body': Schema(SchemaType.string, description: 'JSON string or plain text body'),
          }, requiredProperties: ['url', 'method'])
      )
    ])
  ];

  @override
  void initState() {
    super.initState();
    mcpService.start();
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _startWorkflow() async {
    final apiKey = _apiKeyController.text.trim();
    final specUrl = _specUrlController.text.trim();

    if (apiKey.isEmpty || specUrl.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("API Key and Spec URL are required.")));
      return;
    }

    setState(() {
      _feed.clear();
      _isProcessing = true;
    });

    try {
      final model = GenerativeModel(
        model: 'gemini-2.5-flash',
        apiKey: apiKey,
        tools: _geminiTools,
      );

      final promptResponse = await mcpService.executePrompt('run_agentic_tests', {"api_spec_url": specUrl});
      final promptText = promptResponse['messages'][0]['content']['text'];

      _chatSession = model.startChat(history: []);
      await _processAgentTurn(Content.text(promptText));

    } catch (e) {
      setState(() => _feed.add(FeedItem(text: "❌ Initialization Error: $e")));
      _isProcessing = false;
    }
  }

  Future<void> _processAgentTurn(Content contentToSend) async {
    try {
      final response = await _chatSession!.sendMessage(contentToSend);

      setState(() {
        if (response.text != null && response.text!.isNotEmpty) {
          _feed.add(FeedItem(text: response.text));
        }

        if (response.functionCalls.isNotEmpty) {
          for (var call in response.functionCalls) {
            _feed.add(FeedItem(pendingToolCall: call, isPending: true));
          }
          _isProcessing = false;
        } else {
          _isProcessing = false;
        }
      });
      _scrollToBottom();
    } catch (e) {
      setState(() {
        _feed.add(FeedItem(text: "❌ Execution Error: $e"));
        _isProcessing = false;
      });
    }
  }

  // FIXED: Now properly catches tool failures and feeds them back to the AI
  Future<void> _grantConsent(FeedItem item) async {
    setState(() {
      item.isPending = false;
      _isProcessing = true;
    });

    final call = item.pendingToolCall!;

    try {
      final mcpResult = await mcpService.executeTool(call.name, call.args);
      final rawResultText = mcpResult['content'][0]['text'];

      setState(() {
        item.toolResult = {"result": rawResultText};
      });

      final functionResponse = Content.functionResponse(call.name, item.toolResult);
      await _processAgentTurn(functionResponse);

    } catch (e) {
      setState(() {
        item.toolResult = {"error": e.toString()};
        // Removed _isProcessing = false so the turn continues
      });
      // Send error back to Gemini so it can recover
      final errorResponse = Content.functionResponse(call.name, {"error": e.toString()});
      await _processAgentTurn(errorResponse);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Row(
        children: [
          Container(
            width: 280,
            color: const Color(0xFF252526),
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("Agentic Config", style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 20),
                const Text("API KEY", style: TextStyle(fontSize: 11, color: Colors.grey)),
                const SizedBox(height: 5),
                TextField(
                  controller: _apiKeyController,
                  obscureText: true,
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                  decoration: InputDecoration(
                    filled: true, fillColor: const Color(0xFF333333),
                    border: OutlineInputBorder(borderSide: BorderSide.none, borderRadius: BorderRadius.circular(6)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 0),
                  ),
                ),
                const Spacer(),
                const Text("Status: Connected to Isolate", style: TextStyle(color: Colors.green, fontSize: 12)),
              ],
            ),
          ),

          Expanded(
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFF333333)))),
                  child: Row(
                    children: [
                      const Icon(Icons.psychology, color: Colors.blueAccent),
                      const SizedBox(width: 10),
                      const Text("Agentic Test Execution Feed", style: TextStyle(color: Colors.white, fontSize: 18)),
                      const Spacer(),
                      if (_isProcessing) const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                    ],
                  ),
                ),

                Expanded(
                  child: ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(30),
                    itemCount: _feed.length,
                    itemBuilder: (context, index) {
                      final item = _feed[index];

                      if (item.text != null) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 20),
                          child: MarkdownBody(
                            data: item.text!,
                            selectable: true,
                            styleSheet: MarkdownStyleSheet(
                              p: const TextStyle(color: Color(0xFFCCCCCC), fontSize: 14, height: 1.5),
                              h1: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
                              h2: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                              code: const TextStyle(backgroundColor: Color(0xFF1E1E1E), color: Color(0xFF9CDCFE), fontFamily: 'monospace'),
                              codeblockDecoration: BoxDecoration(
                                color: const Color(0xFF151515),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: const Color(0xFF333333)),
                              ),
                              listBullet: const TextStyle(color: Colors.blueAccent),
                            ),
                          ),
                        );
                      }

                      if (item.pendingToolCall != null) {
                        return _buildToolCard(item);
                      }

                      return const SizedBox.shrink();
                    },
                  ),
                ),

                Container(
                  padding: const EdgeInsets.all(20),
                  color: const Color(0xFF252526),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _specUrlController,
                          style: const TextStyle(color: Colors.white),
                          decoration: InputDecoration(
                            hintText: "Enter OpenAPI Spec URL",
                            hintStyle: const TextStyle(color: Colors.grey),
                            filled: true, fillColor: const Color(0xFF1E1E1E),
                            border: OutlineInputBorder(borderSide: BorderSide.none, borderRadius: BorderRadius.circular(8)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 15),
                      ElevatedButton.icon(
                        onPressed: _isProcessing ? null : _startWorkflow,
                        icon: const Icon(Icons.play_arrow),
                        label: const Text("Start Workflow"),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blueAccent, foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
                        ),
                      )
                    ],
                  ),
                )
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildToolCard(FeedItem item) {
    final call = item.pendingToolCall!;
    final bool hasExecuted = item.toolResult != null;
    final Map<String, dynamic> args = call.args;

    String mainTitle = call.name;
    String subtitleTool = "Tool Used: ${call.name}";
    String expectedOutcome = "Successful execution";
    String actualOutcome = hasExecuted ? "Executed" : "Pending...";
    bool? isPassed;

    if (call.name == 'execute_apidash_request') {
      final method = args['method']?.toString().toUpperCase() ?? 'REQ';
      final url = args['url']?.toString() ?? '';
      final uri = Uri.tryParse(url);
      final path = uri?.path ?? url;

      mainTitle = "$method $path";
      expectedOutcome = "HTTP Status 2xx";

      if (hasExecuted) {
        if (item.toolResult!.containsKey('result')) {
          try {
            final parsedResult = jsonDecode(item.toolResult!['result']);
            final statusCode = parsedResult['status_code'];
            isPassed = (statusCode != null && statusCode >= 200 && statusCode < 300);
            actualOutcome = "Status Code: $statusCode";
          } catch (_) {
            actualOutcome = "Raw: ${item.toolResult!['result']}";
            isPassed = false;
          }
        } else if (item.toolResult!.containsKey('error')) {
          actualOutcome = "Error: ${item.toolResult!['error']}";
          isPassed = false;
        }
      }
    } else if (call.name == 'read_openapi_spec') {
      mainTitle = "Fetch OpenAPI Specification";
      expectedOutcome = "Valid JSON Spec";
      if (hasExecuted) {
        isPassed = !item.toolResult!.containsKey('error');
        actualOutcome = isPassed! ? "Successfully fetched spec" : "Failed to fetch";
      }
    }

    Color statusColor = Colors.orangeAccent;
    IconData statusIcon = Icons.pause_circle_outline;
    String statusBadgeText = "PENDING";

    if (hasExecuted) {
      if (isPassed == true) {
        statusColor = Colors.green;
        statusIcon = Icons.check_circle;
        statusBadgeText = "PASSED";
      } else if (isPassed == false) {
        statusColor = Colors.redAccent;
        statusIcon = Icons.cancel;
        statusBadgeText = "FAILED";
      } else {
        statusColor = Colors.blueAccent;
        statusIcon = Icons.info;
        statusBadgeText = "COMPLETED";
      }
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
          color: const Color(0xFF2D2D2D),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: statusColor.withOpacity(0.5), width: 1.5),
          boxShadow: [
            BoxShadow(
                color: statusColor.withOpacity(0.05),
                blurRadius: 10, offset: const Offset(0, 4)
            )
          ]
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.1),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(11)),
              border: Border(bottom: BorderSide(color: statusColor.withOpacity(0.2))),
            ),
            child: Row(
              children: [
                Icon(statusIcon, color: statusColor, size: 24),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(mainTitle, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 2),
                      Text(subtitleTool, style: const TextStyle(color: Colors.grey, fontSize: 12, fontFamily: 'monospace')),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(statusBadgeText, style: TextStyle(color: statusColor, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                )
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text("Expected Outcome", style: TextStyle(color: Colors.grey, fontSize: 12)),
                          const SizedBox(height: 4),
                          Text(expectedOutcome, style: const TextStyle(color: Colors.white, fontSize: 14)),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text("Actual Result", style: TextStyle(color: Colors.grey, fontSize: 12)),
                          const SizedBox(height: 4),
                          Text(actualOutcome, style: TextStyle(color: hasExecuted ? statusColor : Colors.white, fontSize: 14, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                const Text("Execution Payload", style: TextStyle(color: Colors.grey, fontSize: 12)),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E1E1E),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFF333333)),
                  ),
                  width: double.infinity,
                  child: Text(jsonEncode(args), style: const TextStyle(color: Color(0xFF9CDCFE), fontFamily: 'monospace', fontSize: 12, height: 1.4)),
                ),
                if (hasExecuted && item.toolResult != null) ...[
                  const SizedBox(height: 12),
                  const Text("Raw Context", style: TextStyle(color: Colors.grey, fontSize: 12)),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E1E1E),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFF333333)),
                    ),
                    width: double.infinity,
                    child: Text(
                        item.toolResult.toString(),
                        maxLines: 4,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Color(0xFFCE9178), fontFamily: 'monospace', fontSize: 12, height: 1.4)
                    ),
                  ),
                ],
                if (item.isPending) ...[
                  const SizedBox(height: 20),
                  Align(
                    alignment: Alignment.centerRight,
                    child: ElevatedButton.icon(
                      onPressed: () => _grantConsent(item),
                      icon: const Icon(Icons.play_arrow, size: 18),
                      label: const Text("Execute Test"),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blueAccent,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        elevation: 0,
                      ),
                    ),
                  )
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// FIXED: Handles JSON-RPC errors and timeouts properly
class McpService {
  Isolate? _isolate;
  SendPort? _serverSendPort;
  final ReceivePort _uiReceivePort = ReceivePort();
  int _requestId = 1;
  final Map<int, Completer<Map<String, dynamic>>> _pendingRequests = {};
  final Completer<void> _initCompleter = Completer<void>();

  Future<void> start() async {
    if (_isolate != null) return;

    _uiReceivePort.listen((message) {
      if (message is SendPort) {
        _serverSendPort = message;
        _initCompleter.complete();
      } else if (message is String) {
        try {
          final response = jsonDecode(message);
          final id = response['id'];

          if (id != null && _pendingRequests.containsKey(id)) {
            final completer = _pendingRequests[id]!;
            _pendingRequests.remove(id);

            // Handle explicit errors from the backend isolate
            if (response.containsKey('error')) {
              completer.completeError(response['error'].toString());
            } else {
              completer.complete(response['result'] ?? <String, dynamic>{});
            }
          }
        } catch (e) {
          debugPrint("Failed to parse MCP Isolate message: $e");
        }
      }
    });

    _isolate = await Isolate.spawn(runMcpIsolate, _uiReceivePort.sendPort);
    await _initCompleter.future;
  }

  Future<Map<String, dynamic>> executePrompt(String name, Map<String, dynamic> arguments) async {
    if (_serverSendPort == null) await start();
    final id = _requestId++;
    final completer = Completer<Map<String, dynamic>>();
    _pendingRequests[id] = completer;

    _serverSendPort!.send(jsonEncode({
      "jsonrpc": "2.0", "id": id, "method": "prompts/get", "params": {"name": name, "arguments": arguments}
    }));

    return completer.future.timeout(
      const Duration(seconds: 15),
      onTimeout: () {
        _pendingRequests.remove(id);
        throw TimeoutException("MCP Isolate took too long to return a prompt.");
      },
    );
  }

  Future<Map<String, dynamic>> executeTool(String name, Map<String, dynamic> arguments) async {
    if (_serverSendPort == null) await start();
    final id = _requestId++;
    final completer = Completer<Map<String, dynamic>>();
    _pendingRequests[id] = completer;

    _serverSendPort!.send(jsonEncode({
      "jsonrpc": "2.0", "id": id, "method": "tools/call", "params": {"name": name, "arguments": arguments}
    }));

    return completer.future.timeout(
      const Duration(seconds: 30),
      onTimeout: () {
        _pendingRequests.remove(id);
        throw TimeoutException("MCP Tool execution timed out.");
      },
    );
  }
}

final mcpService = McpService();