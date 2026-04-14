# 🚀 MCP Session Tester — GSoC 2026 PoC (API Dash)

This project is a Proof of Concept (PoC) for testing MCP (Model Context Protocol) servers, built as part of the GSoC 2026 API Dash guidelines.

It demonstrates interaction with the official Sales Analytics MCP Apps server and provides a structured, developer-friendly testing workflow beyond basic debugging tools.

> ⚡ This PoC focuses on structured testing and performance evaluation of MCP tools, rather than just manual debugging.

---

## 💡 Why this PoC matters

Testing MCP servers today is often manual, repetitive, and lacks performance insights.

This PoC improves that by:

* Enabling reusable test scenarios
* Reducing friction in tool execution
* Introducing load testing for real-world performance evaluation

---

## 📌 Features (Testing-Focused Enhancements)

### 🔹 Improved Testing Workflow

* Save requests without clearing form (fixes data loss issue in MCP Inspector)
* Reusable test scenarios (collections)

### 🔹 Advanced Testing Capabilities

* Schema-based load testing with auto-generated test data
* Real-time latency degradation graph

### 🔹 Debugging & Reliability

* Session replay for failed calls

---

## 🎯 MCP Server Used

This PoC uses the official Sales Analytics MCP Apps server:

* Repo: https://github.com/ashitaprasad/sample-mcp-apps-chatflow
* Endpoint:

  ```
  http://localhost:3000/mcp
  ```

---

## 🧪 MCP Tools Tested

The following tools were tested using this PoC:

* `select-sales-metric`
* `get-sales-data`
* `visualize-sales-data`
* `show-sales-pdf-report`

All tools were executed with valid inputs, and responses were successfully received and validated via the PoC interface.

---

## 🛠️ Project Structure

```
.
├── client/     # React + TypeScript testing UI
├── server/     # Node.js proxy layer for MCP communication
└── README.md
```

---

## ⚙️ Setup & Run Instructions

### 1️⃣ Clone this repository

```bash
git clone https://github.com/foss42/gsoc-poc.git
cd gsoc-poc
```

---

### 2️⃣ Start the Sales Analytics MCP Server

```bash
git clone https://github.com/ashitaprasad/sample-mcp-apps-chatflow
cd sample-mcp-apps-chatflow
npm install
npm run dev
```

This will start the MCP server at:

```
http://localhost:3000/mcp
```

---

### 3️⃣ Start Backend (Proxy Server)

```bash
cd server
pnpm install
npm run proxy
```

---

### 4️⃣ Start Frontend (Client)

```bash
cd client
npm install
npm run dev
```

---

### 5️⃣ Use the Application

* Open the frontend (usually at `http://localhost:5173`)
* Connect to MCP server:

  ```
  http://localhost:3000/mcp
  ```
* Explore tools and execute requests

---

## 🎥 Demo Video

👉 https://youtu.be/DiCToglqEVo

The video demonstrates:

* Connection to the Sales Analytics MCP server
* Execution of real MCP tools
* Structured testing workflow
* Load testing capabilities

---

## 🔍 Key Capabilities Demonstrated

* Real MCP server interaction (not mocked)
* Structured tool execution workflow
* Repeatable testing via saved scenarios
* Performance evaluation via load testing

---

## ✅ Compliance with GSoC Guidelines

* ✔ Uses official Sales Analytics MCP Apps server
* ✔ Demonstrates real MCP tool execution
* ✔ Builds on provided MCP resources
* ✔ Provides a working and testable PoC

---

## 🧠 Key Insight

This PoC shifts MCP interaction from manual debugging to structured testing by introducing reusable scenarios, performance evaluation, and failure analysis — making it more suitable for real-world API workflows.

---

## 👨‍💻 Author

Prajwal Norman
