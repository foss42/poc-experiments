import { getToolStructuredContent } from "../client/mcp-http-client"
import { fetchLinkedUiResource, findTool } from "./helpers"
import { requireState } from "../shared/scenario"
import { defineScenario } from "./define-scenario"
import type { ScenarioDefinition } from "../shared/scenario"

export const pdfContract: ScenarioDefinition = defineScenario(
  {
    id: "pdf-contract",
    title: "PDF Contract",
    suite: "sales-analytics-reference",
    description: "Validate the PDF tool output and save the payload for the apps harness.",
    tags: ["reference", "mcp-apps", "sales-analytics"],
    dependencies: ["fetch-sales-data"],
  },
  async ({ client, recorder, state, test, expect, addArtifact, step, note }) => {
    const salesData = requireState(state, "salesData")
    note("Generating PDF report payload for MCP Apps PDF UI harness")

    const result = await step("Call show-sales-pdf-report", () =>
      client.callTool<Record<string, unknown>>(
        "show-sales-pdf-report",
        salesData as unknown as Record<string, unknown>,
      ),
    )

    const tools = await step("List tools for PDF UI resource", () => client.listTools())
    const tool = findTool(tools, "show-sales-pdf-report")
    const linked = await step("Read PDF MCP Apps resource", () => fetchLinkedUiResource(client, tool))

    if (linked) state.pdfUi = linked
    state.pdfPayload = getToolStructuredContent<Record<string, unknown>>(result)

    const artifact = await step("Write PDF contract artifact", () =>
      recorder.saveScenarioArtifacts("pdf-contract", {
        toolResult: result,
        resource: linked?.resource,
      }),
    )
    addArtifact(artifact)

    note("PDF structured fields and download UI string checks follow")

    await test("pdfBase64 exists", async () => {
      expect(state.pdfPayload?.pdfBase64, "pdfBase64").toBeTruthy()
    })

    await test("fileName exists", async () => {
      expect(state.pdfPayload?.fileName, "fileName").toBeTruthy()
    })

    await test("fileSize exists", async () => {
      expect(state.pdfPayload?.fileSize, "fileSize").toBeTruthy()
    })

    await test("PDF UI mentions ui/download-file", async () => {
      expect(linked?.resource?.text ?? "", "ui/download-file").toContain("ui/download-file")
    })
  },
)
