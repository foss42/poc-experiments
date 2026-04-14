# Story 2.2: Benchmark Card & Task Selector

Status: done

## Story

As a user,
I want to pick a benchmark from animated cards and select specific tasks,
so that I can run a focused evaluation without running the entire suite.

## Acceptance Criteria

1. Benchmark cards show label, harness badge, metric badge, and short description
2. Selected card has highlighted border and expanded description; shows checkmark
3. Task selector shows only tasks for the selected benchmark
4. Selecting a benchmark auto-populates the task list with all tasks selected
5. `flutter analyze` passes

## Tasks / Subtasks

- [x] Task 1: BenchmarkCard widget (AC: 1, 2)
  - [x] Create `lib/features/eval/widgets/benchmark_card.dart`
  - [x] `GestureDetector` + `AnimatedContainer` with `AppTheme.primary` border when selected
  - [x] Expands description on selection; `_TechTag` and `_MetricBadge` private widgets

- [x] Task 2: TaskSelector widget (AC: 3, 4)
  - [x] Create `lib/features/eval/widgets/task_selector.dart`
  - [x] `DropdownButton<String>` (not `DropdownButtonFormField` — `.value` deprecated Flutter 3.33+)
  - [x] Calls `evalConfigProvider.notifier.setTasks([selected])`

- [x] Task 3: Integrate into EvalScreen (AC: 4)
  - [x] Step 2 in `eval_screen.dart` renders benchmark cards grid + task selector

## Dev Notes

- `DropdownButtonFormField.value` is deprecated in Flutter 3.33+ — using `DropdownButton<String>` directly
- `AnimatedContainer` transition duration: 200ms
- Benchmark grid uses `Wrap` for responsive layout

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- DropdownButton used instead of DropdownButtonFormField to avoid lint failure on deprecated `.value`

### File List

- flutter_eval/lib/features/eval/widgets/benchmark_card.dart
- flutter_eval/lib/features/eval/widgets/task_selector.dart
- flutter_eval/lib/features/eval/eval_screen.dart (Step 2 added)
