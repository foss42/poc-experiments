class HealthStatus {
  const HealthStatus({
    required this.lmEval,
    required this.lmmsEval,
    required this.inspectAi,
    required this.fasterWhisper,
    required this.ollama,
  });

  factory HealthStatus.fromJson(Map<String, dynamic> json) => HealthStatus(
        lmEval: json['lm_eval'] as bool? ?? false,
        lmmsEval: json['lmms_eval'] as bool? ?? false,
        inspectAi: json['inspect_ai'] as bool? ?? false,
        fasterWhisper: json['faster_whisper'] as bool? ?? false,
        ollama: json['ollama'] as bool? ?? false,
      );

  factory HealthStatus.allOffline() => const HealthStatus(
        lmEval: false,
        lmmsEval: false,
        inspectAi: false,
        fasterWhisper: false,
        ollama: false,
      );

  final bool lmEval;
  final bool lmmsEval;
  final bool inspectAi;
  final bool fasterWhisper;
  final bool ollama;
}
