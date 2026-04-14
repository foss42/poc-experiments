---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments:
  - docs/superpowers/specs/2026-04-14-flutter-multimodal-eval-design.md
  - backend/main.py
  - frontend/src/App.tsx
  - frontend/src/components/EvalPanel.tsx
  - frontend/src/components/ProgressView.tsx
  - frontend/src/components/ResultsPanel.tsx
  - frontend/src/components/StatusBar.tsx
  - frontend/src/hooks/useSSE.ts
---

# Flutter Multimodal Eval - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for the Flutter Multimodal Eval app, decomposing requirements from the design spec and existing React codebase into implementable stories for the Developer agent.

## Architectural Hard Constraint

> **AC-HARD — No Custom Eval Logic**: The Flutter app and FastAPI backend MUST NOT implement any custom benchmark evaluation, custom metrics, or custom dataset handling. All evaluations delegate entirely to established frameworks:
> - **lm-eval-harness** → image/VLM benchmarks (MMMU, ScienceQA, TextVQA, ChartQA, GQA)
> - **lmms-eval** → audio/ASR benchmarks (LibriSpeech, CommonVoice, FLEURS, VoiceBench)
> - **inspect-ai** → agent/tool-use benchmarks
> - **faster-whisper** → optimized ASR (CTranslate2/INT8)
>
> The Flutter app is a **configuration UI + results viewer**. The backend is a **thin API wrapper**. Any story that adds custom metric calculation, custom dataset upload, or custom harness logic violates this constraint and must be rejected.

---

## Requirements Inventory

### Functional Requirements

FR1: Flutter native mobile app (Android/iOS primary) replaces the React frontend entirely — the `frontend/` directory is removed
FR2: Backend remains Dockerized — `docker-compose up` starts only the FastAPI backend; Flutter app connects to it at a configurable URL
FR3: Flutter project lives at `flutter_eval/` in the same repo root alongside `backend/`
FR4: App displays a status bar showing live health of all five eval engines: lm-eval-harness, lmms-eval, inspect-ai, faster-whisper, Ollama
FR5: User can select a modality (Image / Audio / Agent) — switching modality resets benchmark, provider, model list
FR6: User can select a provider for image modality only (HuggingFace / Ollama) — switching provider updates model defaults
FR7: User can browse and select a benchmark from a list with expandable descriptions per benchmark card
FR8: User can select one or more tasks from a dropdown for the selected benchmark
FR9: User can configure a sample limit (numeric input)
FR10: User can enter one or more model identifiers with autocomplete suggestions from the models API
FR11: User can run a single-model evaluation (POST /api/eval/harness) and see results inline
FR12: User can add up to 4 models and run a concurrent comparison (POST /api/eval/harness/compare) via SSE streaming
FR13: Comparison run shows live progress: LinearProgressIndicator, per-model chips as results arrive, bar chart updating live, final results table
FR14: User can stop an in-progress comparison run — stream is cancelled cleanly
FR15: Single-model result displays a metrics grid (task → metric key → value) with correct formatting (% for accuracy, 3 decimals for others)
FR16: Agent eval result displays a collapsible trajectory viewer showing each message (system/user/assistant/tool) with role-coloured indicators
FR17: Results history screen lists all past evaluations (eval_id, type, harness, tasks, models, timestamp) fetched from GET /api/results
FR18: Results history supports manual refresh on desktop and pull-to-refresh on mobile
FR19: Settings screen allows user to configure and persist the backend base URL
FR20: Settings screen has a "Test connection" button that hits /api/health and shows inline pass/fail
FR21: App auto-detects runtime: uses relative URL `/` on Flutter Web (Nginx proxies), uses `http://localhost:8001` on native builds

### NonFunctional Requirements

NFR1: Responsive layout — breakpoint at 600px: NavigationRail on desktop/tablet, BottomNavigationBar on mobile
NFR2: All interactive touch targets have a minimum size of 48×48px (Material accessibility guideline)
NFR3: Dark theme matches existing zinc/blue palette exactly (zinc-950 background, zinc-900 surface, blue-500 primary)
NFR4: State management uses Riverpod 2.x (AsyncNotifier, StateNotifier, FutureProvider, StreamProvider) — APIDash compatible
NFR5: Navigation uses go_router — APIDash compatible
NFR6: HTTP client uses Dio — APIDash compatible
NFR7: No code generation dependencies (no build_runner, no riverpod_generator, no freezed) — keeps build simple
NFR8: SSE stream is cancelled automatically when the comparison provider is disposed — no manual AbortController
NFR9: Docker build uses multi-stage (Flutter builder → Nginx alpine) and must complete without errors
NFR10: Nginx config must set `proxy_buffering off` and `proxy_http_version 1.1` for SSE compatibility
NFR11: Unit tests cover SSE chunk parsing in sse_client.dart
NFR12: Provider tests cover EvalConfigNotifier state transitions (modality/benchmark/provider switching)
NFR13: Widget tests cover StatusBar rendering given a HealthStatus object

### Additional Requirements

- Feature-based folder structure: features/eval, features/results, features/settings, shared/providers, shared/widgets, core/api, core/models, core/theme
- SettingsProvider (StateNotifier) persists baseUrl to shared_preferences
- healthProvider and modelsProvider are FutureProviders loaded on app startup
- EvalConfigNotifier (StateNotifier) holds all form state for the 3-step eval wizard
- EvalNotifier (AsyncNotifier) manages single eval run lifecycle (idle → loading → data/error)
- CompareNotifier (AsyncNotifier) exposes Stream<SSEEvent> from sse_client.dart for comparison mode
- ResultsNotifier (AsyncNotifier) manages results history with manual refresh
- Flutter project lives at flutter_eval/ directory alongside existing backend/ and frontend/
- docker-compose.yml frontend service build context changes from ./frontend to ./flutter_eval only

### UX Design Requirements

UX-DR1: SectionCard shared widget — numbered step badge (circle, blue-500/20 background) + title + children, with zinc-900 card color and zinc-800 border, 12px border radius, 16px padding
UX-DR2: EngineDot shared widget — 6px circle, emerald-400 when OK, zinc-600 when offline, with label text
UX-DR3: StatusBar widget — horizontal row of EngineDot + label pairs; wraps in SingleChildScrollView(scrollDirection: horizontal) on mobile
UX-DR4: ModalitySelector widget — SegmentedButton with Image/Audio/Agent options and matching icons (image, audio_lines, smart_toy)
UX-DR5: ProviderSelector widget — SegmentedButton with HuggingFace/Ollama options; visible only when modality == image; shows explanatory text when Ollama selected
UX-DR6: BenchmarkCard widget — tappable card showing label + tech tag + metric badge; expands to show description when selected; checkmark on selected card
UX-DR7: ModelInputList widget — dynamic list of TextField rows with RawAutocomplete suggestions; Add button (max 4); Remove (X) button per row; "Comparison mode" chip when ≥2 models
UX-DR8: RunButton widget — full-width on mobile (width < 600), right-aligned on desktop; shows "Stop" outlined button during active comparison; disabled when any model field is empty
UX-DR9: ProgressView widget — LinearProgressIndicator with done/total label; Wrap of model chips as results arrive; BarChart (fl_chart) updating live; results Table after chart
UX-DR10: SingleResultView widget — Card with benchmark label/tech/metric header; Wrap grid of metric cards (2-3 cols desktop, 1-2 mobile); error text if result.error present
UX-DR11: TrajectoryView widget — ExpansionTile collapsed by default; messages as ListView with left-border color coding: system=grey, user=blue, assistant=green, tool=amber
UX-DR12: ResultCard widget — eval type badge (Compare purple / Single blue), harness chip, eval_id monospace, task list, model chips with truncation
UX-DR13: AppShell responsive scaffold — LayoutBuilder: width≥600 → Row[NavigationRail, Expanded(child)]; width<600 → Scaffold with BottomNavigationBar; StatusBar above content area

### FR Coverage Map

FR1  → Epic 1 — Flutter project scaffold (replaces React frontend)
FR2  → Epic 1 — Backend stays Dockerized, Flutter connects to it
FR3  → Epic 1 — flutter_eval/ directory at repo root
FR4  → Epic 1 — Engine health status bar (5 engine dots)
FR19 → Epic 1 — Settings screen with backend URL input
FR20 → Epic 1 — "Test connection" button
FR21 → Epic 1 — Platform-aware base URL (kIsWeb / emulator / physical device)
FR5  → Epic 2 — Modality selector (image/audio/agent)
FR6  → Epic 2 — Provider selector (HuggingFace/Ollama, image only)
FR7  → Epic 2 — Benchmark list with expandable cards (harness-backed tasks only)
FR8  → Epic 2 — Task dropdown (tasks from lm-eval/lmms-eval/inspect-ai/faster-whisper)
FR9  → Epic 2 — Sample limit input
FR10 → Epic 2 — Model input list with autocomplete from /api/models
FR11 → Epic 2 — Single eval run → POST /api/eval/harness
FR15 → Epic 2 — Metrics grid display (harness output, no custom formatting logic)
FR16 → Epic 2 — Agent trajectory collapsible viewer
FR12 → Epic 3 — Multi-model comparison → POST /api/eval/harness/compare (SSE)
FR13 → Epic 3 — Live progress: indicator + chips + fl_chart bar chart + table
FR14 → Epic 3 — Stop button, clean SSE stream cancellation
FR17 → Epic 4 — Results history list from GET /api/results
FR18 → Epic 4 — Pull-to-refresh (mobile) + manual refresh button (desktop)

## Epic List

### Epic 1: Flutter Project Scaffold & App Shell
Developer can run the Flutter app pointing at the Dockerized backend and see a working dark-themed shell with responsive navigation (BottomNavigationBar on mobile, NavigationRail on tablet/desktop), engine health status bar, and a settings screen to configure and test the backend URL. The React frontend is gone.
**FRs covered:** FR1, FR2, FR3, FR4, FR19, FR20, FR21

### Epic 2: Single-Model AI Evaluation (Harness-Backed)
User completes the 3-step wizard (modality → benchmark → configure), runs a single model evaluation against lm-eval-harness / lmms-eval / inspect-ai / faster-whisper, and sees the harness output — metrics grid for image/audio, collapsible agent trajectory for agent evals. No custom eval logic anywhere.
**FRs covered:** FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR15, FR16
**AC-HARD enforced:** benchmark list = harness tasks only; results display = raw harness output

### Epic 3: Multi-Model Live Comparison (SSE Streaming)
User adds up to 4 models and watches concurrent comparison results stream in — live progress bar, per-model result chips, fl_chart bar chart updating as each model finishes, results table, and a stop button for clean cancellation.
**FRs covered:** FR12, FR13, FR14

### Epic 4: Results History
User browses all past evaluation runs with pull-to-refresh on mobile and a refresh button on desktop. Each card shows eval type, harness, eval ID, tasks, and models.
**FRs covered:** FR17, FR18

### Epic 5: Backend Enhancements (Emerging)
Backend API improvements discovered during mobile development — e.g. pagination for /api/results, cleaner error response shapes, new query parameters. Stories added as mobile development surfaces needs.
**AC-HARD enforced:** no custom eval logic — enhancements are API surface improvements only
**FRs covered:** TBD (emerging)

---

## Epic 1: Flutter Project Scaffold & App Shell

Developer can run the Flutter app pointing at the Dockerized backend and see a working dark-themed shell with responsive navigation, engine health status bar, and settings screen. The React frontend is gone.

### Story 1.1: Flutter Project Scaffold

As a **developer**,
I want a Flutter project initialized at `flutter_eval/` with all dependencies configured,
So that the codebase compiles on Android, iOS, and desktop from a single `pubspec.yaml`.

**Acceptance Criteria:**

**Given** the repo root contains `backend/` and the old `frontend/`
**When** a developer runs `flutter pub get` inside `flutter_eval/`
**Then** all dependencies resolve: `flutter_riverpod`, `go_router`, `dio`, `fl_chart`, `shared_preferences`
**And** `flutter build apk --debug` completes without errors
**And** `flutter build ios --no-codesign` completes without errors
**And** the folder structure matches: `lib/core/`, `lib/features/`, `lib/shared/`
**And** `frontend/` directory is removed from the repo

### Story 1.2: Dark Theme & Shared Widget Library

As a **developer**,
I want the app theme and reusable widgets (SectionCard, EngineDot) implemented,
So that all future screens share a consistent dark zinc/blue visual identity without duplicating style code.

**Acceptance Criteria:**

**Given** the app launches
**When** any screen renders
**Then** scaffold background is `#09090B` (zinc-950), card surfaces are `#18181B` (zinc-900), primary color is `#3B82F6` (blue-500)
**And** `SectionCard` renders a numbered step badge (blue circle) + title + children with zinc-800 border and 12px radius
**And** `EngineDot` renders a 6px circle: `#34D399` (emerald-400) when `ok: true`, `#3F3F46` (zinc-700) when false, with a label
**And** no hardcoded color values appear outside `app_theme.dart`

### Story 1.3: Responsive App Shell & Navigation

As a **user**,
I want a responsive navigation shell that works on both phone and tablet/desktop,
So that I can switch between Eval, Results, and Settings screens comfortably on any device.

**Acceptance Criteria:**

**Given** the app launches
**When** screen width is **≥ 600px**
**Then** a `NavigationRail` is shown on the left with Eval / Results / Settings destinations
**And** the selected route's screen fills the remaining width

**Given** the app launches
**When** screen width is **< 600px**
**Then** a `BottomNavigationBar` is shown with the same 3 destinations
**And** tapping each destination navigates to the correct route via go_router (`/`, `/results`, `/settings`)

**Given** any navigation item is tapped
**When** the route changes
**Then** the active destination is visually highlighted
**And** back navigation does not exit the app from a top-level route

### Story 1.4: Settings Screen & Backend Connectivity

As a **developer or user**,
I want to configure the backend URL and verify connectivity,
So that the app works whether I'm on an emulator, a physical device, or a desktop.

**Acceptance Criteria:**

**Given** the app runs on **Flutter Web**
**When** the app initializes
**Then** `baseUrl` defaults to `""` (empty string — relative URL, Nginx proxies `/api/`)

**Given** the app runs on **a native build** with no saved setting
**When** the app initializes on an Android emulator
**Then** `baseUrl` defaults to `http://10.0.2.2:8001`

**Given** the app runs on **a native desktop build** with no saved setting
**When** the app initializes
**Then** `baseUrl` defaults to `http://localhost:8001`

**Given** the Settings screen is open
**When** the user enters a URL and taps "Save"
**Then** the value is persisted via `shared_preferences` and survives app restart

**Given** the user taps "Test connection"
**When** the app calls `GET {baseUrl}/api/health`
**Then** a green inline message "Connected ✓" is shown if the response is 200
**And** a red inline message "Failed — check URL" is shown on error, with no crash

### Story 1.5: Engine Health Status Bar

As a **user**,
I want to see the live health of all five eval engines at a glance,
So that I know which harnesses are available before starting an evaluation.

**Acceptance Criteria:**

**Given** the app launches
**When** `GET {baseUrl}/api/health` returns a response
**Then** the `StatusBar` shows 5 `EngineDot` + label pairs: `lm-eval-harness`, `lmms-eval`, `inspect-ai`, `faster-whisper`, `Ollama`
**And** each dot is emerald when the engine is available, zinc when not

**Given** the status bar is displayed on a **mobile screen (< 600px)**
**When** all 5 dots are shown
**Then** the row is horizontally scrollable and no dots are clipped

**Given** the backend is unreachable
**When** the health request fails
**Then** all dots show zinc (offline) and no crash or blank screen occurs

**Given** a widget test for `StatusBar`
**When** passed a `HealthStatus` with all engines true
**Then** all 5 dots render with emerald color
**And** when passed a `HealthStatus` with all engines false, all 5 dots render zinc

---

## Epic 2: Single-Model AI Evaluation (Harness-Backed)

User completes the 3-step wizard, runs a single model evaluation against lm-eval-harness / lmms-eval / inspect-ai / faster-whisper, and sees the raw harness output. No custom eval logic anywhere.

### Story 2.1: Modality & Provider Selector

As a **user**,
I want to choose what type of AI I'm evaluating (Image / Audio / Agent) and which provider serves it,
So that the benchmark list and model suggestions update to match my selection.

**Acceptance Criteria:**

**Given** the Eval screen opens
**When** the user taps Image / Audio / Agent
**Then** the modality selection is highlighted and the benchmark list updates to show only harness tasks for that modality
**And** selecting a new modality resets the benchmark, provider, task, and model list to defaults

**Given** modality is **Image**
**When** the provider selector is shown
**Then** two options appear: HuggingFace and Ollama (local)
**And** selecting Ollama shows an explanatory note about `localhost:11434/v1`

**Given** modality is **Audio** or **Agent**
**When** the screen renders
**Then** the provider selector is hidden entirely

**Given** provider tests for `EvalConfigNotifier`
**When** `switchModality(audio)` is called
**Then** state resets: benchmark = first audio benchmark, provider = huggingface, modelList = [defaultModel]
**And** when `switchProvider(ollama)` is called, modelList resets to `[benchmark.defaultModelOllama]`

### Story 2.2: Benchmark & Task Selector

As a **user**,
I want to browse the available harness-backed benchmarks and pick tasks,
So that I can choose a well-known evaluation standard without configuring anything from scratch.

**Acceptance Criteria:**

**Given** a modality is selected
**When** the benchmark list renders
**Then** only benchmarks backed by the corresponding harness are shown:
- Image → lm-eval-harness tasks (MMMU, ScienceQA, TextVQA, ChartQA, GQA)
- Audio → lmms-eval tasks (LibriSpeech, CommonVoice, FLEURS, VoiceBench) + faster-whisper variants
- Agent → inspect-ai tasks (basic_agent)
**And** each card shows: label, tech tag (e.g. "MMMU — lm-eval-harness"), metric badge

**Given** a benchmark card is tapped
**When** it becomes selected
**Then** the card expands to show the benchmark description
**And** the task dropdown updates to tasks valid for that benchmark
**And** a checkmark appears on the selected card

**Given** the task dropdown is shown
**When** the user selects a task
**Then** the selection is stored and passed to the eval request

### Story 2.3: Model Configuration & Sample Limit

As a **user**,
I want to enter a model identifier and set a sample limit,
So that I can control what model runs and how many samples are evaluated.

**Acceptance Criteria:**

**Given** the configuration step is shown
**When** the model input field renders
**Then** autocomplete suggestions are populated from `GET /api/models` matching the current modality and provider
**And** the placeholder text matches the expected format (e.g. `pretrained=org/model` for HuggingFace, `llava-phi3` for Ollama, `base` for faster-whisper, `qwen2.5:1.5b` for agent)

**Given** a user types in the model field
**When** suggestions are shown
**Then** tapping a suggestion fills the field

**Given** the sample limit field
**When** the user enters a number
**Then** only positive integers are accepted and the default is 10 (5 for agent evals)

**Given** the model field is empty
**When** the Run button renders
**Then** it is disabled

### Story 2.4: Single Eval Run & Loading State

As a **user**,
I want to tap Run and see a loading indicator while the harness evaluates the model,
So that I know the evaluation is in progress and the app hasn't frozen.

**Acceptance Criteria:**

**Given** a valid model and task are configured
**When** the user taps "Run Evaluation"
**Then** a `CircularProgressIndicator` appears and the Run button is disabled
**And** a POST is sent to `/api/eval/harness` with the correct `model_type`, `model_args`, `tasks`, `limit`, `harness`, `provider` fields
**And** AC-HARD: no custom scoring or metric calculation happens in Flutter — the response is displayed as-is

**Given** the backend returns an error (HTTP 500 or `"error"` field in response)
**When** the result is displayed
**Then** the error message from the backend is shown in red inline with no crash

### Story 2.5: Metrics Grid Result Display

As a **user**,
I want to see the evaluation results as a clean metrics grid,
So that I can read the harness scores (accuracy, WER, etc.) at a glance.

**Acceptance Criteria:**

**Given** a single eval completes successfully
**When** the result is displayed
**Then** a card shows benchmark label, tech tag, and primary metric name in the header
**And** for each task in the result, a metrics grid shows: metric key (stripped of `,none` suffix) + formatted value
**And** values < 1.0 are formatted as percentages (e.g. `0.45` → `45.0%`)
**And** values ≥ 1.0 are shown to 3 decimal places
**And** `stderr` metrics are hidden from the grid
**And** AC-HARD: values are taken directly from the harness JSON response — no recalculation

### Story 2.6: Agent Trajectory Viewer

As a **user**,
I want to see the step-by-step tool-call trajectory from an agent evaluation,
So that I can understand how the model used the tool and where it succeeded or failed.

**Acceptance Criteria:**

**Given** an agent eval (inspect-ai) completes
**When** the result contains a `trajectory` array
**Then** a collapsed `ExpansionTile` appears: "Agent trajectory (N messages)"
**And** expanding it shows each message with a role-coloured left border:
- `system` → zinc/grey, `user` → blue, `assistant` → green, `tool` → amber

**Given** the trajectory is expanded
**When** a message is long
**Then** text wraps correctly and does not overflow horizontally

**Given** the eval result has no `trajectory` field
**When** the result is displayed
**Then** no trajectory section is shown

---

## Epic 3: Multi-Model Live Comparison (SSE Streaming)

User adds up to 4 models and watches concurrent comparison results stream in — live progress bar, per-model chips, fl_chart bar chart updating as each model finishes, results table, and a stop button for clean cancellation.

### Story 3.1: Multi-Model Input & Comparison Mode

As a **user**,
I want to add multiple models to the model list and see the UI shift into comparison mode,
So that I know a concurrent comparison will run instead of a single eval.

**Acceptance Criteria:**

**Given** the model input list has exactly 1 model
**When** the user taps "Add model to compare"
**Then** a second model input row appears and a "Comparison mode" chip is shown
**And** the Run button label changes to "Compare Models"

**Given** the model list has 4 models
**When** the screen renders
**Then** the "Add model" button is hidden (max 4 enforced)

**Given** the model list has 2+ models and the user taps X on a row
**When** only 1 model remains
**Then** comparison mode chip disappears and Run label reverts to "Run Evaluation"

**Given** modality is **Agent**
**When** the model list renders
**Then** the "Add model" button is always hidden (agent evals are single-model only)

### Story 3.2: SSE Client & Stream Provider

As a **developer**,
I want a Dart SSE client that parses Server-Sent Events from the backend comparison endpoint,
So that the Flutter app can consume real-time model results without polling.

**Acceptance Criteria:**

**Given** `sse_client.dart` receives a POST response with `ResponseType.stream`
**When** the backend emits `data: {"type":"model_complete","model":"x","result":{...}}\n\n`
**Then** the client yields a typed `SSEEvent` object with correct fields populated

**Given** the SSE stream receives a malformed JSON line
**When** parsing fails
**Then** that line is silently skipped — no crash, stream continues

**Given** the `CompareNotifier` provider is disposed (user navigates away)
**When** the stream is active
**Then** the Dio request is cancelled and no further events are processed

**Given** unit tests for `sse_client.dart`
**When** fed raw byte chunks simulating `data: {...}\n\n` SSE format
**Then** all typed `SSEEvent` objects are correctly parsed and yielded in order

### Story 3.3: Live Comparison Progress View

As a **user**,
I want to watch model results arrive one by one during a comparison run,
So that I don't have to wait for all models to finish before seeing any results.

**Acceptance Criteria:**

**Given** a comparison run starts and the `init` SSE event arrives
**When** it is processed
**Then** a `LinearProgressIndicator` appears showing `0 / N models (0%)`

**Given** a `model_complete` event arrives
**When** it is processed
**Then** a chip appears with the model name + its primary metric value
**And** the progress bar advances and a bar appears in the `fl_chart` BarChart (live update)

**Given** a `model_error` event arrives
**When** it is processed
**Then** an amber error tile appears with model name and error message
**And** the progress bar still advances

**Given** the `complete` event arrives
**When** all models have finished
**Then** the progress bar disappears and the full results table is shown below the chart

### Story 3.4: Stop Button & Clean Cancellation

As a **user**,
I want to stop an in-progress comparison run,
So that I can abort a long-running eval without restarting the app.

**Acceptance Criteria:**

**Given** a comparison run is active
**When** the screen renders
**Then** a red "Stop" outlined button appears alongside the disabled Run button

**Given** the user taps Stop
**When** the button is pressed
**Then** the SSE stream is cancelled via provider disposal
**And** the `LinearProgressIndicator` disappears
**And** any partial results already received remain visible
**And** the Run button becomes re-enabled with label "Compare Models"

**Given** the stream is cancelled before a `complete` event
**When** no complete event was received
**Then** no error message is shown — partial results are displayed as-is

---

## Epic 4: Results History

User browses all past evaluation runs with pull-to-refresh on mobile and a refresh button on desktop. Each card shows eval type, harness, eval ID, tasks, and models.

### Story 4.1: Results History Screen

As a **user**,
I want to see a list of all past evaluations,
So that I can reference previous runs without re-running them.

**Acceptance Criteria:**

**Given** the user navigates to the Results screen
**When** the screen loads
**Then** `GET {baseUrl}/api/results` is called and results are displayed as a list of `ResultCard` widgets
**And** each card shows: eval type badge (Compare = purple, Single = blue), harness chip, eval_id in monospace, task list, model chips (truncated with tooltip for long names)
**And** results are ordered newest first (as returned by the backend)

**Given** the results list is empty
**When** the screen renders
**Then** an empty state message is shown: "No evaluations yet. Run one from the Eval tab."

**Given** the backend returns an error
**When** the fetch fails
**Then** an inline error message is shown with a retry button — no crash

### Story 4.2: Refresh Results

As a **user**,
I want to refresh the results list to see the latest evaluations,
So that new runs I just completed appear without restarting the app.

**Acceptance Criteria:**

**Given** the Results screen is open on a **mobile device (< 600px)**
**When** the user pulls down on the list
**Then** a `RefreshIndicator` spinner appears and `GET /api/results` is re-fetched
**And** the list updates with any new results

**Given** the Results screen is open on a **desktop/tablet (≥ 600px)**
**When** the user taps the "Refresh" button in the top-right
**Then** the button shows a spinning icon while loading and the list updates on completion

---

## Epic 5: Backend Enhancements (Emerging)

Backend API improvements discovered during mobile development. Stories are added here as mobile development surfaces specific needs. AC-HARD enforced: no custom eval logic — enhancements are API surface improvements only.

### Story 5.1: Results Pagination

As a **user**,
I want the results list to load quickly even with hundreds of past runs,
So that the app doesn't slow down after many evaluations.

**Acceptance Criteria:**

**Given** `GET /api/results` is called
**When** the backend has more than 50 results
**Then** the endpoint accepts `?limit=N&offset=M` query parameters
**And** returns only the requested slice with a `total` count in the response
**And** the Flutter app loads the first 20 results and shows a "Load more" button

**Given** the "Load more" button is tapped
**When** the next page is fetched
**Then** results are appended to the existing list (not replacing it)

### Story 5.2: Per-Result Detail Endpoint

As a **user**,
I want to tap a result card and see the full result detail,
So that I can review exact metrics and trajectories from past runs without re-running.

**Acceptance Criteria:**

**Given** the user taps a `ResultCard`
**When** the detail screen opens
**Then** `GET /api/results/{eval_id}` is called and the full result JSON is displayed
**And** if the result contains a `trajectory`, the `TrajectoryView` widget is rendered
**And** if the result contains a metrics grid, the `SingleResultView` widget is rendered

**Given** the eval_id does not exist
**When** the backend returns 404
**Then** an inline "Result not found" message is shown and the user can navigate back
