import 'dart:async';

import 'response_models.dart';
import 'streaming_reducer.dart';

class StreamingSession {
  StreamingSession({StreamingReducer? reducer})
    : _reducer = reducer ?? StreamingReducer();

  final StreamingReducer _reducer;
  final StreamController<ParsedResponse> _controller =
      StreamController<ParsedResponse>.broadcast();

  Stream<ParsedResponse> get stream => _controller.stream;

  ParsedResponse get currentResponse => _reducer.currentResponse;

  ParsedResponse applyDelta(Map<String, dynamic> event) {
    final next = _reducer.apply(event);
    if (!_controller.isClosed) {
      _controller.add(next);
    }
    return next;
  }

  ParsedResponse reset() {
    _reducer.reset();
    final resetState = _reducer.currentResponse;
    if (!_controller.isClosed) {
      _controller.add(resetState);
    }
    return resetState;
  }

  Future<void> dispose() async {
    await _controller.close();
  }
}
