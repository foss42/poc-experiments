import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';

/// Typed SSE event emitted by the comparison endpoint.
sealed class SSEEvent {
  const SSEEvent();
}

class SSEInit extends SSEEvent {
  SSEInit({required this.totalModels});
  final int totalModels;
}

class SSEModelComplete extends SSEEvent {
  SSEModelComplete({
    required this.model,
    required this.result,
    required this.done,
    required this.total,
  });
  final String model;
  final Map<String, dynamic> result;
  final int done;
  final int total;
}

class SSEModelError extends SSEEvent {
  SSEModelError({required this.model, required this.error});
  final String model;
  final String error;
}

class SSEComplete extends SSEEvent {
  const SSEComplete();
}

/// Parses a raw SSE byte stream from Dio into typed [SSEEvent] objects.
///
/// The backend emits newline-delimited JSON prefixed with `data: `:
///   data: {"type":"init","total_models":2}\n\n
///   data: {"type":"model_complete","model":"x","result":{...}}\n\n
///   data: {"type":"complete"}\n\n
Stream<SSEEvent> parseSseStream(ResponseBody responseBody) async* {
  final lineBuffer = StringBuffer();

  await for (final chunk in responseBody.stream) {
    final decoded = utf8.decode(chunk, allowMalformed: true);
    lineBuffer.write(decoded);

    // Process all complete lines in the buffer
    String buffer = lineBuffer.toString();
    lineBuffer.clear();

    while (buffer.contains('\n')) {
      final idx = buffer.indexOf('\n');
      final line = buffer.substring(0, idx).trim();
      buffer = buffer.substring(idx + 1);

      if (line.startsWith('data: ')) {
        final jsonStr = line.substring(6).trim();
        if (jsonStr.isEmpty) continue;

        SSEEvent? event;
        try {
          final json = jsonDecode(jsonStr) as Map<String, dynamic>;
          event = _parseEvent(json);
        } catch (_) {
          // Malformed JSON — skip silently per AC
          continue;
        }
        if (event != null) yield event;
      }
    }

    // Keep any incomplete line in the buffer
    if (buffer.isNotEmpty) {
      lineBuffer.write(buffer);
    }
  }
}

SSEEvent? _parseEvent(Map<String, dynamic> json) {
  final type = json['type'] as String? ?? '';
  switch (type) {
    case 'init':
      return SSEInit(totalModels: json['total_models'] as int? ?? 0);
    case 'model_complete':
      return SSEModelComplete(
        model: json['model'] as String? ?? '',
        result: ((json['result'] as Map?)?.cast<String, dynamic>()) ?? {},
        done: json['done'] as int? ?? 0,
        total: json['total'] as int? ?? 0,
      );
    case 'model_error':
      return SSEModelError(
        model: json['model'] as String? ?? '',
        error: json['error'] as String? ?? '',
      );
    case 'complete':
      return const SSEComplete();
    default:
      return null;
  }
}
