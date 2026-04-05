// ---------------------------------------------------------------------------
// Benchmark models for LM Evaluation Harness integration
// ---------------------------------------------------------------------------

class AvailableTask {
  final String name;
  final String category;
  final bool isMultimodal;
  final String outputType; // "generate_until" or "loglikelihood"
  final String description;

  AvailableTask({
    required this.name,
    required this.category,
    required this.isMultimodal,
    required this.outputType,
    required this.description,
  });

  bool get isGenerateUntil => outputType == 'generate_until';
  bool get isLoglikelihood => outputType == 'loglikelihood';

  factory AvailableTask.fromJson(Map<String, dynamic> json) {
    return AvailableTask(
      name: json['name'] ?? '',
      category: json['category'] ?? '',
      isMultimodal: json['is_multimodal'] ?? false,
      outputType: json['output_type'] ?? 'loglikelihood',
      description: json['description'] ?? '',
    );
  }
}


class BenchmarkRun {
  final String id;
  final String modelConfigId;
  final String modelType;
  final List<String> tasks;
  final String status;
  final int? limit;
  final int? numFewshot;
  final bool applyChatTemplate;
  final bool fewshotAsMultiturn;
  final String? errorMessage;
  final String createdAt;
  final String? completedAt;

  BenchmarkRun({
    required this.id,
    required this.modelConfigId,
    required this.modelType,
    required this.tasks,
    required this.status,
    this.limit,
    this.numFewshot,
    this.applyChatTemplate = true,
    this.fewshotAsMultiturn = true,
    this.errorMessage,
    required this.createdAt,
    this.completedAt,
  });

  bool get isRunning   => status == 'running';
  bool get isCompleted => status == 'completed';
  bool get isFailed    => status == 'failed';
  bool get isPending   => status == 'pending';

  factory BenchmarkRun.fromJson(Map<String, dynamic> json) {
    return BenchmarkRun(
      id: json['id'] ?? '',
      modelConfigId: json['model_config_id'] ?? '',
      modelType: json['model_type'] ?? 'local-chat-completions',
      tasks: (json['tasks'] is List)
          ? List<String>.from(json['tasks'])
          : <String>[],
      status: json['status'] ?? 'pending',
      limit: json['limit'],
      numFewshot: json['num_fewshot'],
      applyChatTemplate: json['apply_chat_template'] ?? true,
      fewshotAsMultiturn: json['fewshot_as_multiturn'] ?? true,
      errorMessage: json['error_message'],
      createdAt: json['created_at'] ?? '',
      completedAt: json['completed_at'],
    );
  }
}


class BenchmarkTaskResult {
  final String id;
  final String runId;
  final String taskName;
  final String metricName;
  final double metricValue;
  final double? stderr;
  final bool isMultimodal;

  BenchmarkTaskResult({
    required this.id,
    required this.runId,
    required this.taskName,
    required this.metricName,
    required this.metricValue,
    this.stderr,
    required this.isMultimodal,
  });

  factory BenchmarkTaskResult.fromJson(Map<String, dynamic> json) {
    return BenchmarkTaskResult(
      id: json['id'] ?? '',
      runId: json['run_id'] ?? '',
      taskName: json['task_name'] ?? '',
      metricName: json['metric_name'] ?? '',
      metricValue: (json['metric_value'] ?? 0.0).toDouble(),
      stderr: json['stderr']?.toDouble(),
      isMultimodal: json['is_multimodal'] ?? false,
    );
  }
}
