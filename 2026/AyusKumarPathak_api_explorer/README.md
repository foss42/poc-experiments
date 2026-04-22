# GSoC PoC — Automated API Discovery & Template Generation Pipeline

This PoC shows a minimal working version of an automated pipeline that converts
OpenAPI specifications into structured API templates and demonstrates how those
templates can be used by an AI agent.

It is built as part of the GSoC 2026 proposal for **API Dash (Foss42)**.

---

## What This PoC Does

1. Fetches a live OpenAPI 3.0 specification from a public URL
2. Extracts all endpoints (path, method, summary)
3. Assigns a category tag using simple keyword-based scoring
4. Builds a structured JSON template representing the API
5. Simulates an agent that treats endpoints as callable tools and selects them based on intent

---

## Project Structure

```
gsoc-api-discovery-poc/
│
├── src/
│   ├── openapi_parser.py   # Fetch OpenAPI spec
│   ├── extractor.py        # Extract endpoints
│   ├── tagger.py           # Assign category tags
│   ├── builder.py          # Build JSON template
│   └── agent.py            # Simulated agent using templates
│
├── data/
│   └── output.json         # Generated template
│
├── main.py                 # Runs full pipeline
├── requirements.txt
└── README.md
```

---

## Mapping to Proposal Modules

| Proposal Component  | Implementation File |
| ------------------- | ------------------- |
| Parser Engine       | `openapi_parser.py` |
| Metadata Extraction | `extractor.py`      |
| Tagging Engine      | `tagger.py`         |
| Template Builder    | `builder.py`        |
| Agent Integration   | `agent.py`          |

---

## How to Run

### Requirements

* Python 3.8+

### Setup

```bash
pip install -r requirements.txt
```

### Run

```bash
python main.py
```

---

## Output

The pipeline:

* Fetches OpenAPI spec
* Extracts and tags endpoints
* Generates `data/output.json`
* Runs a simple agent simulation

---

## Design Choices

* No frameworks — only Python + requests
* Small modular components
* Deterministic logic (no ML/LLM dependency)
* Scoring-based tagging instead of naive matching
* Simple agent to demonstrate tool usage

---

## Generalization

The system is designed to work across different APIs.

* Tagging uses keyword scoring instead of fixed rules
* Agent selection is based on intent–endpoint overlap
* No API-specific logic is hardcoded

---

## AI Agent Integration

This PoC demonstrates how API templates can act as structured tools for AI agents.

* Each endpoint becomes a callable unit
* The agent selects endpoints based on intent
* Templates act as a capability layer over APIs

---

## Relation to MCP Apps

Based on the MCP Apps resources provided by the maintainers:

* APIs can be exposed as tools to AI agents
* Structured data replaces prompt-based guessing
* Workflows become tool-driven instead of chat-driven

This PoC reflects that idea at a minimal level:

* JSON template → tool definitions
* Agent → selects and invokes tools
* Pipeline → enables automatic tool generation from OpenAPI specs

A future extension could generate MCP-compatible tool definitions directly,
allowing API Dash to integrate APIs seamlessly with AI agents.

---

## Future Work

* Support HTML and Markdown API documentation
* Improve tagging using embeddings or semantic similarity
* Add validation against API Dash schema
* Generate MCP-compatible tool definitions

---

## Notes

I have gone through the MCP Apps resources shared by the maintainers and
used them to guide the design of the agent simulation and template structure.

This PoC focuses on demonstrating the core pipeline and how it connects to
AI agent workflows, while keeping the implementation minimal and clear.
