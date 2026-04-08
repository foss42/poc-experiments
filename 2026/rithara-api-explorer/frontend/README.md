# API Explorer Frontend

The frontend for the **API Dash Marketplace** is a high-performance, desktop-first Flutter application. It provides a seamless interface for discovering, browsing, and importing pre-configured API templates directly into the API Dash workspace.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Key Features](#key-features)
- [Core Architecture](#core-architecture)
- [Directory Overview](#directory-overview)
- [Getting Started](#getting-started)

---

## Tech Stack

- **Framework**: [Flutter 3.x](https://flutter.dev/)
- **State Management**: [Riverpod](https://riverpod.dev/) for robust and testable reactive state.
- **Navigation**: [GoRouter](https://pub.dev/packages/go_router) for declarative routing.
- **Styling**: Vanilla Flutter widgets with a customized Material 3 theme.

---

## Key Features

- **Serverless Fetching**: Lazily fetches detailed API documentation only when requested to minimize initial load weight.
- **One-Click Import**: Generates and copies ready-to-use request templates to the clipboard for instant use in API Dash.
- **Responsive Design**: Optimized for desktop use while maintaining compatibility with web and mobile.
- **Syntax Highlighting**: Real-time syntax highlighting for request bodies and response schemas.

---

## Core Architecture

### State Management
The app uses **Riverpod** for all data fetching and UI state. 
- **Caching**: API data is cached globally via providers, ensuring that multiple screens can access the same data without redundant network calls.
- **Lazy Loading**: Detail providers only trigger a network fetch when the user navigates to a specific API detail screen.

### Routing
The application uses **GoRouter** for declarative navigation, allowing for direct deep-linking into specific API categories or detail pages.

### Data Fetching
Data is fetched as static JSON artifacts from GitHub Pages. The `ApiService` handles the HTTP client logic with custom error handling and timeout policies.

---

## Directory Overview

- **`lib/providers/`**: Contains the state logic and data-fetching providers.
- **`lib/widgets/`**: Reusable UI components (Sidebar, TopBar, API Detail sheets).
- **`lib/models/`**: Strongly typed data models for APIs, categories, and templates.
- **`lib/services/`**: Low-level services for HTTP requests and storage.
- **`lib/screens/`**: Main page-level widgets and screen layouts.

---

## Getting Started

1.  **Install Dependencies**:
    ```bash
    flutter pub get
    ```

2.  **Run Locally**:
    ```bash
    flutter run -d windows # or chrome/linux/macos
    ```

---
