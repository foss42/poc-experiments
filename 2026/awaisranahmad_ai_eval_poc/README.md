
#  AI Model Evaluation Framework — MCP Apps PoC

### GSoC 2026 Proof of Concept

**Student:** Rana Awais Ahmad  
**Project:** End-to-End Multimodal AI & Agent Evaluation Framework  
**Mentor:** @animator  

---

##  Overview

 A working MCP Apps-based AI Evaluation system running inside an AI agent (VS Code Copilot).

This PoC demonstrates how an **AI Evaluation UI can be built using MCP Apps chatflow architecture** — adapted from the reference project.

Instead of a sales analytics workflow, this PoC transforms the MCP pattern into an **AI benchmarking system**, where users can:

- Select models, datasets, and metrics  
- Run evaluations  
- View results inside an AI agent  

---

##  MCP Requirement Validation

This PoC explicitly fulfills the mentor requirement:

> "Explore if AI evaluation UI can be built using MCP Apps to make it easy for end users to run evals from inside AI agents."

### ✔ What has been demonstrated:
- Evaluation UI rendered inside an AI agent (VS Code Copilot)
- MCP tools controlling the full evaluation workflow
- User interaction via chat (agent-driven execution)
- Structured evaluation results displayed inside agent

 This confirms that **MCP Apps can power AI evaluation workflows inside agent environments.**

---

##  Key Innovation

This PoC extends the MCP Apps pattern from:

- Sales Analytics → **AI Model Evaluation Framework**

It proves MCP Apps can support:

- AI benchmarking workflows  
- Agent-driven evaluation pipelines  
- Interactive evaluation UI inside chat  

---

##  Demo Flow

1. `get eval config`  
   → Opens evaluation UI via MCP tool  

2. `get-eval-data`  
   → Runs evaluation on MCP server  

3. `show-eval-report`  
   → Displays benchmark results  

---

##  Architecture

```

User (VS Code Chat)
│
▼
AI Agent (Copilot)
│  calls MCP tools
▼
MCP Server (ai-eval-poc)
┌─────────────────────────────────┐
│  Tool 1: select-eval-config     │
│  Tool 2: get-eval-data          │
│  Tool 3: show-eval-report       │
└─────────────────────────────────┘
│
▼
UI Resources (HTML widgets)

```

---

## MCP Tools

| Tool | Description |
|------|------------|
| select-eval-config | Opens evaluation configuration UI |
| get-eval-data | Fetches benchmark data |
| show-eval-report | Displays evaluation results |

---

## ⚙️ Supported Options

**Models:** GPT-4o, Claude Sonnet, Gemini 1.5 Pro, LLaMA 3 70B  
**Datasets:** MMLU, HellaSwag, GSM8K, HumanEval, TruthfulQA  
**Metrics:** Accuracy, Latency, Cost, F1 Score  

---

##  Project Structure

```

awaisranahmad_ai_eval_poc/
├── src/
│   ├── index.ts
│   └── ui/
│       ├── eval-form.ts
│       └── eval-report.ts
├── dist/
├── .vscode/
│   └── mcp.json
├── package.json
├── tsconfig.json
└── README.md

````

---

## ⚙️ Setup & Run

### Prerequisites
- Node.js 18+
- VS Code Insiders
- GitHub Copilot

---

### Install & Build

```bash
git clone https://github.com/foss42/gsoc-poc
cd 2026/awaisranahmad_ai_eval_poc
npm install
npm run build
````

---

### VS Code MCP Config

`.vscode/mcp.json`:

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

---

### Run

Open project in VS Code Insiders → MCP server starts automatically

---

##  Test Commands

```
get eval config
call the tool get-eval-data with models gpt-4o and claude-sonnet, dataset mmlu, metrics accuracy and latency
call the tool show-eval-report
```

---

##  Connection to GSoC Proposal

| Proposal Component                    | PoC Validation |
| ------------------------------------- | -------------- |
| MCP Apps architecture                 | ✅ Implemented  |
| Agent-based UI                        | ✅ Working      |
| Evaluation workflow                   | ✅ Implemented  |
| Metrics (Accuracy, Latency, Cost, F1) | ✅ Implemented  |
| TypeScript MCP server                 | ✅ Implemented  |

---

##  Future Work

* FastAPI backend for real evaluation jobs
* Flutter UI integration
* SSE real-time streaming
* Multimodal inputs (Image, Audio, Text)

---

##  References

* sample-mcp-apps-chatflow
* MCP Apps Protocol
* API Dash GSoC Proposal

---

**Built by Rana Awais Ahmad — GSoC 2026 Applicant**

````

---

#  **PR DESCRIPTION (COPY–PASTE)**

```md
##  AI Evaluation Framework — MCP Apps PoC

This PR adds a Proof of Concept demonstrating how MCP Apps can be used to build an AI model evaluation system inside an AI agent.

### ✅ Key Features

- MCP-based agent workflow
- AI evaluation UI inside VS Code Copilot
- Tool-based architecture:
  - select-eval-config
  - get-eval-data
  - show-eval-report
- Benchmark metrics: Accuracy, Latency, Cost, F1 Score

### 🎯 Mentor Requirement Covered

This PoC directly addresses:

> "Explore if AI evaluation UI can be built using MCP Apps..."

✔ Evaluation UI inside agent  
✔ MCP tool orchestration  
✔ End-to-end evaluation workflow  

### 🔥 Innovation

- Extends MCP Apps beyond dashboards into AI evaluation
- Demonstrates agent-driven evaluation pipelines
- Shows feasibility of integrating evaluation systems into AI agents

### 🧪 How to Test

1. Open in VS Code Insiders  
2. Start MCP server (auto)  
3. Use Copilot Agent mode  
4. Run:

````

get eval config
get-eval-data
show-eval-report

```

---


