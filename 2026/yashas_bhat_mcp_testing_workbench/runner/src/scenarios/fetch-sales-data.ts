import { getToolStructuredContent } from "../client/mcp-http-client"
import { defineScenario } from "./define-scenario"
import type { SalesDataSnapshot, ScenarioDefinition } from "../shared/scenario"

export const fetchSalesData: ScenarioDefinition = defineScenario(
  {
    id: "fetch-sales-data",
    title: "Fetch Sales Data",
    suite: "sales-analytics-reference",
    description: "Run the deterministic Sales Analytics data fetch and assert the structured response.",
    tags: ["reference", "tool-call", "sales-analytics"],
  },
  async ({ client, manifest, recorder, state, test, expect, addArtifact, step, note }) => {
    const selections: SalesDataSnapshot["selections"] = {
      states: ["MH", "TN", "KA"],
      metric: "revenue",
      period: "monthly",
      year: "2025",
      ...(manifest.inputs as Partial<SalesDataSnapshot["selections"]>),
    }

    note(
      `Fetching sales data: states=${selections.states.join(",")}, metric=${selections.metric}, period=${selections.period}, year=${selections.year}`,
    )

    const result = await step("Call get-sales-data", () =>
      client.callTool<Record<string, unknown>>("get-sales-data", selections),
    )

    const report = getToolStructuredContent<SalesDataSnapshot["report"]>(result)
    const snapshot: SalesDataSnapshot = { selections, report }

    state.salesData = snapshot

    const artifact = await step("Write sales snapshot artifact", () =>
      recorder.saveScenarioArtifacts("fetch-sales-data", snapshot),
    )
    addArtifact(artifact)

    note("Structured report received; running field assertions")

    await test("Summary exists", async () => {
      expect(report.summary, "summary").toBeTruthy()
    })

    await test("Top state exists", async () => {
      expect(report.topState, "top state").toBeTruthy()
    })

    await test("Periods are populated", async () => {
      expect(report.periods, "periods").toHaveLengthAtLeast(1)
    })

    await test("State count matches selections", async () => {
      expect(report.states.length, "state count").toBe(selections.states.length)
    })
  },
)
