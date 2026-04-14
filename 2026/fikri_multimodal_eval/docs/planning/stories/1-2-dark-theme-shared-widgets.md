# Story 1.2: Dark Theme & Shared Widget Library

Status: review

## Story

As a developer,
I want a complete dark zinc/blue theme and reusable shared widgets in place,
so that all feature screens can import consistent styling without duplicating code.

## Acceptance Criteria

1. `AppTheme.dark()` ThemeData covers scaffold, inputs, buttons (ElevatedButton min 48×48), segmented button, chips
2. `SectionCard` widget renders numbered step badge + title row + child content
3. `EngineDot` widget renders 6px circle (emerald-400 when ok, zinc-700 when offline) + label
4. `flutter analyze` passes with no errors
5. Widget tests: SectionCard renders step badge + title + child; EngineDot green when ok; EngineDot zinc when offline

## Tasks / Subtasks

- [x] Task 1: Extend AppTheme (AC: 1)
  - [x] Add inputDecorationTheme, elevatedButtonTheme (min 48×48), outlinedButtonTheme, segmentedButtonTheme, chipTheme to AppTheme.dark()

- [x] Task 2: SectionCard widget (AC: 2)
  - [x] Create `lib/shared/widgets/section_card.dart`
  - [x] Implement `SectionCard(step, title, child)` with `_StepBadge` private widget (20×20 circle, primary/primaryLight)

- [x] Task 3: EngineDot widget (AC: 3)
  - [x] Create `lib/shared/widgets/engine_dot.dart`
  - [x] Implement `EngineDot(label, ok)` — 6px circle success/muted + 11px label text

- [x] Task 4: Widget tests (AC: 4, 5)
  - [x] Add SectionCard and EngineDot tests to `test/widget_test.dart`
  - [x] Run `flutter analyze` (0 issues) and `flutter test` (4 pass)

## Dev Notes

- `AppTheme` is `abstract final class` — all members are `static const`
- `withValues(alpha: 0.2)` used on `AppTheme.primary` in `_StepBadge` (Flutter 3.x API)
- EngineDot `ok: true` → `AppTheme.success` (0xFF34D399); `ok: false` → `AppTheme.muted` (0xFF3F3F46)
- No code generation — manual Riverpod, no freezed/riverpod_generator

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- AppTheme.dark() complete with all button/input/chip themes in Story 1.1 already
- SectionCard and EngineDot created fresh in Story 1.2
- 4 widget tests passing: app boot, SectionCard render, EngineDot ok, EngineDot offline

### File List

- flutter_eval/lib/core/theme/app_theme.dart (already complete from Story 1.1)
- flutter_eval/lib/shared/widgets/section_card.dart
- flutter_eval/lib/shared/widgets/engine_dot.dart
- flutter_eval/test/widget_test.dart
