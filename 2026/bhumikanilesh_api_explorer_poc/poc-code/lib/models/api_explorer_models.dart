import 'dart:convert';

import 'package:apidash_core/apidash_core.dart';

class ApiExplorerApiSummary {
  const ApiExplorerApiSummary({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.qualityScore,
    required this.requiresAuth,
    required this.endpointCount,
    required this.source,
    required this.baseUrl,
    required this.lastSyncedAt,
    this.readinessBadges = const [],
    this.tags = const [],
  });

  final String id;
  final String title;
  final String description;
  final String category;
  final int qualityScore;
  final bool requiresAuth;
  final int endpointCount;
  final String source;
  final String baseUrl;
  final DateTime lastSyncedAt;
  final List<String> readinessBadges;
  final List<String> tags;

  factory ApiExplorerApiSummary.fromMap(Map<String, dynamic> map) {
    List<String> parseStrings(dynamic values) {
      return (values as List<dynamic>? ?? const [])
          .map((value) => value.toString())
          .toList();
    }

    return ApiExplorerApiSummary(
      id: map['id'] as String? ?? '',
      title: map['title'] as String? ?? '',
      description: map['description'] as String? ?? '',
      category: map['category'] as String? ?? 'General',
      qualityScore: (map['qualityScore'] as num?)?.toInt() ?? 0,
      requiresAuth: map['requiresAuth'] as bool? ?? false,
      endpointCount: (map['endpointCount'] as num?)?.toInt() ?? 0,
      source: map['source'] as String? ?? '',
      baseUrl: map['baseUrl'] as String? ?? '',
      lastSyncedAt: DateTime.tryParse(map['lastSyncedAt'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      readinessBadges: parseStrings(map['readinessBadges']),
      tags: parseStrings(map['tags']),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'category': category,
      'qualityScore': qualityScore,
      'requiresAuth': requiresAuth,
      'endpointCount': endpointCount,
      'source': source,
      'baseUrl': baseUrl,
      'lastSyncedAt': lastSyncedAt.toIso8601String(),
      'readinessBadges': readinessBadges,
      'tags': tags,
    };
  }
}

class ApiExplorerEndpoint {
  const ApiExplorerEndpoint({
    required this.id,
    required this.method,
    required this.path,
    required this.summary,
    required this.description,
    required this.authType,
    this.headers = const [],
    this.queryParameters = const [],
    this.pathParameters = const [],
    this.requestBodyExample,
    this.responseExample,
    this.contentType,
  });

  final String id;
  final HTTPVerb method;
  final String path;
  final String summary;
  final String description;
  final String authType;
  final List<NameValueModel> headers;
  final List<NameValueModel> queryParameters;
  final List<NameValueModel> pathParameters;
  final String? requestBodyExample;
  final String? responseExample;
  final ContentType? contentType;

  bool get hasBody =>
      requestBodyExample != null && requestBodyExample!.trim().isNotEmpty;

  factory ApiExplorerEndpoint.fromMap(Map<String, dynamic> map) {
    HTTPVerb parseMethod(String raw) {
      return HTTPVerb.values.firstWhere(
        (value) => value.name == raw.toLowerCase(),
        orElse: () => HTTPVerb.get,
      );
    }

    List<NameValueModel> parseRows(dynamic rows) {
      return (rows as List<dynamic>? ?? const [])
          .map(
            (row) {
              final rowMap = Map<String, dynamic>.from(row as Map);
              return NameValueModel(
                name: rowMap['name'] as String? ?? '',
                value: rowMap['value']?.toString() ?? '',
              );
            },
          )
          .toList();
    }

    ContentType? parseContentType(String? raw) {
      if (raw == null) return null;
      return ContentType.values.firstWhere(
        (value) => value.name == raw,
        orElse: () => ContentType.json,
      );
    }

    return ApiExplorerEndpoint(
      id: map['id'] as String? ?? '',
      method: parseMethod(map['method'] as String? ?? 'get'),
      path: map['path'] as String? ?? '',
      summary: (map['summary'] ?? map['name']) as String? ?? '',
      description: (map['description'] ?? map['note']) as String? ?? '',
      authType: map['authType'] as String? ?? map['auth_type'] as String? ?? 'none',
      headers: parseRows(map['headers']),
      queryParameters: parseRows(map['queryParameters'] ?? map['params']),
      pathParameters: parseRows(map['pathParameters']),
      requestBodyExample:
          (map['requestBodyExample'] ?? map['body_text']) as String?,
      responseExample: map['responseExample'] as String?,
      contentType: parseContentType(map['contentType'] as String?),
    );
  }

  Map<String, dynamic> toMap() {
    List<Map<String, String>> rowsToMap(List<NameValueModel> rows) {
      return rows
          .map((row) => {'name': row.name, 'value': row.value.toString()})
          .toList();
    }

    return {
      'id': id,
      'method': method.name,
      'path': path,
      'summary': summary,
      'description': description,
      'authType': authType,
      'headers': rowsToMap(headers),
      'queryParameters': rowsToMap(queryParameters),
      'pathParameters': rowsToMap(pathParameters),
      'requestBodyExample': requestBodyExample,
      'responseExample': responseExample,
      'contentType': contentType?.name,
    };
  }
}

class ApiExplorerApiDetails {
  const ApiExplorerApiDetails({
    required this.summary,
    required this.version,
    required this.sourceUrl,
    required this.endpoints,
  });

  final ApiExplorerApiSummary summary;
  final String version;
  final String sourceUrl;
  final List<ApiExplorerEndpoint> endpoints;

  factory ApiExplorerApiDetails.fromMap(Map<String, dynamic> map) {
    return ApiExplorerApiDetails(
      summary: ApiExplorerApiSummary.fromMap(
        Map<String, dynamic>.from(map['summary'] as Map),
      ),
      version: map['version'] as String? ?? '',
      sourceUrl: map['sourceUrl'] as String? ?? '',
      endpoints:
          (map['endpoints'] as List<dynamic>? ?? const [])
              .map(
                (endpoint) => ApiExplorerEndpoint.fromMap(
                  Map<String, dynamic>.from(endpoint as Map),
                ),
              )
              .toList(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'summary': summary.toMap(),
      'version': version,
      'sourceUrl': sourceUrl,
      'endpoints': endpoints.map((endpoint) => endpoint.toMap()).toList(),
    };
  }
}

class ApiExplorerFailureRecord {
  const ApiExplorerFailureRecord({
    required this.id,
    required this.source,
    required this.stage,
    required this.reason,
    required this.createdAt,
  });

  final String id;
  final String source;
  final String stage;
  final String reason;
  final DateTime createdAt;

  factory ApiExplorerFailureRecord.fromMap(Map<String, dynamic> map) {
    return ApiExplorerFailureRecord(
      id: map['id'] as String? ?? '',
      source: map['source'] as String? ?? '',
      stage: map['stage'] as String? ?? '',
      reason: map['reason'] as String? ?? '',
      createdAt: DateTime.tryParse(map['createdAt'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'source': source,
      'stage': stage,
      'reason': reason,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

class ApiExplorerUsageRecord {
  const ApiExplorerUsageRecord({
    required this.id,
    required this.apiId,
    required this.userId,
    required this.action,
    required this.createdAt,
    this.endpointId,
  });

  final String id;
  final String apiId;
  final String userId;
  final String action;
  final DateTime createdAt;
  final String? endpointId;

  factory ApiExplorerUsageRecord.fromMap(Map<String, dynamic> map) {
    return ApiExplorerUsageRecord(
      id: map['id'] as String? ?? '',
      apiId: map['apiId'] as String? ?? '',
      userId: map['userId'] as String? ?? '',
      action: map['action'] as String? ?? '',
      createdAt: DateTime.tryParse(map['createdAt'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      endpointId: map['endpointId'] as String?,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'apiId': apiId,
      'userId': userId,
      'action': action,
      'createdAt': createdAt.toIso8601String(),
      'endpointId': endpointId,
    };
  }
}

class ApiExplorerReviewRecord {
  const ApiExplorerReviewRecord({
    required this.id,
    required this.apiId,
    required this.userId,
    required this.rating,
    required this.comment,
    required this.createdAt,
  });

  final String id;
  final String apiId;
  final String userId;
  final int rating;
  final String comment;
  final DateTime createdAt;

  factory ApiExplorerReviewRecord.fromMap(Map<String, dynamic> map) {
    return ApiExplorerReviewRecord(
      id: map['id'] as String? ?? '',
      apiId: map['apiId'] as String? ?? '',
      userId: map['userId'] as String? ?? '',
      rating: (map['rating'] as num?)?.toInt() ?? 0,
      comment: map['comment'] as String? ?? '',
      createdAt: DateTime.tryParse(map['createdAt'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'apiId': apiId,
      'userId': userId,
      'rating': rating,
      'comment': comment,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

class ApiExplorerRemediationRecord {
  const ApiExplorerRemediationRecord({
    required this.id,
    required this.apiId,
    required this.trigger,
    required this.status,
    required this.recommendation,
    required this.createdAt,
  });

  final String id;
  final String apiId;
  final String trigger;
  final String status;
  final String recommendation;
  final DateTime createdAt;

  factory ApiExplorerRemediationRecord.fromMap(Map<String, dynamic> map) {
    return ApiExplorerRemediationRecord(
      id: map['id'] as String? ?? '',
      apiId: map['apiId'] as String? ?? '',
      trigger: map['trigger'] as String? ?? '',
      status: map['status'] as String? ?? '',
      recommendation: map['recommendation'] as String? ?? '',
      createdAt: DateTime.tryParse(map['createdAt'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'apiId': apiId,
      'trigger': trigger,
      'status': status,
      'recommendation': recommendation,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

String encodePrettyJson(Object? value) {
  return const JsonEncoder.withIndent('  ').convert(value);
}
