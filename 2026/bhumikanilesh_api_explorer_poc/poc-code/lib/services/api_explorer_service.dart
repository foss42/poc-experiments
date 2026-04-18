import 'dart:convert';
import 'dart:io';

import 'package:apidash/models/api_explorer_models.dart';
import 'package:apidash_core/apidash_core.dart';
import 'package:hive_ce_flutter/hive_flutter.dart';
import 'package:path/path.dart' as p;
import 'package:uuid/uuid.dart';

import 'hive_services.dart';
const String kApiExplorerCatalogIdsKey = 'catalogIds';
const String kApiExplorerFailureIdsKey = 'failureIds';
const String kApiExplorerUsageIdsKey = 'usageIds';
const String kApiExplorerReviewIdsKey = 'reviewIds';
const String kApiExplorerRemediationIdsKey = 'remediationIds';
const String kApiExplorerPipelineRootKey = 'pipelineRoot';

class ApiExplorerService {
  ApiExplorerService() : _box = Hive.box(kApiExplorerBox);

  final Box _box;
  final Uuid _uuid = const Uuid();

  List<ApiExplorerApiSummary> getCatalog() {
    final ids = (_box.get(kApiExplorerCatalogIdsKey) as List<dynamic>? ?? const [])
        .cast<String>();
    return ids
        .map((id) => _box.get('api:$id'))
        .whereType<Map>()
        .map((map) => ApiExplorerApiDetails.fromMap(Map<String, dynamic>.from(map)).summary)
        .toList();
  }

  ApiExplorerApiDetails? getApiDetails(String apiId) {
    final raw = _box.get('api:$apiId');
    if (raw is! Map) return null;
    return ApiExplorerApiDetails.fromMap(Map<String, dynamic>.from(raw));
  }

  List<ApiExplorerFailureRecord> getFailures() {
    final ids = (_box.get(kApiExplorerFailureIdsKey) as List<dynamic>? ?? const [])
        .cast<String>();
    return ids
        .map((id) => _box.get('failure:$id'))
        .whereType<Map>()
        .map((map) => ApiExplorerFailureRecord.fromMap(Map<String, dynamic>.from(map)))
        .toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  List<ApiExplorerUsageRecord> getUsageHistory({String? userId}) {
    final ids = (_box.get(kApiExplorerUsageIdsKey) as List<dynamic>? ?? const [])
        .cast<String>();
    final items = ids
        .map((id) => _box.get('usage:$id'))
        .whereType<Map>()
        .map((map) => ApiExplorerUsageRecord.fromMap(Map<String, dynamic>.from(map)))
        .where((item) => userId == null || userId.isEmpty || item.userId == userId)
        .toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return items;
  }

  List<ApiExplorerReviewRecord> getReviews({String? apiId}) {
    final ids = (_box.get(kApiExplorerReviewIdsKey) as List<dynamic>? ?? const [])
        .cast<String>();
    final items = ids
        .map((id) => _box.get('review:$id'))
        .whereType<Map>()
        .map((map) => ApiExplorerReviewRecord.fromMap(Map<String, dynamic>.from(map)))
        .where((item) => apiId == null || item.apiId == apiId)
        .toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return items;
  }

  List<ApiExplorerRemediationRecord> getRemediations() {
    final ids =
        (_box.get(kApiExplorerRemediationIdsKey) as List<dynamic>? ?? const [])
            .cast<String>();
    return ids
        .map((id) => _box.get('remediation:$id'))
        .whereType<Map>()
        .map(
          (map) => ApiExplorerRemediationRecord.fromMap(
            Map<String, dynamic>.from(map),
          ),
        )
        .toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  String? getPipelineRoot() => _box.get(kApiExplorerPipelineRootKey) as String?;

  Future<void> setPipelineRoot(String path) async {
    await _box.put(kApiExplorerPipelineRootKey, path);
  }

  Future<void> seedDemoData() async {
    final now = DateTime.now();
    final stripe = ApiExplorerApiDetails(
      summary: ApiExplorerApiSummary(
        id: 'stripe-demo',
        title: 'Stripe Billing',
        description: 'Payments, customers, invoices, and subscriptions.',
        category: 'Payments',
        qualityScore: 92,
        requiresAuth: true,
        endpointCount: 3,
        source: 'demo',
        baseUrl: 'https://api.stripe.com/v1',
        lastSyncedAt: now,
        readinessBadges: const ['Auth documented', 'Examples present', 'High quality'],
        tags: const ['payments', 'billing'],
      ),
      version: '2025-10-01',
      sourceUrl: 'https://docs.stripe.com/api',
      endpoints: const [
        ApiExplorerEndpoint(
          id: 'stripe-demo-list-customers',
          method: HTTPVerb.get,
          path: '/customers',
          summary: 'List customers',
          description: 'Returns a paginated list of customers.',
          authType: 'bearer',
          queryParameters: [NameValueModel(name: 'limit', value: '10')],
          responseExample: '{"data": [{"id": "cus_123"}]}',
        ),
        ApiExplorerEndpoint(
          id: 'stripe-demo-create-customer',
          method: HTTPVerb.post,
          path: '/customers',
          summary: 'Create customer',
          description: 'Creates a customer from billing data.',
          authType: 'bearer',
          headers: [
            NameValueModel(name: 'Content-Type', value: 'application/json'),
          ],
          requestBodyExample:
              '{"name": "Ada Lovelace", "email": "ada@example.com"}',
          responseExample: '{"id": "cus_123", "email": "ada@example.com"}',
          contentType: ContentType.json,
        ),
        ApiExplorerEndpoint(
          id: 'stripe-demo-get-customer',
          method: HTTPVerb.get,
          path: '/customers/{customer_id}',
          summary: 'Retrieve customer',
          description: 'Looks up a customer using the path id.',
          authType: 'bearer',
          pathParameters: [
            NameValueModel(name: 'customer_id', value: '{{customer_id}}'),
          ],
          responseExample: '{"id": "cus_123", "email": "ada@example.com"}',
        ),
      ],
    );

    final weather = ApiExplorerApiDetails(
      summary: ApiExplorerApiSummary(
        id: 'weather-demo',
        title: 'WeatherKit',
        description: 'Current weather and forecast endpoints.',
        category: 'Weather',
        qualityScore: 81,
        requiresAuth: false,
        endpointCount: 2,
        source: 'demo',
        baseUrl: 'https://api.weatherkit.dev',
        lastSyncedAt: now,
        readinessBadges: const ['Examples present', 'Schema complete'],
        tags: const ['weather', 'forecast'],
      ),
      version: '1.0.0',
      sourceUrl: 'https://example.com/weather/openapi.json',
      endpoints: const [
        ApiExplorerEndpoint(
          id: 'weather-demo-current',
          method: HTTPVerb.get,
          path: '/weather/current',
          summary: 'Current weather',
          description: 'Returns live weather information.',
          authType: 'none',
          queryParameters: [
            NameValueModel(name: 'city', value: 'Bengaluru'),
          ],
          responseExample: '{"temp_c": 28, "condition": "Cloudy"}',
        ),
        ApiExplorerEndpoint(
          id: 'weather-demo-forecast',
          method: HTTPVerb.get,
          path: '/weather/forecast',
          summary: 'Forecast',
          description: 'Returns weather for the coming days.',
          authType: 'none',
          queryParameters: [
            NameValueModel(name: 'city', value: 'Bengaluru'),
            NameValueModel(name: 'days', value: '3'),
          ],
          responseExample: '{"days": [{"day": 1, "temp_c": 27}]}',
        ),
      ],
    );

    await _saveCatalog([stripe, weather]);
  }

  Future<void> syncFromPipelineRoot(String rootPath) async {
    try {
      await setPipelineRoot(rootPath);
      final indexFile = File(p.join(rootPath, 'marketplace', 'index.json'));
      final apisDir = Directory(p.join(rootPath, 'marketplace', 'apis'));
      if (!indexFile.existsSync()) {
        throw FileSystemException('marketplace/index.json not found');
      }
      if (!apisDir.existsSync()) {
        throw FileSystemException('marketplace/apis not found');
      }

      final indexJson = jsonDecode(await indexFile.readAsString());
      if (indexJson is! Map<String, dynamic>) {
        throw const FormatException('Pipeline index is not a JSON object');
      }

      final details = <ApiExplorerApiDetails>[];
      for (final entry in indexJson.entries) {
        final summaryMap = Map<String, dynamic>.from(entry.value as Map);
        final apiFile = File(
          p.join(apisDir.path, summaryMap['filename'] as String? ?? '${entry.key}.json'),
        );
        if (!apiFile.existsSync()) {
          await _logFailure(
            source: entry.key,
            stage: 'publish',
            reason: 'Missing API file for ${entry.key}',
          );
          continue;
        }
        final detailMap = jsonDecode(await apiFile.readAsString());
        if (detailMap is! Map<String, dynamic>) {
          await _logFailure(
            source: entry.key,
            stage: 'parse',
            reason: 'API file for ${entry.key} is not a JSON object',
          );
          continue;
        }
        details.add(_buildDetailsFromPipeline(summaryMap, detailMap));
      }
      await _saveCatalog(details);
    } catch (error) {
      await _logFailure(
        source: rootPath,
        stage: 'sync',
        reason: error.toString(),
      );
      rethrow;
    }
  }

  Future<void> recordUsage({
    required String apiId,
    required String action,
    String? userId,
    String? endpointId,
  }) async {
    if (userId == null || userId.trim().isEmpty) return;
    final record = ApiExplorerUsageRecord(
      id: _uuid.v4(),
      apiId: apiId,
      userId: userId.trim(),
      action: action,
      endpointId: endpointId,
      createdAt: DateTime.now(),
    );
    final ids = (_box.get(kApiExplorerUsageIdsKey) as List<dynamic>? ?? const [])
        .cast<String>();
    await _box.put('usage:${record.id}', record.toMap());
    await _box.put(kApiExplorerUsageIdsKey, [record.id, ...ids].take(100).toList());
  }

  Future<void> submitReview({
    required String apiId,
    required String userId,
    required int rating,
    required String comment,
  }) async {
    final trimmedUserId = userId.trim();
    if (trimmedUserId.isEmpty) return;
    final review = ApiExplorerReviewRecord(
      id: _uuid.v4(),
      apiId: apiId,
      userId: trimmedUserId,
      rating: rating,
      comment: comment.trim(),
      createdAt: DateTime.now(),
    );
    final ids = (_box.get(kApiExplorerReviewIdsKey) as List<dynamic>? ?? const [])
        .cast<String>();
    await _box.put('review:${review.id}', review.toMap());
    await _box.put(kApiExplorerReviewIdsKey, [review.id, ...ids].take(100).toList());

    if (rating <= 2) {
      final remediation = ApiExplorerRemediationRecord(
        id: _uuid.v4(),
        apiId: apiId,
        trigger: 'bad_review',
        status: 'queued',
        recommendation:
            'Retry pipeline sync, inspect endpoint examples, and flag for maintainer review if the issue persists.',
        createdAt: DateTime.now(),
      );
      final remediationIds =
          (_box.get(kApiExplorerRemediationIdsKey) as List<dynamic>? ?? const [])
              .cast<String>();
      await _box.put('remediation:${remediation.id}', remediation.toMap());
      await _box.put(
        kApiExplorerRemediationIdsKey,
        [remediation.id, ...remediationIds].take(100).toList(),
      );
    }
  }

  HttpRequestModel buildRequestModel(
    ApiExplorerApiDetails details,
    ApiExplorerEndpoint endpoint,
  ) {
    final headers = <NameValueModel>[
      ...endpoint.headers,
      if (endpoint.contentType != null &&
          !endpoint.headers.any(
            (header) => header.name.toLowerCase() == 'content-type',
          ))
        NameValueModel(
          name: 'Content-Type',
          value: endpoint.contentType!.header,
        ),
    ];

    return HttpRequestModel(
      method: endpoint.method,
      url: '${details.summary.baseUrl}${endpoint.path}',
      headers: headers,
      params: [
        ...endpoint.queryParameters,
        ...endpoint.pathParameters,
      ],
      isHeaderEnabledList: List<bool>.filled(headers.length, true),
      isParamEnabledList: List<bool>.filled(
        endpoint.queryParameters.length + endpoint.pathParameters.length,
        true,
      ),
      authModel: AuthModel(
        type: endpoint.authType == 'none'
            ? APIAuthType.none
            : APIAuthType.bearer,
      ),
      bodyContentType: endpoint.contentType ?? ContentType.json,
      body: endpoint.requestBodyExample,
    );
  }

  List<ApiExplorerEndpoint> suggestSequence(ApiExplorerApiDetails details) {
    int score(ApiExplorerEndpoint endpoint) {
      return switch (endpoint.method) {
        HTTPVerb.post => 0,
        HTTPVerb.get when endpoint.path.contains('{') => 2,
        HTTPVerb.get => 1,
        HTTPVerb.put || HTTPVerb.patch => 3,
        HTTPVerb.delete => 4,
        _ => 5,
      };
    }

    final ordered = [...details.endpoints];
    ordered.sort((a, b) => score(a).compareTo(score(b)));
    return ordered;
  }

  List<Map<String, dynamic>> listTools() {
    return const [
      {
        'name': 'explore_apis',
        'description': 'Search and filter the processed API catalog.',
      },
      {
        'name': 'get_api_details',
        'description': 'Return a single API with endpoint details.',
      },
      {
        'name': 'import_to_apidash',
        'description': 'Return import-ready request payloads for API Dash.',
      },
      {
        'name': 'suggest_sequence',
        'description': 'Recommend an endpoint order for exploration or testing.',
      },
      {
        'name': 'get_failures',
        'description': 'List failed extractions and reasons.',
      },
    ];
  }

  Map<String, dynamic> callTool(String name, Map<String, dynamic> arguments) {
    return switch (name) {
      'explore_apis' => {
        'apis': getCatalog()
            .where(
              (api) => _matchesSearch(
                api,
                arguments['query'] as String? ?? '',
              ),
            )
            .map((api) => api.toMap())
            .toList(),
      },
      'get_api_details' => getApiDetails(arguments['apiId'] as String? ?? '')
              ?.toMap() ??
          {'error': 'API not found'},
      'import_to_apidash' => _buildImportPayload(arguments['apiId'] as String? ?? ''),
      'suggest_sequence' => _buildSuggestedSequence(arguments['apiId'] as String? ?? ''),
      'get_failures' => {
        'failures': getFailures().map((failure) => failure.toMap()).toList(),
      },
      _ => {'error': 'Unsupported tool: $name'},
    };
  }

  ApiExplorerApiDetails _buildDetailsFromPipeline(
    Map<String, dynamic> summaryMap,
    Map<String, dynamic> detailMap,
  ) {
    final info = Map<String, dynamic>.from(detailMap['info'] as Map? ?? {});
    final requests = (detailMap['requests'] as List<dynamic>? ?? const []);
    final endpoints = requests
        .whereType<Map>()
        .map((request) => _buildEndpointFromPipeline(Map<String, dynamic>.from(request)))
        .toList();
    final title = summaryMap['title'] as String? ?? info['title'] as String? ?? '';
    final description =
        summaryMap['description'] as String? ?? info['description'] as String? ?? '';
    final qualityScore = _computeQualityScore(info, endpoints);
    return ApiExplorerApiDetails(
      summary: ApiExplorerApiSummary(
        id: summaryMap['id'] as String? ?? detailMap['id'] as String? ?? _uuid.v4(),
        title: title,
        description: description,
        category: _deriveCategory(summaryMap, info),
        qualityScore: qualityScore,
        requiresAuth: summaryMap['requires_auth'] as bool? ?? false,
        endpointCount: endpoints.length,
        source: summaryMap['source'] as String? ?? 'pipeline',
        baseUrl: info['base_url'] as String? ?? '',
        lastSyncedAt: DateTime.now(),
        readinessBadges: _buildReadinessBadges(qualityScore, endpoints, info),
        tags: (info['tags'] as List<dynamic>? ?? const [])
            .map((tag) => tag.toString())
            .toList(),
      ),
      version: info['version'] as String? ?? '',
      sourceUrl: info['source'] as String? ?? '',
      endpoints: endpoints,
    );
  }

  ApiExplorerEndpoint _buildEndpointFromPipeline(Map<String, dynamic> request) {
    List<NameValueModel> parseRows(dynamic rawRows) {
      return (rawRows as List<dynamic>? ?? const [])
          .map((row) => Map<String, dynamic>.from(row as Map))
          .map(
            (row) => NameValueModel(
              name: row['name'] as String? ?? '',
              value: row['value']?.toString() ?? '',
            ),
          )
          .toList();
    }

    final headers = parseRows(request['headers']);
    final queryParametersRaw = request['queryParameters'] ?? request['params'];
    final pathParametersRaw = request['pathParameters'];
    final queryParameters = parseRows(queryParametersRaw);
    final pathParameters = parseRows(pathParametersRaw);
    final fallbackParams =
        pathParameters.isEmpty && queryParametersRaw == request['params']
            ? parseRows(request['params'])
            : const <NameValueModel>[];
    final splitQueryParameters =
        fallbackParams.where((param) => !param.name.contains('{')).toList();
    final splitPathParameters =
        fallbackParams.where((param) => param.name.contains('{')).toList();
    final body = request['body'];
    return ApiExplorerEndpoint(
      id: request['id'] as String? ??
          '${request['method']}-${request['path']}'.replaceAll('/', '_'),
      method: HTTPVerb.values.firstWhere(
        (method) => method.name == (request['method'] as String? ?? 'get').toLowerCase(),
        orElse: () => HTTPVerb.get,
      ),
      path: request['path'] as String? ?? '/',
      summary: request['name'] as String? ?? request['summary'] as String? ?? '',
      description: request['description'] as String? ?? '',
      authType: request['auth_type'] as String? ??
          request['authType'] as String? ??
          ((request['auth'] as Map?)?['type'] as String?) ??
          'none',
      headers: headers,
      queryParameters:
          queryParameters.isNotEmpty ? queryParameters : splitQueryParameters,
      pathParameters:
          pathParameters.isNotEmpty ? pathParameters : splitPathParameters,
      requestBodyExample: body is String
          ? body
          : request['requestBodyExample'] is String
              ? request['requestBodyExample'] as String
              : body is Map || body is List
              ? encodePrettyJson(body)
              : null,
      responseExample: request['responseExample'] is Map ||
              request['responseExample'] is List
          ? encodePrettyJson(request['responseExample'])
          : request['responseExample'] as String? ??
              (request['response_example'] is Map ||
                      request['response_example'] is List
                  ? encodePrettyJson(request['response_example'])
                  : request['response_example'] as String?),
      contentType: _parseContentType(
        request['contentType'] as String? ?? request['content_type'] as String?,
      ),
    );
  }

  Future<void> _saveCatalog(List<ApiExplorerApiDetails> details) async {
    final ids = <String>[];
    for (final item in details) {
      ids.add(item.summary.id);
      await _box.put('api:${item.summary.id}', item.toMap());
    }
    await _box.put(kApiExplorerCatalogIdsKey, ids);
  }

  Future<void> _logFailure({
    required String source,
    required String stage,
    required String reason,
  }) async {
    final record = ApiExplorerFailureRecord(
      id: _uuid.v4(),
      source: source,
      stage: stage,
      reason: reason,
      createdAt: DateTime.now(),
    );
    final ids = (_box.get(kApiExplorerFailureIdsKey) as List<dynamic>? ?? const [])
        .cast<String>();
    await _box.put('failure:${record.id}', record.toMap());
    await _box.put(kApiExplorerFailureIdsKey, [record.id, ...ids].take(100).toList());
  }

  bool _matchesSearch(ApiExplorerApiSummary api, String query) {
    if (query.trim().isEmpty) return true;
    final term = query.toLowerCase();
    return api.title.toLowerCase().contains(term) ||
        api.description.toLowerCase().contains(term) ||
        api.category.toLowerCase().contains(term) ||
        api.tags.any((tag) => tag.toLowerCase().contains(term));
  }

  Map<String, dynamic> _buildImportPayload(String apiId) {
    final details = getApiDetails(apiId);
    if (details == null) return {'error': 'API not found'};
    return {
      'apiId': apiId,
      'requests': details.endpoints
          .map((endpoint) => buildRequestModel(details, endpoint).toJson())
          .toList(),
    };
  }

  Map<String, dynamic> _buildSuggestedSequence(String apiId) {
    final details = getApiDetails(apiId);
    if (details == null) return {'error': 'API not found'};
    return {
      'apiId': apiId,
      'sequence': suggestSequence(details)
          .map(
            (endpoint) => {
              'endpointId': endpoint.id,
              'method': endpoint.method.name.toUpperCase(),
              'path': endpoint.path,
              'summary': endpoint.summary,
            },
          )
          .toList(),
    };
  }

  ContentType? _parseContentType(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    if (raw.contains('multipart/form-data')) return ContentType.formdata;
    if (raw.contains('text/plain')) return ContentType.text;
    return ContentType.json;
  }

  int _computeQualityScore(
    Map<String, dynamic> info,
    List<ApiExplorerEndpoint> endpoints,
  ) {
    var score = 30;
    if ((info['description'] as String? ?? '').trim().isNotEmpty) score += 15;
    if ((info['base_url'] as String? ?? '').trim().isNotEmpty) score += 10;
    if ((info['version'] as String? ?? '').trim().isNotEmpty) score += 10;
    if (endpoints.every((endpoint) => endpoint.summary.trim().isNotEmpty)) {
      score += 15;
    }
    if (endpoints.any((endpoint) => endpoint.requestBodyExample?.isNotEmpty ?? false)) {
      score += 10;
    }
    if (endpoints.any((endpoint) => endpoint.responseExample?.isNotEmpty ?? false)) {
      score += 10;
    }
    return score.clamp(0, 100);
  }

  String _deriveCategory(
    Map<String, dynamic> summaryMap,
    Map<String, dynamic> info,
  ) {
    final categories = (summaryMap['categories'] as List<dynamic>? ?? const [])
        .cast<String>();
    if (categories.isNotEmpty) return categories.first;
    final haystack =
        '${summaryMap['title']} ${summaryMap['description']} ${info['description']}'.toLowerCase();
    if (haystack.contains('payment')) return 'Payments';
    if (haystack.contains('weather')) return 'Weather';
    if (haystack.contains('ai') || haystack.contains('chat')) return 'AI';
    return 'General';
  }

  List<String> _buildReadinessBadges(
    int qualityScore,
    List<ApiExplorerEndpoint> endpoints,
    Map<String, dynamic> info,
  ) {
    final badges = <String>[];
    if ((info['description'] as String? ?? '').trim().isNotEmpty) {
      badges.add('Docs present');
    }
    if (endpoints.any((endpoint) => endpoint.requestBodyExample?.isNotEmpty ?? false)) {
      badges.add('Examples present');
    }
    if ((info['base_url'] as String? ?? '').trim().isNotEmpty) {
      badges.add('Ready to import');
    }
    if (qualityScore >= 85) {
      badges.add('High quality');
    }
    return badges;
  }
}
