import { MCPClient } from "./client.js";
import {
  AssertionResult,
  runAssertion,
  assert,
  assertType,
  assertHasKey,
} from "./assertions.js";

/**
 * MCP Apps conformance tests.
 *
 * These tests validate the MCP Apps extension (SEP-1865) which enables
 * servers to return rich, interactive HTML UIs via structuredContent
 * and declare UI resources alongside standard tools.
 *
 * Tested against: sample-mcp-apps-chatflow (Sales Analytics)
 */
export async function runMcpAppsSuite(client: MCPClient): Promise<AssertionResult[]> {
  const results: AssertionResult[] = [];

  // ── MCP Apps: structuredContent Tests ──

  results.push(
    await runAssertion("get-sales-data returns structuredContent", "MCP Apps", async () => {
      const result = await client.callToolRaw("get-sales-data", {
        states: ["MH"],
        metric: "revenue",
        period: "monthly",
        year: "2024",
      });
      assertHasKey(result, "content", "tool result");
      assertHasKey(result, "structuredContent", "tool result");
      assert(
        result.structuredContent !== null && result.structuredContent !== undefined,
        "structuredContent should not be null/undefined"
      );
    })
  );

  results.push(
    await runAssertion("structuredContent contains valid report structure", "MCP Apps", async () => {
      const result = await client.callToolRaw("get-sales-data", {
        states: ["MH"],
        metric: "revenue",
        period: "monthly",
        year: "2024",
      });
      const sc = result.structuredContent as Record<string, unknown>;
      assertHasKey(sc, "summary", "structuredContent");
      assertHasKey(sc, "periods", "structuredContent");
      assertHasKey(sc, "states", "structuredContent");
      assertHasKey(sc, "stateNames", "structuredContent");

      const summary = sc.summary as Record<string, unknown>;
      assertHasKey(summary, "total", "summary");
      assertHasKey(summary, "totalRaw", "summary");
      assertType(summary.totalRaw, "number", "summary.totalRaw");

      assert(
        Array.isArray(sc.periods),
        "structuredContent.periods should be an array"
      );
      assert(
        (sc.periods as unknown[]).length > 0,
        "structuredContent.periods should not be empty"
      );
    })
  );

  // ── MCP Apps: UI Resources Tests ──

  results.push(
    await runAssertion("resources/list exposes MCP Apps UI resources", "MCP Apps: Resources", async () => {
      const resources = await client.listResources();
      assertType(resources, "array", "resources");
      assert(resources.length > 0, "Server returned 0 resources");
      assert(resources.length === 3, `Expected 3 UI resources, got ${resources.length}`);
    })
  );

  results.push(
    await runAssertion("UI resources use mcp-app MIME type", "MCP Apps: Resources", async () => {
      const resources = await client.listResources();
      for (const resource of resources) {
        assertHasKey(resource, "mimeType", "resource");
        assert(
          resource.mimeType === "text/html;profile=mcp-app",
          `Expected mimeType "text/html;profile=mcp-app", got "${resource.mimeType}"`
        );
      }
    })
  );

  results.push(
    await runAssertion("UI resources use ui:// URI scheme", "MCP Apps: Resources", async () => {
      const resources = await client.listResources();
      for (const resource of resources) {
        assertHasKey(resource, "uri", "resource");
        const uri = resource.uri as string;
        assert(
          uri.startsWith("ui://"),
          `Expected URI to start with "ui://", got "${uri}"`
        );
      }
    })
  );

  // ── MCP Apps: Tool Metadata Tests ──

  results.push(
    await runAssertion("tools declare UI resource bindings via _meta", "MCP Apps: Metadata", async () => {
      const tools = await client.listToolsRaw();
      const toolsWithUi = tools.filter(
        (t) => (t._meta as Record<string, unknown>)?.ui !== undefined
      );
      assert(
        toolsWithUi.length > 0,
        "No tools declare _meta.ui resource bindings"
      );
      for (const tool of toolsWithUi) {
        const ui = (tool._meta as Record<string, unknown>).ui as Record<string, unknown>;
        assertHasKey(ui, "resourceUri", `${tool.name}._meta.ui`);
        const resourceUri = ui.resourceUri as string;
        assert(
          resourceUri.startsWith("ui://"),
          `${tool.name}._meta.ui.resourceUri should use ui:// scheme, got "${resourceUri}"`
        );
      }
    })
  );

  results.push(
    await runAssertion("tools declare visibility levels", "MCP Apps: Metadata", async () => {
      const tools = await client.listToolsRaw();
      const toolsWithUi = tools.filter(
        (t) => (t._meta as Record<string, unknown>)?.ui !== undefined
      );
      for (const tool of toolsWithUi) {
        const ui = (tool._meta as Record<string, unknown>).ui as Record<string, unknown>;
        assertHasKey(ui, "visibility", `${tool.name}._meta.ui`);
        assert(
          Array.isArray(ui.visibility),
          `${tool.name}._meta.ui.visibility should be an array`
        );
        const vis = ui.visibility as string[];
        assert(vis.length > 0, `${tool.name}._meta.ui.visibility is empty`);
        for (const v of vis) {
          assert(
            v === "model" || v === "app",
            `${tool.name}: unexpected visibility "${v}" (expected "model" or "app")`
          );
        }
      }
    })
  );

  // ── MCP Apps: Visualization & PDF Tests ──

  results.push(
    await runAssertion("visualize-sales-data returns chart structuredContent", "MCP Apps: Tools", async () => {
      // First, get report data from get-sales-data
      const dataResult = await client.callToolRaw("get-sales-data", {
        states: ["MH"],
        metric: "revenue",
        period: "monthly",
        year: "2024",
      });
      const report = dataResult.structuredContent as Record<string, unknown>;

      // Pass selections + report to visualize-sales-data
      const vizResult = await client.callToolRaw("visualize-sales-data", {
        selections: { states: ["MH"], metric: "revenue", period: "monthly", year: "2024" },
        report,
      });

      assertHasKey(vizResult, "structuredContent", "visualize result");
      const vizSc = vizResult.structuredContent as Record<string, unknown>;
      assertHasKey(vizSc, "selections", "viz structuredContent");
      assertHasKey(vizSc, "report", "viz structuredContent");
    })
  );

  results.push(
    await runAssertion("show-sales-pdf-report returns PDF base64", "MCP Apps: Tools", async () => {
      const dataResult = await client.callToolRaw("get-sales-data", {
        states: ["MH"],
        metric: "revenue",
        period: "monthly",
        year: "2024",
      });
      const report = dataResult.structuredContent as Record<string, unknown>;

      const pdfResult = await client.callToolRaw("show-sales-pdf-report", {
        selections: { states: ["MH"], metric: "revenue", period: "monthly", year: "2024" },
        report,
      });

      assertHasKey(pdfResult, "structuredContent", "pdf result");
      const pdfSc = pdfResult.structuredContent as Record<string, unknown>;
      assertHasKey(pdfSc, "pdfBase64", "pdf structuredContent");
      assertHasKey(pdfSc, "fileName", "pdf structuredContent");
      assertHasKey(pdfSc, "fileSize", "pdf structuredContent");
      assertType(pdfSc.pdfBase64, "string", "pdfBase64");
      assert(
        (pdfSc.pdfBase64 as string).length > 0,
        "pdfBase64 is empty"
      );
    })
  );

  // ── MCP Apps: Resource Content Tests ──

  results.push(
    await runAssertion("resources/read returns HTML content for UI resources", "MCP Apps: Resources", async () => {
      const resources = await client.listResources();
      assert(resources.length > 0, "No resources to read");

      const uri = resources[0].uri as string;
      const contents = await client.readResource(uri);
      assert(Array.isArray(contents), "resources/read should return contents array");
      assert(contents.length > 0, "resources/read returned empty contents");

      const content = contents[0];
      assertHasKey(content, "text", "resource content");
      assertHasKey(content, "mimeType", "resource content");
      assert(
        content.mimeType === "text/html;profile=mcp-app",
        `Expected mimeType "text/html;profile=mcp-app", got "${content.mimeType}"`
      );
      assert(
        (content.text as string).includes("<!DOCTYPE html>") || (content.text as string).includes("<html"),
        "Resource content should be valid HTML"
      );
    })
  );

  results.push(
    await runAssertion("UI resources with CSP declare resourceDomains", "MCP Apps: Resources", async () => {
      // The visualization and PDF resources declare CSP for CDN access
      const vizContents = await client.readResource(
        "ui://sample-mcp-apps-chatflow/sales-visualization"
      );
      assert(vizContents.length > 0, "Visualization resource returned empty contents");

      const content = vizContents[0];
      assertHasKey(content, "_meta", "visualization resource content");
      const meta = content._meta as Record<string, unknown>;
      assertHasKey(meta, "ui", "resource _meta");
      const ui = meta.ui as Record<string, unknown>;
      assertHasKey(ui, "csp", "_meta.ui");
      const csp = ui.csp as Record<string, unknown>;
      assertHasKey(csp, "resourceDomains", "csp");
      assert(
        Array.isArray(csp.resourceDomains),
        "csp.resourceDomains should be an array"
      );
      assert(
        (csp.resourceDomains as string[]).length > 0,
        "csp.resourceDomains is empty"
      );
    })
  );

  // ── MCP Apps: Workflow Tests ──

  results.push(
    await runAssertion("tool workflow: select → fetch data pipeline", "MCP Apps: Workflow", async () => {
      // Step 1: select-sales-metric (no args needed)
      const selectResult = await client.callTool("select-sales-metric", {});
      assertHasKey(selectResult, "content", "select result");
      assert(selectResult.content.length > 0, "select returned empty content");

      // Step 2: get-sales-data with valid params
      const dataResult = await client.callToolRaw("get-sales-data", {
        states: ["MH", "TN"],
        metric: "revenue",
        period: "quarterly",
        year: "2024",
      });
      assertHasKey(dataResult, "structuredContent", "data result");
      const sc = dataResult.structuredContent as Record<string, unknown>;
      assertHasKey(sc, "summary", "workflow structuredContent");
      assertHasKey(sc, "periods", "workflow structuredContent");
      assert(
        (sc.states as unknown[]).length === 2,
        `Expected 2 states in report, got ${(sc.states as unknown[]).length}`
      );
    })
  );

  results.push(
    await runAssertion("full pipeline: select → data → visualize → PDF", "MCP Apps: Workflow", async () => {
      // Step 1: select-sales-metric
      await client.callTool("select-sales-metric", {});

      // Step 2: get-sales-data
      const dataResult = await client.callToolRaw("get-sales-data", {
        states: ["MH", "KA"],
        metric: "revenue",
        period: "quarterly",
        year: "2024",
      });
      const report = dataResult.structuredContent as Record<string, unknown>;
      assertHasKey(report, "summary", "report");
      const selections = { states: ["MH", "KA"], metric: "revenue", period: "quarterly", year: "2024" };

      // Step 3: visualize-sales-data
      const vizResult = await client.callToolRaw("visualize-sales-data", {
        selections,
        report,
      });
      assertHasKey(vizResult, "structuredContent", "viz result");

      // Step 4: show-sales-pdf-report
      const pdfResult = await client.callToolRaw("show-sales-pdf-report", {
        selections,
        report,
      });
      assertHasKey(pdfResult, "structuredContent", "pdf result");
      const pdfSc = pdfResult.structuredContent as Record<string, unknown>;
      assertHasKey(pdfSc, "pdfBase64", "pdf structuredContent");
      assert(
        (pdfSc.fileName as string).includes("revenue"),
        `PDF fileName should reference metric, got "${pdfSc.fileName}"`
      );
    })
  );

  return results;
}
