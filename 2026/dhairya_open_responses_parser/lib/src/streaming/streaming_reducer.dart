import '../models/open_response.dart';
import '../models/items/function_call_item.dart';
import '../models/items/message_item.dart';
import '../models/items/reasoning_item.dart';
import '../models/items/function_call_output_item.dart';
import '../models/items/unknown_item.dart';
import '../utils/safe_cast.dart';
import 'streaming_state.dart';

/// Pure-function reducer for OpenAI Responses API SSE events.
///
/// Every call returns a new [StreamingState]; the incoming state is never
/// mutated.  Unknown or malformed events are silently ignored — the reducer
/// never throws.
class StreamingReducer {
  const StreamingReducer();

  /// Process one SSE event map and return the next [StreamingState].
  StreamingState reduce(StreamingState state, Map<String, dynamic> event) {
    try {
      return _handle(state, event);
    } catch (_) {
      // Malformed event — return state unchanged.
      return state;
    }
  }

  StreamingState _handle(StreamingState state, Map<String, dynamic> event) {
    final type = safeString(event, 'type');
    switch (type) {
      case 'response.output_item.added':
        return _handleItemAdded(state, event);
      case 'response.output_text.delta':
        return _handleTextDelta(state, event);
      case 'response.function_call_arguments.delta':
        return _handleArgumentsDelta(state, event);
      case 'response.output_item.done':
        return _handleItemDone(state, event);
      case 'response.completed':
        return _handleCompleted(state, event);
      default:
        return state;
    }
  }

  // ---------------------------------------------------------------------------
  // response.output_item.added
  // ---------------------------------------------------------------------------

  StreamingState _handleItemAdded(
      StreamingState state, Map<String, dynamic> event) {
    final outputIndex = event['output_index'] as int?;
    if (outputIndex == null) return state;

    final rawItem = event['item'];
    if (rawItem is! Map<String, dynamic>) return state;

    final itemType = safeString(rawItem, 'type');
    final placeholder = _buildPlaceholder(itemType, rawItem);

    final items = List<OpenResponsesItem>.from(state.items);
    // Extend list if needed, filling gaps with UnknownOutput.
    while (items.length <= outputIndex) {
      items.add(const UnknownOutput(UnknownItem(type: 'placeholder', raw: null)));
    }
    // Only set placeholder if slot is still the default gap filler.
    // If an item.done already arrived (out-of-order), keep it.
    if (items[outputIndex] is UnknownOutput &&
        (items[outputIndex] as UnknownOutput).item.type == 'placeholder') {
      items[outputIndex] = placeholder;
    } else if (items[outputIndex] is UnknownOutput &&
        (items[outputIndex] as UnknownOutput).item.raw == null) {
      items[outputIndex] = placeholder;
    }

    return state.copyWith(items: items);
  }

  OpenResponsesItem _buildPlaceholder(
      String? itemType, Map<String, dynamic> raw) {
    switch (itemType) {
      case 'message':
        return MessageOutput(MessageItem(
          type: 'message',
          id: safeString(raw, 'id') ?? '',
          role: safeString(raw, 'role') ?? '',
          content: const [],
        ));
      case 'function_call':
        return FunctionCallOutput(FunctionCallItem(
          type: 'function_call',
          id: safeString(raw, 'id') ?? '',
          callId: safeString(raw, 'call_id') ?? '',
          name: safeString(raw, 'name') ?? '',
          arguments: '',
          status: 'in_progress',
        ));
      case 'reasoning':
        return ReasoningOutput(ReasoningItem(
          type: 'reasoning',
          id: safeString(raw, 'id') ?? '',
          summary: const [],
        ));
      default:
        return UnknownOutput(UnknownItem.fromRaw(raw));
    }
  }

  // ---------------------------------------------------------------------------
  // response.output_text.delta
  // ---------------------------------------------------------------------------

  StreamingState _handleTextDelta(
      StreamingState state, Map<String, dynamic> event) {
    final outputIndex = event['output_index'] as int?;
    if (outputIndex == null) return state;

    final delta = safeString(event, 'delta') ?? '';
    if (delta.isEmpty) return state;

    final texts = Map<int, String>.from(state.inProgressTexts);
    texts[outputIndex] = (texts[outputIndex] ?? '') + delta;

    // Reflect accumulated text into the items list immediately so
    // currentResponse is always up to date.
    final items = _applyTextToItems(state.items, outputIndex, texts[outputIndex]!);

    return state.copyWith(items: items, inProgressTexts: texts);
  }

  List<OpenResponsesItem> _applyTextToItems(
      List<OpenResponsesItem> items, int index, String text) {
    if (index >= items.length) return items;
    final current = items[index];
    if (current is! MessageOutput) return items;

    final updated = List<OpenResponsesItem>.from(items);
    final msg = current.item;
    final newContent = [MessageContent(type: 'output_text', text: text)];
    updated[index] = MessageOutput(MessageItem(
      type: msg.type,
      id: msg.id,
      role: msg.role,
      content: newContent,
    ));
    return updated;
  }

  // ---------------------------------------------------------------------------
  // response.function_call_arguments.delta
  // ---------------------------------------------------------------------------

  StreamingState _handleArgumentsDelta(
      StreamingState state, Map<String, dynamic> event) {
    final outputIndex = event['output_index'] as int?;
    if (outputIndex == null) return state;

    final delta = safeString(event, 'delta') ?? '';
    if (delta.isEmpty) return state;

    final args = Map<int, String>.from(state.inProgressArguments);
    args[outputIndex] = (args[outputIndex] ?? '') + delta;

    final items = _applyArgsToItems(state.items, outputIndex, args[outputIndex]!);

    return state.copyWith(items: items, inProgressArguments: args);
  }

  List<OpenResponsesItem> _applyArgsToItems(
      List<OpenResponsesItem> items, int index, String arguments) {
    if (index >= items.length) return items;
    final current = items[index];
    if (current is! FunctionCallOutput) return items;

    final updated = List<OpenResponsesItem>.from(items);
    final fc = current.item;
    updated[index] = FunctionCallOutput(FunctionCallItem(
      type: fc.type,
      id: fc.id,
      callId: fc.callId,
      name: fc.name,
      arguments: arguments,
      status: fc.status,
    ));
    return updated;
  }

  // ---------------------------------------------------------------------------
  // response.output_item.done
  // ---------------------------------------------------------------------------

  StreamingState _handleItemDone(
      StreamingState state, Map<String, dynamic> event) {
    final outputIndex = event['output_index'] as int?;
    if (outputIndex == null) return state;

    final rawItem = event['item'];
    if (rawItem is! Map<String, dynamic>) return state;

    final finalItem = _parseFinalItem(rawItem);

    final items = List<OpenResponsesItem>.from(state.items);
    while (items.length <= outputIndex) {
      items.add(const UnknownOutput(UnknownItem(type: 'placeholder', raw: null)));
    }
    items[outputIndex] = finalItem;

    return state.copyWith(items: items);
  }

  OpenResponsesItem _parseFinalItem(Map<String, dynamic> raw) {
    final itemType = safeString(raw, 'type');
    switch (itemType) {
      case 'message':
        return MessageOutput(MessageItem.fromMap(raw));
      case 'function_call':
        return FunctionCallOutput(FunctionCallItem.fromMap(raw));
      case 'function_call_output':
        return FunctionCallOutputResult(FunctionCallOutputItem.fromMap(raw));
      case 'reasoning':
        return ReasoningOutput(ReasoningItem.fromMap(raw));
      default:
        return UnknownOutput(UnknownItem.fromRaw(raw));
    }
  }

  // ---------------------------------------------------------------------------
  // response.completed
  // ---------------------------------------------------------------------------

  StreamingState _handleCompleted(
      StreamingState state, Map<String, dynamic> event) {
    final response = event['response'];
    String? responseId = state.responseId;
    String status = 'completed';

    if (response is Map<String, dynamic>) {
      responseId = safeString(response, 'id') ?? responseId;
      status = safeString(response, 'status') ?? 'completed';
    }

    return state.copyWith(
      isComplete: true,
      responseId: responseId,
      status: status,
    );
  }
}
