import 'dart:convert';

import 'gen_ui_models.dart';
import 'response_models.dart';

class OpenResponsesDetector {
  const OpenResponsesDetector._();

  static const int _maxTraversalDepth = 64;

  static bool containsGenUIDescriptor(ParsedResponse response) {
    return extractGenUIDescriptorJson(response) != null;
  }

  static Map<String, dynamic>? extractGenUIDescriptorJson(
    ParsedResponse response,
  ) {
    for (final ResponseItem item in response.items) {
      if (item is UnknownItem) {
        final descriptor = _findDescriptorInDynamic(
          item.raw,
          depth: 0,
          visited: <int>{},
        );
        if (descriptor != null) {
          return descriptor;
        }
      }

      if (item is FunctionCallOutputItem) {
        final descriptor = _findDescriptorInDynamic(
          item.parsedOutput,
          depth: 0,
          visited: <int>{},
        );
        if (descriptor != null) {
          return descriptor;
        }
      }

      if (item is MessageItem) {
        final descriptor = _extractFromMessage(item.text);
        if (descriptor != null) {
          return descriptor;
        }
      }
    }

    return null;
  }

  static GenUIDescriptor? extractGenUIDescriptor(ParsedResponse response) {
    final raw = extractGenUIDescriptorJson(response);
    if (raw == null) {
      return null;
    }

    try {
      return GenUIDescriptor.fromJson(raw);
    } catch (_) {
      return null;
    }
  }

  static Map<String, dynamic>? _extractFromMessage(String source) {
    try {
      final decoded = jsonDecode(source);
      return _findDescriptorInDynamic(decoded, depth: 0, visited: <int>{});
    } catch (_) {
      return null;
    }
  }

  static Map<String, dynamic>? _findDescriptorInDynamic(
    dynamic value, {
    required int depth,
    required Set<int> visited,
  }) {
    if (depth > _maxTraversalDepth) {
      return null;
    }

    if (value is Map || value is List) {
      final identity = identityHashCode(value);
      if (!visited.add(identity)) {
        return null;
      }
    }

    if (value is Map) {
      final map = _normalizeMap(value);
      if (_looksLikeDescriptor(map)) {
        return map;
      }

      for (final dynamic entryValue in map.values) {
        final nested = _findDescriptorInDynamic(
          entryValue,
          depth: depth + 1,
          visited: visited,
        );
        if (nested != null) {
          return nested;
        }
      }
    }

    if (value is List) {
      for (final dynamic item in value) {
        final nested = _findDescriptorInDynamic(
          item,
          depth: depth + 1,
          visited: visited,
        );
        if (nested != null) {
          return nested;
        }
      }
    }

    return null;
  }

  static bool _looksLikeDescriptor(Map<String, dynamic> map) {
    final type = _asString(map['type']);
    return type == 'screen' && map['components'] is List;
  }

  static Map<String, dynamic> _normalizeMap(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value;
    }
    if (value is Map) {
      return value.map(
        (dynamic key, dynamic mapValue) => MapEntry(key.toString(), mapValue),
      );
    }
    return <String, dynamic>{};
  }

  static String _asString(dynamic value) {
    if (value is String) {
      return value;
    }
    if (value == null) {
      return '';
    }
    return value.toString();
  }
}
