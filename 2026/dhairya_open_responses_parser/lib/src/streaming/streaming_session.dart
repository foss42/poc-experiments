import 'dart:async';

import '../models/open_response.dart';
import '../models/correlated_call.dart';
import '../models/items/function_call_item.dart';
import '../models/items/function_call_output_item.dart';
import 'streaming_reducer.dart';
import 'streaming_state.dart';

/// Higher-level wrapper around [StreamingReducer].
///
/// Maintains internal [StreamingState], exposes a [processEvent] method,
/// a [currentResponse] getter and a [stream] of [ParsedOpenResponse] updates.
class StreamingSession {
  StreamingSession({StreamingReducer? reducer})
      : _reducer = reducer ?? const StreamingReducer();

  final StreamingReducer _reducer;
  StreamingState _state = StreamingState.initial();

  final _controller = StreamController<ParsedOpenResponse>.broadcast();

  /// Feed one SSE event into the session.
  void processEvent(Map<String, dynamic> event) {
    _state = _reducer.reduce(_state, event);
    _controller.add(currentResponse);
  }

  /// The latest [ParsedOpenResponse] built from accumulated state.
  ParsedOpenResponse get currentResponse => _buildResponse(_state);

  /// Emits a new [ParsedOpenResponse] after every [processEvent] call.
  Stream<ParsedOpenResponse> get stream => _controller.stream;

  /// Close the underlying [StreamController].
  void dispose() => _controller.close();

  // ---------------------------------------------------------------------------

  ParsedOpenResponse _buildResponse(StreamingState state) {
    // Correlate function_call ↔ function_call_output by call_id.
    final callMap = <String, FunctionCallItem>{};
    final outputMap = <String, FunctionCallOutputItem>{};

    for (final item in state.items) {
      if (item is FunctionCallOutput) callMap[item.item.callId] = item.item;
      if (item is FunctionCallOutputResult) {
        outputMap[item.item.callId] = item.item;
      }
    }

    final correlatedCalls = <String, CorrelatedCall>{
      for (final entry in callMap.entries)
        entry.key: CorrelatedCall(
          call: entry.value,
          output: outputMap[entry.key],
        ),
    };

    return ParsedOpenResponse(
      id: state.responseId ?? 'streaming',
      status: state.status,
      model: 'unknown',
      items: List.unmodifiable(state.items),
      correlatedCalls: correlatedCalls,
    );
  }
}
