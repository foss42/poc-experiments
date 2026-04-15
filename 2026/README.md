# API Dash 3 PoCs - Abdelrahman ElBorgy - GSOC 2026

This Repo has 3 PoCs, each has its own README file that explains its aim and what it proves.

### Repository Overview

1. **[PoC 1: Agentic Testing & GenUI Rendering](./PoC1_AgenticTesting_GenUIRendered)**
    * **Focus:** Dynamic UI generation.
    * **Description:** Explores how an AI agent can autonomously test APIs and return results as dynamically rendered Generative UI components rather than raw text.

2. **[PoC 2: Agentic Workflow Testing (HITL)](./PoC2_Agentic_WorkflowTesting_HITL)**
    * **Focus:** Human-in-the-Loop safety and multi-step chaining.
    * **Description:** Demonstrates an architecture where an AI autonomously reads OpenAPI specs and chains requests, but explicitly pauses for human consent before executing network calls and generates a full report at the end of the workflow testing.

3. **[PoC 3: MCP Claude Desktop Connector](./PoC3_MCP_ClaudeDesktop_Connector)**
    * **Focus:** External LLM client integration.
    * **Description:** Proves the viability of connecting a native Dart-based MCP server directly to external clients like Claude Desktop, exposing API testing tools to outside ecosystems.

---
*Please navigate into each individual PoC folder to read its dedicated README, which contains specific architectures, visual demos, and instructions on how to run it.*
