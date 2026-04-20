import {
  executeRequest,
  runAssertions,
  type TestResult,
  type TestResponse,
} from "../utils/http-client.js";
import type { TestCase } from "../utils/test-plan-generator.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TestCaseWithContext extends TestCase {
  extractVariables?: Array<{ path: string; as: string }>;
  injectVariables?: boolean;
}

export type StepState = "idle" | "running" | "success" | "failed";

export interface StepTrace {
  testName: string;
  state: StepState;
  contextSnapshot: Record<string, unknown>;
}

export interface ContextExecutionResult {
  results: Array<TestResult & { testName: string }>;
  contextStore: Record<string, unknown>;
  trace: StepTrace[];
}

// ─── Dot-Path Resolver ───────────────────────────────────────────────────────
// Safe property access without eval or JSONPath (avoids CVE-2026-1615).
// Supports: "body.data.id", "body.items[0].token", "headers.authorization"

function resolvePathValue(obj: unknown, path: string): unknown {
  const segments = path
    .replace(/\[(\d+)\]/g, ".$1") // Convert array[0] to array.0
    .split(".")
    .filter(Boolean);

  let current: unknown = obj;
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

// ─── Variable Extraction ─────────────────────────────────────────────────────
// Extracts values from a response and stores them in the context Map.

function extractFromResponse(
  response: TestResponse,
  extractions: Array<{ path: string; as: string }>,
  store: Map<string, unknown>,
): void {
  for (const { path, as: varName } of extractions) {
    // Support extracting from body, headers, or top-level response fields
    let value: unknown;
    if (path.startsWith("headers.")) {
      value = resolvePathValue(response.headers, path.slice(8));
    } else if (path.startsWith("body.")) {
      value = resolvePathValue(response.body, path.slice(5));
    } else {
      value = resolvePathValue(response, path);
    }

    if (value !== undefined) {
      store.set(varName, value);
    } else {
      console.warn(`[ContextStore] Variable extraction failed: path "${path}" not found`);
    }
  }
}

// ─── Variable Injection ──────────────────────────────────────────────────────
// Replaces {{varName}} placeholders in a string with context store values.

function injectIntoString(template: string, store: Map<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, varName: string) => {
    const value = store.get(varName);
    if (value === undefined) return `{{${varName}}}`; // Leave unchanged if not found
    return String(value);
  });
}

function injectIntoTest(
  test: TestCaseWithContext,
  store: Map<string, unknown>,
): TestCaseWithContext {
  return {
    ...test,
    url: injectIntoString(test.url, store),
    headers: Object.fromEntries(
      Object.entries(test.headers).map(([k, v]) => [k, injectIntoString(v, store)]),
    ),
    body: test.body ? injectIntoString(test.body, store) : undefined,
  };
}

// ─── Context Runner ──────────────────────────────────────────────────────────
// Executes tests sequentially with variable extraction/injection between steps.
// This is the FSM concept simplified: Idle -> Running -> Success/Failed per step.

export async function runWithContext(
  tests: TestCaseWithContext[],
): Promise<ContextExecutionResult> {
  const store = new Map<string, unknown>();
  const results: Array<TestResult & { testName: string }> = [];
  const trace: StepTrace[] = [];

  for (const test of tests) {
    // Inject variables from context store if enabled
    const prepared = test.injectVariables ? injectIntoTest(test, store) : test;

    trace.push({
      testName: test.name,
      state: "running",
      contextSnapshot: Object.fromEntries(store),
    });

    try {
      const response = await executeRequest({
        method: prepared.method,
        url: prepared.url,
        headers: prepared.headers,
        body: prepared.body,
      });

      const assertions = runAssertions(
        response,
        prepared.expectedStatus,
        prepared.maxResponseTime,
      );

      const passed = assertions.every((a) => a.passed);

      results.push({
        testName: test.name,
        ...response,
        assertions,
        passed,
      });

      // Extract variables from response for subsequent steps
      if (test.extractVariables) {
        extractFromResponse(response, test.extractVariables, store);
      }

      // Update trace with final state
      trace[trace.length - 1].state = passed ? "success" : "failed";
      trace[trace.length - 1].contextSnapshot = Object.fromEntries(store);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        testName: test.name,
        statusCode: 0,
        statusText: "Connection Error",
        headers: {},
        body: message,
        responseTime: 0,
        assertions: [{ name: "Request succeeds", passed: false, detail: message }],
        passed: false,
      });

      trace[trace.length - 1].state = "failed";
    }
  }

  return {
    results,
    contextStore: Object.fromEntries(store),
    trace,
  };
}

// Re-export for convenience
export { resolvePathValue, injectIntoString, extractFromResponse };
