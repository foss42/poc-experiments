# 🎙️ AI Conversational Interview Assistant

**GSoC Proof of Concept** — An AI powered mock interview tool that conducts realistic,
adaptive voice interviews on any topic using Google Gemini, Murf.AI, and AssemblyAI.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎯 **Any Subject** | Choose from presets or type any custom topic |
| 🧠 **Adaptive AI** | References your actual answers for follow-up questions |
| 🎙️ **Voice Interaction** | Speak your answers; hear questions in real time |
| 🔊 **Streaming Audio** | <130ms latency via Murf.AI Falcon |
| 📊 **Detailed Feedback** | Scored analysis with specific examples from your answers |
| 💬 **Conversation Memory** | Full context retained across all questions via LangGraph |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, Flask |
| AI / Memory | Google Gemini 2.5 Flash + LangGraph InMemorySaver |
| Speech to Text | AssemblyAI |
| Text to Speech | Murf.AI Falcon (streaming) |
| Frontend | HTML, Tailwind CSS, Vanilla JS |

---

## 📁 Project Structure

```
gsoc-poc/
├── backend/
│   ├── app.py            # Flask API — all 3 endpoints
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── index.html        # UI with custom subject input
│   └── index.js          # All frontend logic
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### 1. Clone and enter the project

```bash
git clone https://github.com/YOUR_USERNAME/gsoc-poc.git
cd gsoc-poc
```

### 2. Set up the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Fill in your three API keys in .env
```

### 3. Run the backend

```bash
python app.py
# Runs on http://127.0.0.1:8000
```

### 4. Open the frontend

Open `frontend/index.html` directly in your browser — no build step needed.

---

## 🔑 API Keys Required

| Service | Purpose | Free Tier |
|---|---|---|
| [Google AI Studio](https://aistudio.google.com/app/apikey) | Gemini LLM | ✅ Yes |
| [Murf.AI](https://murf.ai) | Text to Speech | ✅ Trial |
| [AssemblyAI](https://assemblyai.com) | Speech to Text | ✅ $50 free credit |

---

## 🔄 How It Works

```
User selects/types a subject
        │
        ▼
POST /start-interview
  → Gemini generates greeting + Q1
  → Murf.AI streams audio to browser
        │
        ▼
User records answer (mic)
        │
        ▼
POST /submit-answer
  → AssemblyAI transcribes audio
  → Answer stored in LangGraph memory
  → Gemini generates follow-up
  → Murf.AI streams next question
        │
     (repeat up to 5 questions)
        │
        ▼
POST /get-feedback
  → Gemini reviews full conversation
  → Returns structured JSON feedback
```

---

## 🆕 Modification Added (PoC Enhancement)


- **Custom subject input** — users can type any topic (Machine Learning, System Design, Node.js, etc.)
- **Graceful icon fallback** — custom subjects display a generic icon instead of crashing
- **Input validation** — empty subject is caught with user feedback before starting
- **Enter key support** — press Enter in the input to start immediately
- **Bug fixes** — corrected `create_react_agent` import, fixed `Response` import,
  removed duplicate model/agent initialization, fixed score circle `strokeDashoffset`
  mismatch between HTML and JS

---

## 📄 License

MIT
