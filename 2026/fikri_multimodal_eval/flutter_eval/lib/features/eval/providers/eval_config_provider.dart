import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/benchmark_config.dart';
import '../../../core/models/eval_config.dart';

String _defaultModel(BenchmarkConfig benchmark, EvalProvider provider, Modality modality) {
  if (modality == Modality.agent) return 'qwen2.5:1.5b';
  return switch (provider) {
    EvalProvider.ollama => benchmark.defaultModelOllama ?? '',
    EvalProvider.openrouter => 'openai/gpt-4o-mini',
    EvalProvider.huggingface => benchmark.defaultModelHf ?? '',
  };
}

EvalConfig _initialConfig() {
  final benchmark = imageBenchmarks[0]; // MMMU
  return EvalConfig(
    modality: Modality.image,
    provider: EvalProvider.huggingface,
    benchmark: benchmark,
    tasks: [benchmark.tasks.first],
    models: [benchmark.defaultModelHf ?? ''],
    sampleLimit: 10,
  );
}

class EvalConfigNotifier extends StateNotifier<EvalConfig> {
  EvalConfigNotifier() : super(_initialConfig());

  void switchModality(Modality modality) {
    final benchmarks = benchmarksForModality(modality);
    final benchmark = benchmarks.first;
    state = EvalConfig(
      modality: modality,
      provider: EvalProvider.huggingface,
      benchmark: benchmark,
      tasks: [benchmark.tasks.first],
      models: [_defaultModel(benchmark, EvalProvider.huggingface, modality)],
      sampleLimit: modality == Modality.agent ? 5 : 10,
    );
  }

  void switchProvider(EvalProvider provider) {
    final model = _defaultModel(state.benchmark, provider, state.modality);
    state = state.copyWith(provider: provider, models: [model]);
  }

  void selectBenchmark(BenchmarkConfig benchmark) {
    final model = _defaultModel(benchmark, state.provider, state.modality);
    state = state.copyWith(
      benchmark: benchmark,
      tasks: [benchmark.tasks.first],
      models: [model],
    );
  }

  void setTasks(List<String> tasks) {
    state = state.copyWith(tasks: tasks);
  }

  void setModels(List<String> models) {
    state = state.copyWith(models: models);
  }

  void setSampleLimit(int limit) {
    state = state.copyWith(sampleLimit: limit);
  }
}

final evalConfigProvider =
    StateNotifierProvider<EvalConfigNotifier, EvalConfig>(
  (ref) => EvalConfigNotifier(),
);
