import { defineScenario } from "./define-scenario"
import type { DiscoverySnapshot, ScenarioDefinition } from "../shared/scenario"

export const bootstrapAndDiscovery: ScenarioDefinition = defineScenario(
  {
    id: "bootstrap-and-discovery",
    title: "Bootstrap And Discovery",
    suite: "generic-http",
    description: "Initialize a session and collect tools/resources for any HTTP MCP server.",
    tags: ["generic", "discovery"],
  },
  async ({ client, recorder, test, expect, addArtifact, step, note }) => {
    note("Starting generic HTTP discovery against the configured MCP server")

    const initialize = await step("Initialize MCP session", () => client.initialize())
    const tools = await step("List tools", () => client.listTools())
    const resources = await step("List resources", () => client.listResources())

    const snapshot: DiscoverySnapshot = {
      initialize: initialize as Record<string, unknown>,
      tools,
      resources,
    }

    const artifact = await step("Write discovery artifact", () =>
      recorder.saveScenarioArtifacts("bootstrap-and-discovery", snapshot),
    )
    addArtifact(artifact)

    note(`Discovered ${tools.length} tool(s) and ${resources.length} resource(s)`)

    await test("Server info returned", async () => {
      expect(initialize.serverInfo, "server info").toBeTruthy()
    })

    await test("At least one tool discovered", async () => {
      expect(tools, "tools length").toHaveLengthAtLeast(1)
    })

    await test("Resources listing returned", async () => {
      expect(Array.isArray(resources), "resources array").toBe(true)
    })
  },
)
