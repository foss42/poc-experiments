class ApiTemplate {
  final String name;
  final List<String> tags;
  final String baseUrl;
  final Map<String, dynamic> globalAuthMethods;
  final int endpointsCount;
  final CommunityScore communityScore;
  final List<ApiEndpoint> endpoints;

  ApiTemplate({
    required this.name,
    required this.tags,
    required this.baseUrl,
    required this.globalAuthMethods,
    required this.endpointsCount,
    required this.communityScore,
    required this.endpoints,
  });

  factory ApiTemplate.fromJson(Map<String, dynamic> json) {
    final endpointList = json['endpoints'] as List? ?? const [];

    String baseUrl = json['base_url'] ?? '';
    final String originalUrl = json['_original_url'] ?? '';

    // If the base_url is a relative path (e.g. "/api/v3"), try to prepend the domain from _original_url
    if (baseUrl.startsWith('/') && originalUrl.startsWith('http')) {
      try {
        final uri = Uri.parse(originalUrl);
        // Extract scheme and host, e.g., 'https://petstore.swagger.io'
        final domain = '${uri.scheme}://${uri.host}';
        baseUrl = '$domain$baseUrl';
      } catch (_) {
        // ignore errors and fallback to original
      }
    }

    return ApiTemplate(
      name: json['name'] ?? '',
      tags: List<String>.from(json['tags'] ?? []),
      baseUrl: baseUrl,
      globalAuthMethods:
          (json['global_auth_methods'] as Map?)?.cast<String, dynamic>() ??
              const {},
      endpointsCount: json['endpoints_count'] ?? 0,
      communityScore: CommunityScore.fromJson(
          (json['community_score'] as Map?)?.cast<String, dynamic>() ?? {}),
      endpoints: endpointList
          .whereType<Map>()
          .map((e) => ApiEndpoint.fromJson(e.cast<String, dynamic>()))
          .toList(),
    );
  }
}

class ApiEndpoint {
  final String method;
  final String path;
  final String summary;
  final List<String> authRequired;
  final EndpointParameters parameters;
  final dynamic requestBodySample;
  final dynamic responseBodySample;

  ApiEndpoint({
    required this.method,
    required this.path,
    required this.summary,
    required this.authRequired,
    required this.parameters,
    required this.requestBodySample,
    required this.responseBodySample,
  });

  factory ApiEndpoint.fromJson(Map<String, dynamic> json) {
    return ApiEndpoint(
      method: json['method'] ?? '',
      path: json['path'] ?? '',
      summary: json['summary'] ?? '',
      authRequired: List<String>.from(json['auth_required'] ?? const []),
      parameters: EndpointParameters.fromJson(
          (json['parameters'] as Map?)?.cast<String, dynamic>() ?? const {}),
      requestBodySample: json['request_body_sample'],
      responseBodySample: json['response_body_sample'],
    );
  }
}

class EndpointParameters {
  final List<ApiParameter> headers;
  final List<ApiParameter> pathVariables;
  final List<ApiParameter> queryParameters;

  const EndpointParameters({
    required this.headers,
    required this.pathVariables,
    required this.queryParameters,
  });

  factory EndpointParameters.fromJson(Map<String, dynamic> json) {
    List<ApiParameter> parseParams(dynamic raw) {
      final list = raw as List? ?? const [];
      return list
          .whereType<Map>()
          .map((item) => ApiParameter.fromJson(item.cast<String, dynamic>()))
          .toList();
    }

    return EndpointParameters(
      headers: parseParams(json['headers']),
      pathVariables: parseParams(json['path_variables']),
      queryParameters: parseParams(json['query_parameters']),
    );
  }
}

class ApiParameter {
  final String name;
  final String type;
  final bool required;

  const ApiParameter({
    required this.name,
    required this.type,
    required this.required,
  });

  factory ApiParameter.fromJson(Map<String, dynamic> json) {
    return ApiParameter(
      name: json['name']?.toString() ?? '',
      type: json['type']?.toString() ?? 'unknown',
      required: json['required'] == true,
    );
  }
}

class CommunityScore {
  final int issueUpvotes;
  final int totalComments;
  final int commentUpvotes;
  final int overallPopularityScore;
  final List<CommentInteraction> interactions;

  const CommunityScore({
    required this.issueUpvotes,
    required this.totalComments,
    required this.commentUpvotes,
    required this.overallPopularityScore,
    required this.interactions,
  });

  factory CommunityScore.fromJson(Map<String, dynamic> json) {
    final interactionsRaw = json['interactions'] as List? ?? [];
    return CommunityScore(
      issueUpvotes: json['issue_upvotes'] ?? 0,
      totalComments: json['total_comments'] ?? 0,
      commentUpvotes: json['comment_upvotes'] ?? 0,
      overallPopularityScore: json['overall_popularity_score'] ?? 0,
      interactions: interactionsRaw
          .whereType<Map>()
          .map((e) => CommentInteraction.fromJson(e.cast<String, dynamic>()))
          .toList(),
    );
  }
}

class CommentInteraction {
  final String user;
  final String body;
  final int upvotes;
  final DateTime createdAt;

  const CommentInteraction({
    required this.user,
    required this.body,
    required this.upvotes,
    required this.createdAt,
  });

  factory CommentInteraction.fromJson(Map<String, dynamic> json) {
    return CommentInteraction(
      user: json['user'] ?? '',
      body: json['body'] ?? '',
      upvotes: json['upvotes'] ?? 0,
      createdAt: DateTime.tryParse(json['created_at'] ?? '') ?? DateTime(1970),
    );
  }
}
