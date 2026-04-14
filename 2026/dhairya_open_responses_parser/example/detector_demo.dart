/// detector_demo.dart
///
/// Pure-Dart console script that runs three detection scenarios side-by-side
/// and prints each DetectionResult so you can verify the routing logic.
///
/// Run with:
///   dart example/detector_demo.dart
///
/// (No Flutter needed — the detector and router have zero Flutter deps.)
library;
// ignore_for_file: avoid_print

import 'package:open_responses_parser/open_responses_parser.dart';

// ---------------------------------------------------------------------------
// Scenario 1 — Real OpenAI Responses API completed payload
// ---------------------------------------------------------------------------
const Map<String, dynamic> kOpenResponsesPayload = {
  'id': 'resp_demo_gsoc_2026',
  'object': 'response',
  'status': 'completed',
  'model': 'gpt-4o',
  'output': [
    {
      'type': 'reasoning',
      'id': 'rs_001',
      'summary': [
        {
          'type': 'summary_text',
          'text': 'The user wants weather info for Tokyo. '
              'I will call the weather tool, then summarise the result.',
        },
      ],
    },
    {
      'type': 'function_call',
      'id': 'fc_001',
      'call_id': 'call_weather_tokyo',
      'name': 'get_current_weather',
      'arguments': '{"city": "Tokyo", "units": "celsius"}',
      'status': 'completed',
    },
    {
      'type': 'function_call_output',
      'id': 'fco_001',
      'call_id': 'call_weather_tokyo',
      'output':
          '{"temperature": 22, "condition": "Partly cloudy", "humidity": 65}',
    },
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
  ],
  'usage': {
    'input_tokens': 95,
    'output_tokens': 60,
  },
};

// ---------------------------------------------------------------------------
// Scenario 2 — Simulated SSE event map with correct headers
// ---------------------------------------------------------------------------
const Map<String, dynamic> kSseEventBody = {
  'type': 'response.output_text.delta',
  'output_index': 0,
  'delta': 'Tokyo is currently',
};

const Map<String, String> kSseHeaders = {
  'content-type': 'text/event-stream; charset=utf-8',
  'cache-control': 'no-cache',
  'connection': 'keep-alive',
};

// ---------------------------------------------------------------------------
// Scenario 3 — Standard REST API JSON response
// ---------------------------------------------------------------------------
const Map<String, dynamic> kStandardPayload = {
  'userId': 1,
  'id': 1,
  'title': 'delectus aut autem',
  'completed': false,
};

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

void main() {
  final detector = const OpenResponsesDetector();
  final router = const ViewRouter();

  final scenarios = [
    (
      label: 'Scenario 1 — OpenAI Responses API (completed)',
      body: kOpenResponsesPayload,
      headers: <String, String>{},
    ),
    (
      label: 'Scenario 2 — SSE stream (Responses API streaming)',
      body: kSseEventBody,
      headers: kSseHeaders,
    ),
    (
      label: 'Scenario 3 — Standard REST API JSON',
      body: kStandardPayload,
      headers: <String, String>{},
    ),
  ];

  print('');
  print('╔══════════════════════════════════════════════════════════════╗');
  print('║        OpenResponsesDetector — routing demo                  ║');
  print('╚══════════════════════════════════════════════════════════════╝');
  print('');

  for (final s in scenarios) {
    final result = detector.detect(s.body, s.headers);
    final view = router.route(result);

    print('─── ${s.label}');
    print('    format     : ${result.format.name}');
    print('    confidence : ${result.confidence}');
    print('    reason     : ${result.reason}');
    print('    → renderer : $view');
    print('');
  }
}
