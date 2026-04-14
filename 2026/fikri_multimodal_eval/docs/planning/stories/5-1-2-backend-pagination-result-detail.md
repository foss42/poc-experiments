# Story 5.1–5.2: Backend Pagination Endpoint & Per-Result Detail Screen

Status: done

## Story

As a user,
I want the backend to return paginated results and a per-result detail page,
so that the app loads quickly on large result sets and I can inspect any individual run.

## Acceptance Criteria

1. `GET /api/results?limit=N&offset=M` returns `{"total": int, "results": [...]}`
2. Default limit = 20
3. Result detail screen loads `/api/results/:id` and shows metrics + trajectory
4. 404 → "Result not found" with back button
5. Back button navigates to `/results`
6. `flutter analyze` passes

## Tasks / Subtasks

- [x] Task 1: Backend pagination (AC: 1, 2)
  - [x] Update `backend/db.py`: `list_results(limit=20, offset=0)` returns `{"total": int, "results": [...]}`
  - [x] Update `backend/main.py`: `GET /api/results` accepts `limit` and `offset` query params

- [x] Task 2: Result detail screen (AC: 3, 4, 5)
  - [x] Create `lib/features/results/result_detail_screen.dart`
  - [x] `_resultDetailProvider = FutureProvider.family<Map, String>` for `/api/results/$evalId`
  - [x] AppBar with back button → `context.go('/results')`
  - [x] Shows `SingleResultView` + `TrajectoryView` if trajectory present
  - [x] 404 → "Result not found" + back button

## Dev Notes

- `FutureProvider.family` keyed on `evalId` string — each detail page is independently cached
- Backend `list_results()` uses `SELECT ... LIMIT ? OFFSET ?` — SQLite pagination
- `context.go('/results')` rather than `context.pop()` — ensures correct back-stack on deep links

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- backend/db.py updated to return total + paginated results
- FutureProvider.family used for per-ID caching on detail screen

### File List

- backend/db.py
- backend/main.py
- flutter_eval/lib/features/results/result_detail_screen.dart
- flutter_eval/lib/core/router/app_router.dart (nested :id route confirmed)
