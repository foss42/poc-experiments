final _templateRegex = RegExp(r'\{\{(\w+)\}\}');

String substituteTemplate(String template, Map<String, String> variables) {
  return template.replaceAllMapped(_templateRegex, (match) {
    final key = match.group(1)!;
    return variables[key] ?? match.group(0)!;
  });
}

Map<String, String> substituteHeaders(
  Map<String, String> headers,
  Map<String, String> variables,
) {
  return headers.map(
    (k, v) => MapEntry(k, substituteTemplate(v, variables)),
  );
}

List<String> findUnresolvedVariables(String template) {
  return _templateRegex
      .allMatches(template)
      .map((m) => m.group(1)!)
      .toList();
}
