import 'package:flutter_test/flutter_test.dart';
import 'package:open_responses_explorer/domain/open_responses_detector.dart';
import 'package:open_responses_explorer/domain/response_models.dart';

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

    test('returns null for descriptor nested beyond max traversal depth', () {
      dynamic deep = <String, dynamic>{
        'type': 'screen',
        'components': <dynamic>[],
      };

      for (var i = 0; i < 80; i++) {
        deep = <String, dynamic>{'next': deep};
      }

      final response = _parsedWithItems(<ResponseItem>[
        UnknownItem(raw: <String, dynamic>{'root': deep}),
      ]);

      final descriptor = OpenResponsesDetector.extractGenUIDescriptorJson(
        response,
      );

      expect(descriptor, isNull);
    });

    test('does not throw on cyclic payload structures', () {
      final cyclic = <String, dynamic>{};
      cyclic['self'] = cyclic;

      final response = _parsedWithItems(<ResponseItem>[
        UnknownItem(raw: <String, dynamic>{'cyclic': cyclic}),
      ]);

      expect(
        () => OpenResponsesDetector.extractGenUIDescriptorJson(response),
        returnsNormally,
      );
      expect(
        OpenResponsesDetector.extractGenUIDescriptorJson(response),
        isNull,
      );
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
