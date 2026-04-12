/// Identifies the format of an incoming HTTP response so the UI layer
/// can route it to the correct renderer.
enum ResponseFormat {
  /// A completed, non-streaming OpenAI Responses API payload.
  /// Routes to OpenResponsesView.
  openResponses,

  /// A server-sent event (SSE) stream from the OpenAI Responses API.
  /// Routes to StreamingTimelineView.
  openResponsesStreaming,

  /// Any other JSON payload — falls back to the existing renderer.
  /// Routes to StandardJsonView.
  standard,
}
