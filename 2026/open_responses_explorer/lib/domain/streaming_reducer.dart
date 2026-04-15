import 'dart:convert';

import 'response_models.dart';

class StreamingReducer {
  StreamingReducer({
    this.initialId = 'resp_stream_simulated',
    this.initialModel = 'gpt-4o',
  }) : _state = _StreamingState(
         id: initialId,
         status: 'in_progress',
         model: initialModel,
         outputByIndex: <int, Map<String, dynamic>>{},
         arrivedAtByIndex: <int, int>{},
       );

  final String initialId;
  final String initialModel;

  _StreamingState _state;

  ParsedResponse get currentResponse => _state.toParsedResponse();

  void reset() {
    _state = _StreamingState(
      id: initialId,
      status: 'in_progress',
      model: initialModel,
      outputByIndex: <int, Map<String, dynamic>>{},
      arrivedAtByIndex: <int, int>{},
    );
  }

  ParsedResponse apply(Map<String, dynamic> event) {
    final type = _asString(event['type']);

    switch (type) {
      case 'response.output_item.added':
        _applyOutputItemAdded(event);
      case 'response.output_text.delta':
        _applyOutputTextDelta(event);
      case 'response.function_call_arguments.delta':
        _applyFunctionCallArgumentsDelta(event);
      case 'response.output_item.done':
        _applyOutputItemDone(event);
      case 'response.completed':
        _applyResponseCompleted(event);
      default:
      // Unknown event types are ignored to keep the reducer resilient.
    }

    return _state.toParsedResponse();
  }

  void _applyOutputItemAdded(Map<String, dynamic> event) {
    final outputIndex = _asInt(event['output_index']);
    if (outputIndex == null) {
      return;
    }

    final item = _normalizeMap(event['item']);
    final merged = <String, dynamic>{...item};

    if (!merged.containsKey('status')) {
      merged['status'] = 'in_progress';
    }

    _state.outputByIndex[outputIndex] = merged;
    _state.arrivedAtByIndex.putIfAbsent(
      outputIndex,
      () => _state.arrivedAtByIndex.length,
    );
  }

  void _applyOutputTextDelta(Map<String, dynamic> event) {
    final outputIndex = _asInt(event['output_index']);
    if (outputIndex == null) {
      return;
    }

    final item = _state.outputByIndex[outputIndex] ?? <String, dynamic>{};
    final existingContent = _normalizeList(item['content']);
    final normalizedContent = existingContent
        .map((dynamic part) => _normalizeMap(part))
        .toList(growable: true);

    if (normalizedContent.isEmpty) {
      normalizedContent.add(<String, dynamic>{'type': 'text', 'text': ''});
    }

    final contentIndex = _asInt(event['content_index']) ?? 0;
    while (normalizedContent.length <= contentIndex) {
      normalizedContent.add(<String, dynamic>{'type': 'text', 'text': ''});
    }

    final part = normalizedContent[contentIndex];
    final currentText = _asString(part['text']);
    final delta = _asString(event['delta']);

    part['type'] = part['type'] ?? 'text';
    part['text'] = '$currentText$delta';
    normalizedContent[contentIndex] = part;

    item['content'] = normalizedContent;

    final existingText = _asString(item['text']);
    item['text'] = '$existingText$delta';

    _state.outputByIndex[outputIndex] = item;
  }

  void _applyFunctionCallArgumentsDelta(Map<String, dynamic> event) {
    final outputIndex = _asInt(event['output_index']);
    if (outputIndex == null) {
      return;
    }

    final item = _state.outputByIndex[outputIndex] ?? <String, dynamic>{};
    final currentArguments = _asString(item['arguments']);
    final delta = _asString(event['delta']);
    item['arguments'] = '$currentArguments$delta';

    _state.outputByIndex[outputIndex] = item;
  }

  void _applyOutputItemDone(Map<String, dynamic> event) {
    final outputIndex = _asInt(event['output_index']);
    if (outputIndex == null) {
      return;
    }

    final incomingItem = _normalizeMap(event['item']);
    final existingItem =
        _state.outputByIndex[outputIndex] ??
        <String, dynamic>{'type': incomingItem['type']};

    final merged = <String, dynamic>{...existingItem, ...incomingItem};
    merged['status'] = 'completed';

    _state.outputByIndex[outputIndex] = merged;
    _state.arrivedAtByIndex.putIfAbsent(
      outputIndex,
      () => _state.arrivedAtByIndex.length,
    );
  }

  void _applyResponseCompleted(Map<String, dynamic> event) {
    final response = _normalizeMap(event['response']);

    _state = _state.copyWith(
      id: _asString(response['id'], fallback: _state.id),
      model: _asString(response['model'], fallback: _state.model),
      status: _asString(response['status'], fallback: 'completed'),
    );
  }

  static int? _asInt(dynamic value) {
    if (value is int) {
      return value;
    }
    if (value is num) {
      return value.toInt();
    }
    if (value is String) {
      return int.tryParse(value);
    }
    return null;
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
      return Map<String, dynamic>.from(value);
    }
    if (value is Map) {
      return value.map(
        (dynamic key, dynamic mapValue) => MapEntry(key.toString(), mapValue),
      );
    }
    return <String, dynamic>{};
  }

  static List<dynamic> _normalizeList(dynamic value) {
    if (value is List<dynamic>) {
      return value;
    }
    if (value is List) {
      return List<dynamic>.from(value);
    }
    return <dynamic>[];
  }
}

class _StreamingState {
  const _StreamingState({
    required this.id,
    required this.status,
    required this.model,
    required this.outputByIndex,
    required this.arrivedAtByIndex,
  });

  final String id;
  final String status;
  final String model;
  final Map<int, Map<String, dynamic>> outputByIndex;
  final Map<int, int> arrivedAtByIndex;

  _StreamingState copyWith({String? id, String? status, String? model}) {
    return _StreamingState(
      id: id ?? this.id,
      status: status ?? this.status,
      model: model ?? this.model,
      outputByIndex: outputByIndex,
      arrivedAtByIndex: arrivedAtByIndex,
    );
  }

  ParsedResponse toParsedResponse() {
    final sortedIndexes = outputByIndex.keys.toList()..sort();
    final responseItems = <ResponseItem>[];

    for (final index in sortedIndexes) {
      final raw = outputByIndex[index] ?? <String, dynamic>{};
      final type = _asString(raw['type']);

      switch (type) {
        case 'reasoning':
          responseItems.add(
            ReasoningItem(
              id: _asString(raw['id'], fallback: 'reasoning_$index'),
              summaryText: _extractReasoningSummary(raw),
            ),
          );
        case 'function_call':
          responseItems.add(
            FunctionCallItem(
              id: _asString(raw['id'], fallback: 'function_call_$index'),
              callId: _asString(raw['call_id'], fallback: 'call_$index'),
              name: _asString(raw['name'], fallback: 'unknown_function'),
              arguments: _decodeMapLike(
                raw['arguments'],
                fallbackKey: 'raw_arguments',
              ),
            ),
          );
        case 'function_call_output':
          responseItems.add(
            FunctionCallOutputItem(
              callId: _asString(raw['call_id'], fallback: 'call_$index'),
              parsedOutput: _decodeMapLike(
                raw['output'] ?? raw['parsed_output'],
                fallbackKey: 'raw_output',
              ),
            ),
          );
        case 'message':
          responseItems.add(
            MessageItem(
              role: _asString(raw['role'], fallback: 'assistant'),
              text: _extractMessageText(raw),
            ),
          );
        default:
          responseItems.add(UnknownItem(raw: raw));
      }
    }

    final outputsByCallId = <String, FunctionCallOutputItem>{};
    final functionCalls = <FunctionCallItem>[];

    for (final item in responseItems) {
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
      id: id,
      status: status,
      model: model,
      items: responseItems,
      correlatedCalls: correlatedCalls,
      totalTokens: null,
    );
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

    final content = item['content'];
    if (content is List) {
      final values = <String>[];
      for (final segmentRaw in content) {
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

    final text = _asString(item['text']);
    if (text.isNotEmpty) {
      return text;
    }

    return _asString(item['status']) == 'in_progress'
        ? 'Thinking...'
        : 'No reasoning summary available.';
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

    final text = _asString(item['text']);
    if (text.isNotEmpty) {
      return text;
    }

    return _asString(item['status']) == 'in_progress'
        ? ''
        : 'No message text available.';
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
        // Preserve non-JSON argument/output fragments while streaming.
      }
      return <String, dynamic>{fallbackKey: raw};
    }

    if (raw == null) {
      return <String, dynamic>{};
    }

    return <String, dynamic>{fallbackKey: raw};
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
        (dynamic key, dynamic mapValue) => MapEntry(key.toString(), mapValue),
      );
    }
    return <String, dynamic>{};
  }
}
