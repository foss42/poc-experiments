import 'package:flutter_test/flutter_test.dart';
import 'package:open_responses_explorer/domain/response_models.dart';
import 'package:open_responses_explorer/domain/streaming_reducer.dart';

void main() {
  group('StreamingReducer', () {
    test('accepts legacy parsed_output on function_call_output done event', () {
      final reducer = StreamingReducer();

      reducer.apply(<String, dynamic>{
        'type': 'response.output_item.done',
        'output_index': 0,
        'item': <String, dynamic>{
          'type': 'function_call_output',
          'call_id': 'call_weather',
          'parsed_output': <String, dynamic>{'city': 'Tokyo'},
        },
      });

      final response = reducer.currentResponse;
      final outputItem = response.items.single as FunctionCallOutputItem;

      expect(outputItem.callId, 'call_weather');
      expect(outputItem.parsedOutput['city'], 'Tokyo');
    });

    test('correlates function call with output after streaming events', () {
      final reducer = StreamingReducer();

      reducer.apply(<String, dynamic>{
        'type': 'response.output_item.added',
        'output_index': 0,
        'item': <String, dynamic>{
          'type': 'function_call',
          'id': 'fc_1',
          'call_id': 'call_weather',
          'name': 'get_weather',
          'arguments': '{',
        },
      });

      reducer.apply(<String, dynamic>{
        'type': 'response.function_call_arguments.delta',
        'output_index': 0,
        'delta': '"city":"Tokyo"}',
      });

      reducer.apply(<String, dynamic>{
        'type': 'response.output_item.done',
        'output_index': 1,
        'item': <String, dynamic>{
          'type': 'function_call_output',
          'call_id': 'call_weather',
          'output': '{"temperature":22}',
        },
      });

      final response = reducer.currentResponse;

      expect(response.correlatedCalls.length, 1);
      expect(response.correlatedCalls.single.isComplete, isTrue);
      expect(
        response.correlatedCalls.single.output?.parsedOutput['temperature'],
        22,
      );
    });
  });
}
