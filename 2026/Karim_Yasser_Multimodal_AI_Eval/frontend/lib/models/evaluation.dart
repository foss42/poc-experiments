import 'dart:convert';

// ---------------------------------------------------------------------------
// Five-Level Response Quality Taxonomy (MUSE-inspired, arXiv:2603.02482)
// ---------------------------------------------------------------------------

enum ScoreLevel {
  nonResponsive(1, 'Non-Responsive'),
  mismatch(2, 'Mismatch'),
  indirectMatch(3, 'Indirect Match'),
  partialMatch(4, 'Partial Match'),
  fullMatch(5, 'Full Match');

  final int value;
  final String label;
  const ScoreLevel(this.value, this.label);

  static ScoreLevel fromInt(int v) =>
      ScoreLevel.values.firstWhere((e) => e.value == v,
          orElse: () => ScoreLevel.nonResponsive);
}

// ---------------------------------------------------------------------------
// EvaluationRun — run-centric entity (MUSE dual-metric: Hard/Soft/GZW)
// ---------------------------------------------------------------------------

class EvaluationRun {
  final String id;
  final String datasetId;
  final String modelConfigId;
  final String status;
  // Dual metrics (replaces single "accuracy")
  final double hardScore;      // % Full Match (level 5)
  final double softScore;      // % Full + Partial Match (levels 4-5)
  final double grayZoneWidth;  // softScore - hardScore
  final double avgLatencyMs;
  final int totalItems;
  final int completedItems;
  final String createdAt;
  final String? completedAt;

  EvaluationRun({
    required this.id,
    required this.datasetId,
    required this.modelConfigId,
    required this.status,
    required this.hardScore,
    required this.softScore,
    required this.grayZoneWidth,
    required this.avgLatencyMs,
    required this.totalItems,
    required this.completedItems,
    required this.createdAt,
    this.completedAt,
  });

  double get progress => totalItems > 0 ? completedItems / totalItems : 0.0;

  bool get isRunning   => status == 'running';
  bool get isCompleted => status == 'completed';
  bool get isFailed    => status == 'failed';

  factory EvaluationRun.fromJson(Map<String, dynamic> json) {
    return EvaluationRun(
      id: json['id'] ?? '',
      datasetId: json['dataset_id'] ?? '',
      modelConfigId: json['model_config_id'] ?? '',
      status: json['status'] ?? 'pending',
      // Support old "accuracy" field for backwards compat with existing DB rows
      hardScore: (json['hard_score'] ?? json['accuracy'] ?? 0.0).toDouble(),
      softScore: (json['soft_score'] ?? json['accuracy'] ?? 0.0).toDouble(),
      grayZoneWidth: (json['gray_zone_width'] ?? 0.0).toDouble(),
      avgLatencyMs: (json['avg_latency_ms'] ?? 0.0).toDouble(),
      totalItems: json['total_items'] ?? 0,
      completedItems: json['completed_items'] ?? 0,
      createdAt: json['created_at'] ?? '',
      completedAt: json['completed_at'],
    );
  }
}

// ---------------------------------------------------------------------------
// EvaluationResult — per-item with five-level score
// ---------------------------------------------------------------------------

class EvaluationResult {
  final String id;
  final String runId;
  final String input;
  final String expectedOutput;
  final String actualOutput;
  // Five-level taxonomy fields
  final ScoreLevel scoreLevel;
  final String scoreLabel;
  final bool isHardMatch;  // level == 5
  final bool isSoftMatch;  // level >= 4
  final double latencyMs;
  final String? mediaUrl;

  EvaluationResult({
    required this.id,
    required this.runId,
    required this.input,
    required this.expectedOutput,
    required this.actualOutput,
    required this.scoreLevel,
    required this.scoreLabel,
    required this.isHardMatch,
    required this.isSoftMatch,
    required this.latencyMs,
    this.mediaUrl,
  });

  factory EvaluationResult.fromJson(Map<String, dynamic> json) {
    var rawExpected = json['expected_output'];
    String expected = '';
    if (rawExpected is List) {
      expected = rawExpected.map((e) => e.toString()).join(', ');
    } else if (rawExpected is String) {
      if (rawExpected.trim().startsWith('[') && rawExpected.trim().endsWith(']')) {
        try {
          var decoded = jsonDecode(rawExpected);
          if (decoded is List) {
            expected = decoded.map((e) => e.toString()).join(', ');
          } else {
            expected = rawExpected;
          }
        } catch (_) {
          expected = rawExpected;
        }
      } else {
        expected = rawExpected;
      }
    } else if (rawExpected != null) {
      expected = rawExpected.toString();
    }

    // Support old is_match field for backwards compat
    final bool legacyIsMatch = json['is_match'] ?? false;
    final int levelInt = json['score_level'] ??
        (legacyIsMatch ? 5 : 2); // map old bool to level
    final ScoreLevel level = ScoreLevel.fromInt(levelInt);

    return EvaluationResult(
      id: json['id'] ?? '',
      runId: json['run_id'] ?? '',
      input: json['input'] ?? '',
      expectedOutput: expected,
      actualOutput: json['actual_output'] ?? '',
      scoreLevel: level,
      scoreLabel: json['score_label'] ?? level.label,
      isHardMatch: json['hard_score'] != null
          ? (json['hard_score'] as num) >= 1.0
          : legacyIsMatch,
      isSoftMatch: json['soft_score'] != null
          ? (json['soft_score'] as num) >= 1.0
          : legacyIsMatch,
      latencyMs: (json['latency_ms'] ?? 0.0).toDouble(),
      mediaUrl: json['media_url'],
    );
  }
}
