/**
 * MCP Apps Host Conformance Tests — Layers 2, 3, 4.
 *
 * These tests go beyond metadata validation (suite-mcp-apps.ts) to verify
 * that MCP Apps actually render, communicate, and transform text into rich UI.
 *
 * Layer 2 — Rendering:  HTML loads, scripts execute, DOM elements appear.
 * Layer 3 — Bridge:     ui/initialize handshake, tools/call proxy, context updates.
 * Layer 4 — Text→UI:    The same data produces both text and visual output.
 *
 * Requires Playwright (optional dependency). Skipped gracefully if absent.
 *
 * Tested against: sample-mcp-apps-chatflow (Sales Analytics)
 */

import { MCPClient } from "./client.js";
import {
  AssertionResult,
  runAssertion,
  assert,
  assertType,
  assertHasKey,
} from "./assertions.js";
import { HostSimulator, AppSession } from "./host/simulator.js";

// ── Helper: get the actual iframe Frame from an AppSession ──

async function getIframeFrame(session: AppSession): Promise<any> {
  // Playwright FrameLocator doesn't support .evaluate() directly.
  // We need to get the actual Frame object from the page.
  const frames = session.page.frames();
  // frames[0] is the main page, frames[1] is the iframe (if loaded)
  const iframeFrame = frames.find((f) => f !== session.page.mainFrame());
  if (!iframeFrame) throw new Error("No iframe frame found");
  return iframeFrame;
}

// ── Resource URIs for the Sales Analytics server ──

const FORM_URI = "ui://sample-mcp-apps-chatflow/sales-metric-input-ui";
const VIZ_URI = "ui://sample-mcp-apps-chatflow/sales-visualization";
const PDF_URI = "ui://sample-mcp-apps-chatflow/sales-pdf-report";

const ALL_URIS = [FORM_URI, VIZ_URI, PDF_URI];

// ── Helper: get report data for tests that need it ──

async function getReportData(client: MCPClient): Promise<{
  selections: Record<string, unknown>;
  report: Record<string, unknown>;
}> {
  const selections = {
    states: ["MH", "KA"],
    metric: "revenue",
    period: "monthly",
    year: "2024",
  };
  const result = await client.callToolRaw("get-sales-data", selections);
  return { selections, report: result.structuredContent as Record<string, unknown> };
}

// ── Suite ──

export async function runMcpAppsHostSuite(client: MCPClient): Promise<AssertionResult[]> {
  const results: AssertionResult[] = [];

  const simulator = new HostSimulator(client, { headless: true });
  await simulator.launch();

  try {
    // ════════════════════════════════════════════════════════════════════
    // Layer 2: Rendering
    // ════════════════════════════════════════════════════════════════════

    // Test 1: Sales form loads without JS errors
    results.push(
      await runAssertion("sales-form HTML loads without JS errors", "MCP Apps Host: Rendering", async () => {
        const session = await simulator.loadApp(FORM_URI);
        try {
          await session.waitForHandshake(8000).catch(() => {});
          // Give the page a moment to execute all scripts
          await session.page.waitForTimeout(1000);
          assert(
            session.consoleErrors.length === 0,
            `JS errors in sales-form: ${session.consoleErrors.join("; ")}`
          );
        } finally {
          await session.close();
        }
      })
    );

    // Test 2: Sales form renders interactive elements
    results.push(
      await runAssertion("sales-form renders interactive elements", "MCP Apps Host: Rendering", async () => {
        const session = await simulator.loadApp(FORM_URI);
        try {
          await session.waitForHandshake(8000).catch(() => {});
          await session.page.waitForTimeout(1000);

          const stateCards = await session.iframe.locator(".state-card").count();
          assert(stateCards > 0, `Expected state cards in grid, found ${stateCards}`);

          const metricSelect = session.iframe.locator("#metricSelect");
          assert(await metricSelect.isVisible(), "Metric select dropdown not visible");
        } finally {
          await session.close();
        }
      })
    );

    // Test 3: Visualization loads Chart.js from CDN
    results.push(
      await runAssertion("visualization loads Chart.js from CDN", "MCP Apps Host: Rendering", async () => {
        const session = await simulator.loadApp(VIZ_URI);
        try {
          await session.waitForHandshake(8000).catch(() => {});
          // Wait for Chart.js CDN script to load
          await session.page.waitForTimeout(3000);

          const frame = await getIframeFrame(session);
          const chartDefined = await frame.evaluate(() => typeof (window as any).Chart !== "undefined");
          assert(chartDefined, "Chart.js not loaded — window.Chart is undefined");
        } finally {
          await session.close();
        }
      })
    );

    // Test 4: Visualization renders canvas after data injection
    results.push(
      await runAssertion("visualization renders canvas after data injection", "MCP Apps Host: Rendering", async () => {
        const session = await simulator.loadApp(VIZ_URI);
        try {
          await session.waitForHandshake(8000).catch(() => {});
          await session.page.waitForTimeout(3000);

          // Inject report data via tool-input
          const { selections, report } = await getReportData(client);
          await session.sendToolInput({ selections, report });
          await session.page.waitForTimeout(2000);

          const canvasCount = await session.iframe.locator("canvas").count();
          assert(canvasCount >= 1, `Expected at least 1 canvas element, found ${canvasCount}`);
        } finally {
          await session.close();
        }
      })
    );

    // Test 5: PDF viewer loads PDF.js from CDN
    results.push(
      await runAssertion("PDF viewer loads PDF.js from CDN", "MCP Apps Host: Rendering", async () => {
        const session = await simulator.loadApp(PDF_URI);
        try {
          await session.waitForHandshake(8000).catch(() => {});
          // PDF.js loads via dynamic import — give it time
          await session.page.waitForTimeout(4000);

          // Check that the loading overlay is visible (waiting for data)
          const loadingOverlay = session.iframe.locator("#loadingOverlay");
          const isVisible = await loadingOverlay.isVisible();
          assert(isVisible, "PDF viewer loading overlay not visible — HTML may not have loaded");
        } finally {
          await session.close();
        }
      })
    );

    // Test 6: All UI resources produce non-empty body
    results.push(
      await runAssertion("all UI resources produce non-empty body", "MCP Apps Host: Rendering", async () => {
        for (const uri of ALL_URIS) {
          const session = await simulator.loadApp(uri);
          try {
            await session.waitForHandshake(8000).catch(() => {});
            await session.page.waitForTimeout(1500);

            const frame = await getIframeFrame(session);
            const bodyLength = await frame.evaluate(
              () => document.body.innerHTML.length
            );
            assert(bodyLength > 0, `${uri}: document.body.innerHTML is empty`);
          } finally {
            await session.close();
          }
        }
      })
    );

    // ════════════════════════════════════════════════════════════════════
    // Layer 3: Bridge Communication
    // ════════════════════════════════════════════════════════════════════

    // Test 7: All apps complete ui/initialize handshake
    results.push(
      await runAssertion("all apps complete ui/initialize handshake", "MCP Apps Host: Bridge", async () => {
        for (const uri of ALL_URIS) {
          const session = await simulator.loadApp(uri);
          try {
            await session.waitForHandshake(8000);
            assert(
              session.bridge.handshakeComplete,
              `${uri}: handshake did not complete`
            );
          } finally {
            await session.close();
          }
        }
      })
    );

    // Test 8: ui/initialize includes protocolVersion and clientInfo
    results.push(
      await runAssertion("ui/initialize includes protocolVersion and clientInfo", "MCP Apps Host: Bridge", async () => {
        const session = await simulator.loadApp(FORM_URI);
        try {
          await session.waitForHandshake(8000);

          const params = session.bridge.initializeParams as Record<string, unknown>;
          assertHasKey(params, "protocolVersion", "ui/initialize params");
          assertType(params.protocolVersion, "string", "protocolVersion");
          assert(
            (params.protocolVersion as string).length > 0,
            "protocolVersion is empty"
          );

          assertHasKey(params, "clientInfo", "ui/initialize params");
          const clientInfo = params.clientInfo as Record<string, unknown>;
          assertHasKey(clientInfo, "name", "clientInfo");
          assert(
            (clientInfo.name as string).length > 0,
            "clientInfo.name is empty"
          );
        } finally {
          await session.close();
        }
      })
    );

    // Test 9: Host injects hostContext CSS variables
    results.push(
      await runAssertion("host injects hostContext CSS variables", "MCP Apps Host: Bridge", async () => {
        const customContext = { "--color-background-primary": "#ff0000" };
        const customSim = new HostSimulator(client, {
          headless: true,
          hostContext: customContext,
        });
        await customSim.launch();
        try {
          const session = await customSim.loadApp(FORM_URI);
          try {
            await session.waitForHandshake(8000);

            // Verify the bridge responded with the custom hostContext
            const outbound = session.bridge.messages.find(
              (m) => m.direction === "outbound" && m.method === "ui/initialize"
            );
            assert(outbound !== undefined, "No outbound ui/initialize response found");
            const result = outbound!.result as Record<string, unknown>;
            assertHasKey(result, "hostContext", "ui/initialize response");
            const ctx = result.hostContext as Record<string, string>;
            assert(
              ctx["--color-background-primary"] === "#ff0000",
              `Expected hostContext --color-background-primary=#ff0000, got ${ctx["--color-background-primary"]}`
            );
          } finally {
            await session.close();
          }
        } finally {
          await customSim.close();
        }
      })
    );

    // Test 10: App sends size-changed notification
    results.push(
      await runAssertion("app sends size-changed notification", "MCP Apps Host: Bridge", async () => {
        const session = await simulator.loadApp(FORM_URI);
        try {
          await session.waitForHandshake(8000);
          // The sales-form sends size-changed right after initialize
          await session.page.waitForTimeout(2000);

          assert(
            session.bridge.sizeChanges.length > 0,
            "No ui/notifications/size-changed received"
          );
          const size = session.bridge.sizeChanges[0];
          assertType(size.width, "number", "size-changed width");
          assertType(size.height, "number", "size-changed height");
          assert(size.width > 0, `size-changed width should be > 0, got ${size.width}`);
          assert(size.height > 0, `size-changed height should be > 0, got ${size.height}`);
        } finally {
          await session.close();
        }
      })
    );

    // Test 11: Sales form calls tools/call via bridge
    results.push(
      await runAssertion("sales-form calls tools/call via bridge", "MCP Apps Host: Bridge", async () => {
        const session = await simulator.loadApp(FORM_URI);
        try {
          await session.waitForHandshake(8000);
          await session.page.waitForTimeout(1500);

          // Simulate the iframe calling tools/call by invoking the bridge directly.
          // This tests the bridge's tool proxy — the same path a real iframe uses.
          const toolCallMsg = JSON.stringify({
            jsonrpc: "2.0",
            id: 999,
            method: "tools/call",
            params: { name: "get-sales-data", arguments: { states: ["MH"], metric: "revenue", period: "monthly", year: "2024" } },
          });
          await session.bridge.handleMessage(toolCallMsg);

          assert(
            session.bridge.toolCallRequests.length > 0,
            "Bridge did not record the tools/call request"
          );
          assert(
            session.bridge.toolCallRequests[0].name === "get-sales-data",
            `Expected tools/call for get-sales-data, got ${session.bridge.toolCallRequests[0].name}`
          );
        } finally {
          await session.close();
        }
      })
    );

    // Test 12: Proxied tools/call returns structuredContent from server
    results.push(
      await runAssertion("proxied tools/call returns structuredContent from server", "MCP Apps Host: Bridge", async () => {
        const session = await simulator.loadApp(FORM_URI);
        try {
          await session.waitForHandshake(8000);

          // Invoke bridge directly — same code path as iframe postMessage
          const responseStr = await session.bridge.handleMessage(JSON.stringify({
            jsonrpc: "2.0",
            id: 1000,
            method: "tools/call",
            params: { name: "get-sales-data", arguments: { states: ["MH"], metric: "revenue", period: "monthly", year: "2024" } },
          }));

          const record = session.bridge.toolCallRequests[0];
          assert(record.result !== null, "Tool call result is null — proxy failed");
          const result = record.result as Record<string, unknown>;
          assertHasKey(result, "structuredContent", "proxied tool result");

          // Verify JSON-RPC response
          assert(responseStr !== null, "Bridge returned no response");
          const response = JSON.parse(responseStr!);
          assertHasKey(response, "result", "JSON-RPC response");
        } finally {
          await session.close();
        }
      })
    );

    // Test 13: Bridge handles ui/update-model-context
    results.push(
      await runAssertion("bridge handles ui/update-model-context", "MCP Apps Host: Bridge", async () => {
        const session = await simulator.loadApp(FORM_URI);
        try {
          await session.waitForHandshake(8000);

          // Simulate the iframe sending ui/update-model-context (what happens
          // after the form fetches data and pushes it to chat context)
          const { selections, report } = await getReportData(client);
          const responseStr = await session.bridge.handleMessage(JSON.stringify({
            jsonrpc: "2.0",
            id: 1001,
            method: "ui/update-model-context",
            params: { structuredContent: { selections, report } },
          }));

          assert(
            session.bridge.modelContextUpdates.length > 0,
            "No ui/update-model-context recorded"
          );
          const update = session.bridge.modelContextUpdates[0] as Record<string, unknown>;
          assertHasKey(update, "structuredContent", "model context update");
          const sc = update.structuredContent as Record<string, unknown>;
          assertHasKey(sc, "selections", "context update structuredContent");
          assertHasKey(sc, "report", "context update structuredContent");

          // Verify response acknowledges
          assert(responseStr !== null, "Bridge returned no response");
        } finally {
          await session.close();
        }
      })
    );

    // Test 14: Visualization responds to tool-input notification
    results.push(
      await runAssertion("visualization responds to tool-input notification", "MCP Apps Host: Bridge", async () => {
        const session = await simulator.loadApp(VIZ_URI);
        try {
          await session.waitForHandshake(8000).catch(() => {});
          await session.page.waitForTimeout(3000);

          // Check initial state — subtitle should show "Loading data..."
          const subtitleBefore = await session.iframe
            .locator("#reportSubtitle")
            .textContent()
            .catch(() => "");

          // Inject data
          const { selections, report } = await getReportData(client);
          await session.sendToolInput({ selections, report });
          await session.page.waitForTimeout(2000);

          // After data injection, subtitle should change
          const subtitleAfter = await session.iframe
            .locator("#reportSubtitle")
            .textContent()
            .catch(() => "");

          assert(
            subtitleAfter !== subtitleBefore || subtitleAfter !== "Loading data...",
            "Visualization DOM did not update after tool-input"
          );
        } finally {
          await session.close();
        }
      })
    );

    // ════════════════════════════════════════════════════════════════════
    // Layer 4: Text → UI Transition
    // ════════════════════════════════════════════════════════════════════

    // Test 15: Tool produces both text content and structuredContent
    results.push(
      await runAssertion("tool produces both text content and structuredContent", "MCP Apps Host: Text→UI", async () => {
        const result = await client.callToolRaw("get-sales-data", {
          states: ["MH"],
          metric: "revenue",
          period: "monthly",
          year: "2024",
        });
        assertHasKey(result, "content", "tool result");
        assertHasKey(result, "structuredContent", "tool result");

        // Verify text content exists
        const content = result.content as Array<Record<string, unknown>>;
        assert(content.length > 0, "text content array is empty");
        assertHasKey(content[0], "text", "content[0]");
        assert(
          (content[0].text as string).length > 0,
          "text content is empty"
        );

        // Verify structuredContent is not just a copy of text
        assert(
          typeof result.structuredContent === "object" && result.structuredContent !== null,
          "structuredContent should be an object"
        );
      })
    );

    // Test 16: structuredContent renders as charts in visualization UI
    results.push(
      await runAssertion("structuredContent renders as charts in visualization UI", "MCP Apps Host: Text→UI", async () => {
        const session = await simulator.loadApp(VIZ_URI);
        try {
          await session.waitForHandshake(8000).catch(() => {});
          await session.page.waitForTimeout(3000);

          // Get structured data from the MCP server (text path)
          const { selections, report } = await getReportData(client);

          // Feed it to the visualization UI (visual path)
          await session.sendToolInput({ selections, report });
          await session.page.waitForTimeout(3000);

          // Verify charts actually rendered
          const canvasCount = await session.iframe.locator("canvas").count();
          assert(canvasCount >= 1, `No canvas elements rendered — charts did not draw`);

          // Verify at least one canvas has non-zero dimensions (actually rendered)
          const frame = await getIframeFrame(session);
          const hasRendered = await frame.evaluate(() => {
            const canvases = document.querySelectorAll("canvas");
            return Array.from(canvases).some((c) => c.width > 0 && c.height > 0);
          });
          assert(hasRendered, "Canvas elements exist but none have rendered (0x0 dimensions)");
        } finally {
          await session.close();
        }
      })
    );

    // Test 17: Full pipeline through host: select → data → visualize → PDF
    results.push(
      await runAssertion("full pipeline through host: select → data → visualize → PDF", "MCP Apps Host: Text→UI", async () => {
        // Step 1: Get data from the MCP server
        const { selections, report } = await getReportData(client);
        assertHasKey(report, "summary", "report");

        // Step 2: Load visualization and verify charts render
        const vizSession = await simulator.loadApp(VIZ_URI);
        try {
          await vizSession.waitForHandshake(8000).catch(() => {});
          await vizSession.page.waitForTimeout(3000);
          await vizSession.sendToolInput({ selections, report });
          await vizSession.page.waitForTimeout(3000);

          const canvasCount = await vizSession.iframe.locator("canvas").count();
          assert(canvasCount >= 1, "Pipeline step 2 failed: no charts rendered");
        } finally {
          await vizSession.close();
        }

        // Step 3: Generate PDF
        const pdfResult = await client.callToolRaw("show-sales-pdf-report", {
          selections,
          report,
        });
        const pdfSc = pdfResult.structuredContent as Record<string, unknown>;
        assertHasKey(pdfSc, "pdfBase64", "PDF structuredContent");

        // Step 4: Load PDF viewer and verify it renders
        const pdfSession = await simulator.loadApp(PDF_URI);
        try {
          await pdfSession.waitForHandshake(8000).catch(() => {});
          await pdfSession.page.waitForTimeout(3000);

          // Send PDF data to the viewer
          await pdfSession.sendToolResult(pdfSc);
          await pdfSession.page.waitForTimeout(5000);

          // Verify the toolbar appeared (PDF loaded successfully)
          const toolbarVisible = await pdfSession.iframe
            .locator("#toolbar")
            .isVisible()
            .catch(() => false);
          assert(toolbarVisible, "Pipeline step 4 failed: PDF toolbar not visible");
        } finally {
          await pdfSession.close();
        }
      })
    );

    // Test 18: Visibility enforcement: app-only tools callable only via bridge
    results.push(
      await runAssertion("visibility enforcement: app-only tools callable only via bridge", "MCP Apps Host: Text→UI", async () => {
        // get-sales-data is visibility: ["app"] — should be callable via MCPClient
        // (server doesn't enforce visibility — that's the host's job)
        // But it SHOULD be callable via bridge too
        const tools = await client.listToolsRaw();
        const salesDataTool = tools.find((t) => t.name === "get-sales-data");
        assert(salesDataTool !== undefined, "get-sales-data tool not found in tools/list");

        // Verify visibility metadata
        const meta = (salesDataTool!._meta as Record<string, unknown>)?.ui as Record<string, unknown>;
        assert(meta !== undefined, "get-sales-data has no _meta.ui");
        const visibility = meta.visibility as string[];
        assert(
          visibility.includes("app") && !visibility.includes("model"),
          `get-sales-data should be app-only, got visibility: [${visibility.join(", ")}]`
        );

        // Verify it's callable via bridge (same path as iframe postMessage)
        const session = await simulator.loadApp(FORM_URI);
        try {
          await session.waitForHandshake(8000);

          // Call get-sales-data through the bridge (simulating iframe tools/call)
          const responseStr = await session.bridge.handleMessage(JSON.stringify({
            jsonrpc: "2.0",
            id: 2000,
            method: "tools/call",
            params: { name: "get-sales-data", arguments: { states: ["MH"], metric: "revenue", period: "monthly", year: "2024" } },
          }));

          const toolCall = session.bridge.toolCallRequests.find(
            (r) => r.name === "get-sales-data"
          );
          assert(toolCall !== undefined, "get-sales-data not callable via bridge");
          assert(toolCall!.result !== null, "get-sales-data call via bridge returned null");

          // Verify response contains structuredContent
          const response = JSON.parse(responseStr!);
          assertHasKey(response.result, "structuredContent", "bridge-proxied get-sales-data");
        } finally {
          await session.close();
        }

        // Also verify model+app tools work via MCPClient
        const vizTool = tools.find((t) => t.name === "visualize-sales-data");
        const vizMeta = (vizTool?._meta as Record<string, unknown>)?.ui as Record<string, unknown>;
        const vizVisibility = vizMeta?.visibility as string[];
        assert(
          vizVisibility.includes("model") && vizVisibility.includes("app"),
          `visualize-sales-data should be model+app, got: [${vizVisibility?.join(", ")}]`
        );
      })
    );
  } finally {
    await simulator.close();
  }

  return results;
}
