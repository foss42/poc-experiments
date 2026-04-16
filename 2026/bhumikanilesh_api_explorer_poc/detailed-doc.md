# API Explorer PoC for API Dash

## PR Summary

This work adds an in-app `API Explorer` to API Dash, backed by the existing pipeline and extended with a local MCP-style service layer.

The Explorer introduces a native screen inside API Dash for browsing processed APIs, inspecting endpoint details, importing requests into API Dash, and experimenting with request setup before sending. Alongside the UI, it adds a persistent storage layer for catalog data, failures, reviews, usage history, and remediation items so the Explorer can behave like a real product feature instead of a temporary demo surface.

On the pipeline side, this update adjusts the publishing and validation flow so `apis.guru` specifications are emitted in an API Dash-friendly request shape and cached specifications can be reused across runs. Validator and index cleanup were also updated so `marketplace/index.json` stays consistent with the files that actually survive in `marketplace/apis`.

This PR is focused on implementing API Explorer as a usable API Dash feature. The core story is simple: discover an API, inspect its endpoints, prepare a request, and move directly into API Dash's existing request workflow.

## What This Implements

This PoC adds `API Explorer` navigation to desktop and mobile UI, and introduces a dedicated Explorer screen for browsing synced APIs. The screen renders a searchable API catalog, an endpoint list, and a detailed endpoint panel so users can move from discovery to inspection without leaving API Dash.

It also adds the request-side interaction needed to make Explorer useful inside API Dash. Users can import a single endpoint or a full API, prepare a request in a lightweight playground, edit JSON body, headers, auth, and pre-request script values, preview generated code, and then either open the request in the normal Requests editor or run it through the existing API Dash request flow.

Under the hood, the feature adds Explorer-specific models, providers, services, and Hive-backed persistence. That persistence layer stores synced catalog data as well as failures, reviews, recent usage, and remediation items, which helps the feature feel stable and maintainable rather than transient.

On the pipeline side, this work updates fetch, parse, publish, and validate behavior so cached `apis.guru` specs continue to flow through the pipeline and are ultimately published in a shape that API Dash Explorer can consume directly.

## Main Files

- [api_explorer_page.dart](C:\Users\HP\apidash\lib\screens\api_explorer\api_explorer_page.dart)
- [api_explorer_service.dart](C:\Users\HP\apidash\lib\services\api_explorer_service.dart)
- [api_explorer_providers.dart](C:\Users\HP\apidash\lib\providers\api_explorer_providers.dart)
- [api_explorer_models.dart](C:\Users\HP\apidash\lib\models\api_explorer_models.dart)
- [fetcher.py](C:\Users\HP\apidash\mypipeline\fetcher.py)
- [parser.py](C:\Users\HP\apidash\mypipeline\parser.py)
- [publisher.py](C:\Users\HP\apidash\mypipeline\publisher.py)
- [validator.py](C:\Users\HP\apidash\mypipeline\validator.py)

## Overview

The goal of this work is to make API discovery and request creation feel native to API Dash. Instead of treating API exploration as an external catalog problem, this PoC connects processed OpenAPI data from the existing pipeline to an in-app browsing, inspection, import, and testing experience.

The overall architecture is straightforward. `apis.guru` and other sources feed the pipeline, the pipeline publishes normalized marketplace output, and API Dash consumes that output inside the Explorer. Once an endpoint is selected, the Explorer can hand off directly into API Dash's request model and execution flow. On top of that same marketplace output, an MCP-style service layer can expose structured API data to agents and future tooling.

In short, the flow becomes:

`apis.guru/manual sources -> pipeline -> marketplace output -> API Dash Explorer -> import/test/codegen`

and optionally:

`marketplace output -> MCP tools/resources -> AI agent workflows`

## What We Built

Inside API Dash, this PoC adds a new `Explorer` entry in the left navigation and introduces a full Explorer screen. That screen loads a catalog of processed APIs, shows a searchable list of APIs, renders endpoint lists with method and path information, and opens a detail view with endpoint metadata, request body examples, auth expectations, and response examples.

To make the Explorer practical, it also adds import and testing flow. A selected endpoint can be converted into an API Dash request, opened in the standard Requests editor, or prepared inside a request playground. The playground supports JSON body editing, headers editing, auth editing, pre-request script input, and generated code preview so users can move from “I found an endpoint” to “I am ready to send this request” without switching tools.

Inside the pipeline, this work improves how processed APIs are carried forward and published. Cached `apis.guru` raw specs are now reused instead of being effectively dropped, parser accepts cached results as valid inputs, publisher emits request objects in an API Dash-friendly structure, and validator now understands that updated request shape. Index cleanup was also tightened so removed or invalid API templates do not continue to linger in `index.json`.

## How It Works

Phase 1 of the pipeline fetches `apis.guru` specs and stores raw specs in [data/raw](C:\Users\HP\apidash\mypipeline\data\raw). Snapshot metadata in [snapshot.json](C:\Users\HP\apidash\mypipeline\data\snapshot.json) tracks APIs that have not changed between runs. Instead of dropping unchanged APIs from the later phases, the pipeline now returns them as cached results so they can continue through parsing, enrichment, publishing, and validation.

Parser accepts both freshly fetched and cached `apis.guru` items. Enricher then normalizes these APIs into the pipeline's internal request representation. Publisher writes the final marketplace artifacts to [marketplace/index.json](C:\Users\HP\apidash\mypipeline\marketplace\index.json) and [marketplace/apis](C:\Users\HP\apidash\mypipeline\marketplace\apis), and validator removes invalid outputs while keeping the index aligned with the files that remain.

API Dash sync reads those marketplace files, converts them into Explorer models, and stores them in Hive. The Explorer UI then renders the catalog, endpoint list, details panel, and request playground from that persisted local state. When a user imports or runs an endpoint, API Dash creates a real `HttpRequestModel` and uses the existing request editor and request execution flow rather than duplicating those systems inside Explorer.

## Technologies Used

This PoC uses Flutter to build the Explorer UI inside API Dash, Riverpod to manage Explorer state, and Hive for local persistence. On the pipeline side, it uses Python and a JSON-based marketplace publishing flow. For request execution and code generation, it reuses API Dash's existing request models, editor flow, and send-request infrastructure rather than introducing a parallel execution stack.

MCP-style service concepts are layered on top of the same marketplace output so the processed API catalog can be shared across UI, tooling, and agent-facing workflows.

## How MCP Is Used Here

MCP does not replace the pipeline in this design. The pipeline remains responsible for fetching, parsing, enriching, validating, and publishing API data. MCP sits on top of the published marketplace artifacts and exposes that processed data in a structured way for agents and future integrations.

In this PoC, the role of MCP is to expose catalog search and API details as agent-callable tools, provide import-ready request payloads, surface failures and status information, and optionally support an embedded Explorer-like resource layer later. This matters because it means the same processed API dataset can be reused by API Dash users, AI assistants, and future CLI or automation workflows instead of being trapped inside a single UI.

Conceptually, the relationship is:

`pipeline output -> MCP service -> AI agents / embedded UI`

## How API Dash Had To Be Modified

The navigation layer was updated first so the new Explorer had a proper home inside API Dash. Desktop and mobile navigation were extended in [dashboard.dart](C:\Users\HP\apidash\lib\screens\dashboard.dart), [mobile/dashboard.dart](C:\Users\HP\apidash\lib\screens\mobile\dashboard.dart), and [mobile/navbar.dart](C:\Users\HP\apidash\lib\screens\mobile\navbar.dart).

This matters because Explorer is designed to complement the existing API Dash workflow rather than replace it. In the sidebar, `Requests` remains the primary place where users build, edit, organize, and send saved requests. Explorer feeds into that section by helping users discover APIs and convert selected endpoints into real API Dash requests.

`Variables` continues to be the place where users define reusable values such as API keys, auth tokens, host values, and environment-specific placeholders. This is especially important for Explorer because many imported endpoints include headers, auth requirements, query parameters, or request bodies that become much more useful when they can be mapped to variables rather than hardcoded values.

`History` remains responsible for showing previously executed requests and responses. Once an endpoint discovered in Explorer is opened in the Requests editor and executed, its runtime behavior naturally belongs in History. This separation keeps Explorer focused on discovery and preparation while History stays focused on what was actually sent and received.

`Logs` continues to serve as the operational debugging surface for API Dash. That makes it a natural companion to Explorer sync and request testing, especially when users are troubleshooting malformed imported requests, sync problems, failed request execution, or mismatches between pipeline output and runnable request data.

In that sense, the sidebar structure becomes a connected workflow rather than a set of isolated tabs. Explorer helps users find and understand APIs, Variables helps parameterize them safely, Requests becomes the editable working surface, History records actual usage, and Logs helps debug failures and unexpected behavior.

Storage was expanded by adding an Explorer-specific Hive box in [hive_services.dart](C:\Users\HP\apidash\lib\services\hive_services.dart). This keeps Explorer state isolated from the core request and history boxes while still allowing the feature to behave like a first-class part of the app.

Explorer models were added in [api_explorer_models.dart](C:\Users\HP\apidash\lib\models\api_explorer_models.dart). These models represent API summaries, API details, endpoints, failures, usage records, reviews, and remediation items. Service logic was added in [api_explorer_service.dart](C:\Users\HP\apidash\lib\services\api_explorer_service.dart) to sync pipeline output, parse catalog files, record failures and reviews, maintain usage history, and build importable API Dash request payloads.

State management was added in [api_explorer_providers.dart](C:\Users\HP\apidash\lib\providers\api_explorer_providers.dart). These providers and controllers manage catalog loading, endpoint selection, sync behavior, imports, review submission, and usage tracking. The Explorer UI itself lives in [api_explorer_page.dart](C:\Users\HP\apidash\lib\screens\api_explorer\api_explorer_page.dart), which brings together the catalog view, endpoint view, details view, and request playground.

## Pipeline Modifications

In [fetcher.py](C:\Users\HP\apidash\mypipeline\fetcher.py), cached specs are now surfaced as usable phase outputs instead of being treated as skipped work that disappears from the rest of the pipeline. Unchanged APIs can directly reuse raw cached spec files, which keeps later phases populated even when a full refetch is unnecessary.

In [parser.py](C:\Users\HP\apidash\mypipeline\parser.py), parser now accepts cached results in addition to freshly fetched ones. This is what allows cached `apis.guru` data to keep flowing into enrichment and publishing.

In [publisher.py](C:\Users\HP\apidash\mypipeline\publisher.py), output is now shaped for API Dash Explorer. It writes `filename` in the format Explorer expects, emits request fields such as `path`, `headers` as name/value rows, `params`, `queryParameters`, `pathParameters`, `auth_type`, `content_type`, and `requestBodyExample`, and stops merging stale old index contents back into the newly published output.

In [validator.py](C:\Users\HP\apidash\mypipeline\validator.py), validator now accepts the new request shape and keeps index and category cleanup aligned with the current filename format. Invalid files removed from `marketplace/apis` are also removed from `index.json`, which keeps the published catalog consistent and prevents Explorer sync from loading stale or broken references.

## Current Outcome

After the latest corrected run, publisher emitted 2570 APIs and validator kept 2113 valid APIs. The final [marketplace/index.json](C:\Users\HP\apidash\mypipeline\marketplace\index.json) and [marketplace/apis](C:\Users\HP\apidash\mypipeline\marketplace\apis) outputs are now consistent with each other, and real APIs such as Adobe are present as published templates rather than existing only as stale index entries.

This means Explorer can now sync against a realistic published dataset instead of falling back to a tiny metadata-only subset or a stale catalog state.

## Future Problems We Can Expect

The first likely issue is spec quality variance. Many upstream OpenAPI specs are malformed, incomplete, or inconsistent, and some will continue to produce weak or partially usable request templates. The best mitigation here is to keep strengthening parser normalization, improve validation reports, and use the remediation queue to track APIs that need corrective handling.

The second likely issue is duplication. Large API catalogs often contain multiple versions, overlapping providers, and repeated titles. This should eventually be handled with stronger duplicate detection using title, host, version, and endpoint signatures, along with rules for preferring the latest or best-quality variant.

A third issue is bad example data. Some upstream specs contain localhost URLs, broken defaults, or example secrets. This will need stronger sanitization before publish, validator-side security filtering, and better placeholder rewriting before templates reach API Dash users.

Finally, catalog size will become a practical concern. Full sync across thousands of APIs may eventually be slow enough to justify incremental sync, checksum-based refresh, lazy detail loading, or search-index-driven loading instead of reading everything eagerly.

## How To Tackle Future Work

As this feature grows, the first major improvement would be moving from purely local Hive storage to server-backed storage for multi-user scenarios. That would allow reviews, usage history, and remediation workflows to be shared across users rather than stored only per local install.

Another important follow-up would be to make the request editing experience even more native by reusing more of API Dash's built-in request editor components directly inside Explorer. Today the playground is useful, but longer-term it would be stronger to have Explorer and the main request editor share even more UI and state machinery.

Future work can also deepen the handoff between Explorer and the rest of API Dash. Better deep-linking from an Explorer endpoint to an exact request editor state, clearer “open imported request” behavior, and more precise filtering for runnable APIs versus metadata-only APIs would all improve usability.

## Extra Features Still Worth Adding

There are several natural next steps once the core Explorer flow is stable. One is direct spec upload or import into Explorer so users are not limited to syncing from a pipeline root. Another is better readiness signaling, such as badges for auth completeness, example quality, schema completeness, or request readiness.

Beyond that, a maintainer dashboard for failed extraction and remediation items would make the ecosystem easier to operate at scale. Export snippets, collection JSON export, and richer MCP tool coverage such as `parse_openapi`, `import_endpoint`, `test_request`, and `retry_validation` would also be strong extensions of the same architecture.

## How This Reaches the Goal

The real goal of this work is not merely to parse OpenAPI documents. It is to transform raw specifications into a usable API catalog, expose that catalog inside API Dash, let users inspect and import endpoints directly, and make the same structured data available to future agent workflows through MCP.

That is why the combination of a Python processing pipeline, published marketplace JSON, an in-app API Dash Explorer UI, Hive-backed local state, the existing API Dash request engine, and MCP-style service exposure is the right technical stack for this PoC. Each part reinforces the others, and together they create a path from raw API metadata to an actual usable API Dash workflow.
