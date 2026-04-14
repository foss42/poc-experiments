import 'package:test/test.dart';
import 'package:open_responses_parser/open_responses_parser.dart';

void main() {
  const detector = OpenResponsesDetector();
  const router = ViewRouter();

  // ---------------------------------------------------------------------------
  // Fixtures
  // ---------------------------------------------------------------------------

  // A realistic completed Responses API payload.
  const Map<String, dynamic> kValidOpenResponsesBody = {
    'id': 'resp_test_001',
    'object': 'response',
    'status': 'completed',
    'model': 'gpt-4o',
    'output': [
      {
        'type': 'reasoning',
        'id': 'rs_001',
        'summary': [
          {'type': 'summary_text', 'text': 'Thinking...'},
        ],
      },
      {
        'type': 'message',
        'id': 'msg_001',
        'role': 'assistant',
        'content': [
          {'type': 'output_text', 'text': 'Hello!'},
        ],
      },
    ],
    'usage': {'input_tokens': 10, 'output_tokens': 5},
  };

  // A minimal SSE event map with correct headers.
  const Map<String, dynamic> kSseEventBody = {
    'type': 'response.output_text.delta',
    'output_index': 0,
    'delta': 'Hello',
  };

  const Map<String, String> kSseHeaders = {
    'content-type': 'text/event-stream; charset=utf-8',
  };

  // A plain REST API response — no Responses API signals.
  const Map<String, dynamic> kStandardBody = {
    'userId': 1,
    'id': 1,
    'title': 'delectus aut autem',
    'completed': false,
  };

  // ---------------------------------------------------------------------------
  // Happy-path: openResponses
  // ---------------------------------------------------------------------------

  group('openResponses detection', () {
    test('valid Open Responses payload is detected correctly', () {
      final result = detector.detect(kValidOpenResponsesBody, null);
      expect(result.format, equals(ResponseFormat.openResponses));
    });

    test('confidence is 0.95 for valid payload', () {
      final result = detector.detect(kValidOpenResponsesBody, null);
      expect(result.confidence, equals(0.95));
    });

    test('reason is non-empty', () {
      final result = detector.detect(kValidOpenResponsesBody, null);
      expect(result.reason, isNotEmpty);
    });

    test('routes to OpenResponsesView', () {
      final result = detector.detect(kValidOpenResponsesBody, null);
      expect(router.route(result), equals('OpenResponsesView'));
    });

    test('function_call type is recognised as known type', () {
      final body = {
        'object': 'response',
        'output': [
          {'type': 'function_call', 'id': 'fc_1', 'call_id': 'c1', 'name': 'fn'},
        ],
      };
      final result = detector.detect(body, null);
      expect(result.format, equals(ResponseFormat.openResponses));
    });

    test('function_call_output type is recognised as known type', () {
      final body = {
        'object': 'response',
        'output': [
          {'type': 'function_call_output', 'id': 'fco_1', 'call_id': 'c1'},
        ],
      };
      final result = detector.detect(body, null);
      expect(result.format, equals(ResponseFormat.openResponses));
    });
  });

  // ---------------------------------------------------------------------------
  // Happy-path: openResponsesStreaming
  // ---------------------------------------------------------------------------

  group('openResponsesStreaming detection', () {
    test('SSE headers + response. type is detected correctly', () {
      final result = detector.detect(kSseEventBody, kSseHeaders);
      expect(result.format, equals(ResponseFormat.openResponsesStreaming));
    });

    test('confidence is 0.95 for SSE detection', () {
      final result = detector.detect(kSseEventBody, kSseHeaders);
      expect(result.confidence, equals(0.95));
    });

    test('routes to StreamingTimelineView', () {
      final result = detector.detect(kSseEventBody, kSseHeaders);
      expect(router.route(result), equals('StreamingTimelineView'));
    });

    test('response.completed event is also detected as streaming', () {
      final body = {'type': 'response.completed', 'response': {}};
      final result = detector.detect(body, kSseHeaders);
      expect(result.format, equals(ResponseFormat.openResponsesStreaming));
    });

    test('SSE header but no response. type falls through to body check', () {
      // Body has object=response + valid output → openResponses wins after
      // streaming check fails (type does not start with 'response.').
      final result = detector.detect(kValidOpenResponsesBody, kSseHeaders);
      // Streaming check fails because body 'type' key is absent;
      // body check succeeds → openResponses.
      expect(result.format, equals(ResponseFormat.openResponses));
    });
  });

  // ---------------------------------------------------------------------------
  // Standard fallback
  // ---------------------------------------------------------------------------

  group('standard fallback', () {
    test('plain REST JSON returns standard format', () {
      final result = detector.detect(kStandardBody, null);
      expect(result.format, equals(ResponseFormat.standard));
    });

    test('standard confidence is 1.0', () {
      final result = detector.detect(kStandardBody, null);
      expect(result.confidence, equals(1.0));
    });

    test('routes to StandardJsonView', () {
      final result = detector.detect(kStandardBody, null);
      expect(router.route(result), equals('StandardJsonView'));
    });

    test('null body returns standard', () {
      final result = detector.detect(null, null);
      expect(result.format, equals(ResponseFormat.standard));
    });

    test('empty body map returns standard', () {
      final result = detector.detect({}, null);
      expect(result.format, equals(ResponseFormat.standard));
    });

    test('null headers still performs body detection', () {
      final result = detector.detect(kValidOpenResponsesBody, null);
      // Body check should still succeed without headers.
      expect(result.format, equals(ResponseFormat.openResponses));
    });

    test('empty headers map still performs body detection', () {
      final result = detector.detect(kValidOpenResponsesBody, {});
      expect(result.format, equals(ResponseFormat.openResponses));
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases: output list issues
  // ---------------------------------------------------------------------------

  group('output list edge cases', () {
    test('empty output array returns standard', () {
      final body = {'object': 'response', 'output': <dynamic>[]};
      final result = detector.detect(body, null);
      expect(result.format, equals(ResponseFormat.standard));
    });

    test('output key exists but is not a List returns standard', () {
      final body = {'object': 'response', 'output': 'not a list'};
      final result = detector.detect(body, null);
      expect(result.format, equals(ResponseFormat.standard));
    });

    test('output is a Map (not a List) returns standard', () {
      final body = {'object': 'response', 'output': {'type': 'message'}};
      final result = detector.detect(body, null);
      expect(result.format, equals(ResponseFormat.standard));
    });

    test('all items in output have unknown type fields returns standard', () {
      final body = {
        'object': 'response',
        'output': [
          {'type': 'computer_use', 'id': 'cu_1'},
          {'type': 'image_output', 'id': 'img_1'},
        ],
      };
      final result = detector.detect(body, null);
      expect(result.format, equals(ResponseFormat.standard));
    });

    test('output items that are not maps are ignored; all-unknown → standard',
        () {
      final body = {
        'object': 'response',
        'output': [42, 'string', true],
      };
      final result = detector.detect(body, null);
      expect(result.format, equals(ResponseFormat.standard));
    });

    test('mixed known and unknown types still detects openResponses', () {
      final body = {
        'object': 'response',
        'output': [
          {'type': 'computer_use', 'id': 'cu_1'},
          {'type': 'message', 'id': 'msg_1', 'role': 'assistant'},
        ],
      };
      final result = detector.detect(body, null);
      expect(result.format, equals(ResponseFormat.openResponses));
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases: malformed / adversarial input
  // ---------------------------------------------------------------------------

  group('malformed input never throws', () {
    test('completely null body does not throw', () {
      expect(() => detector.detect(null, null), returnsNormally);
    });

    test('body with null values for known keys does not throw', () {
      final body = <String, dynamic>{'object': null, 'output': null};
      expect(() => detector.detect(body, null), returnsNormally);
    });

    test('deeply nested unexpected types do not throw', () {
      final body = <String, dynamic>{
        'object': 'response',
        'output': [
          <String, dynamic>{'type': null},
        ],
      };
      expect(() => detector.detect(body, null), returnsNormally);
      final result = detector.detect(body, null);
      expect(result.format, equals(ResponseFormat.standard));
    });

    test('headers with mixed case content-type are handled', () {
      final headers = {'Content-Type': 'text/event-stream'};
      final result = detector.detect(kSseEventBody, headers);
      expect(result.format, equals(ResponseFormat.openResponsesStreaming));
    });

    test('SSE headers without matching body type → standard (no crash)', () {
      final result = detector.detect({'type': 'some.other.thing'}, kSseHeaders);
      expect(result.format, equals(ResponseFormat.standard));
    });
  });

  // ---------------------------------------------------------------------------
  // Confidence values
  // ---------------------------------------------------------------------------

  group('confidence values', () {
    test('openResponses confidence is 0.95', () {
      expect(
          detector.detect(kValidOpenResponsesBody, null).confidence, 0.95);
    });

    test('openResponsesStreaming confidence is 0.95', () {
      expect(detector.detect(kSseEventBody, kSseHeaders).confidence, 0.95);
    });

    test('standard confidence is 1.0', () {
      expect(detector.detect(kStandardBody, null).confidence, 1.0);
    });

    test('null body standard confidence is 1.0', () {
      expect(detector.detect(null, null).confidence, 1.0);
    });
  });

  // ---------------------------------------------------------------------------
  // ViewRouter
  // ---------------------------------------------------------------------------

  group('ViewRouter', () {
    test('openResponses → OpenResponsesView', () {
      final result = const DetectionResult(
          format: ResponseFormat.openResponses,
          confidence: 0.95,
          reason: 'test');
      expect(router.route(result), equals('OpenResponsesView'));
    });

    test('openResponsesStreaming → StreamingTimelineView', () {
      final result = const DetectionResult(
          format: ResponseFormat.openResponsesStreaming,
          confidence: 0.95,
          reason: 'test');
      expect(router.route(result), equals('StreamingTimelineView'));
    });

    test('standard → StandardJsonView', () {
      final result = const DetectionResult(
          format: ResponseFormat.standard, confidence: 1.0, reason: 'test');
      expect(router.route(result), equals('StandardJsonView'));
    });
  });
}
