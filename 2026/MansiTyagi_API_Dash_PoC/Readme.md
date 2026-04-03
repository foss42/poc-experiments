# 🚀 API Dash: Agentic UI Evaluation PoC

**Candidate:** Mansi Tyagi  
**Project:** GSoC 2026 - Multimodal AI & Agent API Eval Framework (Project #2)  

## 📌 Overview
This repository contains a Proof of Concept (PoC) built in response to the maintainer's feedback regarding **Model Context Protocol (MCP)** and **Agentic UIs**. 

Instead of forcing users to leave their AI agent workspace to run an evaluation on a separate, heavy dashboard, this PoC demonstrates a "Dependency-Lite" architecture where the Python evaluation engine acts as an MCP-style tool. The React frontend simulates an AI Agent that triggers this tool and dynamically renders the benchmark metrics into a visual **Evaluation Card** directly within the chat flow.

## 🏗️ Architecture
This PoC consists of two lightweight, decoupled microservices:

1. **Backend (Python / FastAPI):** - Simulates a Python evaluation engine (e.g., a wrapper for `lm-harness`). 
   - Exposes a `/run_evaluation` endpoint that accepts a dataset name, simulates processing time, and returns a JSON payload of evaluation metrics (Accuracy, Latency, Pass Rate).
   
2. **Frontend (React / Vite):** - A simulated Agent chat interface.
   - When a user requests an evaluation, the Agent invokes the Python backend. Instead of printing raw JSON, the UI intercepts the payload and renders a custom React component (`EvalCard`) natively inside the chat context.

---

## ⚙️ Quick Start Guide

### Prerequisites
- Python 3.8+
- Node.js (v16+)

### 1. Start the Python Evaluation Tool (Backend)
Open a terminal, navigate to the `backend` directory, and start the FastAPI server:

```bash
cd backend
pip install fastapi uvicorn
uvicorn mcp_server:app --reload