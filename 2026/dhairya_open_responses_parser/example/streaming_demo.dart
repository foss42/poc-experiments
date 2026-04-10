/// Streaming Reducer demo — run with:
///   dart run example/streaming_demo.dart
///
/// Feeds a realistic sequence of SSE events into a StreamingSession and
/// prints the accumulated ParsedOpenResponse after every event.
library;

import 'package:open_responses_parser/open_responses_parser.dart';

void main() {
  final session = StreamingSession();

  void feed(String label, Map<String, dynamic> event) {
    session.processEvent(event);
    final r = session.currentResponse;
    print('─── $label');
    print('    id=${r.id}  status=${r.status}  items=${r.items.length}');
    for (var i = 0; i < r.items.length; i++) {
      final item = r.items[i];
      switch (item) {
        case MessageOutput():
          print('    [$i] MessageOutput  text="${item.item.fullText}"');
        case FunctionCallOutput():
          print(
              '    [$i] FunctionCallOutput  name=${item.item.name}'
              '  args=${item.item.arguments}  status=${item.item.status}');
        case FunctionCallOutputResult():
          print('    [$i] FunctionCallOutputResult  callId=${item.item.callId}');
        case ReasoningOutput():
          print('    [$i] ReasoningOutput  summaries=${item.item.summary.length}');
        case UnknownOutput():
          print('    [$i] UnknownOutput  type=${item.item.type}');
      }
    }
    if (r.correlatedCalls.isNotEmpty) {
      for (final e in r.correlatedCalls.entries) {
        print('    correlatedCall[${e.key}]  complete=${e.value.isComplete}');
      }
    }
    print('');
  }

  // ── Event sequence ──────────────────────────────────────────────────────────

  feed('function_call item added (index 0)', {
    'type': 'response.output_item.added',
    'output_index': 0,
    'item': {
      'type': 'function_call',
      'id': 'fc_001',
      'call_id': 'call_weather_tokyo',
      'name': 'get_current_weather',
      'status': 'in_progress',
    },
  });

  feed('message item added (index 1)', {
    'type': 'response.output_item.added',
    'output_index': 1,
    'item': {
      'type': 'message',
      'id': 'msg_001',
      'role': 'assistant',
      'status': 'in_progress',
    },
  });

  feed('function_call arguments delta chunk 1', {
    'type': 'response.function_call_arguments.delta',
    'output_index': 0,
    'delta': '{"city":',
  });

  feed('function_call arguments delta chunk 2', {
    'type': 'response.function_call_arguments.delta',
    'output_index': 0,
    'delta': '"Tokyo","units":"celsius"}',
  });

  feed('text delta chunk 1', {
    'type': 'response.output_text.delta',
    'output_index': 1,
    'content_index': 0,
    'delta': 'Tokyo is',
  });

  feed('text delta chunk 2', {
    'type': 'response.output_text.delta',
    'output_index': 1,
    'content_index': 0,
    'delta': ' currently sunny and 22°C.',
  });

  feed('function_call item done', {
    'type': 'response.output_item.done',
    'output_index': 0,
    'item': {
      'type': 'function_call',
      'id': 'fc_001',
      'call_id': 'call_weather_tokyo',
      'name': 'get_current_weather',
      'arguments': '{"city":"Tokyo","units":"celsius"}',
      'status': 'completed',
    },
  });

  feed('message item done', {
    'type': 'response.output_item.done',
    'output_index': 1,
    'item': {
      'type': 'message',
      'id': 'msg_001',
      'role': 'assistant',
      'content': [
        {
          'type': 'output_text',
          'text': 'Tokyo is currently sunny and 22°C.',
        },
      ],
    },
  });

  feed('response.completed', {
    'type': 'response.completed',
    'response': {'id': 'resp_stream_001', 'status': 'completed'},
  });

  session.dispose();
  print('Done. isComplete=${session.currentResponse.status}');
}
