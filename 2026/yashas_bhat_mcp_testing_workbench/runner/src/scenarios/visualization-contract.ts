import { getToolStructuredContent } from "../client/mcp-http-client"
import { fetchLinkedUiResource, findTool } from "./helpers"
import { requireState } from "../shared/scenario"
import { defineScenario } from "./define-scenario"
import type { ScenarioDefinition } from "../shared/scenario"

export const visualizationContract: ScenarioDefinition = defineScenario(
  {
    id: "visualization-contract",
    title: "Visualization Contract",
    suite: "sales-analytics-reference",
    description: "Validate the chart tool contract and visualization UI metadata.",
    tags: ["reference", "mcp-apps", "sales-analytics"],
    dependencies: ["fetch-sales-data"],
  },
  async ({ client, recorder, state, test, expect, addArtifact, step, note }) => {
    const salesData = requireState(state, "salesData")
    note("Using sales snapshot from fetch-sales-data for visualize-sales-data")

    const result = await step("Call visualize-sales-data", () =>
      client.callTool<Record<string, unknown>>(
        "visualize-sales-data",
        salesData as unknown as Record<string, unknown>,
      ),
    )

    const tools = await step("List tools for visualization UI metadata", () => client.listTools())
    const tool = findTool(tools, "visualize-sales-data")
    const linked = await step("Read visualization MCP Apps resource", () =>
      fetchLinkedUiResource(client, tool),
    )

    if (linked) state.visualizationUi = linked
    state.visualizationPayload = getToolStructuredContent<Record<string, unknown>>(
      result,
      salesData as unknown as Record<string, unknown>,
    )

    if (!linked) {
      note("Warning: no UI resource linked from visualize-sales-data tool metadata")
    }

    const artifact = await step("Write visualization contract artifact", () =>
      recorder.saveScenarioArtifacts("visualization-contract", {
        toolResult: result,
        resource: linked?.resource,
      }),
    )
    addArtifact(artifact)

    await test("Visualization preserves structured content", async () => {
      expect(result.structuredContent, "structured content").toBeTruthy()
    })

    await test("Visualization UI resource exists", async () => {
      expect(linked?.resource, "visualization resource").toBeTruthy()
    })

    await test("Visualization UI declares CDN CSP", async () => {
      expect(JSON.stringify(linked?.resource?._meta ?? {}), "visualization CSP").toContain("cdn.jsdelivr.net")
    })
  },
)
