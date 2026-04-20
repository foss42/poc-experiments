import '../models/workflow_node.dart';
import '../utils/json_extractor.dart';
import '../utils/template_substitutor.dart';

class ContextVariable {
  final String key;
  final String value;
  final String sourceNodeId;

  const ContextVariable({
    required this.key,
    required this.value,
    required this.sourceNodeId,
  });
}

class ContextStore {
  final Map<String, ContextVariable> _variables = {};

  void set(String key, String value, String sourceNodeId) {
    _variables[key] = ContextVariable(
      key: key,
      value: value,
      sourceNodeId: sourceNodeId,
    );
  }

  String? get(String key) => _variables[key]?.value;

  Map<String, String> getAll() {
    return _variables.map((k, v) => MapEntry(k, v.value));
  }

  List<ContextVariable> getAllWithSource() {
    return _variables.values.toList();
  }

  String substitute(String template) {
    return substituteTemplate(template, getAll());
  }

  Map<String, String> substituteMap(Map<String, String> map) {
    return substituteHeaders(map, getAll());
  }

  Map<String, String> extractFromResponse(
    String responseBody,
    List<ExtractionRule> rules,
    String sourceNodeId,
  ) {
    final extracted = <String, String>{};
    for (final rule in rules) {
      final value = extractJsonValue(responseBody, rule.jsonPath);
      if (value != null) {
        set(rule.variableName, value, sourceNodeId);
        extracted[rule.variableName] = value;
      }
    }
    return extracted;
  }

  void clear() => _variables.clear();
}
