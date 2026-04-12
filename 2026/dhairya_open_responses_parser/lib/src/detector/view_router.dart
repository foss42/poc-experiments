import 'detection_result.dart';
import 'response_format.dart';

/// Maps a [DetectionResult] to the name of the widget that should render it.
///
/// Returns a string identifier rather than a concrete widget type so this
/// class has no dependency on Flutter and can be unit-tested in pure Dart.
class ViewRouter {
  const ViewRouter();

  /// Returns the renderer name for the given [result].
  ///
  /// | format                  | renderer               |
  /// |-------------------------|------------------------|
  /// | openResponses           | OpenResponsesView      |
  /// | openResponsesStreaming  | StreamingTimelineView  |
  /// | standard                | StandardJsonView       |
  String route(DetectionResult result) {
    switch (result.format) {
      case ResponseFormat.openResponses:
        return 'OpenResponsesView';
      case ResponseFormat.openResponsesStreaming:
        return 'StreamingTimelineView';
      case ResponseFormat.standard:
        return 'StandardJsonView';
    }
  }
}
