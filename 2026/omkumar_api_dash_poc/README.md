# API Dash – OpenAPI Template Generator (PoC)

## Overview

This project is a Proof of Concept (PoC) for automating API integration workflows in API Dash.

It takes an OpenAPI specification (JSON) as input and generates ready-to-use API request templates. The goal is to reduce manual API setup and improve developer onboarding.

---

## Features

- OpenAPI parsing (paths, methods, parameters, request body)
- Data normalization into a consistent structure
- Automatic endpoint tagging (User, Weather, Finance, etc.)
- Metadata enrichment (base URL and authentication type)
- API template generation
- Express API endpoint: `POST /generate`
- Minimal UI for interactive testing

---

## How It Works

```
OpenAPI JSON → Parse → Normalize → Tag → Enrich → Generate Templates
```

---

## Live Demo

https://api-dash-poc.onrender.com

---

## Run Locally

```bash
npm install
npm start
```

Open in browser:

```
http://localhost:3000
```

---

## API Endpoint

### POST `/generate`

Request:
- OpenAPI JSON in the request body

Response:
- Generated API templates in JSON format

---

## Project Structure

```
src/
  parser/
  normalizer/
  tagger/
  generator/
  utils/
  routes/
  app.js

public/
  index.html

sample/
  sample-openapi.json
```

---

## Future Scope

- Integration with AI agents for dynamic API execution
- Interactive API UI rendering inside chat interfaces
- Schema-based request body generation
- Improved tagging and categorization logic

---

## AI / MCP Integration Perspective

This PoC focuses on generating structured API request templates from OpenAPI specifications.

These templates can be used by AI agents as structured tools, enabling dynamic API interaction without manual configuration.

In an MCP-style architecture, the generated templates can be rendered as interactive API explorers within chat-based interfaces, allowing users to trigger API calls directly from an AI assistant.

This aligns with the idea of exposing APIs as tools that can be discovered, invoked, and visualized inside agent-driven environments.