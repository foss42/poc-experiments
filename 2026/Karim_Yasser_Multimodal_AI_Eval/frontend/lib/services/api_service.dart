import 'dart:convert';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import '../models/dataset.dart';
import '../models/model_config.dart';
import '../models/evaluation.dart';
import '../models/benchmark.dart';

class ApiService {
  static const String baseUrl = 'http://127.0.0.1:9000/api';

  final Dio _dio = Dio(
    BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 60),
      headers: {'Accept': 'application/json'},
    ),
  );

  // ─── Health ─────────────────────────────────────────────────────────

  Future<bool> healthCheck() async {
    try {
      final response = await _dio.get('/health');
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  // ─── Datasets ───────────────────────────────────────────────────────

  Future<Dataset> uploadDataset({
    required Uint8List fileBytes,
    required String fileName,
    String name = '',
    String description = '',
  }) async {
    final formData = FormData.fromMap({
      'file': MultipartFile.fromBytes(fileBytes, filename: fileName),
      'name': name.isEmpty ? fileName.replaceAll('.json', '') : name,
      'description': description,
    });
    final response = await _dio.post('/datasets/upload', data: formData);
    return Dataset.fromJson(response.data);
  }

  Future<List<Dataset>> listDatasets() async {
    final response = await _dio.get('/datasets');
    return (response.data as List).map((e) => Dataset.fromJson(e)).toList();
  }

  Future<Dataset> getDataset(String id) async {
    final response = await _dio.get('/datasets/$id');
    return Dataset.fromJson(response.data);
  }

  // ─── Models ─────────────────────────────────────────────────────────

  Future<ModelConfig> createModelConfig({
    required String name,
    required String modelName,
    String provider = 'openai',
    String apiKey = '',
    double temperature = 0.7,
    int maxTokens = 256,
    String baseUrl = 'https://api.openai.com/v1',
    bool supportsVision = false,
  }) async {
    final normalizedProvider = provider.trim().toLowerCase();
    final resolvedBaseUrl =
        (normalizedProvider == 'huggingface' && baseUrl.trim().isEmpty)
        ? 'https://router.huggingface.co/v1'
        : baseUrl;

    final response = await _dio.post(
      '/models',
      data: {
        'name': name,
        'provider': normalizedProvider,
        'api_key': apiKey,
        'model_name': modelName,
        'temperature': temperature,
        'max_tokens': maxTokens,
        'base_url': resolvedBaseUrl,
        'supports_vision': supportsVision,
      },
    );
    return ModelConfig.fromJson(response.data);
  }

  Future<List<ModelConfig>> listModelConfigs() async {
    final response = await _dio.get('/models');
    return (response.data as List).map((e) => ModelConfig.fromJson(e)).toList();
  }

  Future<void> deleteModelConfig(String id) async {
    await _dio.delete('/models/$id');
  }

  // ─── Evaluations ───────────────────────────────────────────────────

  Stream<EvaluationRun> streamEvaluation(String runId) async* {
    final response = await _dio.get<ResponseBody>(
      '/evaluations/$runId/stream',
      options: Options(
        responseType: ResponseType.stream,
        headers: {'Accept': 'text/event-stream', 'Cache-Control': 'no-cache'},
      ),
    );

    final stream = response.data!.stream
        .cast<List<int>>()
        .transform(utf8.decoder)
        .transform(const LineSplitter());

    await for (final line in stream) {
      if (line.startsWith('data: ')) {
        final jsonStr = line.substring(6).trim();
        if (jsonStr.isEmpty) continue;

        try {
          final data = jsonDecode(jsonStr);
          if (data.containsKey('error')) continue;
          yield EvaluationRun.fromJson(data);
        } catch (e) {
          // Silent catch for unexpected payload structures
        }
      }
    }
  }

  Future<EvaluationRun> startEvaluation({
    required String datasetId,
    required String modelConfigId,
  }) async {
    final response = await _dio.post(
      '/evaluations',
      data: {'dataset_id': datasetId, 'model_config_id': modelConfigId},
    );
    return EvaluationRun.fromJson(response.data);
  }

  Future<List<EvaluationRun>> listEvaluations() async {
    final response = await _dio.get('/evaluations');
    return (response.data as List)
        .map((e) => EvaluationRun.fromJson(e))
        .toList();
  }

  Future<EvaluationRun> getEvaluation(String id) async {
    final response = await _dio.get('/evaluations/$id');
    return EvaluationRun.fromJson(response.data);
  }

  Future<List<EvaluationResult>> getEvaluationResults(String runId) async {
    final response = await _dio.get('/evaluations/$runId/results');
    return (response.data as List)
        .map((e) => EvaluationResult.fromJson(e))
        .toList();
  }

  // ─── Benchmarks ────────────────────────────────────────────────────

  Future<List<AvailableTask>> listBenchmarkTasks() async {
    final response = await _dio.get('/benchmarks/tasks');
    return (response.data as List)
        .map((e) => AvailableTask.fromJson(e))
        .toList();
  }

  Future<BenchmarkRun> startBenchmark({
    required String modelConfigId,
    required List<String> tasks,
    String modelType = 'local-chat-completions',
    int? limit,
    int? numFewshot,
    bool applyChatTemplate = true,
    bool fewshotAsMultiturn = true,
  }) async {
    final response = await _dio.post(
      '/benchmarks',
      data: {
        'model_config_id': modelConfigId,
        'model_type': modelType,
        'tasks': tasks,
        'limit': ?limit,
        'num_fewshot': ?numFewshot,
        'apply_chat_template': applyChatTemplate,
        'fewshot_as_multiturn': fewshotAsMultiturn,
      },
    );
    return BenchmarkRun.fromJson(response.data);
  }

  Future<List<BenchmarkRun>> listBenchmarks() async {
    final response = await _dio.get('/benchmarks');
    return (response.data as List)
        .map((e) => BenchmarkRun.fromJson(e))
        .toList();
  }

  Stream<BenchmarkRun> streamBenchmark(String runId) async* {
    final response = await _dio.get<ResponseBody>(
      '/benchmarks/$runId/stream',
      options: Options(
        responseType: ResponseType.stream,
        receiveTimeout: const Duration(minutes: 30),
        headers: {'Accept': 'text/event-stream', 'Cache-Control': 'no-cache'},
      ),
    );

    final stream = response.data!.stream
        .cast<List<int>>()
        .transform(utf8.decoder)
        .transform(const LineSplitter());

    await for (final line in stream) {
      if (line.startsWith('data: ')) {
        final jsonStr = line.substring(6).trim();
        if (jsonStr.isEmpty) continue;

        try {
          final data = jsonDecode(jsonStr);
          if (data.containsKey('error')) continue;
          yield BenchmarkRun.fromJson(data);
        } catch (e) {
          // Silent catch
        }
      }
    }
  }

  Future<List<BenchmarkTaskResult>> getBenchmarkResults(String runId) async {
    final response = await _dio.get('/benchmarks/$runId/results');
    return (response.data as List)
        .map((e) => BenchmarkTaskResult.fromJson(e))
        .toList();
  }

  // ─── Admin ─────────────────────────────────────────────────────────

  Future<void> resetData() async {
    await _dio.post('/reset');
  }

  // ─── Settings ───────────────────────────────────────────────────────

  Future<String> getSetting(String key) async {
    final response = await _dio.get('/settings/$key');
    return response.data['value'] as String? ?? '';
  }

  Future<void> setSetting(String key, String value) async {
    await _dio.put('/settings/$key', data: {'value': value});
  }
}
