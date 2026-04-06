# AI Eval MCP

Simple MCP server for running prompt-based evaluations against Claude and Gemini, with UI screens for configuration and results comparison.

## Demo Video

<video controls width="100%" preload="metadata">
  <source src="./images/full-run.mp4" type="video/mp4" />
  Your viewer does not support embedded video playback.
</video>

[images/full-run.mp4](images/full-run.mp4)

## Requirements

- Node.js 18+
- npm

## Install

```bash
npm install
```

## Run the server

```bash
npm run dev
```

## Test with MCP Inspector

```bash
npm run inspector:http
```

Then open the provided Inspector URL and connect to:

- `http://localhost:3000/mcp`

## Main tools

- `configure-eval`: Opens the evaluation configuration UI.
- `run-eval`: Runs test cases for one or both providers.
- `show-eval-results`: Shows results in the dashboard UI.
- `show-latest-eval-results`: Shows cached latest results, optionally filtered by provider.

## Evaluation input format

`run-eval` expects:

- `providers`: `["claude"]`, `["gemini"]`, or `["claude", "gemini"]`
- `apiKeys`: object keyed by provider name
- `testCases`: array of `{ "prompt": "...", "expected": "..." }`

Pass/fail uses case-insensitive substring matching (`actual` includes `expected`).

## Notes

- The server keeps the latest evaluation result in memory to support follow-up result requests.
- Provider/model defaults are configured in `src/providers/claude.ts` and `src/providers/gemini.ts`.
