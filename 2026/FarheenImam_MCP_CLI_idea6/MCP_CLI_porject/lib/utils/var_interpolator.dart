// ---------------------------------------------------------------------------
// Variable interpolator
// Replaces {{variable}} tokens with values from the active environment.
// ---------------------------------------------------------------------------

final _varPattern = RegExp(r'\{\{(\w+)\}\}');

String interpolate(String input, Map<String, String> variables) {
  return input.replaceAllMapped(_varPattern, (m) {
    final key = m.group(1)!;
    return variables[key] ?? m.group(0)!; // leave unreplaced if missing
  });
}

Map<String, String> interpolateHeaders(
    Map<String, String> headers, Map<String, String> variables) {
  return headers
      .map((k, v) => MapEntry(interpolate(k, variables), interpolate(v, variables)));
}
