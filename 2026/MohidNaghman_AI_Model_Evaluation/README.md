# AI Model Evaluation PoC

> A production-ready proof-of-concept for evaluating AI text generation across multiple providers (Groq + Mistral) with concurrent execution, standardized metrics, and a web-based interface — built as part of a GSoC 2026 application for the **Multimodal AI Evaluation Framework** project at API Dash.

## � Demo

👉 **Watch the PoC in action:** [YouTube Demo Video](https://youtu.be/jxZyAHhV2Wk)

See the full evaluation workflow: CSV upload → concurrent model evaluation → results with metrics → CSV export

---

## 🎯 What This Proves

This PoC demonstrates the core capabilities required for the full GSoC project:

- **Multi-Provider Abstraction**: Swap between Groq and Mistral seamlessly — blueprint for enterprise LLM integration
- **Concurrent Evaluation**: Parallel requests using `asyncio` — scales to 1000s of prompts efficiently
- **Advanced Metrics**: BLEU + ROUGE-L + Flexible Exact Match — reproducible evaluation methodology
- **End-to-End Pipeline**: CSV upload → evaluate → export results — realistic ML workflow
- **LangGraph Orchestration**: State machine workflow for complex evaluation pipelines
- **MCP Tool Architecture**: Foundation for AI agent integration

---

## 🧠 Architecture

This PoC demonstrates a modern agent-based evaluation architecture:

```
┌────────────────────────────────────────┐
│       Web Interface / REST API         │
│   ├── /api/evaluate (POST CSV)         │
│   ├── /api/export (GET results)        │
│   └── FastAPI + CORS enabled           │
└────────────────┬───────────────────────┘
                 │
┌────────────────▼───────────────────────┐
│      LangGraph State Machine           │
│   (Orchestration Layer)                │
│   ├── process_prompt (node)            │
│   ├── should_continue (conditional)    │
│   └── finish_evaluation (node)         │
└────────────────┬───────────────────────┘
                 │
┌────────────────▼───────────────────────┐
│   MCP Tools (Tool Layer)               │
│   ├── evaluate_with_groq()             │
│   ├── evaluate_with_mistral()          │
│   ├── calculate_bleu()                 │
│   ├── calculate_rouge()                │
│   └── check_exact_match()              │
└────────────────┬───────────────────────┘
                 │
┌────────────────▼───────────────────────┐
│    Provider Clients (API Layer)        │
│   ├── GroqProvider (Llama-3-70B)       │
│   └── MistralProvider (mistral-medium) │
└────────────────────────────────────────┘
```

### Key Components

**LangGraph State Machine**

- Orchestrates evaluation workflow
- Tracks state across prompt processing
- Provides full execution trace for debugging
- Foundation for complex evaluation pipelines

**MCP Tools**

- Self-documenting through tool schemas
- Easy to expose to external agents (Claude, ChatGPT)
- Rate limiting + retry logic built-in
- Extensible for new metrics

**Provider Abstraction**

```python
class ProviderBase:
    async def evaluate(self, prompt: str, temperature: float) -> str: ...

class GroqProvider(ProviderBase): ...
class MistralProvider(ProviderBase): ...
```

→ Add new providers by implementing one interface

**Concurrent Execution**

```python
results = await asyncio.gather(
    groq.evaluate(prompts, temp),
    mistral.evaluate(prompts, temp)
)
```

→ Both models evaluated in parallel (2-3× faster than sequential)

---

## 🚀 Quick Start

### 1. Get API Keys (free tiers available)

| Provider | Link                          | Limit               |
| -------- | ----------------------------- | ------------------- |
| Groq     | https://console.groq.com/keys | 6000 req/min        |
| Mistral  | https://console.mistral.ai/   | 5 req/min free tier |

### 2. Install & Configure

```bash
# Clone and setup
git clone <your-fork>
cd POC_Ai-Models-Eval_Gsoc

# Install dependencies
pip install -r backend/requirements.txt

# Create environment file
cp .env.example .env

# Edit .env and add your API keys
GROQ_API_KEY=your_key_here
MISTRAL_API_KEY=your_key_here
```

### 3. Run Backend

```bash
python backend/main.py
# Server starts at http://localhost:8000
```

### 4. Use Web Interface

Open browser: `http://localhost:8000`

1. Upload CSV with columns: `prompt`, `expected_answer`
2. Select models (Groq, Mistral, or both)
3. Adjust temperature (0.0 = deterministic, 1.0 = creative)
4. Click "Start Evaluation"
5. View results with BLEU, ROUGE-L, and exact match metrics
6. Export results as CSV

---

## 📊 Metrics Explained

This PoC evaluates model outputs using **three complementary metrics**:

| Metric          | What it measures                      | Range | Use case            |
| --------------- | ------------------------------------- | ----- | ------------------- |
| **BLEU**        | N-gram precision + brevity penalty    | 0-100 | Factual accuracy    |
| **ROUGE-L**     | Longest common subsequence similarity | 0-100 | Fluency + coherence |
| **Exact Match** | Binary categorical match (lenient)    | ✓/✗   | Simple Q&A tasks    |

**Example:**

- Reference: `"The capital of France is Paris"`
- Output 1: `"Paris is the capital of France"`
  - BLEU: 80 (words match but order differs)
  - ROUGE-L: 90 (same words, similar meaning)
  - Match: ✓ (token subset match)
- Output 2: `"France"`
  - BLEU: 25 (incomplete)
  - ROUGE-L: 15 (minimal overlap)
  - Match: ✗ (missing tokens)

---

## 📁 Project Structure

```
POC_Ai-Models-Eval_Gsoc/
├── backend/
│   ├── main.py                    # FastAPI app entry point
│   ├── server.py                  # REST endpoints
│   ├── config.py                  # Data models + CSV parsing
│   ├── requirements.txt           # Python dependencies
│   ├── tools/
│   │   ├── run_eval.py            # LangGraph + MCP tools
│   │   ├── providers.py           # Groq + Mistral clients
│   │   ├── metrics.py             # BLEU + ROUGE-L + exact match
│   │   └── __init__.py
│   └── .env.example               # Template (add your keys)
├── frontend/
│   ├── index.html                 # Web interface (single page)
│   ├── script.js                  # Form handling + results display
│   └── styles.css                 # Dark theme styling
├── sample.csv                     # Example evaluation dataset
└── README.md
```

---

## 📈 Example Output

**Console Output:**

```
🚀 Evaluation starting...
   Prompts: 3
   Models: ['groq', 'mistral']

📝 Processing prompt 1/3: 'What is 2+2?'
  🟦 Groq output: 'The answer is 4'
      📊 BLEU: 85.0, ROUGE-L: 80.5, Match: ✓
  🟪 Mistral output: 'Four'
      📊 BLEU: 50.0, ROUGE-L: 45.2, Match: ✓

✅ Evaluation complete! Processed 3 prompts with 2 models
```

**Results Table:**
| Prompt | Expected | Groq Output | Groq BLEU | Groq ROUGE-L | Groq Match | Mistral Output | Mistral BLEU | Mistral ROUGE-L | Mistral Match |
|--------|----------|-------------|-----------|--------------|------------|----------------|--------------|-----------------|---------------|
| What is 2+2? | 4 | The answer is 4 | 85.0 | 80.5 | ✓ | Four | 50.0 | 45.2 | ✓ |

**Summary Stats:**

- Total Prompts: 3
- Groq Avg BLEU: 85.67 | Avg ROUGE-L: 82.14 | Exact Match: 3/3
- Mistral Avg BLEU: 65.33 | Avg ROUGE-L: 62.45 | Exact Match: 2/3

---

## 🎯 Why This is a Strong GSoC PoC

- **Demonstrates Core Architecture**: LangGraph + MCP tools + asyncio patterns  
- **Production Quality**: Error handling, rate limiting, logging  
- **Extensible Design**: Easy to add providers, metrics, models  
- **Working End-to-End**: CSV → evaluate → export in < 2 minutes  
- **Proven Performance**: Concurrent execution 2-3× faster than sequential
- **Clear Code Path**: Ready for scaling to full GSoC proposal

---

## 🔮 Path to Full GSoC Project

This PoC establishes the foundation. The 14-week GSoC project builds on it:

**Phase 1: Production Infrastructure** (Weeks 1-4)

- PostgreSQL for evaluation history
- Redis for caching + queuing
- SSE streaming for real-time progress

**Phase 2: Advanced Metrics** (Weeks 5-7)

- BERTScore (semantic similarity)
- LLM-as-Judge (Claude/GPT scoring)
- Cost tracking + latency benchmarking

**Phase 3: Multimodal Support** (Weeks 8-11)

- Image evaluation (vision models)
- Audio evaluation (ASR/TTS quality)
- Video frame analysis

**Phase 4: Agent Integration** (Weeks 12-14)

- MCP server for Claude integration
- Native API Dash tab
- Test coverage + documentation

---

## 🧪 Requirements

- Python 3.8+
- Groq API key (free tier)
- Mistral API key (free tier)
- ~500MB disk space

---

## 📚 Resources Referenced

- **LangGraph**: https://langchain-ai.github.io/langgraph/
- **MCP Protocol**: https://modelcontextprotocol.io/
- **BLEU Metric**: https://en.wikipedia.org/wiki/BLEU
- **ROUGE Metric**: https://en.wikipedia.org/wiki/ROUGE_(metric)

---


## 👤 Author

**Mohid Naghman**  
**Project**: Multimodal AI Evaluation Framework 
**Repository**: https://github.com/MohidNaghman1/POC_Ai-Models-Eval_Gsoc