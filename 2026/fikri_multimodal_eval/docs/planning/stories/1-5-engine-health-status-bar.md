# Story 1.5: Engine Health Status Bar

Status: done

## Story

As a user,
I want to see which evaluation engines are available at a glance,
so that I know before running a benchmark whether the required backend is online.

## Acceptance Criteria

1. `StatusBar` shows 5 `EngineDot` widgets: lm-eval-harness, lmms-eval, inspect-ai, faster-whisper, Ollama
2. Dots use `healthProvider` (FutureProvider<HealthStatus>) — green when ok, zinc when offline
3. Status bar scrolls horizontally on narrow screens
4. Health endpoint errors result in all-offline display (no crash)
5. `flutter analyze` passes; 6 status bar tests pass

## Tasks / Subtasks

- [x] Task 1: HealthStatus model (AC: 2)
  - [x] Create `lib/core/models/health_status.dart`
  - [x] `HealthStatus.fromJson()` parses `lm_eval/lmms_eval/inspect_ai/faster_whisper/ollama` booleans
  - [x] `HealthStatus.allOffline()` factory for error/missing-field states

- [x] Task 2: Health provider (AC: 2, 4)
  - [x] Create `lib/shared/providers/health_provider.dart`
  - [x] `FutureProvider<HealthStatus>` watching `dioProvider`; all exceptions → `allOffline()`

- [x] Task 3: API client (AC: 2)
  - [x] Create `lib/core/api/api_client.dart`
  - [x] `dioProvider` watches `settingsProvider.baseUrl` — recreates Dio on URL change

- [x] Task 4: StatusBar widget (AC: 1, 3)
  - [x] `SingleChildScrollView(scrollDirection: Axis.horizontal)` wrapping `Row` of 5 `EngineDot` widgets
  - [x] `const SizedBox(width: 12)` spacers between dots

- [x] Task 5: Tests (AC: 5)
  - [x] `test/status_bar_test.dart` — 6 tests: labels present, all online, all offline, scrollable, fromJson, missing fields

## Dev Notes

- `HealthStatus.allOffline()` ensures `AsyncError` from healthProvider never propagates to UI
- `dioProvider` is a `Provider<Dio>` (not `FutureProvider`) — Dio construction is synchronous
- JSON keys from `/api/health`: `lm_eval`, `lmms_eval`, `inspect_ai`, `faster_whisper`, `ollama`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- 6 status bar tests passing
- allOffline factory tested for missing JSON fields and catch-all error scenarios

### File List

- flutter_eval/lib/core/models/health_status.dart
- flutter_eval/lib/core/api/api_client.dart
- flutter_eval/lib/shared/providers/health_provider.dart
- flutter_eval/lib/shared/widgets/status_bar.dart
- flutter_eval/test/status_bar_test.dart
