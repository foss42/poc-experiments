# Flutter Multimodal Eval — Design Spec
**Date:** 2026-04-14  
**Author:** Ahmed Fikri  
**Status:** Approved

---

## 1. Goal

Convert the existing React/TypeScript frontend of the Multimodal AI Eval PoC into a Flutter app. The Flutter app:

1. Replaces the React container in `docker-compose.yml` — `docker-compose up` continues to work as a single command
2. Is built as **Flutter Web** for Docker/browser delivery, but the same codebase compiles to native desktop (Windows/macOS/Linux) and mobile (Android/iOS)
3. Follows **APIDash architecture patterns** (Riverpod 2.x, go_router, Dio) so it can be extracted into APIDash as a native module later
4. Targets **desktop + mobile** with a responsive breakpoint at 600px

The FastAPI backend is **unchanged**. Only the frontend changes.

---

## 2. Project Structure

```
flutter_eval/
├── lib/
│   ├── main.dart
│   ├── app.dart                        # MaterialApp + GoRouter
│   ├── core/
│   │   ├── api/
│   │   │   ├── eval_api.dart           # Dio client — all HTTP methods
│   │   │   └── sse_client.dart         # SSE stream parser
│   │   ├── models/
│   │   │   ├── health_status.dart
│   │   │   ├── model_list.dart
│   │   │   ├── eval_request.dart
│   │   │   ├── harness_result.dart
│   │   │   ├── sse_event.dart
│   │   │   └── result_meta.dart
│   │   └── theme/
│   │       └── app_theme.dart
│   ├── features/
│   │   ├── eval/
│   │   │   ├── providers/
│   │   │   │   ├── eval_config_provider.dart
│   │   │   │   ├── eval_notifier.dart
│   │   │   │   └── compare_provider.dart
│   │   │   └── widgets/
│   │   │       ├── eval_screen.dart
│   │   │       ├── modality_selector.dart
│   │   │       ├── provider_selector.dart
│   │   │       ├── benchmark_list.dart
│   │   │       ├── model_input_list.dart
│   │   │       ├── run_button.dart
│   │   │       ├── single_result_view.dart
│   │   │       ├── trajectory_view.dart
│   │   │       └── progress_view.dart
│   │   ├── results/
│   │   │   ├── providers/
│   │   │   │   └── results_notifier.dart
│   │   │   └── widgets/
│   │   │       ├── results_screen.dart
│   │   │       └── result_card.dart
│   │   └── settings/
│   │       ├── providers/
│   │       │   └── settings_provider.dart
│   │       └── widgets/
│   │           └── settings_screen.dart
│   └── shared/
│       ├── providers/
│       │   ├── health_provider.dart
│       │   └── models_provider.dart
│       └── widgets/
│           ├── status_bar.dart
│           ├── section_card.dart
│           └── engine_dot.dart
├── Dockerfile
├── nginx.conf
└── pubspec.yaml
```

---

## 3. Dependencies

| Package | Version | Purpose | APIDash uses? |
|---|---|---|---|
| `flutter_riverpod` | ^2.x | State management | Yes |
| `go_router` | ^x | Navigation | Yes |
| `dio` | ^x | HTTP client + SSE stream | Yes |
| `fl_chart` | ^x | Comparison bar chart | No (new) |
| `shared_preferences` | ^x | Backend URL persistence | Yes |

No code generation (`riverpod_generator`, `freezed`) — keeps the build step simple and mentor-review-friendly.

---

## 4. State Architecture

### 4.1 Provider Map

```
SettingsProvider (StateNotifier<SettingsState>)
  └── baseUrl: String
        web:    "/"                          # relative, Nginx proxies /api/
        native: "http://localhost:8001"      # detected via kIsWeb

healthProvider (FutureProvider<HealthStatus>)
  └── GET {baseUrl}/api/health

modelsProvider (FutureProvider<ModelList>)
  └── GET {baseUrl}/api/models

EvalConfigNotifier (StateNotifier<EvalConfigState>)
  ├── modality: Modality          # image | audio | agent
  ├── benchmark: Benchmark
  ├── tasks: List<String>
  ├── provider: Provider          # huggingface | ollama
  ├── modelList: List<String>
  └── limit: int

EvalNotifier (AsyncNotifier<HarnessResult?>)
  └── POST {baseUrl}/api/eval/harness

CompareNotifier (AsyncNotifier<void>)
  └── exposes stream: Stream<SSEEvent>
      via sse_client.dart → POST {baseUrl}/api/eval/harness/compare

ResultsNotifier (AsyncNotifier<List<ResultMeta>>)
  └── GET {baseUrl}/api/results
```

### 4.2 SSE Implementation

`sse_client.dart` uses Dio with `ResponseType.stream`. It:
1. Opens a POST with the comparison request body
2. Reads the response as a byte stream
3. Buffers chunks, splits on `\n`, strips `data: ` prefix
4. Parses each line as JSON → typed `SSEEvent`
5. Yields events downstream

`CompareNotifier` exposes a `Stream<SSEEvent>` property. `ProgressView` calls `ref.watch(compareNotifierProvider)` and rebuilds on each event. Provider disposal automatically cancels the stream — no manual cancellation needed.

### 4.3 React → Flutter State Mapping

| React pattern | Flutter equivalent |
|---|---|
| `useState` (local) | `StatefulWidget.setState` or `StateProvider` |
| `useEffect` on mount | `FutureProvider` / `ref.listen` |
| `useSSE` hook | `CompareNotifier` + `Stream<SSEEvent>` |
| Prop drilling | `ref.watch(provider)` in ConsumerWidget |
| Conditional render | `if/else` in `build()` |

---

## 5. Navigation

Routes (go_router):

```
/           → EvalScreen    (default)
/results    → ResultsScreen
/settings   → SettingsScreen
```

### 5.1 Responsive Shell

```
LayoutBuilder:
  width ≥ 600px  →  Row [ NavigationRail | Expanded(child: router outlet) ]
  width < 600px  →  Column [ router outlet | BottomNavigationBar ]
```

`StatusBar` sits above the content area on all screen sizes. On mobile it wraps into a horizontally scrollable `SingleChildScrollView`.

---

## 6. Component Breakdown

### 6.1 EvalScreen (replaces EvalPanel.tsx)

Three-step layout using `SectionCard` widgets:

- **Step 1 — Modality:** `SegmentedButton` (image / audio / agent). On mobile: full-width buttons stacked vertically if needed.
- **Step 1b — Provider:** shown only for image modality. `SegmentedButton` (HuggingFace / Ollama).
- **Step 2 — Benchmark:** `ListView` of `BenchmarkCard` widgets. Tapping a card expands its description (same accordion behavior as React).
- **Step 3 — Configure:** `DropdownButtonFormField` for task, `TextFormField` for limit, `ModelInputList` for model entries with autocomplete (`RawAutocomplete`).
- **Run button:** full-width on mobile, right-aligned on desktop. Shows "Stop" secondary button during comparison run.

### 6.2 ProgressView (replaces ProgressView.tsx)

Watches `CompareNotifier` stream. Shows:
- Linear progress indicator (`LinearProgressIndicator`) with `done/total` label
- Chip list of completed models with their primary metric (appears as each model finishes)
- `fl_chart` `BarChart` once the first result arrives — updates live
- Results table below the chart (same columns as React)
- Per-model error tiles if any model fails

### 6.3 SingleResultView (replaces SingleResultView in EvalPanel.tsx)

Renders task → metrics grid. Metrics are `Card` widgets in a `Wrap` (responsive — 2-3 columns on desktop, 1-2 on mobile). Agent trajectory rendered by `TrajectoryView`.

### 6.4 TrajectoryView (replaces TrajectoryView in EvalPanel.tsx)

`ExpansionTile` — collapsed by default. Messages rendered as a `ListView` with role-colored left border (`system` = grey, `user` = blue, `assistant` = green, `tool` = amber).

### 6.5 ResultsScreen (replaces ResultsPanel.tsx)

`ListView` of `ResultCard` widgets. Pull-to-refresh on mobile (`RefreshIndicator`). Manual refresh button on desktop (same as React). `ResultCard` shows eval type badge, harness chip, eval ID, tasks, models.

### 6.6 SettingsScreen (new — no React equivalent)

Single `TextFormField` for backend URL. Save button persists to `shared_preferences`. "Test connection" button hits `/api/health` and shows inline result. Pre-filled with `localhost:8001` on native, `/` on web.

---

## 7. Theme

```dart
ThemeData(
  brightness: Brightness.dark,
  scaffoldBackgroundColor: const Color(0xFF09090B),  // zinc-950
  colorScheme: ColorScheme.dark(
    primary:   const Color(0xFF3B82F6),              // blue-500
    surface:   const Color(0xFF18181B),              // zinc-900
    onSurface: const Color(0xFFF4F4F5),              // zinc-100
  ),
)
```

`SectionCard` widget encapsulates the step card pattern:
```
Card(
  color: zinc-900,
  shape: RoundedRectangleBorder(
    side: BorderSide(color: zinc-800),
    borderRadius: 12,
  ),
  child: Padding(16, Column([stepBadge, title, children]))
)
```

Touch targets: all interactive widgets use `minimumSize: Size(48, 48)` via `ButtonStyle` or `InkWell` constraints.

---

## 8. Docker Setup

### 8.1 flutter_eval/Dockerfile

```dockerfile
FROM ghcr.io/cirruslabs/flutter:stable AS builder
WORKDIR /app
COPY . .
RUN flutter build web --release --no-tree-shake-icons

FROM nginx:alpine
COPY --from=builder /app/build/web /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### 8.2 flutter_eval/nginx.conf

```nginx
server {
  listen 80;

  # Proxy /api/ to FastAPI backend (SSE-compatible)
  location /api/ {
    proxy_pass http://backend:8001;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
    proxy_buffering off;
    chunked_transfer_encoding on;
  }

  # Serve Flutter web SPA
  location / {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;
  }
}
```

### 8.3 docker-compose.yml change

Only the `frontend` service changes:
```yaml
frontend:
  build:
    context: ./flutter_eval    # was ./frontend
  ports:
    - "3000:80"
  depends_on:
    - backend
  restart: unless-stopped
```

---

## 9. Error Handling

- All `FutureProvider` / `AsyncNotifier` errors surface as `AsyncError` — widgets use `when(data:, loading:, error:)` pattern consistently
- Network errors in SSE stream emit a synthetic `SSEEvent(type: 'error', message: ...)` and close the stream
- The `SettingsScreen` "Test connection" button shows inline success/failure — no full-screen error for misconfigured URL
- `EvalNotifier` wraps the POST in try/catch; errors stored in `AsyncValue.error` and displayed inline in `SingleResultView`

---

## 10. Testing Strategy

- **Unit tests** for `sse_client.dart` — feed it raw SSE byte chunks and assert parsed `SSEEvent` objects. This is the highest-value unit test since SSE parsing is stateful.
- **Provider tests** for `EvalConfigNotifier` — assert state transitions when modality/benchmark/provider switch (mirrors the `switchModality`, `selectBenchmark`, `switchProvider` logic in React).
- **Widget tests** for `StatusBar` — given a `HealthStatus`, assert the correct dots render green/grey.
- No integration tests in the PoC — the backend is a real process, not mockable at this stage.

---

## 11. Out of Scope (PoC)

- Video modality (not in current React app either)
- Custom dataset upload UI
- Export results to CSV/JSON
- APIDash plugin wiring (this spec covers the standalone Flutter app only)
- Authentication / API key management
