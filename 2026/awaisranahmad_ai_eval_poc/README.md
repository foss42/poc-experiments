# AI Model Evaluation Framework — MCP Apps PoC

**Author:** Rana Awais Ahmad 
**GSoC 2026**  API Dash  

**Proposal:** End-to-End Multimodal AI & Agent Evaluation Framework

---

## Overview

This PoC demonstrates an **AI Evaluation UI built inside an AI Agent chatflow** using the MCP Apps protocol — directly inspired by [sample-mcp-apps-chatflow](https://github.com/ashitaprasad/sample-mcp-apps-chatflow).

Just as the Sales Analytics chatflow lets users select regions/metrics via interactive UI inside the agent, this PoC lets users **select AI models, benchmark datasets, and evaluation metrics** — all from within the VS Code Insiders agent chat window, without ever leaving it.

---

## Architecture
User (VS Code Agent Chat)

↓  "get eval config"

AI Agent (GitHub Copilot / GPT-4.1)

↓  calls MCP tool

ai-eval-poc MCP Server (Node.js / TypeScript)

├── select-eval-config  → Opens eval config UI panel

├── get-eval-data       → Fetches benchmark results

└── show-eval-report    → Displays results table


---

## MCP Integration

This PoC integrates **3 MCP tools** registered on a local stdio MCP server:

| Tool | Visibility | Description |
|---|---|---|
| `select-eval-config` | Agent + User | Opens evaluation configuration panel — select models, dataset, metrics |
| `get-eval-data` | App only | Fetches simulated benchmark data for selected models — called internally by the UI widget |
| `show-eval-report` | Agent + User | Displays results table with all evaluation metrics |

The agent **dynamically selects and executes tools** via the MCP server — no hardcoding. The MCP server is registered in `.vscode/mcp.json` and VS Code Insiders discovers it automatically.

---

## Evaluation Metrics

Every model run produces these metrics:

| Metric | Description |
|---|---|
| **Accuracy** | Correct answers / total questions on benchmark dataset |
| **Latency** | Average response time in seconds |
| **Cost/Token** | Estimated cost per 1K tokens in USD |
| **F1 Score** | Harmonic mean of precision and recall |

---

## Demo Screenshots

### 1. Agent calls `select-eval-config` — Eval Config Panel
<img width="1415" height="840" alt="image" src="https://github.com/user-attachments/assets/2da5f42d-4015-4da6-89f2-21b0503dc248" />


Agent automatically calls `select-eval-config` MCP tool. Available models (GPT-4o, Claude Sonnet 4.5, Gemini 1.5 Pro, LLaMA 3 70B), datasets (MMLU, HellaSwag, GSM8K, HumanEval, TruthfulQA), and metrics are shown.

### 2. MCP Server Running — 3 Tools Discovered
<img width="1568" height="760" alt="image" src="https://github.com/user-attachments/assets/44495789-d5f9-4a84-b8b6-2dca3b7324c7" />


VS Code Insiders Agent mode with `ai-eval-poc` MCP Server connected. Terminal shows `Discovered 3 tools` and `Connection state: Running`. Agent calls `select-eval-config` and `get-eval-data` tools in sequence.

### 3. `show-eval-report` — Benchmark Results Table
<img width="1065" height="899" alt="image" src="https://github.com/user-attachments/assets/b60e8184-b34c-40ba-a738-0f48b027385d" />


`show-eval-report` tool generates a comparison table for GPT-4o and Claude Sonnet 4.5 on MMLU dataset across Accuracy, Latency, Cost, and F1 Score.

---

## Project Structure

awaisranahmad_ai_eval_poc/

├── src/

│   ├── index.ts           ← MCP server — 3 tools registered

│   └── ui/

│       ├── eval-form.ts   ← Eval config selector widget HTML

│       └── eval-report.ts ← Results viewer widget HTML

├── .vscode/

│   └── mcp.json           ← VS Code MCP server config

├── dist/                  ← Compiled JS (after npm run build)

├── package.json

├── tsconfig.json

└── README.md

---

## How to Run

### 1. Install dependencies
```bash
npm install
```

### 2. Build
```bash
npm run build
```

### 3. Configure VS Code MCP Server
`.vscode/mcp.json` is already included:
```json
{
  "servers": {
    "ai-eval-poc": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/dist/index.js"]
    }
  }
}
```

### 4. Open in VS Code Insiders
```bash
code-insiders .
```

### 5. Test in Agent Mode
Open Copilot Chat → Agent mode → type:
get eval config

call the tool get-eval-data with models gpt-4o and claude-3-5-sonnet, dataset mmlu, metrics accuracy and latency

call the tool show-eval-report

---

## MCP Server Proof

Terminal output when server starts:

Connection state: Starting
Connection state: Running
Discovered 3 tools

Tools discovered by agent:
- `select-eval-config`
- `get-eval-data`  
- `show-eval-report`

---

## Connection to GSoC Proposal

This PoC directly implements the core concept from my GSoC proposal — building an **AI Evaluation UI inside an AI Agent chatflow** using MCP Apps. The same architectural pattern from `sample-mcp-apps-chatflow` (Sales Analytics) is applied here for **AI Model Evaluation**, demonstrating:

- MCP tool orchestration inside agent chat ✅
- Interactive evaluation config UI ✅
- Real-time benchmark metrics (Accuracy, Latency, Cost, F1) ✅
- Multi-model comparison capability ✅

---

## Supported Models
- GPT-4o (OpenAI)
- Claude Sonnet 4.5 (Anthropic)  
- Gemini 1.5 Pro (Google)
- LLaMA 3 70B (Meta)

## Supported Datasets
- MMLU — General Knowledge
- HellaSwag — Common Sense Reasoning
- GSM8K — Math Reasoning
- HumanEval — Code Generation
- TruthfulQA — Truthfulness

## References
sample-mcp-apps-chatflow — Reference implementation by mentor
How I built MCP Apps based Sales Analytics Agentic UI — Article by @ashitaprasad
MCP Apps Protocol — Official spec
GSoC 2026 Proposal — API Dash
Built by Rana Awais Ahmad — GSoC 2026 applicant for API Dash (foss42)
