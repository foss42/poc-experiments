import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/sse_client.dart';
import '../../../core/models/benchmark_config.dart';
import '../../../core/models/eval_config.dart';
import '../../settings/providers/settings_provider.dart';
import 'eval_config_provider.dart';

class ModelResult {
  const ModelResult({required this.model, this.result, this.error});
  final String model;
  final Map<String, dynamic>? result;
  final String? error;

  bool get hasError => error != null;
}

class CompareState {
  const CompareState({
    this.isRunning = false,
    this.done = 0,
    this.total = 0,
    this.results = const [],
    this.isComplete = false,
  });

  final bool isRunning;
  final int done;
  final int total;
  final List<ModelResult> results;
  final bool isComplete;

  double get progress => total == 0 ? 0.0 : done / total;

  CompareState copyWith({
    bool? isRunning,
    int? done,
    int? total,
    List<ModelResult>? results,
    bool? isComplete,
  }) {
    return CompareState(
      isRunning: isRunning ?? this.isRunning,
      done: done ?? this.done,
      total: total ?? this.total,
      results: results ?? this.results,
      isComplete: isComplete ?? this.isComplete,
    );
  }
}

class CompareNotifier extends StateNotifier<CompareState> {
  CompareNotifier(this._ref) : super(const CompareState());

  final Ref _ref;
  CancelToken? _cancelToken;
  StreamSubscription<SSEEvent>? _sub;

  Future<void> run() async {
    final config = _ref.read(evalConfigProvider);
    final dio = _ref.read(dioProvider);
    final apiKey = _ref.read(settingsProvider).openRouterApiKey;

    _cancelToken = CancelToken();
    state = const CompareState(isRunning: true);

    try {
      final body = _buildRequest(config, openRouterApiKey: apiKey);
      final response = await dio.post<ResponseBody>(
        '/api/eval/harness/compare',
        data: body,
        options: Options(
          responseType: ResponseType.stream,
          receiveTimeout: const Duration(minutes: 15),
        ),
        cancelToken: _cancelToken,
      );

      _sub = parseSseStream(response.data!).listen(
        _onEvent,
        onError: (_) => _finish(),
        onDone: _finish,
        cancelOnError: false,
      );
    } on DioException catch (e) {
      if (!CancelToken.isCancel(e)) {
        state = const CompareState();
      }
    }
  }

  void _onEvent(SSEEvent event) {
    switch (event) {
      case SSEInit(:final totalModels):
        state = state.copyWith(total: totalModels);
      case SSEModelComplete(:final model, :final result, :final done):
        state = state.copyWith(
          done: done,
          results: [
            ...state.results,
            ModelResult(model: model, result: result),
          ],
        );
      case SSEModelError(:final model, :final error):
        state = state.copyWith(
          done: state.done + 1,
          results: [
            ...state.results,
            ModelResult(model: model, error: error),
          ],
        );
      case SSEComplete():
        state = state.copyWith(isRunning: false, isComplete: true);
    }
  }

  void _finish() {
    state = state.copyWith(isRunning: false);
  }

  void stop() {
    _cancelToken?.cancel();
    _sub?.cancel();
    _cancelToken = null;
    _sub = null;
    state = state.copyWith(isRunning: false);
  }

  @override
  void dispose() {
    stop();
    super.dispose();
  }
}

Map<String, dynamic> _buildRequest(EvalConfig config, {String? openRouterApiKey}) {
  final providerStr = switch (config.provider) {
    EvalProvider.ollama => 'ollama',
    EvalProvider.openrouter => 'openrouter',
    EvalProvider.huggingface => 'huggingface',
  };
  return {
    'model_type': 'hf-multimodal',
    'models': config.models,
    'tasks': config.tasks,
    'num_fewshot': 0,
    'limit': config.sampleLimit,
    'device': 'cpu',
    'harness': config.benchmark.harness,
    'provider': providerStr,
    if (config.provider == EvalProvider.openrouter &&
        openRouterApiKey != null &&
        openRouterApiKey.isNotEmpty)
      'openrouter_api_key': openRouterApiKey,
  };
}

final compareProvider =
    StateNotifierProvider<CompareNotifier, CompareState>(
  (ref) => CompareNotifier(ref),
);
