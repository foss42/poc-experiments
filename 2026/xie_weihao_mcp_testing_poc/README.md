# Sales Analytics MCP Testing PoC

This repository is my PoC for the APIDash GSoC MCP Testing task.

This PoC follows the guidance in my proposal discussion for MCP Testing and focuses on demonstrating the testing of the Sales Analytics MCP Apps server built in `sample-mcp-apps-chatflow`.

For this PoC, I focused on testing the MCP behavior of `sample-mcp-apps-chatflow` as a complete workflow rather than looking at each tool in isolation. The sample itself is already fairly complete, so I focused more on breaking the testing surface into clear parts and validating the key flow in a concrete way.

## What this PoC covers

This PoC currently validates:

- sample MCP server health check
- MCP tool discovery and invocation
- the `get-sales-data` structuredContent contract
- the workflow handoff into `visualize-sales-data`
- MCP resource listing and resource content traits
- protocol metadata such as tool visibility and `resourceUri`
- edge cases for `monthly`, `quarterly`, and invalid input
- PDF payload validity from `show-sales-pdf-report`
- scenario-based workflow testing with locally generated reports
- a small manual test page for happy-path verification

## Target under test

Target repository: `sample-mcp-apps-chatflow`

It is an HTTP-based MCP server that exposes these core tools:

- `select-sales-metric`
- `get-sales-data`
- `visualize-sales-data`
- `show-sales-pdf-report`

## Why I built it this way

I started by reading through the sample MCP project and then turning that understanding into a set of checks that could actually run.

I mainly broke the testing work into a few layers:

- what to assert at the tool level
- what to check at the resource level
- whether workflow context is passed through correctly
- and which parts still benefit from a manual pass even after automation exists

That way, the result is not just a few test scripts, but a more complete testing approach around the workflow itself.

## Current automated coverage

### 1. Health check

Validate that:

- `http://127.0.0.1:3000/health` responds successfully

### 2. Tool contracts

Validate that the tool list is complete and that `get-sales-data` returns structured content containing:

- `summary`
- `topState`
- `periods`
- `states`
- `stateNames`

### 3. Resource metadata validation

Validate that the server exposes these UI resources:

- `ui://sample-mcp-apps-chatflow/sales-metric-input-ui`
- `ui://sample-mcp-apps-chatflow/sales-visualization`
- `ui://sample-mcp-apps-chatflow/sales-pdf-report`

Then read the resource contents and verify:

- the form resource includes `ui/initialize`
- the visualization resource includes `chart.js`
- the PDF resource includes `pdf.min.mjs`
- the PDF resource uses `ui/download-file` for host-side download

### 4. Protocol edge validation

Validate that:

- `get-sales-data` is app-only in tool metadata
- `monthly` returns 12 periods
- `quarterly` returns 4 periods
- invalid input such as `period=weekly` is rejected by MCP input validation

### 5. Visualization flow validation

Validate that `visualize-sales-data` can consume:

- `selections`
- `report`

from the previous `get-sales-data` step, and that the workflow context is preserved in the returned structured content.

### 6. PDF payload validation

Validate that `show-sales-pdf-report` returns:

- `pdfBase64`
- `fileName`
- `fileSize`

and that the decoded payload is a valid PDF.

### 7. Scenario-based workflow validation

Run two full business scenarios:

- `monthly_revenue_workflow`
- `quarterly_conversion_workflow`

Each scenario executes:

1. `get-sales-data`
2. `visualize-sales-data`
3. `show-sales-pdf-report`

Running the test runner generates local reports under `reports/`.

## Environment

- Node.js + npm
- Python 3.11
- Python packages: `mcp`, `httpx`

## Run the target server

In the `sample-mcp-apps-chatflow` directory:

```bash
npm install
npm run dev
```

After startup, it should listen on:

- `http://127.0.0.1:3000/health`
- `http://127.0.0.1:3000/mcp`

## Run the automated tests

In the Python `mcp` environment:

```bash
python scripts/run_tests.py
```

This generates local reports in:

- `reports/latest_report.json`
- `reports/latest_report.md`

I treat those files as generated output, not as core source files for submission.

## Manual verification

I also added a very small local manual test page so I could run through the front-end flow myself and confirm that the actual experience and functionality worked as expected.

To start it:

```bash
python scripts/manual_test_server.py
```

Then open:

- `http://127.0.0.1:8765`

The flow I manually checked was:

1. `Check Health`
2. `Run get-sales-data`
3. `Run visualize-sales-data`
4. `Run full workflow`
5. `Download current PDF`

This manual pass was normal end to end. I did not run into any obvious issue.

For this part, I manually went through the full flow myself and checked the happy path carefully, so I could confirm the end-to-end experience from actual use. Automation helps with repeatability, and the manual pass helps confirm the workflow from a real usage perspective.

## Current limitations

Right now this PoC focuses on tool-level, resource-level, and workflow-level validation. It does not yet include:

- full host/UI automation
- broader multi-parameter boundary coverage
- runtime validation of resource `_meta.ui.csp`

Those would be reasonable next steps.

## A short personal note

I also want to be transparent that I used AI tools while working on this PoC.

I have a lot of experience with vibe coding, but I do not take AI output at face value. I usually use it to discuss ideas, explore implementation directions, and move faster during development, then go back and review the code carefully myself. I make sure I understand the logic, can explain what the code is doing, and can actually learn from the process instead of treating AI as a black box.

That is also why I did not stop at writing test scripts. I connected the automated checks, scenario testing, and manual interaction into one flow and ran them through myself.

I also tried to make my way of working visible in this PoC: read the code carefully, break the testing surface into clear pieces, validate the important flows in practice, and be honest about what is already covered and what can still be expanded.

I would be very happy to keep contributing in this area if selected, and I would take that opportunity seriously.
