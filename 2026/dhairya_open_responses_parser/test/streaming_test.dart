import 'package:test/test.dart';
import 'package:open_responses_parser/open_responses_parser.dart';

void main() {
  late StreamingReducer reducer;

  setUp(() {
    reducer = const StreamingReducer();
  });

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  StreamingState reduce(StreamingState s, Map<String, dynamic> event) =>
      reducer.reduce(s, event);

  // ---------------------------------------------------------------------------
  // Happy-path: full sequence
  // ---------------------------------------------------------------------------

  group('full happy-path sequence', () {
    test('function_call item accumulates and completes', () {
      var state = StreamingState.initial();

      // 1. item added
      state = reduce(state, {
        'type': 'response.output_item.added',
        'output_index': 0,
        'item': {
          'type': 'function_call',
          'id': 'fc_001',
          'call_id': 'call_weather',
          'name': 'get_weather',
          'status': 'in_progress',
        },
      });

      expect(state.items.length, 1);
      expect(state.items[0], isA<FunctionCallOutput>());

      // 2. arguments delta chunks
      state = reduce(state, {
        'type': 'response.function_call_arguments.delta',
        'output_index': 0,
        'delta': '{"city":',
      });
      state = reduce(state, {
        'type': 'response.function_call_arguments.delta',
        'output_index': 0,
        'delta': '"Tokyo"}',
      });

      expect(state.inProgressArguments[0], '{"city":"Tokyo"}');

      // 3. item done
      state = reduce(state, {
        'type': 'response.output_item.done',
        'output_index': 0,
        'item': {
          'type': 'function_call',
          'id': 'fc_001',
          'call_id': 'call_weather',
          'name': 'get_weather',
          'arguments': '{"city":"Tokyo"}',
          'status': 'completed',
        },
      });

      final fc = (state.items[0] as FunctionCallOutput).item;
      expect(fc.arguments, '{"city":"Tokyo"}');
      expect(fc.status, 'completed');

      // 4. response completed
      state = reduce(state, {
        'type': 'response.completed',
        'response': {'id': 'resp_001', 'status': 'completed'},
      });

      expect(state.isComplete, true);
      expect(state.responseId, 'resp_001');
      expect(state.status, 'completed');
    });

    test('message item text accumulates and completes', () {
      var state = StreamingState.initial();

      state = reduce(state, {
        'type': 'response.output_item.added',
        'output_index': 0,
        'item': {
          'type': 'message',
          'id': 'msg_001',
          'role': 'assistant',
          'status': 'in_progress',
        },
      });

      state = reduce(state, {
        'type': 'response.output_text.delta',
        'output_index': 0,
        'content_index': 0,
        'delta': 'Hello',
      });
      state = reduce(state, {
        'type': 'response.output_text.delta',
        'output_index': 0,
        'content_index': 0,
        'delta': ', world!',
      });

      expect(state.inProgressTexts[0], 'Hello, world!');

      final msg = (state.items[0] as MessageOutput).item;
      expect(msg.fullText, 'Hello, world!');

      state = reduce(state, {
        'type': 'response.output_item.done',
        'output_index': 0,
        'item': {
          'type': 'message',
          'id': 'msg_001',
          'role': 'assistant',
          'content': [
            {'type': 'output_text', 'text': 'Hello, world!'},
          ],
        },
      });

      final finalMsg = (state.items[0] as MessageOutput).item;
      expect(finalMsg.fullText, 'Hello, world!');

      state = reduce(state, {
        'type': 'response.completed',
        'response': {'id': 'resp_002', 'status': 'completed'},
      });
      expect(state.isComplete, true);
    });
  });

  // ---------------------------------------------------------------------------
  // Text delta accumulation
  // ---------------------------------------------------------------------------

  group('text delta accumulation', () {
    test('multiple deltas concatenate correctly', () {
      var state = StreamingState.initial();

      state = reduce(state, {
        'type': 'response.output_item.added',
        'output_index': 1,
        'item': {'type': 'message', 'id': 'msg_x', 'role': 'assistant'},
      });

      for (final chunk in ['abc', 'def', 'ghi']) {
        state = reduce(state, {
          'type': 'response.output_text.delta',
          'output_index': 1,
          'delta': chunk,
        });
      }

      expect(state.inProgressTexts[1], 'abcdefghi');
    });

    test('empty delta is ignored without crashing', () {
      var state = StreamingState.initial();
      state = reduce(state, {
        'type': 'response.output_item.added',
        'output_index': 0,
        'item': {'type': 'message', 'id': 'msg_y', 'role': 'assistant'},
      });
      final before = state.inProgressTexts[0];
      state = reduce(state, {
        'type': 'response.output_text.delta',
        'output_index': 0,
        'delta': '',
      });
      expect(state.inProgressTexts[0], before); // unchanged
    });
  });

  // ---------------------------------------------------------------------------
  // Arguments delta accumulation
  // ---------------------------------------------------------------------------

  group('arguments delta accumulation', () {
    test('chunks build up correctly', () {
      var state = StreamingState.initial();

      state = reduce(state, {
        'type': 'response.output_item.added',
        'output_index': 0,
        'item': {
          'type': 'function_call',
          'id': 'fc_x',
          'call_id': 'c1',
          'name': 'fn',
        },
      });

      state = reduce(state, {
        'type': 'response.function_call_arguments.delta',
        'output_index': 0,
        'delta': '{"a":',
      });
      state = reduce(state, {
        'type': 'response.function_call_arguments.delta',
        'output_index': 0,
        'delta': '1}',
      });

      expect(state.inProgressArguments[0], '{"a":1}');
    });
  });

  // ---------------------------------------------------------------------------
  // output_item.done replacing placeholder
  // ---------------------------------------------------------------------------

  group('output_item.done', () {
    test('replaces placeholder with final item', () {
      var state = StreamingState.initial();

      state = reduce(state, {
        'type': 'response.output_item.added',
        'output_index': 0,
        'item': {'type': 'function_call', 'id': 'fc_2', 'call_id': 'c2', 'name': 'fn2'},
      });

      state = reduce(state, {
        'type': 'response.output_item.done',
        'output_index': 0,
        'item': {
          'type': 'function_call',
          'id': 'fc_2',
          'call_id': 'c2',
          'name': 'fn2',
          'arguments': '{"x":42}',
          'status': 'completed',
        },
      });

      final fc = (state.items[0] as FunctionCallOutput).item;
      expect(fc.arguments, '{"x":42}');
      expect(fc.status, 'completed');
    });
  });

  // ---------------------------------------------------------------------------
  // Unknown item type → UnknownItem
  // ---------------------------------------------------------------------------

  group('unknown item type', () {
    test('output_item.done with unknown type produces UnknownOutput', () {
      var state = StreamingState.initial();

      state = reduce(state, {
        'type': 'response.output_item.done',
        'output_index': 0,
        'item': {'type': 'some_future_type', 'id': 'x'},
      });

      expect(state.items[0], isA<UnknownOutput>());
      final u = (state.items[0] as UnknownOutput).item;
      expect(u.type, 'some_future_type');
    });
  });

  // ---------------------------------------------------------------------------
  // Malformed events
  // ---------------------------------------------------------------------------

  group('malformed events', () {
    test('missing output_index returns state unchanged', () {
      var state = StreamingState.initial();
      final original = state;

      state = reduce(state, {'type': 'response.output_item.added'});
      expect(state.items.length, original.items.length);
    });

    test('null event values do not crash', () {
      var state = StreamingState.initial();
      // Totally empty map
      state = reduce(state, {});
      expect(state.isComplete, false);
    });

    test('output_text.delta without prior added is safe', () {
      var state = StreamingState.initial();
      // Delta arrives for index 5 without any item.added first
      state = reduce(state, {
        'type': 'response.output_text.delta',
        'output_index': 5,
        'delta': 'orphan',
      });
      // Accumulator is stored but items list isn't corrupted
      expect(state.inProgressTexts[5], 'orphan');
    });
  });

  // ---------------------------------------------------------------------------
  // Interrupted stream (no response.completed)
  // ---------------------------------------------------------------------------

  group('interrupted stream', () {
    test('currentResponse still returns accumulated data', () {
      final session = StreamingSession();

      session.processEvent({
        'type': 'response.output_item.added',
        'output_index': 0,
        'item': {'type': 'message', 'id': 'msg_z', 'role': 'assistant'},
      });
      session.processEvent({
        'type': 'response.output_text.delta',
        'output_index': 0,
        'delta': 'partial',
      });

      final response = session.currentResponse;
      expect(response.status, 'in_progress');
      expect(response.items.length, 1);
      final msg = (response.items[0] as MessageOutput).item;
      expect(msg.fullText, 'partial');

      session.dispose();
    });
  });

  // ---------------------------------------------------------------------------
  // StreamingSession stream emissions
  // ---------------------------------------------------------------------------

  group('StreamingSession', () {
    test('emits ParsedOpenResponse on each processEvent', () async {
      final session = StreamingSession();
      final emissions = <ParsedOpenResponse>[];
      final sub = session.stream.listen(emissions.add);

      session.processEvent({
        'type': 'response.output_item.added',
        'output_index': 0,
        'item': {'type': 'message', 'id': 'msg_e', 'role': 'assistant'},
      });
      session.processEvent({
        'type': 'response.completed',
        'response': {'id': 'resp_e', 'status': 'completed'},
      });

      await Future<void>.delayed(Duration.zero);

      expect(emissions.length, 2);
      expect(emissions.last.status, 'completed');

      await sub.cancel();
      session.dispose();
    });

    test('correlatedCalls populated when call and output both present', () {
      final session = StreamingSession();

      session.processEvent({
        'type': 'response.output_item.done',
        'output_index': 0,
        'item': {
          'type': 'function_call',
          'id': 'fc_c',
          'call_id': 'cid_1',
          'name': 'do_thing',
          'arguments': '{}',
          'status': 'completed',
        },
      });
      session.processEvent({
        'type': 'response.output_item.done',
        'output_index': 1,
        'item': {
          'type': 'function_call_output',
          'id': 'fco_c',
          'call_id': 'cid_1',
          'output': '{"result":"ok"}',
        },
      });

      final response = session.currentResponse;
      expect(response.correlatedCalls.containsKey('cid_1'), true);
      expect(response.correlatedCalls['cid_1']!.isComplete, true);

      session.dispose();
    });
  });
}
