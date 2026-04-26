# AI API Evaluation Framework

A high-performance full-stack application for evaluating the accuracy and latency of Large Language Models (LLMs) and other AI APIs against benchmark datasets.

## MVP Video

https://github.com/user-attachments/assets/f2740e60-8feb-4904-aabe-5a292b989fbd

## 📌 Features

- **MUSE Quality Taxonomy**: Evaluates model variants rigorously measuring Hard Score and Soft Score instead of flat binary exact-matches.
- **Server-Sent Events (SSE) Streaming**: Monitor progress, latency, and status in real-time at 60FPS securely streamed from the FastAPI orchestrator without blocking the UI thread.
- **Custom Datasets**: Upload JSON datasets with `input` (prompt) and multiple `expected_output` valid variants.
- **Model Configuration**: Save configurations for different AI Providers (OpenAI, Ollama, LM Studio, custom endpoints).
- **Async Evaluation Engine**: Evaluate LLM responses concurrently using Python's `asyncio` natively tracking progress into SQLite.
- **Premium Flutter UI**: A modern, responsive dashboard designed for seamless multi-platform (Web & Windows Desktop) experiences.

---

## 🏗️ Architecture

The framework is cleanly decoupled into 2 layers:

1.  **Frontend (Flutter Web)**
    - Responsive dashboard with Riverpod state management.
    - Four main views: Datasets, Model Configs, Evaluation Runner, Results.
2.  **Backend (FastAPI + SQLite)**
    - Asynchronous REST API (`aiosqlite`, `SQLAlchemy`).
    - Pure-Python evaluation engine with text normalization, comparison, and metric computation.
    - Manages background evaluation orchestrator.

---

## 🚀 Getting Started

### Prerequisites

- Docker & Docker Compose (Recommended)
- **Alternatively:** Python 3.11+, Flutter 3.27+

### Option 1: Docker Backend + Native Flutter Desktop (Recommended)

This is the fastest tracking setup. We run the FastAPI database in an isolated container and natively compile the Flutter application.

**1. Start the Dockerized Backend:**

```bat
docker compose up -d --build backend
```

> [!IMPORTANT]
> **Using Local LLMs (LM Studio / Ollama)?**
> Because the Python backend runs inside a Docker Bridge network, it cannot natively reach `127.0.0.1`.
>
> 1. In LM Studio, you **must** change the Server Host binding from `127.0.0.1` to `0.0.0.0` (or `*`).
> 2. When creating your Model Config, set the Base URL using your machine's local router IP (e.g., `http://192.168.1.10:1234/v1`) or simply `http://host.docker.internal:1234/v1`.

**2. Run the Native Windows App:**
Open a new terminal and build the Flutter desktop client:

```bash
cd frontend
fvm flutter run -d windows
```

---

### Option 2: Full Stack via Docker (Web Only)

If you strictly want to run both the FastAPI backend and the compiled Flutter Web frontend entirely inside Docker without installing the Flutter SDK natively:

**Windows (`run.bat` equivalent):**

```bat
docker compose up -d --build
```

**MacOS / Linux (`run.sh` equivalent):**

```bash
docker-compose up -d --build
```

_Note: The Flutter frontend will be accessible via your browser at http://localhost._

---

### Option 3: Full Manual Development

#### 1. Setup the Backend

```bash
cd backend
python -m venv venv
# Windows: venv\\Scripts\\activate
# Mac/Linux: source venv/bin/activate
pip install -r requirements.txt

# Start the API
uvicorn app.main:app --reload --port 8000
```

#### 2. Setup the Frontend

```bash
cd frontend
flutter pub get
flutter run -d chrome
```

---

## 📚 API Reference

The backend exposes a full async REST API. Visit `http://localhost:8000/docs` to interact with the OpenAPI spec.

### Core Endpoints

- `GET  /api/health` - Server status
- `POST /api/datasets/upload` - Upload a `.json` dataset
- `GET  /api/datasets` - List datasets
- `POST /api/models` - Create an AI Model config
- `POST /api/evaluations` - Trigger an async evaluation run
- `GET  /api/evaluations/{id}/stream` - **(SSE)** Stream live evaluation progress blocks
- `GET  /api/evaluations/{id}/results` - Get granular per-item execution results

---

## Hugging Face Router (OpenAI-Compatible)

The backend supports Hugging Face Router using the same chat-completions format as OpenAI:

- Provider: `huggingface`
- Base URL: `https://router.huggingface.co/v1`
- API key: either set it in Model Config, or leave it empty and set `HF_TOKEN` in environment/settings.

Python call shape (reference):

```python
from openai import OpenAI

client = OpenAI(
  base_url="https://router.huggingface.co/v1",
  api_key="YOUR_HF_TOKEN",
)

completion = client.chat.completions.create(
  model="google/gemma-4-31B-it:novita",
  messages=[{"role": "user", "content": "Hello!"}],
)
```

For multimodal calls, send OpenAI-style message content arrays (`text` + `image_url`).

---

## 🗂️ Dataset Format

Datasets must be uploaded as a JSON array containing objects with `input` and `expected_output` fields.

```json
[
  {
    "input": "What is the capital of France?",
    "expected_output": "Paris"
  },
  {
    "input": "Write a python function to add two numbers.",
    "expected_output": "def add(a, b): return a + b"
  }
]
```

A sample dataset is provided in `datasets/sample_qa.json`.

---

## 🛠️ Built With

- **FastAPI** - Python Backend Framework
- **SQLAlchemy / aiosqlite** - Async Database ORM
- **Flutter / Dart** - Frontend UI Framework
- **Riverpod** - Reactive State Management
- **Docker** - Containerization
