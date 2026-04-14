# Story 3.1–3.4: SSE Comparison Streaming, Live Progress View & Stop Button

Status: done

## Story

As a user,
I want to run a multi-model comparison that streams results in real-time,
so that I can watch each model complete and cancel the run if needed.

## Acceptance Criteria

1. SSE stream parsed from Dio `ResponseType.stream` — no native SSE library required
2. `sealed class SSEEvent` covers: SSEInit, SSEModelComplete, SSEModelError, SSEComplete
3. `CompareNotifier` dispatches events to `CompareState` (isRunning, done, total, results, isComplete)
4. Live `LinearProgressIndicator` with done/total count; model result chips appear as they arrive
5. `fl_chart` `BarChart` updates live with first metric per model
6. Stop button cancels both `CancelToken` and `StreamSubscription`; `dispose()` calls stop (NFR8)
7. Full results table shown when `isComplete`
8. `flutter analyze` passes; 7 SSE client tests pass

## Tasks / Subtasks

- [x] Task 1: SSE client parser (AC: 1, 2)
  - [x] Create `lib/core/api/sse_client.dart`
  - [x] `sealed class SSEEvent { const SSEEvent(); }` with 4 subtypes
  - [x] `parseSseStream(ResponseBody)` async* generator — buffers chunks, parses `data: {...}\n\n`
  - [x] Silently skips malformed JSON lines

- [x] Task 2: CompareNotifier (AC: 3, 6)
  - [x] Create `lib/features/eval/providers/compare_provider.dart`
  - [x] `CompareNotifier extends StateNotifier<CompareState>`
  - [x] `run()`: `ResponseType.stream` Dio request → `parseSseStream()` → `_onEvent()` pattern match
  - [x] `stop()`: `_cancelToken.cancel()` + `_sub.cancel()`
  - [x] `dispose()` calls `stop()`

- [x] Task 3: ProgressView widget (AC: 4, 5, 7)
  - [x] Create `lib/features/eval/widgets/progress_view.dart`
  - [x] `LinearProgressIndicator` + done/total label
  - [x] `Wrap` of model `Chip` widgets as results arrive
  - [x] `_CompareBarChart` with `fl_chart` live-updating BarChart
  - [x] Full `SingleResultView` list when `isComplete`

- [x] Task 4: Stop button integration (AC: 6)
  - [x] `run_button.dart` shows `OutlinedButton` with red styling during active comparison

- [x] Task 5: Tests (AC: 8)
  - [x] `test/sse_client_test.dart` — 7 tests: each event type, malformed skip, ordering, unknown type

## Dev Notes

- Dart has no native SSE client; `ResponseType.stream` + manual `data:` line parsing is the standard pattern
- `sealed class SSEEvent` requires `const SSEEvent()` constructor for `const SSEComplete()` subtype
- `CancelToken` from Dio v5 — `cancel()` triggers `DioException` in the stream, which is caught and stops iteration
- `CompareNotifier.dispose()` is called automatically by Riverpod when last listener unsubscribes (navigation away = NFR8 cleanup)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- `const SSEEvent()` constructor added to sealed class to allow `const SSEComplete()`
- `_onEvent()` uses exhaustive switch on sealed type subtypes
- 7 SSE client tests passing

### File List

- flutter_eval/lib/core/api/sse_client.dart
- flutter_eval/lib/features/eval/providers/compare_provider.dart
- flutter_eval/lib/features/eval/widgets/progress_view.dart
- flutter_eval/lib/features/eval/widgets/run_button.dart (stop button)
- flutter_eval/test/sse_client_test.dart
