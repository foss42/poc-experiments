# API Dash Agentic API Testing with MCP app Prototype (GSoC 2026)

This repository contains a functional Model Context Protocol (MCP) implementation within a native Flutter desktop environment. It serves as the primary technical validation for my GSoC 2026 proposal, demonstrating how AI agents can autonomously generate, execute, and self-heal API test suites.

## Visual sneak

<img width="1500" height="750" alt="image" src="https://github.com/user-attachments/assets/1f84edcc-7d6f-4841-8821-1fff15ef3861" />

## Challenges
Sandard AI integrations in developer tools are often restricted to "chatboxes" that lack deep integration with the host application's UI and native capabilities. This project solves two major hurdles:

1. Dynamic UI in AOT: Bypassing Flutter's AOT compilation limits to allow an LLM to "invent" and render interactive dashboards on the fly.

2. Native Execution: Allowing a sandboxed AI-generated interface to trigger high-performance, native Dart HTTP requests that bypass browser CORS restrictions.
Gemini said
To make your prototype repository stand out to the API Dash mentors, your README needs to transition from "simple code dump" to "professional engineering research." It should highlight that you didn't just write a script—you designed a system architecture.

## Key Features
1. Agentic Reasoning Engine
The system uses Gemini 2.5 Flash (API key included just for the prototype) to ingest API goals and generate structured JSON test strategies. It doesn't just suggest code; it designs functional, edge-case, and security-focused test plans.

2. OS-Aware MCP Sandbox
To ensure production-grade stability on Windows Native Desktop, the prototype implements a WebView Adapter Pattern. It utilizes webview_windows (Microsoft Edge WebView2) to provide a secure, high-performance sandbox for AI-generated "MCP Apps".

3. Autonomous Self-Healing with Visual Diffs
When a test fails (e.g., a 403 Forbidden error), the agent captures the native stack trace and response body. It then:

- Analyzes the failure root cause.

- Generates a fix (e.g., adding a missing Authorization header).

- Visualizes the change using a side-by-side Red/Green Diff UI, allowing users to approve the "healed" test case before re-execution.

4. Real-Time Metrics Dashboard
The UI features a dynamic metrics bar that tracks Passed, Failed, and Total tests. These values are synchronized in real-time between the native Dart execution layer and the Javascript-driven dashboard via a JSON-RPC bridge.

## Technical Architecture
The system operates on a three-tier architecture:

**The Host (Dart)**: Handles LLM orchestration, native HTTP networking, and state management.

**The Bridge (JSON-RPC)**: Facilitates secure asynchronous communication (tools/call, tools/heal) between native code and the sandbox.

**The Sandbox (HTML/JS)**: Renders the AI's "thoughts" into an interactive, reactive dashboard.

## Tech Stack
- **Flutter & Dart**
- **Google Generative AI (Gemini 2.5 Flash)**
- **webview_windows** (Microsoft Edge WebView2)
- **Model Context Protocol (MCP)** principles

## Getting Started
**Prerequisites**
1. Flutter SDK (Stable Channel)

2. Visual Studio 2022 (with "Desktop development with C++" workload)

3. A Gemini API Key (in case not included)

## Installation
1. Clone the repository:

- Bash
- git clone https://github.com/AbdelrahmanELBORGY/apidash-agentic-prototype.git
- cd apidash-agentic-prototype

2. Install dependencies:

- Bash
- flutter pub get
- Configure your API Key:
Open lib/main.dart and replace API_KEY with your actual Gemini key.

3. Run for Windows:

- Bash
- flutter run -d windows

## GSoC 2026 Proposal
This prototype is part of a comprehensive proposal for API Dash.
