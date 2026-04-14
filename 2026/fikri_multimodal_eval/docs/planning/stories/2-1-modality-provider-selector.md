# Story 2.1: Modality & Provider Selector

Status: done

## Story

As a user,
I want to choose the evaluation modality (Image / Audio / Agent) and provider (HuggingFace / Ollama),
so that subsequent benchmark options reflect only what is applicable.

## Acceptance Criteria

1. `SegmentedButton<Modality>` with image/mic/smart_toy icons for three modalities
2. Provider selector hidden when modality ≠ Image (audio and agent have no provider choice)
3. Ollama option shows a "localhost" informational note
4. Switching modality resets benchmark, tasks, models, and sample limit (agent default 5, others 10)
5. Switching provider resets model to benchmark's default for that provider
6. `flutter analyze` passes; 14 eval config tests pass

## Tasks / Subtasks

- [x] Task 1: Domain models (AC: 1, 2, 4, 5)
  - [x] Create `lib/core/models/benchmark_config.dart`
  - [x] `Modality` enum (image/audio/agent), `EvalProvider` enum (huggingface/ollama)
  - [x] `BenchmarkConfig` with id, label, harness, tasks, metric, description, defaultModelHf, defaultModelOllama
  - [x] `imageBenchmarks` (MMMU, ScienceQA, TextVQA, ChartQA, GQA), `audioBenchmarks` (5 entries), `agentBenchmarks` (basic_agent)
  - [x] `benchmarksForModality()` helper

- [x] Task 2: EvalConfig model (AC: 4, 5)
  - [x] Create `lib/core/models/eval_config.dart`
  - [x] `EvalConfig` with modality, provider, benchmark, tasks, models, sampleLimit + `copyWith()`

- [x] Task 3: EvalConfigNotifier (AC: 4, 5)
  - [x] Create `lib/features/eval/providers/eval_config_provider.dart`
  - [x] `switchModality()`, `switchProvider()`, `selectBenchmark()`, task/model/sampleLimit setters

- [x] Task 4: UI widgets (AC: 1, 2, 3)
  - [x] `lib/features/eval/widgets/modality_selector.dart` — `SegmentedButton<Modality>`
  - [x] `lib/features/eval/widgets/provider_selector.dart` — hidden when audio/agent; Ollama note

- [x] Task 5: Tests (AC: 6)
  - [x] `test/eval_config_test.dart` — 14 tests covering all state transitions

## Dev Notes

- `benchmarksForModality()` returns `imageBenchmarks`, `audioBenchmarks`, or `agentBenchmarks`
- `sampleLimit` reset: agent → 5, others → 10 (AC-HARD: no custom scoring)
- `benchmarks[0]` initializer uses `final` not `const` (List indexing is not a const expression in Dart)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- 14 eval config tests passing
- `final benchmark = imageBenchmarks[0]` corrected from `const` (list indexing is not a const expression)

### File List

- flutter_eval/lib/core/models/benchmark_config.dart
- flutter_eval/lib/core/models/eval_config.dart
- flutter_eval/lib/features/eval/providers/eval_config_provider.dart
- flutter_eval/lib/features/eval/widgets/modality_selector.dart
- flutter_eval/lib/features/eval/widgets/provider_selector.dart
- flutter_eval/test/eval_config_test.dart
