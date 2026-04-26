import { scenarios } from "../scenarios"
import { toScenarioManifest } from "../shared/scenario"
import type { ScenarioManifest } from "../shared/mcp"

/** Builds the scenario manifest map from the in-memory registry (not loaded from disk). */
export function buildScenarioManifestMap(): Map<string, ScenarioManifest> {
  const manifests = scenarios.map((scenario) => [scenario.id, toScenarioManifest(scenario)] as const)
  return new Map(manifests)
}
