import { fetchLinkedUiResource, findTool, getUiResourceUri } from "./helpers"
import { defineScenario } from "./define-scenario"
import type { ScenarioDefinition } from "../shared/scenario"

export const selectMetricContract: ScenarioDefinition = defineScenario(
  {
    id: "select-metric-contract",
    title: "Sales Metric UI Contract",
    suite: "sales-analytics-reference",
    description: "Validate the Sales Analytics input tool metadata and UI resource contract.",
    tags: ["reference", "mcp-apps", "sales-analytics"],
  },
  async ({ client, recorder, state, test, expect, addArtifact, step, note }) => {
    const tools = await step("List tools for metric UI lookup", () => client.listTools())

    const tool = findTool(tools, "select-sales-metric")
    const resourceUri = getUiResourceUri(tool?._meta)
    note(`select-sales-metric resource URI: ${resourceUri ?? "(none)"}`)

    const linked = await step("Read linked MCP Apps HTML resource", async () => {
      const result = await fetchLinkedUiResource(client, tool)
      if (!result) {
        throw new Error("Expected select-sales-metric to expose a UI resource")
      }
      return result
    })

    state.salesFormUi = linked

    const artifact = await step("Write metric contract artifact", () =>
      recorder.saveScenarioArtifacts("select-metric-contract", {
        tool,
        resource: linked.resource,
      }),
    )
    addArtifact(artifact)

    await test("select-sales-metric exists", async () => {
      expect(tool, "select-sales-metric tool").toBeTruthy()
    })

    await test("Tool metadata points to the metric UI", async () => {
      expect(resourceUri, "resource uri").toBe("ui://sample-mcp-apps-chatflow/sales-metric-input-ui")
    })

    await test("UI resource has MCP Apps MIME type", async () => {
      expect(linked.resource.mimeType, "mime type").toBe("text/html;profile=mcp-app")
    })

    await test("UI HTML mentions ui/initialize", async () => {
      expect(linked.resource.text ?? "", "ui/initialize").toContain("ui/initialize")
    })

    await test("UI HTML mentions tools/call", async () => {
      expect(linked.resource.text ?? "", "tools/call").toContain("tools/call")
    })
  },
)
