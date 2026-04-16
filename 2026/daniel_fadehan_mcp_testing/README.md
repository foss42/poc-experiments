<h1 align="center">
  <br>
   Forge POC
  <br>
</h1>

<h4 align="center">A visual Model Context Protocol (MCP) Creation and Testing Suite.</h4>

**Demo Video:** [Watch on YouTube](https://youtu.be/7kFNVd7rKkE?si=5ADp5sz4STd8qrN-)

---

## Live Playground

Experience the Proof of Concept live here:
**👉 [https://forge-nine-beta.vercel.app/](https://forge-nine-beta.vercel.app/)**

---

## Overview

The Model Context Protocol (MCP) is standardizing how AI models interact with data sources and tools. However, building, debugging, and testing MCP servers currently requires writing boilerplate code, configuring JSON schemas manually, and relentlessly testing in isolated CLI environments.

**Forge** provides a no-code/low-code graphical interface to both **build** and **test** MCP architectures intuitively within the browser. 

### Visual Creation (The Builder)
- **Node-Based Workspace:** Drag and drop nodes to visually design MCP Tools, Prompts, and Resources.
- **Interactive Configuration:** Map inputs and outputs using dynamic forms, bypassing the need to write complex JSON schemas manually.
- **Code Export:** Export your visual logic directly into deployable MCP server code.

### Advanced Testing (The Workbench)
The testing suite bridges the gap between server creation and functional verification. Without leaving the browser, you can thoroughly test every aspect of your MCP server:
- **AI Chat Runtime:** Provision an API key (e.g., Anthropic, OpenAI) to simulate an actual AI client. Chat with the LLM and watch it seamlessly invoke your custom-built tools in real-time.
- **Real-Time Log Bus & Debugger:** Intercept raw JSON-RPC requests and responses across the protocol. Analyze tool execution paths, latency, payloads, and pinpoint errors securely.
- **Prompts & Resources Verification:** Dedicated testing panels allow you to fetch resources and dynamically render prompts with variables to ensure accuracy before deployment.
- **Rich Tool Call Visualization:** Incoming LLM tool invocations are rendered beautifully into "Tool Call Cards," clearly separating arguments, status, and raw outputs.
- **Historical Analysis:** Track past traces and tool execution history over the lifecycle of your session.
- **MCP App Rendering:** Provides sandbox proxies for rendering rich UI applets directly within the host chat ecosystem.
- **Evaluations:** Dedicated module for iteratively assessing and evaluating model outputs against baseline performance criteria.

---

## Getting Started

If you'd like to run the PoC locally to evaluate the codebase:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/forge.git
   cd forge
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to `http://localhost:5173`

5. **Make AI requests:**
   Navigate to the settings tab to configure your preferred LLM provider and API key to enable live tool usage within the Test Workbench.
