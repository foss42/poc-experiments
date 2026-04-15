import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_generative_ai/google_generative_ai.dart';

// The latest Alpha packages
import 'package:genui/genui.dart';
import 'package:json_schema_builder/json_schema_builder.dart' as jsb;

import 'dart:io';
import 'dart:convert';
import 'dart:async';

import 'dart:isolate';
// Import the isolate function you just created!
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
      theme: ThemeData.light(useMaterial3: true),
      home: const DashboardScreen(),
      debugShowCheckedModeBanner: false,
    );
  }
}

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final TextEditingController _promptController = TextEditingController();
  final TextEditingController _urlController = TextEditingController();

  bool _isAiThinking = false;

  final String _apiKey = 'YOUR APIKEY';
  late final GenerativeModel _model;

  final bool _useStrictGenUiEngine = false;

  // GenUI Latest Core Components
  late final Catalog _catalog;
  late final jsb.Schema _dashboardSchema;

  Map<String, dynamic>? _currentDashboardData;
  bool _isHealedRun = false;

  @override
  void initState() {
    super.initState();
    _model = GenerativeModel(model: 'gemini-2.5-flash', apiKey: _apiKey);
    _initGenUI();
  }

  void _initGenUI() {
    // 1. DEFINE THE GEN-UI SCHEMA
    // This guarantees the AI knows exactly what data the widget needs.
    _dashboardSchema = jsb.Schema.object(
      properties: {
        'explanation': jsb.Schema.string(description: 'Brief explanation of the test strategy.'),
        'tests': jsb.Schema.list(
          items: jsb.Schema.object(
            properties: {
              'title': jsb.Schema.string(),
              'expected': jsb.Schema.string(),
              // NEW FIELDS FOR REAL EXECUTION
              'url': jsb.Schema.string(),
              'method': jsb.Schema.string(),
              'body': jsb.Schema.string(description: 'Raw JSON string for the request body, or empty'),
              'expected_status': jsb.Schema.integer(description: 'The exact HTTP status code expected (e.g., 200, 400, 403)'),
            },
            required: ['title', 'expected', 'url', 'method', 'expected_status'],
          ),
        ),
      },
      required: ['explanation', 'tests'],
    );


    // 2. REGISTER THE NATIVE WIDGET IN THE CATALOG
    _catalog = Catalog(
      [
        CatalogItem(
          name: 'TestPlanDashboard',
          dataSchema: _dashboardSchema,
          widgetBuilder: (itemContext) {
            // Extract the AI's generated JSON from the new context object
            final dataModel = itemContext.data as Map<String, dynamic>;

            return NativeTestDashboard(
              data: dataModel,
              isHealed: _isHealedRun,
              onHealRequested: (List<Map<String, dynamic>> results) {
                _triggerSelfHealing(results);
              },
            );

          },
        ),
      ],
      catalogId: 'api_dash_components',
    );

    // Initial Empty State
    setState(() {
      _currentDashboardData = {
        "explanation": "Welcome to the Agentic Console. Type a goal below to generate your native UI test suite.",
        "tests": []
      };
    });
  }

  Future<void> _generateTestPlan(String userPrompt) async {
    if (userPrompt.trim().isEmpty) return;

    final targetUrl = _urlController.text.trim();
    if (targetUrl.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please enter a Target API URL first!")),
      );
      return;
    }

    setState(() {
      _isAiThinking = true;
      _isHealedRun = false;
    });

    try {
      // THE CORRECT GENERATION PROMPT
      final prompt = '''
      You are an API testing agent. 
      The absolute Base URL is: "$targetUrl"
      The user's goal is: "$userPrompt".
      
      Generate 4 real API test cases. 
      CRITICAL: Use the exact Base URL provided and append the correct endpoint path. For example, if Base is 'https://dummyjson.com', the login endpoint MUST be 'https://dummyjson.com/auth/login'.
      
      Return ONLY a raw JSON object matching this exact format:
      {"explanation": "Strategy", "tests": [{"title": "Valid Login", "expected": "Returns token", "url": "$targetUrl/auth/login", "method": "POST", "body": "{\\"username\\": \\"emilys\\", \\"password\\": \\"emilyspass\\"}", "expected_status": 200}]}
      ''';

      final response = await _model.generateContent([Content.text(prompt)]);
      final String jsonStr = response.text?.replaceAll('```json', '').replaceAll('```', '').trim() ?? '{}';

      setState(() {
        _currentDashboardData = jsonDecode(jsonStr);
      });
    } catch (e) {
      debugPrint("AI Error: $e");
    } finally {
      setState(() => _isAiThinking = false);
      _promptController.clear();
    }
  }

  Future<void> _triggerSelfHealing(List<Map<String, dynamic>> lastResults) async {
    setState(() {
      _isAiThinking = true;
      _isHealedRun = true;
    });

    try {
      // 1. Build the failure report
      final List<dynamic> currentTests = _currentDashboardData?['tests'] ?? [];
      String failureReport = "";

      for (int i = 0; i < lastResults.length; i++) {
        final res = lastResults[i];
        if (res['passed'] == false) {
          final failedTest = currentTests[res['index']];
          failureReport += "- Test '${failedTest['title']}': Expected status ${failedTest['expected_status']}, but got ${res['message']}. Payload used: ${failedTest['body']}\n";
        }
      }

      // 2. Encode the old data
      final String oldData = jsonEncode(_currentDashboardData);

      // 3. Construct the prompt using the variables we JUST created above
      final prompt = '''
      You are an expert API testing agent debugging a failed test suite.
      
      CURRENT TEST PLAN:
      $oldData
      
      EXECUTION FAILURES:
      $failureReport
      
      CRITICAL INSTRUCTIONS:
      1. DO NOT touch the tests that did not fail. Keep their titles and payloads EXACTLY the same.
      2. For the FAILED tests, analyze the error. You MUST make real, actual changes to the 'body' or 'url' to fix them. Do not write "hypothetically adjusted". 
      3. Hint: reqres.in /api/login specifically requires the email "eve.holt@reqres.in" to return a 200 OK. If a test failed with 403, your payload was likely wrong or missing this email.
      4. ONLY for the tests you actually fixed, append " (Healed)" to the 'title'.
      5. In the 'explanation' field, write exactly what values you changed.
      
      Return ONLY a raw JSON object matching the original schema.
      ''';

      // 4. Send to Gemini
      final response = await _model.generateContent([Content.text(prompt)]);
      final String healedJsonStr = response.text?.replaceAll('```json', '').replaceAll('```', '').trim() ?? '{}';

      setState(() {
        _currentDashboardData = jsonDecode(healedJsonStr);
      });
    } catch (e) {
      debugPrint("Healing Error: $e");
    } finally {
      setState(() => _isAiThinking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F7),
      body: Row(
        children: [
          // SIDEBAR
          Container(
            width: 250,
            color: Colors.white,
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("API Dash", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 40),
                _navItem(Icons.dashboard, "Agent Dashboard", true),
                _navItem(Icons.history, "History", false),
                _navItem(Icons.settings, "Settings", false),
              ],
            ),
          ),

          // MAIN CONTENT AREA
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(30.0),
              child: Column(
                children: [
                  const Text("Define, Align, Achieve. Precision testing powered by AI.", style: TextStyle(color: Colors.grey, fontSize: 16)),
                  const SizedBox(height: 20),

                  // THE RENDER SURFACE (With Fallback Logic)
                  Expanded(
                    child: _currentDashboardData == null
                        ? const Center(child: CircularProgressIndicator())
                        : (_useStrictGenUiEngine
                    // If GenUI updates and stabilizes, swap to the official renderer here
                        ? const Center(child: Text("Strict GenUI Surface Enabled"))
                    // The completely stable native fallback mapping the GenUI data
                        : NativeTestDashboard(
                      data: _currentDashboardData!,
                      isHealed: _isHealedRun,
                      onHealRequested: (results) => _triggerSelfHealing(results),
                    )),
                  ),

                  const SizedBox(height: 20),

                  // THE CHAT INPUT
                  Column(
                    children: [
                      Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey.shade300),
                      ),
                      child: TextField(
                        controller: _urlController,
                        decoration: const InputDecoration(
                          hintText: "Enter target URL (e.g., https://reqres.in)",
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                          prefixIcon: Icon(Icons.link, color: Colors.grey),
                        ),
                      ),
                    ),
                      Container(
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(colors: [Colors.blueAccent, Colors.purpleAccent]),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        padding: const EdgeInsets.all(2),
                        child: Container(
                          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
                          child: Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _promptController,
                                  decoration: const InputDecoration(
                                    hintText: "Type your API testing goal here...",
                                    border: InputBorder.none,
                                    contentPadding: EdgeInsets.symmetric(horizontal: 20, vertical: 20),
                                  ),
                                  onSubmitted: _generateTestPlan,
                                ),
                              ),
                              if (_isAiThinking)
                                const Padding(padding: EdgeInsets.only(right: 20), child: CircularProgressIndicator())
                              else
                                Padding(
                                  padding: const EdgeInsets.only(right: 10),
                                  child: ElevatedButton.icon(
                                    onPressed: () => _generateTestPlan(_promptController.text),
                                    icon: const Icon(Icons.auto_awesome),
                                    label: const Text("Generate"),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFFf0f0ff),
                                      foregroundColor: const Color(0xFF6b4ce6),
                                      elevation: 0,
                                    ),
                                  ),
                                )
                            ],
                          ),
                        ),
                      ),
                    ],
                  )
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _navItem(IconData icon, String title, bool isActive) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          Icon(icon, color: isActive ? const Color(0xFF6b4ce6) : Colors.grey),
          const SizedBox(width: 15),
          Text(title, style: TextStyle(color: isActive ? const Color(0xFF6b4ce6) : Colors.grey, fontWeight: isActive ? FontWeight.bold : FontWeight.normal)),
        ],
      ),
    );
  }
}

// ============================================================================
// THE NATIVE FLUTTER COMPONENT (The stable fallback)
// ============================================================================
class NativeTestDashboard extends StatefulWidget {
  final Map<String, dynamic> data;
  final bool isHealed;
  final void Function(List<Map<String, dynamic>>) onHealRequested;

  const NativeTestDashboard({super.key, required this.data, required this.isHealed, required this.onHealRequested});

  @override
  State<NativeTestDashboard> createState() => _NativeTestDashboardState();
}

class _NativeTestDashboardState extends State<NativeTestDashboard> {
  bool _isExecuting = false;
  bool _isComplete = false;
  List<Map<String, dynamic>> _results = [];

  @override
  void didUpdateWidget(NativeTestDashboard oldWidget) {
    super.didUpdateWidget(oldWidget);
    // If the AI gives us new or healed data, reset the UI execution state
    if (oldWidget.data != widget.data) {
      setState(() {
        _isComplete = false;
        _isExecuting = false;
        _results = [];
      });
    }
  }

  void _runTests() async {
    setState(() {
      _isExecuting = true;
      _isComplete = false;
      _results = [];
    });

    final List<dynamic> tests = widget.data['tests'] ?? [];
    List<Map<String, dynamic>> realResults = [];

    for (int i = 0; i < tests.length; i++) {
      final test = tests[i];

      try {
        // We now pass the exact URL, Method, and Body generated by the AI!
        final mcpResponse = await mcpService.executeTool(
            'execute_apidash_request',
            {
              "url": test['url'],
              "method": test['method'],
              "headers": {"Content-Type": "application/json"},
              "body": test['body'] != null && test['body'].toString().isNotEmpty ? test['body'] : null
            }
        );

        final content = mcpResponse['content'][0]['text'];
        final httpResult = jsonDecode(content);
        final int actualStatusCode = httpResult['status_code'];
        final int expectedStatusCode = test['expected_status'];

        // grading: match by HTTP status class (2xx, 4xx, 5xx)
        // If the AI wants a 400 but gets a 403, it's still a successful negative test.
        bool isSuccess = false;
        if (expectedStatusCode >= 200 && expectedStatusCode < 300) {
          isSuccess = (actualStatusCode >= 200 && actualStatusCode < 300);
        } else if (expectedStatusCode >= 400 && expectedStatusCode < 500) {
          isSuccess = (actualStatusCode >= 400 && actualStatusCode < 500);
        } else {
          isSuccess = (actualStatusCode == expectedStatusCode);
        }

        realResults.add({
          'index': i,
          'passed': isSuccess,
          'message': 'Got $actualStatusCode (Expected $expectedStatusCode)'
        });

      } catch (e) {
        realResults.add({
          'index': i,
          'passed': false,
          'message': 'MCP Execution Failed: $e'
        });
      }
    }

    setState(() {
      _results = realResults;
      _isExecuting = false;
      _isComplete = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    final List<dynamic> tests = widget.data['tests'] ?? [];
    final int totalTests = tests.length;
    final int passedCount = _results.where((r) => r['passed'] == true).length;
    final int failedCount = _results.where((r) => r['passed'] == false).length;

    return Container(
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade300)),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Text("Agentic API Testing DASHBOARD", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(width: 10),
                  if (widget.isHealed)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: Colors.green, borderRadius: BorderRadius.circular(12)),
                      child: const Text("✨ AI Healed", style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                    )
                ],
              ),
              Row(
                children: [
                  if (_isExecuting) const Text("Bridging to native...", style: TextStyle(color: Colors.grey, fontStyle: FontStyle.italic)),
                  const SizedBox(width: 15),
                  if (totalTests > 0 && !_isComplete)
                    ElevatedButton(
                      onPressed: _isExecuting ? null : _runTests,
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6b4ce6), foregroundColor: Colors.white),
                      child: Text(_isExecuting ? "Executing..." : "Run Tests"),
                    ),
                  if (_isComplete && failedCount > 0)
                    ElevatedButton.icon(
                      onPressed: () { widget.onHealRequested(_results); },
                      icon: const Icon(Icons.auto_fix_high, size: 16),
                      label: const Text("Auto-Fix"),
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.orange, foregroundColor: Colors.white),
                    )
                ],
              )
            ],
          ),
          const Divider(height: 30),
          Row(
            children: [
              _statBox("Total Tests", totalTests.toString(), Colors.grey.shade100, Colors.black),
              const SizedBox(width: 10),
              _statBox("Passed", _isComplete ? passedCount.toString() : "-", passedCount > 0 ? Colors.green.shade50 : Colors.grey.shade100, passedCount > 0 ? Colors.green : Colors.grey),
              const SizedBox(width: 10),
              _statBox("Failed", _isComplete ? failedCount.toString() : "-", failedCount > 0 ? Colors.red.shade50 : Colors.grey.shade100, failedCount > 0 ? Colors.red : Colors.grey),
            ],
          ),
          const SizedBox(height: 15),
          if (widget.data['explanation'] != null && widget.data['explanation'].isNotEmpty)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: widget.isHealed ? Colors.green.shade50 : const Color(0xFFf3e5f5),
                border: Border(left: BorderSide(color: widget.isHealed ? Colors.green : const Color(0xFFb000ff), width: 4)),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text("${widget.isHealed ? '🛠️ What was modified:' : '💡 AI Test Strategy:'} ${widget.data['explanation']}", style: const TextStyle(fontSize: 13)),
            ),
          const SizedBox(height: 15),
          Expanded(
            child: ListView.builder(
              itemCount: tests.length,
              itemBuilder: (context, index) {
                final test = tests[index];
                final result = _results.isNotEmpty ? _results[index] : null;
                Color borderColor = const Color(0xFFb000ff);
                Color bgColor = Colors.white;
                if (result != null) {
                  borderColor = result['passed'] ? Colors.green : Colors.red;
                  bgColor = result['passed'] ? Colors.green.shade50 : Colors.red.shade50;
                }
                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  // Outer container provides the solid left border color and the rounded corners
                  decoration: BoxDecoration(
                      color: borderColor, // This is the thick left border
                      borderRadius: BorderRadius.circular(6),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 4, offset: const Offset(0, 2))
                      ]
                  ),
                  child: Container(
                    // Inner container is shifted 4px to the right to reveal the outer color
                    margin: const EdgeInsets.only(left: 4),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: bgColor,
                      // Now all borders match, keeping Flutter happy!
                      border: Border.all(color: Colors.grey.shade200),
                      borderRadius: const BorderRadius.only(
                          topRight: Radius.circular(6),
                          bottomRight: Radius.circular(6)
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(test['title'] ?? test['name'] ?? 'AI Hallucinated Title', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        const SizedBox(height: 4),
                        Text("Expects: ${test['expected'] ?? test['status'] ?? 'Unknown'}", style: const TextStyle(color: Colors.grey, fontSize: 12)),
                        Text("Tested: ${test['method']} ${test['url']}", style: const TextStyle(color: Colors.blueAccent, fontSize: 11)),
                        if (result != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            "${result['passed'] ? '✓ Passed' : '✗ Failed'}: ${result['message']}",
                            style: TextStyle(color: result['passed'] ? Colors.green.shade700 : Colors.red.shade700, fontWeight: FontWeight.bold, fontSize: 12),
                          )
                        ]
                      ],
                    ),
                  ),
                );
              },
            ),
          )
        ],
      ),
    );
  }

  Widget _statBox(String label, String value, Color bgColor, Color textColor) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.grey.shade300)),
        child: Column(
          children: [
            Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: textColor)),
            Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey, letterSpacing: 0.5)),
          ],
        ),
      ),
    );
  }
}


class McpService {
  Isolate? _isolate;
  SendPort? _serverSendPort; // The port we use to send msgs TO the server
  final ReceivePort _uiReceivePort = ReceivePort(); // The port the server sends msgs TO

  int _requestId = 1;
  final Map<int, Completer<Map<String, dynamic>>> _pendingRequests = {};

  final Completer<void> _initCompleter = Completer<void>();

  Future<void> start() async {
    if (_isolate != null) return;

    // Listen to messages coming from the background Isolate
    _uiReceivePort.listen((message) {
      if (message is SendPort) {
        // Step 1: The isolate gave us its listening port! We are connected.
        _serverSendPort = message;
        _initCompleter.complete();
      } else if (message is String) {
        // Step 2: The isolate sent us a JSON-RPC response
        try {
          final response = jsonDecode(message);
          final id = response['id'];
          if (id != null && _pendingRequests.containsKey(id)) {
            _pendingRequests[id]!.complete(response['result']);
            _pendingRequests.remove(id);
          }
        } catch (e) {
          debugPrint('MCP UI Parse Error: $e');
        }
      }
    });

    // Spawn the server in a separate thread, passing our receive port for the handshake
    _isolate = await Isolate.spawn(runMcpIsolate, _uiReceivePort.sendPort);

    // Wait for the handshake to finish
    await _initCompleter.future;
    debugPrint("✅ Internal MCP Isolate Running!");
  }

  Future<Map<String, dynamic>> executeTool(String name, Map<String, dynamic> arguments) async {
    if (_serverSendPort == null) await start();

    final id = _requestId++;
    final completer = Completer<Map<String, dynamic>>();
    _pendingRequests[id] = completer;

    final request = jsonEncode({
      "jsonrpc": "2.0",
      "id": id,
      "method": "tools/call",
      "params": {
        "name": name,
        "arguments": arguments
      }
    });

    // Send the JSON string to the background isolate
    _serverSendPort!.send(request);

    return completer.future;
  }
}

final mcpService = McpService();