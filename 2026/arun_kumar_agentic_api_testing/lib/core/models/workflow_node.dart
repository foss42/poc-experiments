enum HTTPMethod { get, post, put, patch, delete }

extension HTTPMethodX on HTTPMethod {
  String get label => name.toUpperCase();
}

HTTPMethod parseHTTPMethod(String raw) {
  switch (raw.toUpperCase()) {
    case 'POST':
      return HTTPMethod.post;
    case 'PUT':
      return HTTPMethod.put;
    case 'PATCH':
      return HTTPMethod.patch;
    case 'DELETE':
      return HTTPMethod.delete;
    default:
      return HTTPMethod.get;
  }
}

class ExtractionRule {
  final String variableName;
  final String jsonPath;

  const ExtractionRule({required this.variableName, required this.jsonPath});
}

class WorkflowNode {
  final String id;
  final String name;
  final HTTPMethod method;
  final String url;
  final Map<String, String> headers;
  final String? body;
  final int expectedStatus;
  final List<ExtractionRule> extractionRules;

  const WorkflowNode({
    required this.id,
    required this.name,
    required this.method,
    required this.url,
    this.headers = const {},
    this.body,
    this.expectedStatus = 200,
    this.extractionRules = const [],
  });
}
