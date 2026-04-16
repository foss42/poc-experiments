# Open Responses Dashboard — Flutter Demo

Standalone Flutter demo for **GSoC 2026 Idea 5: Open Responses & Generative UI**.

Covers both halves of the proposal title end-to-end: typed parsing and rich visualisation of the OpenAI Responses API, and an A2UI Generative UI renderer that turns agent-emitted JSONL into live Flutter widgets.

## Running

```bash
flutter pub get
flutter run
```

No server required. All sample payloads are embedded.

## Architecture

```
lib/
├── main.dart                          # App entry point, NavigationRail shell, GenUI Playground
├── design.dart                        # Shared spacing/style constants
├── models/
│   ├── open_responses.dart            # Full Responses API parser (pure dart:convert)
│   └── a2ui.dart                      # A2UI JSONL event parser
└── widgets/
    ├── open_responses_viewer.dart     # Renders all 9 output item types
    ├── open_responses_dashboard.dart  # 3-tab shell (Output / Assertions / Analytics)
    ├── open_responses_assertions.dart # 13-type assertion engine + Dart test export
    ├── open_responses_analytics.dart  # Token bar, tool call table, chain detection
    ├── sse_stream_debugger.dart       # Event-by-event SSE replay debugger
    ├── open_responses_explorer.dart   # Paste & Explore entry point
    └── a2ui_renderer.dart             # 28-component GenUI renderer with inspect mode
```

### Model layer (`models/`)

**`open_responses.dart`** — zero external dependencies. Two public entry points:

- `OpenResponsesResult.fromJson(Map)` — parses a complete JSON response. Sealed `OutputItem` subclasses cover all 9 output item types. `ContentPart` covers all 5 content part types. `Annotation` covers `url_citation`, `file_citation`, `file_path`.
- `OpenResponsesStreamParser.parse(List<String>)` — folds a list of raw SSE lines into an `OpenResponsesResult`. Handles `.delta` accumulation, `.done` authority override, `response.completed` snapshot priority, and `response.failed` / `response.incomplete` terminal events.

**`a2ui.dart`** — parses A2UI JSONL into a flat component map and data model:

- `A2UIParser.isA2UIPayload(String)` — quick check before committing to a full parse.
- `A2UIParser.parse(String)` — returns `({components, dataModel, surfaceTitle?})` or `null` if no components found. Processes `createSurface`, `updateComponents` (accumulating across events), and `updateDataModel` (JSON-pointer paths, `/field` → `"field"` key).

### Widget layer (`widgets/`)

**`open_responses_viewer.dart`** — one card per output item type, driven entirely by the sealed class hierarchy. The `_InspectButton` on every card opens a `DraggableScrollableSheet` with the raw JSON for that item.

**`open_responses_assertions.dart`** — the differentiating feature. APIDash is a testing tool; assertions are the natural extension. Thirteen `AssertionType` values are evaluated against a live `OpenResponsesResult` with a `_Rule → _Outcome` pure function. The "Export Test" button generates a copy-pasteable `flutter_test` snippet that can be dropped straight into a CI test file.

**`a2ui_renderer.dart`** — stateful widget that walks the component tree starting at the `"root"` node. Component properties can be literal values or `{"path": "/data/model/key"}` bindings resolved at render time against the data model. Supports 28 component types.

Inspect mode: set `inspectMode: true` to enable a tap-to-inspect overlay on every rendered widget. Tapping opens a bottom sheet with the component's raw JSON definition and a copy button. The `onDiagnostic` callback fires with `(type, id)` for any component type not recognised by the renderer, allowing the parent to surface a warning banner.

## Features

| Feature | Description |
|---|---|
| **Output Viewer** | All 9 output item types with per-item JSON inspector |
| **AI Response Assertions** | 13 assertion types, live evaluation, Dart test export |
| **Analytics** | Token usage bar, tool call table, chain detection |
| **SSE Stream Debugger** | Event-by-event replay of real captured APIDash SSE data |
| **Paste & Explore** | Auto-detects JSON vs SSE, 3 built-in samples |
| **Generative UI (A2UI)** | 28-component renderer, data bindings, inspect mode, diagnostics |

## Tests

```bash
flutter test
```

77 tests across two files:

- `test/open_responses_test.dart` — 52 tests: all output item types, content parts, annotations, stream parser fold logic, SSE detection, edge cases.
- `test/a2ui_test.dart` — 25 tests: `isA2UIPayload` detection, component parsing, multi-event accumulation, data model path handling, `closeSurface` isolation.

`dart analyze`: no issues.

## Protocol notes

### Open Responses API

The SSE stream surface handled by `OpenResponsesStreamParser`:

```
response.created          → seed result metadata
response.output_item.added → register new item slot
output_text.delta         → accumulate text
output_text.done          → override accumulated text (authoritative)
response.output_item.done → authoritative snapshot of completed item
response.function_call_arguments.delta / .done
response.reasoning_summary_text.delta / .done
response.completed        → authoritative final snapshot (highest priority)
response.failed           → terminal error state
response.incomplete       → terminal truncation state
```

### A2UI JSONL protocol

```jsonl
{"createSurface": {"id": "s1", "title": "My UI"}}
{"updateComponents": {"components": [{"id": "root", "component": "Column", "children": ["t1"]}, {"id": "t1", "component": "Text", "text": "Hello"}]}}
{"updateDataModel": {"path": "/revenue", "value": "$12,450"}}
{"closeSurface": {"id": "s1"}}
```

Component properties accept either a literal value or a data-model path binding:

```jsonl
{"id": "kpi", "component": "Text", "text": {"path": "/revenue"}, "variant": "h2"}
```

The renderer resolves `/revenue` against the data model at render time, allowing the agent to stream structural layout and data values independently.
