import 'package:flutter/material.dart';
import 'package:open_responses_parser/open_responses_parser.dart';
import 'package:open_responses_parser/src/widgets/open_responses_view.dart';

// Sample payload with all five item types and one complete CorrelatedCall
const Map<String, dynamic> kSampleResponse = {
  'id': 'resp_demo_gsoc_2026',
  'object': 'response',
  'status': 'completed',
  'model': 'gpt-4o',
  'output': [
    // 1. ReasoningItem
    {
      'type': 'reasoning',
      'id': 'rs_001',
      'summary': [
        {
          'type': 'summary_text',
          'text':
              'The user wants weather info for Tokyo. I will call the weather '
              'tool, then summarize the result in plain language.',
        },
      ],
    },
    // 2. FunctionCallItem (complete — has a matching output below)
    {
      'type': 'function_call',
      'id': 'fc_001',
      'call_id': 'call_weather_tokyo',
      'name': 'get_current_weather',
      'arguments': '{"city": "Tokyo", "units": "celsius"}',
      'status': 'completed',
    },
    // 3. FunctionCallOutputItem (paired with fc_001)
    {
      'type': 'function_call_output',
      'id': 'fco_001',
      'call_id': 'call_weather_tokyo',
      'output':
          '{"temperature": 22, "condition": "Partly cloudy", "humidity": 65}',
    },
    // 4. MessageItem
    {
      'type': 'message',
      'id': 'msg_001',
      'role': 'assistant',
      'content': [
        {
          'type': 'output_text',
          'text': 'Tokyo is currently 22 °C and partly cloudy with 65 % humidity.',
        },
      ],
    },
    // 5. UnknownItem — unrecognised type preserved as-is
    {
      'type': 'image_output',
      'id': 'img_001',
      'url': 'https://example.com/chart.png',
      'alt': 'Weather chart',
    },
  ],
  'usage': {
    'input_tokens': 95,
    'output_tokens': 60,
  },
};

void main() {
  runApp(const OpenResponsesDemoApp());
}

class OpenResponsesDemoApp extends StatelessWidget {
  const OpenResponsesDemoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'OpenResponsesParser — GSoC 2026 POC',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: const Color(0xFF6366F1),
        useMaterial3: true,
        brightness: Brightness.light,
      ),
      darkTheme: ThemeData(
        colorSchemeSeed: const Color(0xFF6366F1),
        useMaterial3: true,
        brightness: Brightness.dark,
      ),
      home: const _DemoPage(),
    );
  }
}

class _DemoPage extends StatelessWidget {
  const _DemoPage();

  @override
  Widget build(BuildContext context) {
    final response = OpenResponseParser().parse(kSampleResponse);

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'OpenResponsesParser',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
        centerTitle: false,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: OpenResponsesView(response: response),
      ),
    );
  }
}
