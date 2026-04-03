# 🚀 CLI Tool — The Agentic AI CLI

**CLI Tool** is a powerful, model-agnostic, and autonomous AI coding agent that lives in your terminal. It bridges the gap between conversational AI and real-world development by providing direct access to your local file system, terminal, and project context.

![Banner](https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/assets/banner.png)

## ✨ Key Features
- **🤖 Autonomous Execution**: Give the AI permissions to read, write, and execute shell commands locally.
- **🛡️ Secure Modes**: Switch between `/plan` (safe markdown advice) and `/build` (direct tool execution) modes.
- **🏠 Local-First**: Built-in, high-performance integration for **Ollama** (Llama 3, Phi, etc.).
- **🧩 Model Agnostic**: Supports OpenAI, Anthropic, and custom OpenAI-compatible providers.
- **🧠 Project Context**: Automatically loads `CLI-TOOL.md` and `MEMORY.md` to inject project-specific knowledge into every prompt.
- **🎨 Premium UI**: Full Markdown rendering and professional progress spinners for a state-of-the-art terminal experience.

---

## 📦 Installation

To install and run CLI Tool locally:

```bash
# Clone the repository
git clone https://github.com/armanraymagit/cli_tool.git
cd cli_tool

# Install dependencies
npm install

# Build the project
npm run build
```

---

## 🚀 Quick Start

Launch the interactive REPL:
```bash
npm run dev:cli
```

### Common Commands:
- `/plan`: Switch to non-destructive planning mode.
- `/build`: Enable autonomous code/command execution.
- `/init`: Create a `CLI-TOOL.md` file in the current directory to give the AI context.
- `/request [METHOD] [URL]`: Make intelligent API calls with automatic LLM error-triage.
- `/theme [ocean|sunset|forest]`: Change the terminal aesthetics.
- `/undo`: Revert the last interaction and pop it from history.

---

## 🛠️ Configuration
Configure your providers:
```bash
cli-tool config --init
```
Or manually edit `~/.cli-tool/config.json`.

---
