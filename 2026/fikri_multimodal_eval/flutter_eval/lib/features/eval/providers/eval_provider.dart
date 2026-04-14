import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/models/benchmark_config.dart';
import '../../../core/models/eval_config.dart';
import 'eval_config_provider.dart';

Map<String, dynamic> buildEvalRequest(EvalConfig config) => {
      'model_type': 'hf-multimodal',
      'model_args': config.models.first,
      'tasks': config.tasks,
      'num_fewshot': 0,
      'limit': config.sampleLimit,
      'device': 'cpu',
      'harness': config.benchmark.harness,
      'provider':
          config.provider == EvalProvider.ollama ? 'ollama' : 'huggingface',
    };

class EvalNotifier extends AsyncNotifier<Map<String, dynamic>?> {
  @override
  Future<Map<String, dynamic>?> build() async => null;

  Future<void> run() async {
    final config = ref.read(evalConfigProvider);
    final dio = ref.read(dioProvider);

    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final response = await dio.post(
        '/api/eval/harness',
        data: buildEvalRequest(config),
        options: Options(receiveTimeout: const Duration(minutes: 10)),
      );
      final data = response.data as Map<String, dynamic>;
      if (data.containsKey('error')) throw Exception(data['error'].toString());
      return data;
    });
  }

  void reset() => state = const AsyncData(null);
}

final evalProvider =
    AsyncNotifierProvider<EvalNotifier, Map<String, dynamic>?>(
  EvalNotifier.new,
);
