import 'detection_result.dart';
import 'response_format.dart';

/// Stateless detector that inspects an HTTP response and decides which
/// renderer should handle it.
///
/// Design principles
/// -----------------
/// * **Never throws.** Every code path that might fail is wrapped so that
///   malformed input always falls back to [ResponseFormat.standard].
/// * **Conservative.** A false negative (standard returned for a Responses
///   API payload) degrades to raw JSON display — the current behaviour and
///   acceptable. A false positive (Responses API renderer used on standard
///   JSON) would break the UI and is never acceptable.
/// * **Stateless.** Each [detect] call is independent; no internal state is
///   mutated or retained between calls.

class OpenResponsesDetector {
  const OpenResponsesDetector();

  // The known output item types defined by the OpenAI Responses API.
  static const _knownOutputTypes = {
    'reasoning',
    'function_call',
    'function_call_output',
    'message',
  };

  /// Inspect [responseBody] and [headers] and return a [DetectionResult].
  ///
  /// Detection precedence:
  /// 1. If headers indicate SSE **and** the body type starts with `response.`
  ///    → [ResponseFormat.openResponsesStreaming]
  /// 2. If the body looks like a completed Responses API payload
  ///    → [ResponseFormat.openResponses]
  /// 3. Otherwise → [ResponseFormat.standard]
  DetectionResult detect(
    Map<String, dynamic>? responseBody,
    Map<String, String>? headers,
  ) {
    try {
      return _detectInternal(responseBody, headers);
    } catch (_) {
      // Any unexpected exception — fall back to standard immediately.
      return _standard('Unexpected error during detection; defaulting to standard.');
    }
  }

  // ---------------------------------------------------------------------------
  // Internal implementation
  // ---------------------------------------------------------------------------

  DetectionResult _detectInternal(
    Map<String, dynamic>? responseBody,
    Map<String, String>? headers,
  ) {
    // Guard: null or empty body cannot match any Responses API format.
    if (responseBody == null || responseBody.isEmpty) {
      return _standard('Response body is null or empty.');
    }

    // --- Check 1: SSE streaming ---
    final streamingResult = _checkStreaming(responseBody, headers);
    if (streamingResult != null) return streamingResult;

    // --- Check 2: Completed Responses API payload ---
    final openResponsesResult = _checkOpenResponses(responseBody);
    if (openResponsesResult != null) return openResponsesResult;

    // --- Fallback ---
    return _standard('No Responses API signals found in body or headers.');
  }

  // ---------------------------------------------------------------------------
  // Streaming detection
  // ---------------------------------------------------------------------------

  DetectionResult? _checkStreaming(
    Map<String, dynamic> body,
    Map<String, String>? headers,
  ) {
    // Condition 1: content-type must contain 'text/event-stream'.
    final hasEventStreamHeader = _hasEventStreamContentType(headers);
    if (!hasEventStreamHeader) return null;

    // Condition 2: body must have a 'type' field starting with 'response.'.
    final type = _safeString(body, 'type');
    if (type == null || !type.startsWith('response.')) return null;

    return DetectionResult(
      format: ResponseFormat.openResponsesStreaming,
      confidence: 0.95,
      reason: "SSE content-type header detected and body 'type' field starts "
          "with 'response.' (value: '$type').",
    );
  }

  bool _hasEventStreamContentType(Map<String, String>? headers) {
    if (headers == null || headers.isEmpty) return false;
    // Headers are case-insensitive by HTTP spec; check lower-cased key.
    for (final entry in headers.entries) {
      if (entry.key.toLowerCase() == 'content-type') {
        return entry.value.contains('text/event-stream');
      }
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Completed Open Responses detection
  // ---------------------------------------------------------------------------

  DetectionResult? _checkOpenResponses(Map<String, dynamic> body) {
    // Condition 1: 'object' == 'response'
    final object = _safeString(body, 'object');
    if (object != 'response') return null;

    // Condition 2: 'output' key exists and is a List.
    final rawOutput = body['output'];
    if (rawOutput is! List) return null;

    // Condition 3: output list is not empty.
    if (rawOutput.isEmpty) return null;

    // Condition 4: at least one item has a known Responses API 'type' field.
    final hasKnownType = rawOutput.any((item) {
      if (item is! Map<String, dynamic>) return false;
      final type = _safeString(item, 'type');
      return type != null && _knownOutputTypes.contains(type);
    });
    if (!hasKnownType) return null;

    return DetectionResult(
      format: ResponseFormat.openResponses,
      confidence: 0.95,
      reason: "Body has object='response', a non-empty 'output' list, and at "
          'least one item with a known Responses API type '
          '(${_knownOutputTypes.join(', ')}).',
    );
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  String? _safeString(Map<String, dynamic> map, String key) {
    try {
      final value = map[key];
      return value is String ? value : null;
    } catch (_) {
      return null;
    }
  }

  DetectionResult _standard(String reason) => DetectionResult(
        format: ResponseFormat.standard,
        confidence: 1.0,
        reason: reason,
      );
}
