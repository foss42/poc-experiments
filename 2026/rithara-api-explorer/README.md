# API Explorer for API Dash


### Quick Links
- **Live Demo (Flutter Web):** [rithakith.github.io/apidash-poc/](https://rithakith.github.io/apidash-poc/)
- **GitHub Actions (CI/CD):** [github.com/rithakith/apidash-poc/actions](https://github.com/rithakith/apidash-poc/actions)

---

This is a Proof of Concept (POC) for **API Explorer** idea **#8** for [API Dash](https://github.com/foss42/apidash). It features a fully automated Python pipeline that generates a curated library of popular public APIs, paired with a high-performance Flutter frontend.

The API Explorer removes the friction of manual API setup by embedding a browsable library of popular public APIs directly inside API Dash. Users can discover APIs by category, search by name, and one-click import pre-configured templates—complete with auth details and sample payloads—straight into their workspace.

---

## Table of Contents

- [Key Features](#key-features)
- [Relevant Documents](#relevant-documents)
- [Future Roadmap](#future-roadmap)
- [The Pipeline](#the-pipeline)
- [Flutter UI Features](#flutter-ui-features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)

---

## Key Features

- **Serverless-Static Mastery**: No database required. High-performance API marketplace served entirely via static JSON files.
- **Fully Automated Pipeline**: 6-phase Python automation running nightly via GitHub Actions to fetch and enrich 2,500+ APIs.
- **One-Click Import**: Templates include pre-filled headers, body skeletons, and auth—matching API Dash's environment variable system.
- **High Performance**: Desktop-first Flutter app with lazy loading and disk caching for a seamless browsing experience.
- **Advanced Discovery**: Full-text search and category-based filtering (AI, Finance, Weather, etc.).
- **Security Focused**: Automated scans for leaked credentials in templates and resolution of all $ref pointers.

---

## Relevant Documents

| | |
|---|---|
| **Live Demo (Web)** | [**View App**](https://rithakith.github.io/apidash-poc/) |
| **PR** | [#1306](https://github.com/foss42/apidash/pull/1306) |
| **UI Demo Video** | [Watch Preview](https://drive.google.com/file/d/1FuewlwVKeZo9vP9PpnzHBG6AYmvUprs8/view?usp=sharing) |
| **UI Design (Figma)** | [Explore Prototype](https://www.figma.com/make/Exa6b31lpQJFPOLHF3SOF5/API-Discovery-Interface-Screens?fullscreen=1) |
| **Blog Part 2 — Pipeline** | [Technical Implementation](https://medium.com/@ritharaedirisinghe/building-the-api-explorer-pipeline-backend-3d4e775deebb) |
| **Blog Part 1 — Research** | [Planning & Research](https://medium.com/@ritharaedirisinghe/building-an-api-explorer-for-api-dash-my-research-planning-process-3d16ef3c48f2) |
| **Live GitHub Actions** | [**View Pipeline**](https://github.com/rithakith/apidash-poc/actions) |
| **Application Doc** | [GSoC Application](https://github.com/foss42/apidash/blob/main/doc/proposals/2026/gsoc/application_rithara_kithmanthie_API_Explorer.md) |
| **Idea Doc** | [GSoC Project Idea](https://github.com/foss42/apidash/blob/main/doc/proposals/2026/gsoc/idea_rithara_kithmanthie_API_Explorer.md) |
| **Relevant Issue** | [#619 Tracking Issue](https://github.com/foss42/apidash/issues/619) |
| **POC Branch** | [Backend Pipeline Code](https://github.com/rithakith/apidash/tree/feature/api-explorer-pipeline) |

---

## Future Roadmap

- **Automated Spec Enrichment for manually added APIs**: Automatically generating precise tags, categories, and summaries for manually added APIs to ensure consistent metadata across the entire catalog.
- **Community Hub**: A dedicated self-service portal for users to both submit new APIs to the catalog and provide ratings/reviews, all stored as PR-ready JSON files for the automated pipeline.

---

## The Pipeline

The backend pipeline consists of 6 automated phases, running nightly via GitHub Actions:

1.  **Fetcher**: Monthly/Daily sync with apis.guru to download new or updated OpenAPI/Swagger specs.
2.  **Parser**: Resolves $ref pointers and extracts methods, paths, schemas, and security requirements using `prance`.
3.  **Enricher**: Maps categories, detects auth types, matches API Dash environment variable conventions, and fetches logos.
4.  **Template Generator**: Produces importable request templates with pre-filled headers, body skeletons, and sample responses.
5.  **Validator + Publisher**: Performs security scans for leaked credentials and publishes the master catalog and per-API JSON files.
6.  **Orchestrator**: Wires the phases together with concurrent processing and graceful failure handling.

---

## Flutter UI Features

The frontend is built for rapid discovery and integration:

- **Full-Text Search**: Search across names, descriptions, and tags.
- **Category Discovery**: Filter by AI, Finance, Weather, Maps, and more.
- **API Detail Sheets**: Detailed views with auth info, endpoint lists, and instant import buttons.
- **One-Click Import**: Templates slot directly into the user's workspace with placeholder values matching existing environment variables.


---

## Project Structure

- **`apidash-explorer/`**: The backend pipeline. A collection of Python scripts that fetch, process, and enrich thousands of API specifications.
- **`frontend/`**: The client application. A modern, desktop-first Flutter application designed for seamless API discovery.

---

## Getting Started

### 1. Backend (API Pipeline)
See the [Backend README](apidash-explorer/README.md) for instructions on running the Python pipeline locally.

### 2. Frontend (Flutter App)
To run the Flutter project locally:
```bash
cd frontend
flutter pub get
flutter run -d windows # or chrome/linux/macos
```

---