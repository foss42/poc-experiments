import { requireState } from "../shared/scenario"
import { defineScenario } from "./define-scenario"
import type { ScenarioDefinition } from "../shared/scenario"
import type { HostTraceEntry } from "../shared/mcp"

export const appsHostFlow: ScenarioDefinition = defineScenario(
  {
    id: "apps-host-flow",
    title: "Apps Host Flow",
    suite: "sales-analytics-reference",
    description: "Exercise a real MCP Apps host-app interaction path in Playwright.",
    tags: ["reference", "mcp-apps", "host-flow", "sales-analytics"],
    dependencies: ["select-metric-contract", "visualization-contract", "pdf-contract"],
  },
  async ({ harness, recorder, state, test, expect, addArtifact, step, note }) => {
    const salesForm = requireState(state, "salesFormUi")
    const visualization = requireState(state, "visualizationUi")
    const pdf = requireState(state, "pdfUi")
    const visualizationPayload = requireState(state, "visualizationPayload")
    const pdfPayload = requireState(state, "pdfPayload")

    note("Running Playwright host harness: metric form → chart → PDF download")

    const trace: HostTraceEntry[] = []

    await step("Host: sales metric iframe (initialize, tools/call, model context)", async () => {
      const formSession = await harness.mountApp(salesForm.resource.text ?? "", trace)
      try {
        await formSession.waitForMethod("ui/initialize")
        const frame = formSession.page.frameLocator("#mcp-app")
        await frame.locator("button:text('Top 5')").click()
        await frame.locator("#generateBtn").click()
        await formSession.waitForMethod("tools/call")
        await formSession.waitForMethod("ui/update-model-context")
      } finally {
        await formSession.close()
      }
    })

    await step("Host: visualization iframe (tool-input notification + chart)", async () => {
      const vizSession = await harness.mountApp(visualization.resource.text ?? "", trace)
      try {
        await vizSession.waitForMethod("ui/initialize")
        await vizSession.postNotification("ui/notifications/tool-input", {
          structuredContent: visualizationPayload,
        })
        await vizSession.page.frameLocator("#mcp-app").locator("#totalValue").waitFor()
      } finally {
        await vizSession.close()
      }
    })

    await step("Host: PDF iframe (download flow)", async () => {
      const pdfSession = await harness.mountApp(pdf.resource.text ?? "", trace)
      try {
        await pdfSession.waitForMethod("ui/initialize")
        await pdfSession.waitForMethod("ui/notifications/initialized")
        await pdfSession.postNotification("ui/notifications/tool-input", {
          structuredContent: pdfPayload,
        })
        const pdfFrame = pdfSession.page.frameLocator("#mcp-app")
        await pdfFrame.locator("#downloadBtn").waitFor({ state: "visible", timeout: 10_000 })
        await pdfFrame.locator("#downloadBtn").click()
        await pdfSession.waitForMethod("ui/download-file")
      } finally {
        await pdfSession.close()
      }
    })

    const artifact = await step("Write host-app trace artifact", () =>
      recorder.saveScenarioArtifacts("apps-host-flow", { trace }),
    )
    addArtifact(artifact)

    note(`Host trace captured ${trace.length} message(s) (app↔host)`)

    await test("ui/initialize observed", async () => {
      expect(findMethod(trace, "ui/initialize"), "ui/initialize").toBeTruthy()
    })

    await test("tools/call observed", async () => {
      expect(findMethod(trace, "tools/call"), "tools/call").toBeTruthy()
    })

    await test("ui/update-model-context observed", async () => {
      expect(findMethod(trace, "ui/update-model-context"), "ui/update-model-context").toBeTruthy()
    })

    await test("ui/notifications/tool-input observed", async () => {
      expect(findMethod(trace, "ui/notifications/tool-input"), "ui/notifications/tool-input").toBeTruthy()
    })

    await test("PDF app ui/initialize observed", async () => {
      expect(findMethodWithClient(trace, "ui/initialize", "sales-pdf-report"), "pdf initialize").toBeTruthy()
    })

    await test("ui/download-file observed", async () => {
      expect(findMethod(trace, "ui/download-file"), "ui/download-file").toBeTruthy()
    })
  },
)

function findMethod(trace: HostTraceEntry[], method: string): HostTraceEntry | undefined {
  return trace.find((e) => e.method === method)
}

function findMethodWithClient(
  trace: HostTraceEntry[],
  method: string,
  clientName: string,
): HostTraceEntry | undefined {
  return trace.find((e) => {
    if (e.method !== method) return false
    const params = (e.payload as { params?: { clientInfo?: { name?: string } } })?.params
    return params?.clientInfo?.name === clientName
  })
}
