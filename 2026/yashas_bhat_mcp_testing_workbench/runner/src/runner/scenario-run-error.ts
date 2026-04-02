import type { ScenarioExecutionResult } from "../shared/scenario"

/**
 * Thrown when a scenario fails after recording partial progress (notes, steps, artifacts).
 * The runner merges {@link partial} with a terminal failure assertion instead of discarding it.
 */
export class ScenarioRunError extends Error {
  readonly partial: ScenarioExecutionResult

  constructor(message: string, partial: ScenarioExecutionResult, options?: { cause?: unknown }) {
    super(message, { cause: options?.cause })
    this.name = "ScenarioRunError"
    this.partial = partial
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export function isScenarioRunError(error: unknown): error is ScenarioRunError {
  return error instanceof ScenarioRunError
}
