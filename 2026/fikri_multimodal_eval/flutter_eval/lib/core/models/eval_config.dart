import 'benchmark_config.dart';

class EvalConfig {
  const EvalConfig({
    required this.modality,
    required this.provider,
    required this.benchmark,
    required this.tasks,
    required this.models,
    required this.sampleLimit,
  });

  final Modality modality;
  final EvalProvider provider;
  final BenchmarkConfig benchmark;
  final List<String> tasks;
  final List<String> models;
  final int sampleLimit;

  EvalConfig copyWith({
    Modality? modality,
    EvalProvider? provider,
    BenchmarkConfig? benchmark,
    List<String>? tasks,
    List<String>? models,
    int? sampleLimit,
  }) {
    return EvalConfig(
      modality: modality ?? this.modality,
      provider: provider ?? this.provider,
      benchmark: benchmark ?? this.benchmark,
      tasks: tasks ?? this.tasks,
      models: models ?? this.models,
      sampleLimit: sampleLimit ?? this.sampleLimit,
    );
  }
}
