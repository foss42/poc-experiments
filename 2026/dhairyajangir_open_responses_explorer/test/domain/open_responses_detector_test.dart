import 'package:flutter_test/flutter_test.dart';
import 'package:open_responses_explorer/open_responses_detector.dart';
import 'package:open_responses_explorer/response_models.dart';

void main() {
  group('OpenResponsesDetector', () {
    test('finds nested GenUI descriptor in unknown item payload', () {
      final response = _parsedWithItems(const <ResponseItem>[
        UnknownItem(
          raw: <String, dynamic>{
            'wrapper': <String, dynamic>{
              'payload': <String, dynamic>{
                'type': 'screen',
                'components': <dynamic>[],
              },
            },
          },
        ),
      ]);

      final descriptor = OpenResponsesDetector.extractGenUIDescriptorJson(
        response,
      );

      expect(descriptor, isNotNull);
      expect(descriptor?['type'], 'screen');
    });

    test('returns null when no screen descriptor present', () {
      final response = _parsedWithItems(const <ResponseItem>[
        UnknownItem(
          raw: <String, dynamic>{
            'type': 'something_else',
            'data': <dynamic>[1, 2, 3],
          },
        ),
      ]);

      final descriptor = OpenResponsesDetector.extractGenUIDescriptorJson(
        response,
      );

      expect(descriptor, isNull);
    });

    test('finds descriptor nested in function_call_output', () {
      final response = _parsedWithItems(<ResponseItem>[
        FunctionCallOutputItem(
          callId: 'call_001',
          parsedOutput: <String, dynamic>{
            'type': 'screen',
            'components': <dynamic>[],
          },
        ),
      ]);

      final descriptor = OpenResponsesDetector.extractGenUIDescriptorJson(
        response,
      );

      expect(descriptor, isNotNull);
      expect(descriptor?['type'], 'screen');
    });
  });
}

ParsedResponse _parsedWithItems(List<ResponseItem> items) {
  return ParsedResponse(
    id: 'resp_test',
    status: 'completed',
    model: 'gpt-4o',
    items: items,
    correlatedCalls: const <CorrelatedCall>[],
    totalTokens: null,
  );
}
