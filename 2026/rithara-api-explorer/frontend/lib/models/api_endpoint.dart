import 'dart:convert';

class ApiParameter {
  final String name;
  final String location; // 'query', 'path', 'header', 'body'
  final String type;
  final bool required;
  final String description;

  const ApiParameter({
    required this.name,
    required this.location,
    required this.type,
    required this.required,
    required this.description,
  });

  factory ApiParameter.fromJson(String name, Map<String, dynamic> json, String location) {
    return ApiParameter(
      name: name,
      location: location,
      type: json['type'] as String? ?? 'string',
      required: json['required'] as bool? ?? false,
      description: json['description'] as String? ?? '',
    );
  }
}

class ApiEndpointResponse {
  final String description;
  final dynamic example;

  const ApiEndpointResponse({
    required this.description,
    this.example,
  });
}

class ApiEndpoint {
  final String method;
  final String path;
  final String description;
  final List<ApiParameter>? parameters;
  final dynamic requestBody;
  final Map<String, ApiEndpointResponse>? responses;
  final String? url;
  final Map<String, dynamic>? headers;
  final String? sampleRequest;

  const ApiEndpoint({
    required this.method,
    required this.path,
    required this.description,
    this.parameters,
    this.requestBody,
    this.responses,
    this.url,
    this.headers,
    this.sampleRequest,
  });

  factory ApiEndpoint.fromTemplateJson(Map<String, dynamic> json) {
    // Extract path from URL if possible, otherwise use name
    String path = json['url'] as String? ?? json['name'] as String;
    try {
      final uri = Uri.parse(path);
      path = uri.path;
      if (path.isEmpty) path = "/";
    } catch (_) {}

    // Sample request from body
    String? sampleReq;
    if (json['body'] != null) {
      if (json['body'] is Map && json['body']['basic'] != null) {
        sampleReq = jsonEncode(json['body']['basic']['value']);
      } else {
        sampleReq = jsonEncode(json['body']);
      }
    }

    return ApiEndpoint(
      method: json['method'] as String? ?? 'GET',
      path: path,
      description: json['description'] as String? ?? '',
      url: json['url'] as String?,
      headers: json['headers'] as Map<String, dynamic>?,
      sampleRequest: sampleReq,
    );
  }
}