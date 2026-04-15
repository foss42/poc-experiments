import 'dart:convert';

import 'response_models.dart';

class OpenResponseParser {
  const OpenResponseParser._();

  static int _syntheticIdCounter = 0;

  static ParsedResponse parseFromJsonString(String jsonSource) {
    final decoded = jsonDecode(jsonSource);
    if (decoded is! Map) {
      throw const FormatException('Root JSON value must be an object.');
    }
    return parse(_normalizeMap(decoded));
  }

  static ParsedResponse parse(Map<String, dynamic> root) {
    final looksLikeOpenResponses = looksLikeOpenResponsesPayload(root);
    final parsedItems = _parseItems(root['output'] ?? root['items']);
    final items = parsedItems.isEmpty && !looksLikeOpenResponses
        ? <ResponseItem>[
            UnknownItem(
              raw: <String, dynamic>{
                'source': 'generic_json_payload',
                'payload': root,
              },
            ),
          ]
        : parsedItems;
    final outputsByCallId = <String, FunctionCallOutputItem>{};
    final functionCalls = <FunctionCallItem>[];

    for (final item in items) {
      if (item is FunctionCallItem) {
        functionCalls.add(item);
      }
      if (item is FunctionCallOutputItem) {
        outputsByCallId[item.callId] = item;
      }
    }

    final correlatedCalls = functionCalls
        .map(
          (call) => CorrelatedCall(
            call: call,
            output: outputsByCallId[call.callId],
            isComplete: outputsByCallId.containsKey(call.callId),
          ),
        )
        .toList(growable: false);

    return ParsedResponse(
      id: _asString(
        root['id'],
        fallback: looksLikeOpenResponses
            ? 'unknown_response'
            : 'generic_payload',
      ),
      status: _asString(
        root['status'],
        fallback: looksLikeOpenResponses ? 'unknown' : 'inspected',
      ),
      model: _asString(
        root['model'],
        fallback: looksLikeOpenResponses
            ? 'unknown'
            : 'non_open_responses_json',
      ),
      items: items,
      correlatedCalls: correlatedCalls,
      totalTokens: _extractTotalTokens(root),
    );
  }

  static bool looksLikeOpenResponsesPayload(Map<String, dynamic> root) {
    final object = _asString(root['object']);
    final output = root['output'];

    final objectLooksRight = object == 'response';
    final outputLooksRight = output is List;

    if (objectLooksRight && outputLooksRight) {
      return true;
    }

    if (output is List) {
      for (final rawItem in output) {
        final item = _normalizeMap(rawItem);
        final type = _asString(item['type']);
        if (type == 'reasoning' ||
            type == 'function_call' ||
            type == 'function_call_output' ||
            type == 'message') {
          return true;
        }
      }
    }

    return false;
  }

  static List<ResponseItem> _parseItems(dynamic rawOutput) {
    if (rawOutput is! List) {
      return const <ResponseItem>[];
    }

    final items = <ResponseItem>[];

    for (final raw in rawOutput) {
      if (raw is! Map) {
        items.add(
          UnknownItem(
            raw: <String, dynamic>{
              'raw_item': raw,
              'raw_item_type': raw.runtimeType.toString(),
            },
          ),
        );
        continue;
      }

      final item = _normalizeMap(raw);
      final type = _asString(item['type']);

      switch (type) {
        case 'reasoning':
          items.add(
            ReasoningItem(
              id: _asString(item['id'], fallback: _syntheticId('reasoning')),
              summaryText: _extractReasoningSummary(item),
            ),
          );
          break;
        case 'function_call':
          items.add(
            FunctionCallItem(
              id: _asString(
                item['id'],
                fallback: _syntheticId('function_call'),
              ),
              callId: _asString(
                item['call_id'],
                fallback: _syntheticId('call'),
              ),
              name: _asString(item['name'], fallback: 'unknown_function'),
              arguments: _decodeMapLike(
                item['arguments'],
                fallbackKey: 'raw_arguments',
              ),
            ),
          );
          break;
        case 'function_call_output':
          items.add(
            FunctionCallOutputItem(
              callId: _asString(
                item['call_id'],
                fallback: _syntheticId('call'),
              ),
              parsedOutput: _decodeMapLike(
                item['output'] ?? item['parsed_output'],
                fallbackKey: 'raw_output',
              ),
            ),
          );
          break;
        case 'message':
          items.add(
            MessageItem(
              role: _asString(item['role'], fallback: 'assistant'),
              text: _extractMessageText(item),
            ),
          );
          break;
        default:
          items.add(UnknownItem(raw: item));
          break;
      }
    }

    return items;
  }

  static int? _extractTotalTokens(Map<String, dynamic> root) {
    final topLevel = root['total_tokens'];
    if (topLevel is int) {
      return topLevel;
    }

    final usage = _normalizeMap(root['usage']);
    final usageTotal = usage['total_tokens'];
    if (usageTotal is int) {
      return usageTotal;
    }

    return null;
  }

  static String _extractReasoningSummary(Map<String, dynamic> item) {
    final summary = item['summary'];
    if (summary is List) {
      final values = <String>[];
      for (final segmentRaw in summary) {
        final segment = _normalizeMap(segmentRaw);
        final text = _asString(segment['text']);
        if (text.isNotEmpty) {
          values.add(text);
        }
      }
      if (values.isNotEmpty) {
        return values.join(' ');
      }
    }

    final direct = _asString(item['summary_text']);
    if (direct.isNotEmpty) {
      return direct;
    }

    return 'No reasoning summary available.';
  }

  static String _extractMessageText(Map<String, dynamic> item) {
    final content = item['content'];
    if (content is List) {
      final values = <String>[];
      for (final partRaw in content) {
        final part = _normalizeMap(partRaw);
        final text = _asString(part['text']);
        if (text.isNotEmpty) {
          values.add(text);
        }
      }
      if (values.isNotEmpty) {
        return values.join(' ');
      }
    }

    final direct = _asString(item['text']);
    if (direct.isNotEmpty) {
      return direct;
    }

    return 'No message text available.';
  }

  static Map<String, dynamic> _decodeMapLike(
    dynamic raw, {
    required String fallbackKey,
  }) {
    if (raw is Map) {
      return _normalizeMap(raw);
    }

    if (raw is String) {
      try {
        final decoded = jsonDecode(raw);
        if (decoded is Map) {
          return _normalizeMap(decoded);
        }
      } catch (_) {
        // Falls through and preserves the original raw value.
      }
      return <String, dynamic>{fallbackKey: raw};
    }

    if (raw == null) {
      return <String, dynamic>{};
    }

    return <String, dynamic>{fallbackKey: raw};
  }

  static String _syntheticId(String prefix) {
    _syntheticIdCounter += 1;
    return '${prefix}_${DateTime.now().microsecondsSinceEpoch}_$_syntheticIdCounter';
  }

  static String _asString(dynamic value, {String fallback = ''}) {
    if (value is String) {
      return value;
    }
    if (value == null) {
      return fallback;
    }
    return value.toString();
  }

  static Map<String, dynamic> _normalizeMap(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value;
    }
    if (value is Map) {
      return value.map(
        (key, entryValue) => MapEntry(key.toString(), entryValue),
      );
    }
    return <String, dynamic>{};
  }
}
