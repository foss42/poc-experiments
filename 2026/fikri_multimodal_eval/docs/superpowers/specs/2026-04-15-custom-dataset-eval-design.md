# Custom Dataset Evaluation — Design Spec

**Date:** 2026-04-15  
**Status:** Approved  
**Branch:** fikri-multimodal-eval

---

## Problem

Standard eval tools (lm-eval, lmms-eval) only support pre-registered benchmark datasets (MMMU, ScienceQA, etc.). Researchers who want to evaluate vision-language models on their own domain-specific images — medical scans, satellite imagery, documents, product photos — have no good tooling. This feature closes that gap.

---

## Goals

- Let users upload their own images + questions through the existing Flutter app
- Run any supported model (HuggingFace, Ollama, OpenRouter) against those images
- Show live per-sample answers as they arrive (SSE streaming)
- Optionally score against ground truth (exact match / substring match)
- Store results in the existing SQLite results system

---

## Non-Goals

- No batch ZIP/folder upload (single-file picker only, PoC scope)
- No custom metric implementations beyond exact_match and substring
- No persistent dataset storage (uploads are session-scoped, deleted after eval)

---

## Architecture

The custom eval path is entirely separate from the standard lm-eval/lmms-eval path. No changes to existing benchmark evaluation code.

```
Flutter UI
  └── Eval screen
        ├── Step 0: Evaluation mode toggle  [Standard] [Custom Dataset]
        └── Custom mode:
              ├── Step 1: Image picker + per-image question/answer rows
              ├── Step 2: Provider + model selector (existing widgets, reused)
              └── Run → SSE stream → live per-sample result cards

Backend
  ├── POST /api/custom-eval/upload     multipart upload → session_id
  ├── POST /api/custom-eval/stream     SSE eval loop
  └── custom_eval_runner.py            inference + scoring logic
```

---

## Data Model

### DatasetSample (Flutter)

```dart
class DatasetSample {
  final XFile image;          // picked image file
  final String question;      // required
  final List<String> choices; // optional, e.g. ["A. cat", "B. dog"]
  final String? answer;       // optional ground truth
}
```

### Upload manifest (JSON sent to backend)

```json
[
  {"filename": "cat.jpg", "question": "What animal?", "answer": "cat"},
  {"filename": "chart.png", "question": "Which color is highest?",
   "choices": ["A. red", "B. blue", "C. green"], "answer": "A"}
]
```

---

## Backend API

### POST /api/custom-eval/upload

**Request:** `multipart/form-data`
- `files[]` — image files
- `manifest` — JSON string (array of sample objects)

**Response:**
```json
{"session_id": "a1b2c3d4", "count": 5}
```

Images are saved to `/tmp/custom_eval/<session_id>/`. Session directory is deleted after eval completes or after 1 hour.

---

### POST /api/custom-eval/stream

**Request body:**
```json
{
  "session_id": "a1b2c3d4",
  "provider": "openrouter",
  "model": "openai/gpt-4o-mini",
  "modality": "image"
}
```

**SSE stream:**
```
data: {"type":"started","total":5}

data: {"type":"sample","index":0,"total":5,"filename":"cat.jpg",
       "question":"What animal?","model_answer":"a cat","correct":true}

data: {"type":"sample","index":1,...}

data: {"type":"complete","accuracy":0.8,"eval_id":"xyz789",
       "results":[...all samples...]}
```

If no ground truth was provided, `correct` is `null` and `accuracy` is omitted from the complete event.

---

## custom_eval_runner.py

```python
async def run_custom_eval(
    session_id: str,
    samples: list[dict],
    provider: str,
    model: str,
) -> AsyncIterator[dict]:
    yield {"type": "started", "total": len(samples)}
    for i, sample in enumerate(samples):
        image_uri = encode_image(session_dir / sample["filename"])
        answer = await call_model(provider, model, image_uri,
                                   sample["question"], sample.get("choices"))
        correct = score(answer, sample.get("answer"))
        yield {"type": "sample", "index": i, "total": len(samples),
               "filename": sample["filename"], "question": sample["question"],
               "model_answer": answer, "correct": correct}
    yield {"type": "complete", ...aggregated results...}
```

### Model call routing

| Provider | Method |
|---|---|
| `ollama` | `POST http://host.docker.internal:11434/api/chat` with base64 image |
| `openrouter` | `POST https://openrouter.ai/api/v1/chat/completions` with `image_url` content type |
| `huggingface` | `transformers.pipeline("visual-question-answering", model=model)` |

### Scoring

- If ground truth is absent → `correct = None`
- **Exact match:** `normalize(model_answer) == normalize(ground_truth)`
- **Substring match:** `normalize(ground_truth) in normalize(model_answer)` (handles verbose model answers)
- `normalize()`: lowercase, strip punctuation and whitespace

---

## Flutter Components

### New files

| File | Purpose |
|---|---|
| `lib/core/models/dataset_sample.dart` | `DatasetSample` data class |
| `lib/features/eval/providers/custom_dataset_provider.dart` | `StateNotifier<List<DatasetSample>>` — add/remove/update samples |
| `lib/features/eval/providers/custom_eval_provider.dart` | `AsyncNotifier` — upload + SSE stream, mirrors `EvalNotifier` pattern |
| `lib/features/eval/widgets/eval_mode_selector.dart` | `SegmentedButton` — Standard / Custom Dataset |
| `lib/features/eval/widgets/custom_dataset_section.dart` | Image picker + per-image rows |
| `lib/features/eval/widgets/custom_result_stream_view.dart` | Live per-sample result cards |

### Modified files

| File | Change |
|---|---|
| `eval_screen.dart` | Add Step 0 mode toggle; show `custom_dataset_section` when Custom active |
| `eval_config_provider.dart` | No change needed — provider/model selection reused as-is |

### EvalMode enum (new)

```dart
enum EvalMode { standard, custom }
final evalModeProvider = StateProvider<EvalMode>((ref) => EvalMode.standard);
```

---

## SSE Event Parsing

New sealed class `CustomEvalSSEEvent` in `sse_client.dart`, parallel to existing `EvalSSEEvent`:

```dart
sealed class CustomEvalSSEEvent {}
class CustomEvalStarted extends CustomEvalSSEEvent { final int total; }
class CustomEvalSample extends CustomEvalSSEEvent {
  final int index, total;
  final String filename, question, modelAnswer;
  final bool? correct;
}
class CustomEvalComplete extends CustomEvalSSEEvent {
  final double? accuracy;
  final List<Map<String,dynamic>> results;
  final String evalId;
}
class CustomEvalError extends CustomEvalSSEEvent { final String detail; }
```

---

## Error Handling

| Scenario | Handling |
|---|---|
| Image file > 10MB | Rejected at upload with `400 File too large` |
| No question text | Flutter validates before upload, shows inline error |
| Model API error on one sample | SSE `{type:sample_error, index:i, detail:"..."}` — eval continues |
| All samples fail | SSE `{type:complete}` with `accuracy:null`, results show errors |
| Session expired | `404 session not found` → Flutter shows retry prompt |

---

## Results Storage

Custom eval results use the existing `save_result()` + SQLite path with `eval_type="custom"`. The results screen already paginates all eval types — no changes needed there.

---

## Scope Summary

**In scope (PoC):**
- Image modality only (vision-language models)
- Up to 20 images per session
- Exact match + substring scoring
- Per-sample live streaming

**Out of scope (future):**
- Audio/text modalities
- Batch ZIP upload
- Persistent dataset library
- Advanced metrics (F1, ROUGE, BERTScore)
