# Story 4.1–4.2: Results History with Pagination & Pull-to-Refresh

Status: done

## Story

As a user,
I want to browse past evaluations with infinite scroll and pull-to-refresh,
so that I can find and revisit any completed run without losing my scroll position.

## Acceptance Criteria

1. Results list shows evaluation type badge (Compare/Single), harness chip, task chips, model chips, timestamp
2. Model chips truncated at 28 chars with full-text `Tooltip`
3. Pull-to-refresh reloads from page 1 (mobile)
4. Desktop refresh button in header
5. "Load more" button appends next page (page size 20)
6. Empty state, error with retry, and loading spinner
7. Tapping a card navigates to `/results/:id`
8. `flutter analyze` passes

## Tasks / Subtasks

- [x] Task 1: ResultsNotifier (AC: 3, 4, 5)
  - [x] Create `lib/features/results/providers/results_provider.dart`
  - [x] `ResultsState(items, total, isLoadingMore, hasMore)` data class
  - [x] `ResultsNotifier extends AsyncNotifier<ResultsState>`
  - [x] `refresh()` resets to page 1; `loadMore()` appends next page

- [x] Task 2: ResultCard widget (AC: 1, 2, 7)
  - [x] Create `lib/features/results/widgets/result_card.dart`
  - [x] `GestureDetector` → `context.go('/results/$evalId')`
  - [x] `_EvalTypeBadge`: Compare=AppTheme.compare, Single=AppTheme.primary
  - [x] Model chip `Tooltip` with full name; truncated label at 28 chars

- [x] Task 3: ResultsScreen (AC: 3, 4, 5, 6, 8)
  - [x] Create `lib/features/results/results_screen.dart`
  - [x] `RefreshIndicator` wrapping list
  - [x] `_LoadMoreButton` at list end when `state.hasMore`
  - [x] Empty, error, and loading states

## Dev Notes

- `ResultsState` replaces a simple `List<Map>` return to track pagination state alongside items
- `loadMore()` guards against double-calls when `isLoadingMore == true`
- `_formatDate()` in ResultCard parses ISO 8601 to local time with `.toLocal()`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- ResultsProvider rewritten from simple list return to ResultsState with pagination tracking
- Compare badge uses AppTheme.compare (purple); Single uses AppTheme.primary (blue)

### File List

- flutter_eval/lib/features/results/providers/results_provider.dart
- flutter_eval/lib/features/results/widgets/result_card.dart
- flutter_eval/lib/features/results/results_screen.dart
