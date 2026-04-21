import 'dart:convert';
import 'package:flutter/material.dart';
import '../core/widgets/ui_renderer.dart';
import '../core/model/ui_group_builder.dart';
import '../core/model/ui_group.dart';
import '../core/pipeline/ui_pipeline.dart';
import '../core/model/ui_block.dart';

class JsonTesterScreen extends StatefulWidget {
  const JsonTesterScreen({super.key});

  @override
  State<JsonTesterScreen> createState() => _JsonTesterScreenState();
}

class _JsonTesterScreenState extends State<JsonTesterScreen> {
  final TextEditingController _controller = TextEditingController();

  String output = "";
  String detectedType = "";
  List<UIGroup> uiGroups = [];
  List<UIBlock> parsedBlocks = [];

  void convertJson() async {
    try {
      final inputText = _controller.text.trim();

      dynamic parsedInput;

      try {
        parsedInput = jsonDecode(inputText);
      } catch (_) {
        parsedInput = null;
      }

      final pipeline = UIPipeline();
      List<UIBlock> blocks;

      if (parsedInput != null) {
        final isOR =
            parsedInput is Map<String, dynamic> &&
            pipeline.isOpenResponses(parsedInput);

        blocks = pipeline.parse(parsedInput);

        setState(() {
          detectedType = isOR
              ? "Open Responses"
              : "Generic JSON";

          parsedBlocks = blocks;
          uiGroups = UIGroupBuilder().build(blocks);
          output = const JsonEncoder.withIndent('  ').convert(parsedInput);

          for (final block in blocks) {
            _precacheImages(block);
          }
        });
      } else {
        setState(() {
          detectedType = "Invalid JSON";
          output = inputText;
          parsedBlocks = [];
          uiGroups = [];
        });
      }
    } catch (e) {
      setState(() {
        output = "Error\n\n$e";
        detectedType = "";
      });
    }
  }

  void _precacheImages(UIBlock block) {
    if (block.type == UIBlockType.image && block.value != null) {
      precacheImage(NetworkImage(block.value), context);
    }
    block.children?.forEach(_precacheImages);
  }

  String _blocksToPrettyJson() {
    return const JsonEncoder.withIndent(
      '  ',
    ).convert(parsedBlocks.map((e) => e.toJson()).toList());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F6FA),

      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: const Text(
          "GenUI Tester",
          style: TextStyle(color: Colors.white),
        ),
      ),

      body: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            // SAMPLE BUTTONS
            Row(
              children: [
                OutlinedButton(
                  onPressed: () {
                    _controller.text = '''
{
  "output": [
    {"type": "output_text", "text": "Hello"},
    {"type": "output_markdown", "markdown": "**Bold text**"},
    {"type": "output_table", "columns": ["A","B"], "rows": [[1,2],[3,4]]}
  ]
}
''';
                  },
                  child: const Text("Open Responses"),
                ),
                const SizedBox(width: 10),
                OutlinedButton(
                  onPressed: () {
                    _controller.text = '''
{
    "id": 1,
    "name": "Rafia Maqsood",
    "username": "Rafia",
    "email": "rafiamaqsood@gmail.com",
    "address": {
      "street": "Kulas Light",
      "suite": "Apt. 556",
      "city": "Gwenborough",
      "zipcode": "92998-3874",
      "geo": {
        "lat": "-37.3159",
        "lng": "81.1496"
      }
    },
    "phone": "1-770-736-8031 x56442",
    "website": "hildegard.org"
}
''';
                  },
                  child: const Text("Sample JSON"),
                ),
              ],
            ),

            const SizedBox(height: 10),

            _card(
              title: "Request",
              child: Column(
                children: [
                  Row(
                    children: [
                      const Icon(Icons.code, color: Colors.blueGrey),
                      const SizedBox(width: 8),
                      const Text(
                        "Request",
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const Spacer(),
                      ElevatedButton(
                        onPressed: convertJson,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.purple.shade50,
                        ),
                        child: const Text("Send"),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _controller,
                    maxLines: 6,
                    style: const TextStyle(fontFamily: 'monospace'),
                    decoration: InputDecoration(
                      hintText: "Paste JSON or enter prompt...",
                      filled: true,
                      fillColor: Colors.grey.shade100,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 10),

            if (detectedType.isNotEmpty)
              Align(
                alignment: Alignment.centerLeft,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    detectedType,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.blue,
                    ),
                  ),
                ),
              ),

            const SizedBox(height: 10),

            Expanded(
              child: _card(
                title: "Response",
                child: DefaultTabController(
                  length: 3,
                  child: Column(
                    children: [
                      const TabBar(
                        labelColor: Colors.blue,
                        tabs: [
                          Tab(text: "Raw JSON"),
                          Tab(text: "Blocks"),
                          Tab(text: "UI"),
                        ],
                      ),
                      Expanded(
                        child: TabBarView(
                          children: [
                            SingleChildScrollView(
                              padding: const EdgeInsets.all(10),
                              child: SelectableText(
                                output,
                                style: const TextStyle(
                                  fontFamily: 'monospace',
                                ),
                              ),
                            ),
                            SingleChildScrollView(
                              padding: const EdgeInsets.all(10),
                              child: SelectableText(
                                _blocksToPrettyJson(),
                                style: const TextStyle(
                                  fontFamily: 'monospace',
                                ),
                              ),
                            ),
                            uiGroups.isEmpty
                                ? const Center(
                                    child: Text("No UI generated"),
                                  )
                                : RepaintBoundary(
                                    child: UIRenderer(groups: uiGroups),
                                  ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
  Widget _card({required String title, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.shade500,
            blurRadius: 8,
          )
        ],
      ),
      child: child,
    );
  }
}