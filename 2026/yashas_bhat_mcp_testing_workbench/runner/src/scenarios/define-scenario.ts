import { buildAssertion, failAssertion } from "../runner/assertions"
import { ScenarioRunError } from "../runner/scenario-run-error"
import type {
  ScenarioContext,
  ScenarioDefinition,
  ScenarioExecutionResult,
} from "../shared/scenario"
import type { AssertionResult, ScenarioArtifact, ScenarioStepRecord } from "../shared/mcp"

type MaybePromise<T> = T | Promise<T>

class ScenarioExpectationError extends Error {}

interface ScenarioMeta {
  id: string
  title: string
  suite: string
  description: string
  tags: string[]
  dependencies?: string[]
}

interface ScenarioSuiteContext extends ScenarioContext {
  test: (title: string, run: (context: ScenarioContext) => MaybePromise<void>) => Promise<void>
  step: <T>(title: string, run: () => Promise<T>) => Promise<T>
  expect: <T>(actual: T, title?: string) => ScenarioExpect<T>
  note: (message: string) => void
  addArtifact: (artifact: ScenarioArtifact) => void
}

interface ScenarioExpect<T> {
  toBe(expected: T): void
  toBeDefined(): void
  toBeTruthy(): void
  toContain(expected: unknown): void
  toHaveLengthAtLeast(expected: number): void
}

function formatNote(message: string): string {
  return `[${new Date().toISOString()}] ${message}`
}

export function defineScenario(
  meta: ScenarioMeta,
  define: (context: ScenarioSuiteContext) => Promise<void>,
): ScenarioDefinition {
  return {
    ...meta,
    async run(context): Promise<ScenarioExecutionResult> {
      const assertions: AssertionResult[] = []
      const notes: string[] = []
      const steps: ScenarioStepRecord[] = []
      const artifacts: ScenarioArtifact[] = []
      let nextAssertionId = 1

      function buildAssertionId(): string {
        const assertionId = nextAssertionId
        nextAssertionId += 1
        return `assertion-${assertionId}`
      }

      function recordResult(
        passed: boolean,
        title: string,
        message: string,
        expected?: unknown,
        actual?: unknown,
      ): void {
        const assertion = buildAssertion(buildAssertionId(), title, passed, message, expected, actual)
        assertions.push(assertion)

        if (!passed) {
          throw new ScenarioExpectationError(message)
        }
      }

      function expect<T>(actual: T, title = "assertion"): ScenarioExpect<T> {
        return {
          toBe(expected) {
            recordResult(
              actual === expected,
              title,
              `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`,
              expected,
              actual,
            )
          },
          toBeDefined() {
            recordResult(
              actual !== undefined,
              title,
              "Expected value to be defined",
              "defined",
              actual,
            )
          },
          toBeTruthy() {
            recordResult(Boolean(actual), title, "Expected value to be truthy", true, actual)
          },
          toContain(expected) {
            const passed =
              typeof actual === "string"
                ? actual.includes(String(expected))
                : Array.isArray(actual)
                  ? actual.includes(expected)
                  : false

            recordResult(passed, title, `Expected value to contain ${JSON.stringify(expected)}`, expected, actual)
          },
          toHaveLengthAtLeast(expected) {
            const actualLength =
              typeof actual === "string" || Array.isArray(actual) ? actual.length : 0

            recordResult(
              actualLength >= expected,
              title,
              `Expected length ${actualLength} to be at least ${expected}`,
              expected,
              actualLength,
            )
          },
        }
      }

      async function test(title: string, run: (scenarioContext: ScenarioContext) => MaybePromise<void>): Promise<void> {
        try {
          await run(context)
        } catch (error) {
          if (error instanceof ScenarioExpectationError) {
            return
          }
          assertions.push(failAssertion(buildAssertionId(), title, error))
        }
      }

      function note(message: string): void {
        notes.push(formatNote(message))
      }

      async function step<T>(title: string, run: () => Promise<T>): Promise<T> {
        const startedAt = Date.now()
        try {
          const result = await run()
          steps.push({
            title,
            durationMs: Date.now() - startedAt,
            status: "completed",
          })
          return result
        } catch (error) {
          const errMessage = error instanceof Error ? error.message : String(error)
          steps.push({
            title,
            durationMs: Date.now() - startedAt,
            status: "failed",
            error: errMessage,
          })
          throw error
        }
      }

      try {
        await define({
          ...context,
          test,
          step,
          expect,
          note,
          addArtifact(artifact) {
            artifacts.push(artifact)
          },
        })
      } catch (error) {
        if (error instanceof ScenarioExpectationError) {
          return { assertions, notes, steps, artifacts }
        }
        throw new ScenarioRunError(
          `${meta.id} scenario failed`,
          { assertions, notes, steps, artifacts },
          { cause: error instanceof Error ? error : new Error(String(error)) },
        )
      }

      return {
        assertions,
        notes,
        steps,
        artifacts,
      }
    },
  }
}
