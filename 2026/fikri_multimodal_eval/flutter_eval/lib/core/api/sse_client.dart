import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';

// ─── Compare eval SSE ─────────────────────────────────────────────────────

sealed class SSEEvent {
  const SSEEvent();
}

class SSEInit extends SSEEvent {
  const SSEInit({required this.totalModels});
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
  const SSEModelError({required this.model, required this.error});
  final String model;
  final String error;
}

class SSEComplete extends SSEEvent {
  const SSEComplete();
}

// ─── Single eval SSE ──────────────────────────────────────────────────────

sealed class EvalSSEEvent {
  const EvalSSEEvent();
}

class EvalSSEStarted extends EvalSSEEvent {
  const EvalSSEStarted(this.message);
  final String message;
}

class EvalSSEProgress extends EvalSSEEvent {
  const EvalSSEProgress(this.message, this.elapsed);
  final String message;
  final int elapsed;
}

class EvalSSEComplete extends EvalSSEEvent {
  const EvalSSEComplete(this.result);
  final Map<String, dynamic> result;
}

class EvalSSEError extends EvalSSEEvent {
  const EvalSSEError(this.detail);
  final String detail;
}

// ─── Custom eval SSE ──────────────────────────────────────────────────────

sealed class CustomEvalSSEEvent {
  const CustomEvalSSEEvent();
}

class CustomEvalStarted extends CustomEvalSSEEvent {
  const CustomEvalStarted({required this.total, this.totalModels = 1});
  final int total;
  final int totalModels;
}

class CustomEvalModelStarted extends CustomEvalSSEEvent {
  const CustomEvalModelStarted({
    required this.model,
    required this.modelIndex,
    required this.totalModels,
  });
  final String model;
  final int modelIndex;
  final int totalModels;
}

class CustomEvalSample extends CustomEvalSSEEvent {
  const CustomEvalSample({
    required this.index,
    required this.total,
    required this.filename,
    required this.question,
    required this.modelAnswer,
    this.correct,
    this.model,
    this.modelIndex,
    this.thumbnailUri,
  });
  final int index;
  final int total;
  final String filename;
  final String question;
  final String modelAnswer;
  final bool? correct;
  final String? model;
  final int? modelIndex;
  final String? thumbnailUri;
}

class CustomEvalSampleError extends CustomEvalSSEEvent {
  const CustomEvalSampleError({
    required this.index,
    required this.filename,
    required this.detail,
    this.model,
    this.modelIndex,
  });
  final int index;
  final String filename;
  final String detail;
  final String? model;
  final int? modelIndex;
}

class CustomEvalModelComplete extends CustomEvalSSEEvent {
  const CustomEvalModelComplete({
    required this.model,
    required this.modelIndex,
    required this.results,
    this.accuracy,
  });
  final String model;
  final int modelIndex;
  final double? accuracy;
  final List<Map<String, dynamic>> results;
}

class CustomEvalComplete extends CustomEvalSSEEvent {
  const CustomEvalComplete({
    required this.evalId,
    this.results = const [],
    this.accuracy,
    this.comparison,
  });
  final String evalId;
  final double? accuracy;
  final List<Map<String, dynamic>> results;
  /// For compare mode: model → list of sample results
  final Map<String, List<Map<String, dynamic>>>? comparison;
}

class CustomEvalError extends CustomEvalSSEEvent {
  const CustomEvalError(this.detail);
  final String detail;
}

// ─── Shared byte reader ───────────────────────────────────────────────────

/// Reads a raw SSE byte stream and yields each JSON payload string
/// (the part after "data: ", trimmed). Skips empty data lines and
/// non-data lines (comments, keep-alives).
Stream<String> _readSseLines(ResponseBody responseBody) async* {
  final lineBuffer = StringBuffer();

  await for (final chunk in responseBody.stream) {
    final decoded = utf8.decode(chunk, allowMalformed: true);
    lineBuffer.write(decoded);

    String buffer = lineBuffer.toString();
    lineBuffer.clear();

    while (buffer.contains('\n')) {
      final idx = buffer.indexOf('\n');
      final line = buffer.substring(0, idx).trim();
      buffer = buffer.substring(idx + 1);

      if (line.startsWith('data: ')) {
        final payload = line.substring(6).trim();
        if (payload.isNotEmpty) yield payload;
      }
    }

    if (buffer.isNotEmpty) lineBuffer.write(buffer);
  }
}

// ─── Parsers ──────────────────────────────────────────────────────────────

Stream<SSEEvent> parseSseStream(ResponseBody body) async* {
  await for (final payload in _readSseLines(body)) {
    try {
      final json = jsonDecode(payload) as Map<String, dynamic>;
      final event = _parseEvent(json);
      if (event != null) yield event;
    } catch (_) {
      continue;
    }
  }
}

Stream<EvalSSEEvent> parseEvalSseStream(ResponseBody body) async* {
  await for (final payload in _readSseLines(body)) {
    try {
      final json = jsonDecode(payload) as Map<String, dynamic>;
      final event = _parseEvalEvent(json);
      if (event != null) yield event;
    } catch (_) {
      continue;
    }
  }
}

Stream<CustomEvalSSEEvent> parseCustomEvalSseStream(ResponseBody body) async* {
  await for (final payload in _readSseLines(body)) {
    try {
      final json = jsonDecode(payload) as Map<String, dynamic>;
      final event = _parseCustomEvalEvent(json);
      if (event != null) yield event;
    } catch (_) {
      continue;
    }
  }
}

// ─── Event parsers ────────────────────────────────────────────────────────

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

EvalSSEEvent? _parseEvalEvent(Map<String, dynamic> json) {
  final type = json['type'] as String? ?? '';
  switch (type) {
    case 'started':
      return EvalSSEStarted(json['message'] as String? ?? 'Starting…');
    case 'progress':
      return EvalSSEProgress(
        json['message'] as String? ?? 'Running…',
        json['elapsed'] as int? ?? 0,
      );
    case 'complete':
      return EvalSSEComplete(Map<String, dynamic>.from(json)..remove('type'));
    case 'error':
      return EvalSSEError(json['detail'] as String? ?? 'Unknown error');
    default:
      return null;
  }
}

CustomEvalSSEEvent? _parseCustomEvalEvent(Map<String, dynamic> json) {
  final type = json['type'] as String? ?? '';
  switch (type) {
    case 'started':
      return CustomEvalStarted(
        total: json['total'] as int? ?? 0,
        totalModels: json['total_models'] as int? ?? 1,
      );
    case 'model_started':
      return CustomEvalModelStarted(
        model: json['model'] as String? ?? '',
        modelIndex: json['model_index'] as int? ?? 0,
        totalModels: json['total_models'] as int? ?? 1,
      );
    case 'sample':
      return CustomEvalSample(
        index: json['index'] as int? ?? 0,
        total: json['total'] as int? ?? 0,
        filename: json['filename'] as String? ?? '',
        question: json['question'] as String? ?? '',
        modelAnswer: json['model_answer'] as String? ?? '',
        correct: json['correct'] as bool?,
        model: json['model'] as String?,
        modelIndex: json['model_index'] as int?,
        thumbnailUri: json['thumbnail'] as String?,
      );
    case 'sample_error':
      return CustomEvalSampleError(
        index: json['index'] as int? ?? 0,
        filename: json['filename'] as String? ?? '',
        detail: json['detail'] as String? ?? 'Error',
        model: json['model'] as String?,
        modelIndex: json['model_index'] as int?,
      );
    case 'model_complete':
      return CustomEvalModelComplete(
        model: json['model'] as String? ?? '',
        modelIndex: json['model_index'] as int? ?? 0,
        accuracy: (json['accuracy'] as num?)?.toDouble(),
        results: (json['results'] as List<dynamic>?)
                ?.map((e) => (e as Map).cast<String, dynamic>())
                .toList() ??
            [],
      );
    case 'complete':
      Map<String, List<Map<String, dynamic>>>? comparison;
      if (json['comparison'] != null) {
        comparison = (json['comparison'] as Map<String, dynamic>).map(
          (k, v) => MapEntry(
            k,
            (v as List).map((e) => (e as Map).cast<String, dynamic>()).toList(),
          ),
        );
      }
      return CustomEvalComplete(
        evalId: json['eval_id'] as String? ?? '',
        accuracy: (json['accuracy'] as num?)?.toDouble(),
        results: (json['results'] as List<dynamic>?)
                ?.map((e) => (e as Map).cast<String, dynamic>())
                .toList() ??
            [],
        comparison: comparison,
      );
    case 'error':
      return CustomEvalError(json['detail'] as String? ?? 'Unknown error');
    default:
      return null;
  }
}
