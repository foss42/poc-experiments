import '../models/open_response.dart';

/// Accumulated state during an SSE streaming session.
class StreamingState {
  /// Items built so far; may be partial (placeholders for in-progress items).
  final List<OpenResponsesItem> items;

  /// Accumulated text per output_index for message items.
  final Map<int, String> inProgressTexts;

  /// Accumulated arguments per output_index for function_call items.
  final Map<int, String> inProgressArguments;

  final bool isComplete;
  final String? responseId;
  final String status;

  const StreamingState({
    required this.items,
    required this.inProgressTexts,
    required this.inProgressArguments,
    this.isComplete = false,
    this.responseId,
    this.status = 'in_progress',
  });

  factory StreamingState.initial() => const StreamingState(
        items: [],
        inProgressTexts: {},
        inProgressArguments: {},
      );

  StreamingState copyWith({
    List<OpenResponsesItem>? items,
    Map<int, String>? inProgressTexts,
    Map<int, String>? inProgressArguments,
    bool? isComplete,
    String? responseId,
    String? status,
  }) {
    return StreamingState(
      items: items ?? this.items,
      inProgressTexts: inProgressTexts ?? this.inProgressTexts,
      inProgressArguments: inProgressArguments ?? this.inProgressArguments,
      isComplete: isComplete ?? this.isComplete,
      responseId: responseId ?? this.responseId,
      status: status ?? this.status,
    );
  }
}
