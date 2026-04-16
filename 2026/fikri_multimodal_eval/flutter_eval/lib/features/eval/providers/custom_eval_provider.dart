import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/sse_client.dart';
import '../../../core/models/benchmark_config.dart';
import 'custom_dataset_provider.dart';
import 'eval_config_provider.dart';
import '../../../features/settings/providers/settings_provider.dart';

class CustomEvalState {
  const CustomEvalState({
    this.isRunning = false,
    this.total = 0,
    this.sampleResults = const [],
    this.sampleErrors = const [],
    this.accuracy,
    this.evalId,
    this.error,
    this.isComplete = false,
    // compare mode
    this.isCompareMode = false,
    this.currentModel,
    this.currentModelIndex = 0,
    this.totalModels = 1,
    this.modelResults = const {},
    this.modelAccuracies = const {},
  });

  final bool isRunning;
  final int total;
  final List<Map<String, dynamic>> sampleResults;
  final List<Map<String, dynamic>> sampleErrors;
  final double? accuracy;
  final String? evalId;
  final String? error;
  final bool isComplete;

  // compare mode fields
  final bool isCompareMode;
  final String? currentModel;
  final int currentModelIndex;
  final int totalModels;
  final Map<String, List<Map<String, dynamic>>> modelResults;
  final Map<String, double?> modelAccuracies;

  int get received => sampleResults.length + sampleErrors.length;
  double get progress => total == 0 ? 0.0 : received / total;

  CustomEvalState copyWith({
    bool? isRunning,
    int? total,
    List<Map<String, dynamic>>? sampleResults,
    List<Map<String, dynamic>>? sampleErrors,
    double? accuracy,
    String? evalId,
    String? error,
    bool? isComplete,
    bool? isCompareMode,
    String? currentModel,
    int? currentModelIndex,
    int? totalModels,
    Map<String, List<Map<String, dynamic>>>? modelResults,
    Map<String, double?>? modelAccuracies,
  }) {
    return CustomEvalState(
      isRunning: isRunning ?? this.isRunning,
      total: total ?? this.total,
      sampleResults: sampleResults ?? this.sampleResults,
      sampleErrors: sampleErrors ?? this.sampleErrors,
      accuracy: accuracy ?? this.accuracy,
      evalId: evalId ?? this.evalId,
      error: error ?? this.error,
      isComplete: isComplete ?? this.isComplete,
      isCompareMode: isCompareMode ?? this.isCompareMode,
      currentModel: currentModel ?? this.currentModel,
      currentModelIndex: currentModelIndex ?? this.currentModelIndex,
      totalModels: totalModels ?? this.totalModels,
      modelResults: modelResults ?? this.modelResults,
      modelAccuracies: modelAccuracies ?? this.modelAccuracies,
    );
  }
}

class CustomEvalNotifier extends StateNotifier<CustomEvalState> {
  CustomEvalNotifier(this._ref) : super(const CustomEvalState());

  final Ref _ref;
  StreamSubscription<CustomEvalSSEEvent>? _sub;

  Future<void> run() async {
    if (state.isRunning) return;
    _sub?.cancel();
    _sub = null;

    final samples = _ref.read(customDatasetProvider);
    if (samples.isEmpty) {
      state = state.copyWith(error: 'Add at least one image before running.');
      return;
    }

    final unanswered = samples.where((s) => s.question.trim().isEmpty).toList();
    if (unanswered.isNotEmpty) {
      state = state.copyWith(error: 'Every image needs a question.');
      return;
    }

    final config = _ref.read(evalConfigProvider);
    if (config.models.isEmpty || config.models.first.trim().isEmpty) {
      state = state.copyWith(error: 'Select a model before running.');
      return;
    }
    final dio = _ref.read(dioProvider);
    final apiKey = _ref.read(settingsProvider).openRouterApiKey;
    final providerStr = switch (config.provider) {
      EvalProvider.ollama => 'ollama',
      EvalProvider.openrouter => 'openrouter',
      EvalProvider.huggingface => 'huggingface',
    };

    state = const CustomEvalState(isRunning: true);

    try {
      // ── Step 1: upload images ──────────────────────────────────────────
      final formData = FormData();
      final manifest = samples
          .map((s) => {
                'filename': s.image.name,
                'question': s.question,
                if (s.choices.isNotEmpty) 'choices': s.choices,
                if (s.answer != null && s.answer!.isNotEmpty) 'answer': s.answer,
              })
          .toList();

      for (final sample in samples) {
        final bytes = await sample.image.readAsBytes();
        formData.files.add(MapEntry(
          'files[]',
          MultipartFile.fromBytes(bytes, filename: sample.image.name),
        ));
      }
      formData.fields.add(MapEntry('manifest', jsonEncode(manifest)));

      final uploadResp = await dio.post<Map<String, dynamic>>(
        '/api/custom-eval/upload',
        data: formData,
        options: Options(receiveTimeout: const Duration(minutes: 5)),
      );
      final sessionId = uploadResp.data!['session_id'] as String;

      // ── Step 2: stream eval results (single or compare) ───────────────
      final streamResp = await dio.post<ResponseBody>(
        '/api/custom-eval/stream',
        data: {
          'session_id': sessionId,
          'provider': providerStr,
          'models': config.models,  // always send full list
          if (config.provider == EvalProvider.openrouter && apiKey.isNotEmpty)
            'openrouter_api_key': apiKey,
        },
        options: Options(
          responseType: ResponseType.stream,
          receiveTimeout: const Duration(minutes: 20),
        ),
      );

      _sub = parseCustomEvalSseStream(streamResp.data!).listen(
        _onEvent,
        onError: (e) => _setError(e.toString()),
        onDone: () {
          if (!state.isComplete) {
            state = state.copyWith(isRunning: false);
          }
        },
        cancelOnError: false,
      );
    } catch (e) {
      _setError(e.toString());
    }
  }

  void _onEvent(CustomEvalSSEEvent event) {
    switch (event) {
      case CustomEvalStarted(:final total, :final totalModels):
        state = state.copyWith(
          total: total,
          totalModels: totalModels,
          isCompareMode: totalModels > 1,
        );

      case CustomEvalModelStarted(:final model, :final modelIndex, :final totalModels):
        state = state.copyWith(
          currentModel: model,
          currentModelIndex: modelIndex,
          totalModels: totalModels,
          isCompareMode: true,
        );

      case CustomEvalSample(
          :final index,
          :final filename,
          :final question,
          :final modelAnswer,
          :final correct,
          :final model,
          :final modelIndex,
          :final thumbnailUri,
        ):
        state = state.copyWith(
          sampleResults: [
            ...state.sampleResults,
            {
              'type': 'sample',
              'index': index,
              'filename': filename,
              'question': question,
              'model_answer': modelAnswer,
              'correct': correct,
              if (model != null) 'model': model,
              if (modelIndex != null) 'model_index': modelIndex,
              if (thumbnailUri != null) 'thumbnail': thumbnailUri,
            }
          ],
        );

      case CustomEvalSampleError(:final index, :final filename, :final detail, :final model, :final modelIndex):
        state = state.copyWith(
          sampleErrors: [
            ...state.sampleErrors,
            {
              'type': 'sample_error',
              'index': index,
              'filename': filename,
              'detail': detail,
              if (model != null) 'model': model,
              if (modelIndex != null) 'model_index': modelIndex,
            },
          ],
        );

      case CustomEvalModelComplete(:final model, :final accuracy, :final results):
        final updatedResults = Map<String, List<Map<String, dynamic>>>.from(state.modelResults);
        updatedResults[model] = results;
        final updatedAccuracies = Map<String, double?>.from(state.modelAccuracies);
        updatedAccuracies[model] = accuracy;
        state = state.copyWith(
          modelResults: updatedResults,
          modelAccuracies: updatedAccuracies,
        );

      case CustomEvalComplete(:final evalId, :final accuracy, :final results, :final comparison):
        if (comparison != null) {
          // compare mode — use comparison data, clear streaming buffers
          state = state.copyWith(
            isRunning: false,
            isComplete: true,
            evalId: evalId,
            modelResults: comparison,
            sampleResults: const [],
            sampleErrors: const [],
          );
        } else {
          // single model mode
          state = state.copyWith(
            isRunning: false,
            isComplete: true,
            evalId: evalId,
            accuracy: accuracy,
            sampleResults: results,
            sampleErrors: const [],
          );
        }

      case CustomEvalError(:final detail):
        _setError(detail);
    }
  }

  void _setError(String message) {
    state = state.copyWith(isRunning: false, isComplete: false, error: message);
  }

  void reset() {
    _sub?.cancel();
    _sub = null;
    state = const CustomEvalState();
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}

final customEvalProvider =
    StateNotifierProvider<CustomEvalNotifier, CustomEvalState>(
  (ref) => CustomEvalNotifier(ref),
);
