# Story 1.1: Flutter Project Scaffold

Status: review

## Story

As a developer,
I want a Flutter project initialized at `flutter_eval/` with all dependencies configured,
so that the codebase compiles on Android, iOS, and desktop from a single `pubspec.yaml`.

## Acceptance Criteria

1. `flutter pub get` inside `flutter_eval/` resolves all dependencies: `flutter_riverpod`, `go_router`, `dio`, `fl_chart`, `shared_preferences`
2. `flutter build apk --debug` completes without errors
3. `flutter build ios --no-codesign` completes without errors (on macOS) or skipped on Linux
4. Folder structure exists: `lib/core/api/`, `lib/core/models/`, `lib/core/theme/`, `lib/features/eval/providers/`, `lib/features/eval/widgets/`, `lib/features/results/providers/`, `lib/features/results/widgets/`, `lib/features/settings/providers/`, `lib/features/settings/widgets/`, `lib/shared/providers/`, `lib/shared/widgets/`
5. `frontend/` directory is removed from the repo
6. `main.dart` boots without errors (shows a blank dark scaffold)
7. `flutter analyze` passes with no errors

## Tasks / Subtasks

- [x] Task 1: Create Flutter project and configure pubspec.yaml (AC: 1, 2, 3)
  - [x] Run `flutter create flutter_eval --org com.fikri.eval --platforms android,ios,web,linux,windows,macos` at repo root
  - [x] Replace generated `pubspec.yaml` with project-specific version including all required dependencies
  - [x] Run `flutter pub get` and verify resolution

- [x] Task 2: Create feature-based folder structure (AC: 4)
  - [x] Create all directories under `lib/` per architecture spec
  - [x] Add `.gitkeep` files to empty leaf directories so git tracks them

- [x] Task 3: Bootstrap main.dart and app.dart (AC: 6)
  - [x] Write `main.dart` wrapping app in `ProviderScope`
  - [x] Write `app.dart` with minimal `MaterialApp` + dark `ThemeData` scaffold

- [x] Task 4: Remove React frontend (AC: 5)
  - [x] Delete `frontend/` directory from repo

- [x] Task 5: Verify analyze passes (AC: 7)
  - [x] Run `flutter analyze` and fix any issues

## Dev Notes

- Flutter project lives at `flutter_eval/` alongside `backend/` at repo root: `/home/fikrii/Desktop/gsoc-poc/2026/fikri_multimodal_eval/`
- Target platforms: Android (primary), iOS, Web (for Docker delivery), Linux/macOS/Windows desktop
- No code generation dependencies — no `build_runner`, no `riverpod_generator`, no `freezed`
- Architecture: `lib/core/` (api, models, theme) + `lib/features/` (eval, results, settings) + `lib/shared/` (providers, widgets)
- State management: `flutter_riverpod ^2.x` — `AsyncNotifier`, `StateNotifier`, `FutureProvider`
- Navigation: `go_router` — APIDash compatible
- HTTP: `dio` — APIDash compatible
- Charts: `fl_chart`
- Settings persistence: `shared_preferences`

### pubspec.yaml dependencies to add
```yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_riverpod: ^2.6.1
  go_router: ^14.6.2
  dio: ^5.7.0
  fl_chart: ^0.70.2
  shared_preferences: ^2.3.3

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0
```

### Project Structure Notes
- `flutter_eval/` is a sibling of `backend/` and `frontend/` (to be deleted)
- `docker-compose.yml` frontend service will be updated in a later story (Epic 1 setup only)
- `main.dart` must wrap with `ProviderScope` for Riverpod

### References
- [Source: docs/superpowers/specs/2026-04-14-flutter-multimodal-eval-design.md#2-project-structure]
- [Source: docs/superpowers/specs/2026-04-14-flutter-multimodal-eval-design.md#3-dependencies]

## Dev Agent Record

### Agent Model Used

claude-opus-4-6

### Debug Log References

### Completion Notes List

- Flutter 3.41.6 / Dart 3.11.4 used
- All 5 deps resolved: flutter_riverpod 2.6.1, go_router 14.8.1, dio 5.9.2, fl_chart 0.70.2, shared_preferences 2.5.5
- app_theme.dart created with full zinc/blue palette as part of Task 3 (needed by app.dart)
- frontend/ deleted, widget_test.dart updated to use EvalApp
- flutter analyze: 0 issues, flutter test: 1 pass

### File List

- flutter_eval/pubspec.yaml
- flutter_eval/pubspec.lock
- flutter_eval/lib/main.dart
- flutter_eval/lib/app.dart
- flutter_eval/lib/core/theme/app_theme.dart
- flutter_eval/lib/core/api/.gitkeep
- flutter_eval/lib/core/models/.gitkeep
- flutter_eval/lib/features/eval/providers/.gitkeep
- flutter_eval/lib/features/eval/widgets/.gitkeep
- flutter_eval/lib/features/results/providers/.gitkeep
- flutter_eval/lib/features/results/widgets/.gitkeep
- flutter_eval/lib/features/settings/providers/.gitkeep
- flutter_eval/lib/features/settings/widgets/.gitkeep
- flutter_eval/lib/shared/providers/.gitkeep
- flutter_eval/lib/shared/widgets/.gitkeep
- flutter_eval/test/widget_test.dart
- frontend/ (deleted)
