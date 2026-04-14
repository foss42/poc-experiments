# Story 2.4–2.6: Single Eval Run, Metrics Grid & Trajectory Viewer

Status: done

## Story

As a user,
I want to run a single-model evaluation, see benchmark metrics in a grid, and inspect agent trajectories,
so that I can assess model performance without leaving the app.

## Acceptance Criteria

1. Run button posts to `/api/eval/harness` with a 10-minute timeout
2. Results display raw metric values from the harness (AC-HARD: no recalculation)
3. Metrics < 1.0 displayed as percentage; ≥ 1.0 displayed to 3 decimal places; stderr rows hidden
4. `_cleanKey()` strips `,none` suffix from lm-eval-harness metric keys
5. Agent trajectory shown in collapsible `ExpansionTile`; role colors: user=primary, assistant=success, tool=warning
6. `EvalErrorBanner` displays errors inline in red container
7. `flutter analyze` passes; 5 single_result tests pass

## Tasks / Subtasks

- [x] Task 1: EvalNotifier (AC: 1, 2)
  - [x] Create `lib/features/eval/providers/eval_provider.dart`
  - [x] `EvalNotifier extends AsyncNotifier<Map<String, dynamic>?>`
  - [x] `run()` posts to `/api/eval/harness` with `receiveTimeout: Duration(minutes: 10)`
  - [x] `buildEvalRequest()` maps `EvalConfig` → request body dict

- [x] Task 2: SingleResultView widget (AC: 2, 3, 4)
  - [x] Create `lib/features/eval/widgets/single_result_view.dart`
  - [x] Safe cast: `((data['results'] as Map?)?.cast<String, dynamic>()) ?? {}`
  - [x] `_cleanKey()` strips `,none`; `_formatValue()` formats by magnitude

- [x] Task 3: TrajectoryView widget (AC: 5)
  - [x] Create `lib/features/eval/widgets/trajectory_view.dart`
  - [x] `ExpansionTile` collapsed by default
  - [x] Role colors via Dart 3 switch expression; 3px left border per message

- [x] Task 4: RunButton & EvalErrorBanner (AC: 6)
  - [x] Create `lib/features/eval/widgets/run_button.dart`
  - [x] `LayoutBuilder`: `Expanded` on narrow, `MainAxisSize.min` on wide
  - [x] Routes to `compareProvider` or `evalProvider` based on model count

- [x] Task 5: EvalScreen integration (AC: 1–6)
  - [x] `_ResultSection` and `_CompareResultSection` in `eval_screen.dart`

- [x] Task 6: Tests (AC: 7)
  - [x] `test/single_result_test.dart` — 5 tests: task name, %, 3 decimals, empty state, trajectory expand

## Dev Notes

- AC-HARD: raw metric values are displayed as-is; no recomputation or normalization
- `type '_ConstMap<dynamic, dynamic>'` runtime error fixed with `.cast<String, dynamic>()`
- `const_with_non_const_super` in SSE sealed class: `sealed class SSEEvent { const SSEEvent(); }`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- `((data['results'] as Map?)?.cast<String, dynamic>()) ?? {}` — fixes const map type mismatch
- Role color switch expression used for exhaustive pattern matching
- 5 single result tests passing

### File List

- flutter_eval/lib/features/eval/providers/eval_provider.dart
- flutter_eval/lib/features/eval/widgets/single_result_view.dart
- flutter_eval/lib/features/eval/widgets/trajectory_view.dart
- flutter_eval/lib/features/eval/widgets/run_button.dart
- flutter_eval/lib/features/eval/eval_screen.dart (result sections)
- flutter_eval/test/single_result_test.dart
