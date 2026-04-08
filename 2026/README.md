# 🚀 MCP Sales Analytics Server Tester (PoC)

## 📌 Overview

This project is a Proof of Concept (PoC) built for GSoC 2026.

It implements a **CLI-based MCP (Model Context Protocol) testing tool** that connects to a Sales Analytics MCP server, executes its tools, validates responses, and generates a structured test report.

---

## 🎬 Demo

Click the image below to view the POC video:

[![POC Demo](demo/POC-preview1.png)](demo/POC.mp4)

---

## 🎯 Objective

To demonstrate:
- MCP server integration
- Automated tool testing
- Assertion-based validation
- Edge case handling

---

## ⚙️ Features

- ✅ Connects to real MCP server (`/mcp`)  
- ✅ JSON-RPC based communication  
- ✅ Tests multiple MCP tools:
  - `initialize`
  - `tools/list`
  - `select-sales-metric`
  - `get-sales-data`
  - `visualize-sales-data`
  - `show-sales-pdf-report`
- ✅ Assertion Engine for validation  
- ✅ Smart data validation (not just structure)  
- ✅ Edge case testing (invalid inputs)  
- ✅ CLI-based execution  
- ✅ PASS / FAIL report with score  

---
## Setup & Run

### Step 1 — Start the real MCP server

```bash
git clone https://github.com/ashitaprasad/sample-mcp-apps-chatflow.git
cd sample-mcp-apps-chatflow
npm install
npm run dev
# Server starts at http://localhost:3000
```

### Step 2 — Run this tester

```bash
cd Khushboo_MCP_Sales_Tester
npm install
node server.js
```

### Expected output

```
🧪 MCP Sales Analytics Server Tester
   Connecting to http://localhost:3000/mcp...

✅ Server healthy: {"status":"ok","server":"sample-mcp-apps-chatflow"}

━━━ Test 1: MCP Server Initialize ━━━
  ✓ response has result
  ✓ serverInfo present
  ✓ server name matches
  ✓ capabilities present
  ✓ session ID assigned

━━━ Test 2: List Tools ━━━
  ✓ at least 3 tools registered
  ✓ tool: select-sales-metric exists
  ✓ tool: get-sales-data exists
  ✓ tool: visualize-sales-data exists
  ✓ tool: show-sales-pdf-report exists
  ...

## Tech Stack

- **Runtime**: Node.js 20+
- **Language**: JavaScript (ESM)
- **Transport**: MCP Streamable HTTP (JSON-RPC 2.0)
- **Testing**: Custom assertion engine (no external test framework)
- **Dependencies**: `chalk` for terminal output only

## 🧠 How It Works

```text
Tester (CLI)
   ↓
MCP Request (JSON-RPC)
   ↓
MCP Server (Sales Analytics)
   ↓
Response
   ↓
Assertion Engine
   ↓
Test Report (PASS / FAIL)

## Author

Khushboo — GSoC 2026 PoC submission
