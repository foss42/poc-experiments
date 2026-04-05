class ModelConfig {
  final String id;
  final String name;
  final String provider;
  final String modelName;
  final double temperature;
  final int maxTokens;
  final String baseUrl;
  final bool supportsVision;
  final String createdAt;

  ModelConfig({
    required this.id,
    required this.name,
    required this.provider,
    required this.modelName,
    required this.temperature,
    required this.maxTokens,
    required this.baseUrl,
    required this.supportsVision,
    required this.createdAt,
  });

  factory ModelConfig.fromJson(Map<String, dynamic> json) {
    return ModelConfig(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      provider: json['provider'] ?? 'openai',
      modelName: json['model_name'] ?? '',
      temperature: (json['temperature'] ?? 0.7).toDouble(),
      maxTokens: json['max_tokens'] ?? 256,
      baseUrl: json['base_url'] ?? '',
      supportsVision: json['supports_vision'] ?? false,
      createdAt: json['created_at'] ?? '',
    );
  }
}
