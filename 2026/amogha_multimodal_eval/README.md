# PoC: Native Multimodal AI Evaluation Engine

## 🎯 GSoC 2026 Requirement: MCP & Agentic UI Exploration
Following the mentors' instructions regarding the **Amazon Bedrock AgentCore** research, this PoC explores how an Evaluation UI can be served as an **MCP App**. 

### Key Findings:
- **Agentic UI:** By exposing the evaluation logic as an MCP Tool (`evaluate_alignment`), we can allow an AI Agent to trigger the evaluation automatically when a user asks, "How accurate was that last response?"
- **Integration:** The UI demonstrated here is designed to be rendered within an agentic chatflow, providing a "Human-in-the-loop" verification step for multimodal outputs.

## 🚀 Scaling to 350 Hours (Roadmap)
- **Isolate-driven Math:** Moving Cosine Similarity and tensor comparisons to background Isolates.
- **Batch Processing:** Evaluating hundreds of prompt-response pairs in parallel.
- **Vision Support:** Extending the engine to compare Image-to-Text alignment scores.