import 'dart:convert';

import 'gen_ui_models.dart';
import 'response_models.dart';

class OpenResponsesDetector {
  const OpenResponsesDetector._();

  static Map<String, dynamic>? extractGenUIDescriptorJson(
    ParsedResponse response,
  ) {
    for (final ResponseItem item in response.items) {
      if (item is UnknownItem) {
        final descriptor = _findDescriptor(item.raw);
        if (descriptor != null) return descriptor;
      }

      if (item is FunctionCallOutputItem) {
        final descriptor = _findDescriptor(item.parsedOutput);
        if (descriptor != null) return descriptor;
      }

      if (item is MessageItem) {
        try {
          final decoded = jsonDecode(item.text);
          final descriptor = _findDescriptor(decoded);
          if (descriptor != null) return descriptor;
        } catch (_) {}
      }
    }
    return null;
  }

  static GenUIDescriptor? extractGenUIDescriptor(ParsedResponse response) {
    final raw = extractGenUIDescriptorJson(response);
    if (raw == null) return null;
    try {
      return GenUIDescriptor.fromJson(raw);
    } catch (_) {
      return null;
    }
  }

  static Map<String, dynamic>? _findDescriptor(dynamic value) {
    if (value is Map) {
      final map = _normalize(value);
      if (map['type'] == 'screen' && map['components'] is List) return map;
      for (final v in map.values) {
        final nested = _findDescriptor(v);
        if (nested != null) return nested;
      }
    }
    if (value is List) {
      for (final item in value) {
        final nested = _findDescriptor(item);
        if (nested != null) return nested;
      }
    }
    return null;
  }

  static Map<String, dynamic> _normalize(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) {
      return value.map((k, v) => MapEntry(k.toString(), v));
    }
    return {};
  }
}
