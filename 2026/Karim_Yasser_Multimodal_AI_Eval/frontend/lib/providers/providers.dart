import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/dataset.dart';
import '../models/model_config.dart';
import '../models/evaluation.dart';
import '../models/benchmark.dart';
import '../services/api_service.dart';

// ─── API Service Singleton ─────────────────────────────────────────────

final apiServiceProvider = Provider<ApiService>((ref) => ApiService());

// ─── Datasets ──────────────────────────────────────────────────────────

final datasetsProvider = AsyncNotifierProvider<DatasetsNotifier, List<Dataset>>(
  DatasetsNotifier.new,
);

class DatasetsNotifier extends AsyncNotifier<List<Dataset>> {
  @override
  Future<List<Dataset>> build() async {
    final api = ref.read(apiServiceProvider);
    return api.listDatasets();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(
      () => ref.read(apiServiceProvider).listDatasets(),
    );
  }
}

// ─── Model Configs ─────────────────────────────────────────────────────

final modelConfigsProvider =
    AsyncNotifierProvider<ModelConfigsNotifier, List<ModelConfig>>(
      ModelConfigsNotifier.new,
    );

class ModelConfigsNotifier extends AsyncNotifier<List<ModelConfig>> {
  @override
  Future<List<ModelConfig>> build() async {
    final api = ref.read(apiServiceProvider);
    return api.listModelConfigs();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(
      () => ref.read(apiServiceProvider).listModelConfigs(),
    );
  }
}

// ─── Evaluations ───────────────────────────────────────────────────────

final evaluationsProvider =
    AsyncNotifierProvider<EvaluationsNotifier, List<EvaluationRun>>(
      EvaluationsNotifier.new,
    );

class EvaluationsNotifier extends AsyncNotifier<List<EvaluationRun>> {
  @override
  Future<List<EvaluationRun>> build() async {
    final api = ref.read(apiServiceProvider);
    return api.listEvaluations();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(
      () => ref.read(apiServiceProvider).listEvaluations(),
    );
  }
}

// ─── Benchmark Tasks (available) ───────────────────────────────────────

final benchmarkTasksProvider =
    AsyncNotifierProvider<BenchmarkTasksNotifier, List<AvailableTask>>(
      BenchmarkTasksNotifier.new,
    );

class BenchmarkTasksNotifier extends AsyncNotifier<List<AvailableTask>> {
  @override
  Future<List<AvailableTask>> build() async {
    final api = ref.read(apiServiceProvider);
    return api.listBenchmarkTasks();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(
      () => ref.read(apiServiceProvider).listBenchmarkTasks(),
    );
  }
}

// ─── Benchmark Runs ────────────────────────────────────────────────────

final benchmarkRunsProvider =
    AsyncNotifierProvider<BenchmarkRunsNotifier, List<BenchmarkRun>>(
      BenchmarkRunsNotifier.new,
    );

class BenchmarkRunsNotifier extends AsyncNotifier<List<BenchmarkRun>> {
  @override
  Future<List<BenchmarkRun>> build() async {
    final api = ref.read(apiServiceProvider);
    return api.listBenchmarks();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(
      () => ref.read(apiServiceProvider).listBenchmarks(),
    );
  }
}

// ─── Selected nav index ────────────────────────────────────────────────

final selectedNavIndexProvider =
    NotifierProvider<SelectedNavIndexNotifier, int>(
      SelectedNavIndexNotifier.new,
    );

class SelectedNavIndexNotifier extends Notifier<int> {
  @override
  int build() => 0;

  void select(int index) {
    state = index;
  }
}

// ─── Selected Run auto-open ────────────────────────────────────────────

final selectedRunIdProvider =
    NotifierProvider<SelectedRunIdNotifier, String?>(
      SelectedRunIdNotifier.new,
    );

class SelectedRunIdNotifier extends Notifier<String?> {
  @override
  String? build() => null;

  void select(String? runId) {
    state = runId;
  }
}

