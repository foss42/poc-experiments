# 🚀 API Dash: Agentic UI Evaluation PoC

**Candidate:** Mansi Tyagi  
**Target:** GSoC 2026 - Multimodal AI & Agent API Eval Framework (Project #2)  

## 📌 Executive Summary
This repository contains a Proof of Concept (PoC) built specifically in response to the architectural pivot regarding **Model Context Protocol (MCP)** and **Agentic UIs**. 

Instead of routing users to a disconnected, static dashboard to run evaluations, this PoC demonstrates a unified, chat-driven workflow. It proves that a Python evaluation engine can be exposed as an MCP-style tool to an AI Agent. When the agent queries the tool, the React frontend intercepts the raw JSON metrics and dynamically renders an interactive **Evaluation Card** directly within the chat flow.

---

## 🏗️ System Architecture
This PoC is decoupled into two lightweight microservices to ensure the UI remains non-blocking during heavy evaluation tasks:

### 1. The Python Evaluation Tool (Backend)
- **Tech Stack:** Python, FastAPI, Uvicorn.
- **Function:** Acts as the mock execution engine (simulating what would eventually be the `lm-harness` wrapper). 
- **Endpoint:** Exposes `POST /run_evaluation`. It accepts a dataset target, simulates processing latency, and returns a structured JSON payload containing the evaluation metrics (Accuracy, Latency, Pass Rate).

### 2. The Agentic UI (Frontend)
- **Tech Stack:** React, Vite.
- **Function:** A simulated AI Agent chat interface.
- **Agentic Rendering:** When the user requests a benchmark, the Agent invokes the Python backend. Instead of printing the returned JSON as raw text, the UI intercepts the payload and renders a custom React component (`EvalCard`) natively inside the chat context.

---

## ⚙️ Local Setup & Execution Guide

### Prerequisites
- Python 3.8+ installed on your machine.
- Node.js (v16+) and npm installed.

### Step 1: Start the Backend (Evaluation Engine)
Open your terminal, navigate to the `backend` directory, and start the FastAPI server:

    cd backend
    pip install -r requirements.txt
    uvicorn mcp_server:app --reload

*Expected Output: `Uvicorn running on http://127.0.0.1:8000`*

### Step 2: Start the Frontend (Agentic UI)
Open a **second terminal**, navigate to the `frontend` directory, and spin up the Vite development server:

    cd frontend
    npm install
    npm run dev

*Expected Output: `Local: http://localhost:5173`*

---

## 🧪 How to Test the Architecture
1. Open your browser and navigate to `http://localhost:5173`.
2. In the chat interface, type a dataset name (e.g., `mnist`, `iris`, `mmlu`) and hit **Send**.
3. **Observe the flow:**
   - The Agent will acknowledge the request and simulate "thinking."
   - An asynchronous request is fired to the FastAPI backend.
   - The React UI captures the JSON response and instantly renders the green **Evaluation Card** component directly into the chat history.

---

## 💡 Pathway to Full Implementation
In the complete GSoC 2026 integration for API Dash, this architecture will be expanded:
1. **Real-Time Streaming:** The backend will utilize Server-Sent Events (SSE) to stream live execution logs and progress bars from the actual benchmark runners before returning the final payload.
2. **True MCP Standard:** The Python tool will be fully wrapped in the official Model Context Protocol standard, allowing any MCP-compliant LLM client to discover and trigger the evaluation suite automatically.