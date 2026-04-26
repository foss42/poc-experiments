# API Dash — VS Code Extension PoC

> A working Proof of Concept that brings API Dash's core capabilities into VS Code, demonstrating that Dart code generators port directly to TypeScript using identical templates.

## Demo

<!-- Replace with your actual YouTube link -->
📹 [Watch the 2-minute demo video](https://your-unlisted-youtube-link-here)

## What This PoC Proves

| What | How |
|---|---|
| **HTTP requests work in VS Code** | Send GET/POST/PUT/DELETE with headers, params, body — powered by axios |
| **Code generation templates are portable** | Python/JS/cURL generators use **identical** `{{ }}` Nunjucks templates as API Dash's Jinja (Dart). Zero template changes needed. |
| **VS Code APIs are sufficient** | Webview for UI, TreeView for sidebar, globalState for persistence — all native VS Code APIs |
| **Extension architecture is sound** | Clean separation: Extension Host (logic) ↔ Webview (UI) via postMessage |

### The Key Insight

API Dash's Dart codegen uses [Jinja templates](https://pub.dev/packages/jinja) with `jj.Template(tmpl).render(data)`.

This PoC uses [Nunjucks](https://mozilla.github.io/nunjucks/) with `nunjucks.renderString(tmpl, data)`.

**The template strings are byte-for-byte identical:**

```
# In API Dash (Dart):                    # In this PoC (TypeScript):
String kTemplateStart = """               const kTemplateStart = `
import requests                           import requests

url = '{{url}}'                           url = '{{url}}'
""";                                      `;
```

This means the Dart2Ts converter's job for codegen is straightforward: swap the rendering call, keep everything else.

## Features

- ⚡ **Send HTTP Requests** — GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
- 📋 **Response Viewer** — Status code badge, response time, size, formatted JSON body, headers
- 💻 **Code Generation** — Python (requests), JavaScript (fetch), cURL — using templates ported verbatim from API Dash
- 📁 **Sidebar** — TreeView with saved requests, method icons, click-to-open
- 🎨 **Theme Support** — Uses VS Code CSS variables, auto-matches any theme
- 💾 **Persistence** — Requests saved to VS Code globalState across sessions
- 🔗 **URL Auto-Fix** — Typing `api.github.com` auto-adds `https://`

## Run Locally

```bash
# 1. Clone and install
git clone https://github.com/DeepBuha06/apidash-vscode.git
cd apidash-vscode
npm install

# 2. Open in VS Code
code .

# 3. Press F5 to launch the extension in a debug window
```

## Architecture

```
Extension Host (Node.js/TypeScript)          Webview (HTML/CSS/JS)
┌────────────────────────────┐    postMessage    ┌──────────────────────┐
│ extension.ts (entry point) │ ──────────────→   │ request_editor.js    │
│ http_client.ts (axios)     │ ←────────────── │ request_editor.css   │
│ codegen/ (3 generators)    │                   │ (UI: tabs, forms,    │
│ sidebar/ (TreeView)        │                   │  response viewer)    │
│ models/ (TypeScript types) │                   │                      │
└────────────────────────────┘                   └──────────────────────┘
```

## Project Structure

```
src/
├── extension.ts               Entry point — registers commands, sidebar, persistence
├── http_client.ts             HTTP client (axios) with URL sanitization and error handling
├── models/
│   └── request_model.ts       TypeScript interfaces mirroring API Dash's core models
├── codegen/
│   ├── codegen.ts             Generator router (3 languages, mirrors Dart's 33-language router)
│   ├── python_requests.ts     Python requests — templates identical to API Dash's Dart code
│   ├── js_fetch.ts            JavaScript fetch
│   └── curl.ts                cURL
├── sidebar/
│   └── request_tree_provider.ts   VS Code TreeView for saved requests
└── webview/
    └── request_panel.ts       Webview panel manager (Extension Host ↔ Webview bridge)
media/
├── request_editor.css         Styles using VS Code CSS variables
├── request_editor.js          UI logic (tabs, forms, postMessage communication)
└── icon.svg                   Activity Bar icon
```

## API Dash → VS Code Mapping

| API Dash (Dart/Flutter) | This PoC (TypeScript/VS Code) |
|---|---|
| `jj.Template(tmpl).render(data)` | `nunjucks.renderString(tmpl, data)` |
| `HttpRequestModel` (Freezed) | `RequestModel` (TypeScript interface) |
| Riverpod providers + notifyListeners | `vscode.EventEmitter` + callbacks |
| Hive storage | `context.globalState` |
| Flutter widgets | Webview (HTML/CSS/JS) |
| `dart:http` / better_networking | axios |
| Sidebar ListView | VS Code TreeView API |

## What's NOT in the PoC (Saved for GSoC)

These are intentionally excluded — a PoC proves the concept, GSoC implements the product:

- Multipart/form-data and file uploads
- Authentication handling
- GraphQL support
- SSE / streaming responses
- Request cancellation (AbortController)
- 30+ code generator languages (PoC has 3)
- Full Dart2Ts automated converter tool

## Related

- **API Dash**: [github.com/foss42/apidash](https://github.com/foss42/apidash)
- **GSoC Idea**: VS Code Extension for API Dash via AST-based Dart→TypeScript converter
