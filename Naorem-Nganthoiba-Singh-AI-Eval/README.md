# AI Evaluation UI - Proof of Concept (GSoC 2026)

## Overview
This PoC demonstrates an **MCP-based AI Evaluation** system. Inspired by the "Agentic UI" patterns in the AWS Sales Analytics article, this project explores how a dedicated UI can make running and visualizing LLM evaluations more accessible for end-users.

## Features
- **MCP Server:** Built with `FastMCP` (Python) to provide evaluation tools to any MCP-compatible agent.
- **Eval Tool:** A `evaluate_response` tool that benchmarks prompt-response pairs for logic and coherence.
- **Architecture:** Aligned with modular tool-calling patterns to prevent silent failures in agentic workflows.

## How to Run
1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt