# Story 2.3: Model Input List with Autocomplete & Sample Limit

Status: done

## Story

As a user,
I want to enter one or more model names with autocomplete suggestions and set a sample limit,
so that I can compare multiple models or cap evaluation time.

## Acceptance Criteria

1. Dynamic list of text fields — add up to 4 models; remove any row
2. `RawAutocomplete<String>` shows suggestions from `/api/models` as the user types
3. "Comparison mode" chip appears when ≥ 2 models are entered
4. Agent modality forces single-model (add button disabled at 1 model)
5. Sample limit field accepts only positive integers
6. `flutter analyze` passes

## Tasks / Subtasks

- [x] Task 1: Models provider (AC: 2)
  - [x] Create `lib/shared/providers/models_provider.dart`
  - [x] `FutureProvider<Map<String, List<String>>>` hitting `/api/models`

- [x] Task 2: ModelInputList widget (AC: 1, 2, 3, 4)
  - [x] Create `lib/features/eval/widgets/model_input_list.dart`
  - [x] `ConsumerStatefulWidget` managing `List<TextEditingController>`
  - [x] `RawAutocomplete<String>` overlay with filtered suggestions
  - [x] Add/Remove rows; max 4; agent clamps at 1
  - [x] "Comparison mode" chip with `AppTheme.compare` color when `controllers.length >= 2`

- [x] Task 3: SampleLimitField (AC: 5)
  - [x] `TextFormField` with `FilteringTextInputFormatter.digitsOnly` + positive-int validator
  - [x] `_modelKey()` and `_placeholder()` as Dart 3 switch expressions (exhaustive on enums)

## Dev Notes

- `_modelKey()` and `_placeholder()` use switch expressions (not statements) — Dart 3 exhaustiveness
- `EvalConfig` must be explicitly imported in `model_input_list.dart` (no re-export from barrel)
- `body_might_complete_normally` lint: switch statements on enums aren't exhaustive-proven; switch expressions are

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- Replaced switch statements with switch expressions to fix `body_might_complete_normally` lint
- Added explicit `import eval_config.dart` after `EvalConfig` was undefined

### File List

- flutter_eval/lib/shared/providers/models_provider.dart
- flutter_eval/lib/features/eval/widgets/model_input_list.dart
- flutter_eval/lib/features/eval/eval_screen.dart (Step 3 added)
