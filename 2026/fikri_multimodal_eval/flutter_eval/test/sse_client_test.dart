import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:flutter_eval/core/api/sse_client.dart';

/// Builds a fake [ResponseBody] from a list of SSE data strings.
ResponseBody _fakeBody(List<String> dataLines) {
  final bytes = dataLines
      .map((line) => utf8.encode('data: $line\n\n'))
      .expand((b) => b)
      .toList();

  final controller = StreamController<Uint8List>();
  controller.add(Uint8List.fromList(bytes));
  controller.close();

  return ResponseBody(
    controller.stream,
    200,
    headers: {},
  );
}

void main() {
  group('parseSseStream', () {
    test('parses SSEInit event', () async {
      final body = _fakeBody([
        jsonEncode({'type': 'init', 'total_models': 3}),
      ]);
      final events = await parseSseStream(body).toList();

      expect(events.length, 1);
      expect(events.first, isA<SSEInit>());
      expect((events.first as SSEInit).totalModels, 3);
    });

    test('parses SSEModelComplete event', () async {
      final body = _fakeBody([
        jsonEncode({
          'type': 'model_complete',
          'model': 'llava-phi3',
          'result': {'results': {}},
          'done': 1,
          'total': 2,
        }),
      ]);
      final events = await parseSseStream(body).toList();

      expect(events.length, 1);
      final event = events.first as SSEModelComplete;
      expect(event.model, 'llava-phi3');
      expect(event.done, 1);
      expect(event.total, 2);
    });

    test('parses SSEModelError event', () async {
      final body = _fakeBody([
        jsonEncode({
          'type': 'model_error',
          'model': 'bad-model',
          'error': 'model not found',
        }),
      ]);
      final events = await parseSseStream(body).toList();

      expect(events.length, 1);
      final event = events.first as SSEModelError;
      expect(event.model, 'bad-model');
      expect(event.error, 'model not found');
    });

    test('parses SSEComplete event', () async {
      final body = _fakeBody([
        jsonEncode({'type': 'complete'}),
      ]);
      final events = await parseSseStream(body).toList();

      expect(events.length, 1);
      expect(events.first, isA<SSEComplete>());
    });

    test('skips malformed JSON silently — stream continues', () async {
      final body = _fakeBody([
        'NOT VALID JSON }{',
        jsonEncode({'type': 'complete'}),
      ]);
      final events = await parseSseStream(body).toList();

      // Bad line skipped, complete event still arrives
      expect(events.length, 1);
      expect(events.first, isA<SSEComplete>());
    });

    test('parses multiple events in correct order', () async {
      final body = _fakeBody([
        jsonEncode({'type': 'init', 'total_models': 2}),
        jsonEncode({
          'type': 'model_complete',
          'model': 'a',
          'result': {},
          'done': 1,
          'total': 2,
        }),
        jsonEncode({
          'type': 'model_complete',
          'model': 'b',
          'result': {},
          'done': 2,
          'total': 2,
        }),
        jsonEncode({'type': 'complete'}),
      ]);
      final events = await parseSseStream(body).toList();

      expect(events.length, 4);
      expect(events[0], isA<SSEInit>());
      expect(events[1], isA<SSEModelComplete>());
      expect(events[2], isA<SSEModelComplete>());
      expect(events[3], isA<SSEComplete>());
    });

    test('unknown event type yields nothing', () async {
      final body = _fakeBody([
        jsonEncode({'type': 'heartbeat'}),
      ]);
      final events = await parseSseStream(body).toList();
      expect(events.isEmpty, isTrue);
    });
  });
}
