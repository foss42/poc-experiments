import 'package:flutter_test/flutter_test.dart';
import 'package:open_responses_explorer/domain/open_response_parser.dart';
import 'package:open_responses_explorer/domain/response_models.dart';

void main() {
  group('OpenResponseParser', () {
    test('parses function_call_output from output key', () {
      final parsed = OpenResponseParser.parse(<String, dynamic>{
        'object': 'response',
        'output': <dynamic>[
          <String, dynamic>{
            'type': 'function_call_output',
            'call_id': 'call_weather',
            'output': '{"city": "Tokyo"}',
          },
        ],
      });

      final outputItem = parsed.items.single as FunctionCallOutputItem;
      expect(outputItem.callId, 'call_weather');
      expect(outputItem.parsedOutput['city'], 'Tokyo');
    });

    test('parses function_call_output from legacy parsed_output key', () {
      final parsed = OpenResponseParser.parse(<String, dynamic>{
        'object': 'response',
        'output': <dynamic>[
          <String, dynamic>{
            'type': 'function_call_output',
            'call_id': 'call_weather',
            'parsed_output': <String, dynamic>{'city': 'Tokyo'},
          },
        ],
      });

      final outputItem = parsed.items.single as FunctionCallOutputItem;
      expect(outputItem.callId, 'call_weather');
      expect(outputItem.parsedOutput['city'], 'Tokyo');
    });

    test('generates unique synthetic IDs for missing IDs in same payload', () {
      final parsed = OpenResponseParser.parse(<String, dynamic>{
        'object': 'response',
        'output': <dynamic>[
          <String, dynamic>{
            'type': 'reasoning',
            'summary': <dynamic>[
              <String, dynamic>{'text': 'a'},
            ],
          },
          <String, dynamic>{
            'type': 'reasoning',
            'summary': <dynamic>[
              <String, dynamic>{'text': 'b'},
            ],
          },
        ],
      });

      final reasoningItems = parsed.items.whereType<ReasoningItem>().toList();
      expect(reasoningItems.length, 2);
      expect(reasoningItems[0].id, isNot(equals(reasoningItems[1].id)));
    });

    test('serializes function_call_output with output key', () {
      final parsed = ParsedResponse(
        id: 'resp_1',
        status: 'completed',
        model: 'gpt-4o',
        totalTokens: null,
        items: const <ResponseItem>[
          FunctionCallOutputItem(
            callId: 'call_weather',
            parsedOutput: <String, dynamic>{'city': 'Tokyo'},
          ),
        ],
        correlatedCalls: const <CorrelatedCall>[],
      );

      final json = parsed.toJson();
      final item =
          (json['items'] as List<dynamic>).single as Map<String, dynamic>;

      expect(item.containsKey('output'), isTrue);
      expect(item.containsKey('parsed_output'), isFalse);
    });
  });
}
