import 'response_format.dart';

/// The outcome of a single [OpenResponsesDetector.detect] call.
///
/// [format]     — which renderer should handle this response.
/// [confidence] — how certain the detector is (0.0–1.0).
/// [reason]     — human-readable explanation of the decision, useful for
///                debugging and test assertions.

class DetectionResult {
  const DetectionResult({
    required this.format,
    required this.confidence,
    required this.reason,
  }) : assert(confidence >= 0.0 && confidence <= 1.0);

  final ResponseFormat format;
  final double confidence;
  final String reason;

  @override
  String toString() =>
      'DetectionResult(format: ${format.name}, '
      'confidence: $confidence, reason: "$reason")';
}
