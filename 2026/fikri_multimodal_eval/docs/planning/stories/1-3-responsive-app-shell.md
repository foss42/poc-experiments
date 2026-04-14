# Story 1.3: Responsive App Shell with go_router Navigation

Status: done

## Story

As a user,
I want a responsive navigation shell that adapts to screen width,
so that I get a NavigationRail on tablets/desktop and a BottomNavigationBar on phones.

## Acceptance Criteria

1. `AppShell` uses `LayoutBuilder` — breakpoint 600 px — `NavigationRail` (≥ 600) vs `BottomNavigationBar` (< 600)
2. Three destinations: Evaluate (`/`), Results (`/results`), Settings (`/settings`)
3. Active destination syncs with current GoRouter path without re-building the shell
4. `StatusBar` rendered above content area (beneath navigation on wide, above content on narrow)
5. `flutter analyze` passes; 4 shell navigation tests pass

## Tasks / Subtasks

- [x] Task 1: GoRouter config (AC: 2, 3)
  - [x] Create `lib/core/router/app_router.dart` with `routerProvider` (Provider<GoRouter>)
  - [x] `ShellRoute` wrapping `AppShell`; nested `/results/:id` under `/results`

- [x] Task 2: AppShell widget (AC: 1, 3, 4)
  - [x] `ConsumerWidget` watching `healthProvider`
  - [x] `PopScope(canPop: false)` to suppress Android back-button exit
  - [x] `_selectedIndex` computed from `GoRouterState.of(context).uri.path`
  - [x] `_WideShell` (Row: NavigationRail + Expanded content) and `_NarrowShell` (Column: content + BottomNavigationBar)

- [x] Task 3: Theme extensions (AC: 1)
  - [x] Add `BottomNavigationBarThemeData` and `NavigationRailThemeData` to `AppTheme.dark()`

- [x] Task 4: Tests (AC: 5)
  - [x] `test/app_shell_test.dart` — 4 tests: NavigationRail wide, BottomNav narrow, Results nav, Settings nav

## Dev Notes

- `GoRouterState.of(context)` available inside `ShellRoute` builder — no need for `Provider`
- `_selectedIndex` derives from path prefix: `/results` → 1, `/settings` → 2, else → 0
- `PopScope` replaces deprecated `WillPopScope` in Flutter 3.x

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- AppShell made `ConsumerWidget` (not `StatefulWidget`) — no local state for selected index
- NavigationRail and BottomNavigationBar theme values added to AppTheme.dark()
- 4 app shell tests passing

### File List

- flutter_eval/lib/core/router/app_router.dart
- flutter_eval/lib/shared/widgets/app_shell.dart
- flutter_eval/lib/core/theme/app_theme.dart (BottomNavigationBar + NavigationRail themes added)
- flutter_eval/test/app_shell_test.dart
