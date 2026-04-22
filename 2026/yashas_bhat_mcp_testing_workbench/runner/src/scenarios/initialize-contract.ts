import { defineScenario } from "./define-scenario"
import type { ScenarioDefinition } from "../shared/scenario"

export const initializeContract: ScenarioDefinition = defineScenario(
  {
    id: "initialize-contract",
    title: "Initialize Contract",
    suite: "generic-http",
    description: "Verify that an HTTP MCP server completes initialize and returns server info.",
    tags: ["generic", "initialize"],
  },
  async ({ client, recorder, test, expect, addArtifact, step, note }) => {
    note("Checking the initialize response shape for the connected MCP server")

    const initialize = await step("Initialize MCP session", () => client.initialize())

    const artifact = await step("Write initialize artifact", () =>
      recorder.saveScenarioArtifacts("initialize-contract", initialize as Record<string, unknown>),
    )
    addArtifact(artifact)

    await test("Server name is present", async () => {
      expect(initialize.serverInfo?.name, "server name").toBeDefined()
    })

    await test("Server version is present", async () => {
      expect(initialize.serverInfo?.version, "server version").toBeDefined()
    })
  },
)
