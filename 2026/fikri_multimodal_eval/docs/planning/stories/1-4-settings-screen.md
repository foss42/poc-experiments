# Story 1.4: Settings Screen with Backend URL Persistence

Status: done

## Story

As a user,
I want to configure and persist the backend base URL,
so that the app connects to my FastAPI instance whether it runs locally, in Docker, or on a remote host.

## Acceptance Criteria

1. Settings screen displays a text field pre-filled with the current base URL
2. Default URL is platform-aware: empty string (web), `http://10.0.2.2:8001` (Android), `http://localhost:8001` (desktop/iOS)
3. Saved URL persists across app restarts via `SharedPreferences`
4. "Test Connection" button hits `/api/health`; shows "Connected" (green) or "Failed" (red) inline
5. Saving URL resets test status to idle
6. `flutter analyze` passes; 6 settings tests pass

## Tasks / Subtasks

- [x] Task 1: SharedPreferences bootstrap (AC: 3)
  - [x] Create `lib/shared/providers/shared_prefs_provider.dart` (`Provider<SharedPreferences>` — throws if not overridden)
  - [x] Update `lib/main.dart`: async main, `WidgetsFlutterBinding.ensureInitialized()`, override `sharedPrefsProvider` in `ProviderScope`

- [x] Task 2: SettingsNotifier (AC: 2, 3, 4, 5)
  - [x] Create `lib/features/settings/providers/settings_provider.dart`
  - [x] `SettingsState(baseUrl, testStatus)` + `TestConnectionStatus` enum (idle/testing/ok/error)
  - [x] `setBaseUrl()` persists to SharedPreferences, resets testStatus
  - [x] `testConnection()` creates one-shot Dio, hits `/api/health`, sets ok or error

- [x] Task 3: Settings screen UI (AC: 1, 4, 5)
  - [x] Create `lib/features/settings/settings_screen.dart`
  - [x] `TextEditingController` synced to `settingsProvider.baseUrl`
  - [x] "Test Connection" button, inline status indicator

- [x] Task 4: Tests (AC: 6)
  - [x] `test/settings_test.dart` — 6 tests: renders, save persists, loads saved, idle reset, Connected text, Failed text

## Dev Notes

- Platform default URL uses `kIsWeb` then `defaultTargetPlatform` (from `flutter/foundation.dart`)
- `ProviderScope.overrides` bootstrap pattern avoids async providers for SharedPreferences
- `SettingsNotifier extends StateNotifier<SettingsState>` (not `AsyncNotifier` — sync reads from prefs available at startup)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- Settings test `const MaterialApp(theme: ThemeData.dark())` → `MaterialApp(theme: ThemeData.dark())` (non-const fix)
- `_PresetNotifier extends SettingsNotifier` subclass used in tests to preset initial state
- 6 settings tests passing

### File List

- flutter_eval/lib/shared/providers/shared_prefs_provider.dart
- flutter_eval/lib/features/settings/providers/settings_provider.dart
- flutter_eval/lib/features/settings/settings_screen.dart
- flutter_eval/lib/main.dart (async bootstrap)
- flutter_eval/test/settings_test.dart
