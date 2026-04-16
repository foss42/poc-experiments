import 'dart:math';

String generateId() {
  final rng = Random.secure();
  final bytes = List<int>.generate(16, (_) => rng.nextInt(256));
  return bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
}

// ---------------------------------------------------------------------------
// ApiRequest
// ---------------------------------------------------------------------------

class ApiRequest {
  final String id;
  String name;
  String method;
  String url;
  Map<String, String> headers;
  String? body;
  String? collectionId;

  ApiRequest({
    required this.id,
    required this.name,
    required this.method,
    required this.url,
    Map<String, String>? headers,
    this.body,
    this.collectionId,
  }) : headers = headers ?? {};

  factory ApiRequest.create({
    required String name,
    required String method,
    required String url,
    Map<String, String>? headers,
    String? body,
    String? collectionId,
  }) =>
      ApiRequest(
        id: generateId(),
        name: name,
        method: method.toUpperCase(),
        url: url,
        headers: headers ?? {},
        body: body,
        collectionId: collectionId,
      );

  factory ApiRequest.fromJson(Map<String, dynamic> json) => ApiRequest(
        id: json['id'] as String,
        name: json['name'] as String,
        method: json['method'] as String,
        url: json['url'] as String,
        headers: (json['headers'] as Map<String, dynamic>? ?? {})
            .map((k, v) => MapEntry(k, v.toString())),
        body: json['body'] as String?,
        collectionId: json['collectionId'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'method': method,
        'url': url,
        'headers': headers,
        if (body != null) 'body': body,
        if (collectionId != null) 'collectionId': collectionId,
      };

  ApiRequest copyWith({
    String? name,
    String? method,
    String? url,
    Map<String, String>? headers,
    String? body,
    String? collectionId,
  }) =>
      ApiRequest(
        id: id,
        name: name ?? this.name,
        method: method ?? this.method,
        url: url ?? this.url,
        headers: headers ?? Map.from(this.headers),
        body: body ?? this.body,
        collectionId: collectionId ?? this.collectionId,
      );
}

// ---------------------------------------------------------------------------
// ApiCollection
// ---------------------------------------------------------------------------

class ApiCollection {
  final String id;
  String name;
  String? description;
  List<ApiRequest> requests;

  ApiCollection({
    required this.id,
    required this.name,
    this.description,
    List<ApiRequest>? requests,
  }) : requests = requests ?? [];

  factory ApiCollection.create({
    required String name,
    String? description,
  }) =>
      ApiCollection(
        id: generateId(),
        name: name,
        description: description,
      );

  factory ApiCollection.fromJson(Map<String, dynamic> json) => ApiCollection(
        id: json['id'] as String,
        name: json['name'] as String,
        description: json['description'] as String?,
        requests: (json['requests'] as List<dynamic>? ?? [])
            .map((r) => ApiRequest.fromJson(r as Map<String, dynamic>))
            .toList(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        if (description != null) 'description': description,
        'requests': requests.map((r) => r.toJson()).toList(),
      };
}

// ---------------------------------------------------------------------------
// ApiEnvironment
// ---------------------------------------------------------------------------

class ApiEnvironment {
  final String id;
  String name;
  Map<String, String> variables;

  ApiEnvironment({
    required this.id,
    required this.name,
    Map<String, String>? variables,
  }) : variables = variables ?? {};

  factory ApiEnvironment.create({required String name}) =>
      ApiEnvironment(id: generateId(), name: name);

  factory ApiEnvironment.fromJson(Map<String, dynamic> json) => ApiEnvironment(
        id: json['id'] as String,
        name: json['name'] as String,
        variables: (json['variables'] as Map<String, dynamic>? ?? {})
            .map((k, v) => MapEntry(k, v.toString())),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'variables': variables,
      };
}

// ---------------------------------------------------------------------------
// ResponseMeta
// ---------------------------------------------------------------------------

class ResponseMeta {
  final int statusCode;
  final String statusMessage;
  final String? contentType;
  final int sizeBytes;
  final int durationMs;
  final String? body;

  ResponseMeta({
    required this.statusCode,
    required this.statusMessage,
    this.contentType,
    required this.sizeBytes,
    required this.durationMs,
    this.body,
  });

  factory ResponseMeta.fromJson(Map<String, dynamic> json) => ResponseMeta(
        statusCode: json['statusCode'] as int,
        statusMessage: json['statusMessage'] as String,
        contentType: json['contentType'] as String?,
        sizeBytes: json['sizeBytes'] as int,
        durationMs: json['durationMs'] as int,
        body: json['body'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'statusCode': statusCode,
        'statusMessage': statusMessage,
        if (contentType != null) 'contentType': contentType,
        'sizeBytes': sizeBytes,
        'durationMs': durationMs,
        if (body != null) 'body': body,
      };
}

// ---------------------------------------------------------------------------
// HistoryEntry
// ---------------------------------------------------------------------------

class HistoryEntry {
  final String id;
  final DateTime timestamp;
  final ApiRequest request;
  final ResponseMeta response;
  String? savedAs;

  HistoryEntry({
    required this.id,
    required this.timestamp,
    required this.request,
    required this.response,
    this.savedAs,
  });

  factory HistoryEntry.create({
    required ApiRequest request,
    required ResponseMeta response,
  }) =>
      HistoryEntry(
        id: generateId(),
        timestamp: DateTime.now(),
        request: request,
        response: response,
      );

  factory HistoryEntry.fromJson(Map<String, dynamic> json) => HistoryEntry(
        id: json['id'] as String,
        timestamp: DateTime.parse(json['timestamp'] as String),
        request: ApiRequest.fromJson(json['request'] as Map<String, dynamic>),
        response:
            ResponseMeta.fromJson(json['response'] as Map<String, dynamic>),
        savedAs: json['savedAs'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'timestamp': timestamp.toIso8601String(),
        'request': request.toJson(),
        'response': response.toJson(),
        if (savedAs != null) 'savedAs': savedAs,
      };
}
