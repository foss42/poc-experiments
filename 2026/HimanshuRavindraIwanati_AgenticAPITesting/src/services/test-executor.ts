import type {
  ApiTestCase,
  ExecutionResult,
  AssertionResult,
  TestAssertion,
} from "../types.js";
import { BASE_URL } from "../constants.js";

// ─── HTTP Request Executor ───────────────────────────────────────────────────

async function executeRequest(tc: ApiTestCase): Promise<{
  status: number;
  body: unknown;
  durationMs: number;
}> {
  // Substitute path parameters
  let resolvedPath = tc.path;
  if (tc.pathParams) {
    for (const [key, val] of Object.entries(tc.pathParams)) {
      resolvedPath = resolvedPath.replace(`{${key}}`, String(val));
    }
  }

  // Build query string
  const queryStr = tc.queryParams && Object.keys(tc.queryParams).length > 0
    ? "?" + new URLSearchParams(
        Object.fromEntries(
          Object.entries(tc.queryParams).map(([k, v]) => [k, String(v)])
        )
      ).toString()
    : "";

  const url = `${BASE_URL}${resolvedPath}${queryStr}`;
  const start = Date.now();

  const res = await fetch(url, {
    method: tc.method,
    headers: { "Content-Type": "application/json" },
    body: tc.requestBody ? JSON.stringify(tc.requestBody) : undefined,
  });

  const durationMs = Date.now() - start;
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  return { status: res.status, body, durationMs };
}

// ─── Assertion Evaluator ─────────────────────────────────────────────────────

function resolveField(fieldPath: string, status: number, body: unknown): unknown {
  if (fieldPath === "response.status") return status;

  // response.body.x.y.z → drill into body
  const parts = fieldPath.replace("response.body.", "").split(".");
  let current: unknown = body;
  for (const part of parts) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function evaluateAssertion(
  assertion: TestAssertion,
  status: number,
  body: unknown
): AssertionResult {
  const actual = resolveField(assertion.field, status, body);

  let passed = false;
  switch (assertion.operator) {
    case "equals":
      passed = actual === assertion.expected;
      break;
    case "exists":
      passed = actual !== undefined && actual !== null;
      break;
    case "type_is": {
      const actualType = Array.isArray(actual) ? "array" : typeof actual;
      // handle "integer" alias
      const expectedType = assertion.expected === "integer" ? "number" : assertion.expected;
      passed = actualType === expectedType;
      break;
    }
    case "gte":
      passed = typeof actual === "number" && actual >= (assertion.expected as number);
      break;
    case "lte":
      passed = typeof actual === "number" && actual <= (assertion.expected as number);
      break;
    case "contains":
      passed =
        typeof actual === "string" &&
        actual.includes(String(assertion.expected));
      break;
  }

  return {
    field: assertion.field,
    passed,
    expected: assertion.expected,
    actual,
    operator: assertion.operator,
  };
}

// ─── Main Execution Function ─────────────────────────────────────────────────

export async function executeTests(
  tests: ApiTestCase[],
  // Optional: inject a mock response for drift simulation
  mockResponse?: { testId: string; body: unknown; status: number }
): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];

  for (const tc of tests) {
    if (!tc.enabled) {
      results.push({
        testId: tc.id,
        testName: tc.name,
        status: "skipped",
        durationMs: 0,
        assertionResults: [],
      });
      continue;
    }

    try {
      let status: number;
      let body: unknown;
      let durationMs: number;

      // Use mock if provided (drift simulation)
      if (mockResponse && mockResponse.testId === tc.id) {
        status = mockResponse.status;
        body = mockResponse.body;
        durationMs = 12; // simulated
      } else {
        const result = await executeRequest(tc);
        status = result.status;
        body = result.body;
        durationMs = result.durationMs;
      }

      const assertionResults = tc.assertions.map((a) =>
        evaluateAssertion(a, status, body)
      );

      const allPassed = assertionResults.every((r) => r.passed);

      results.push({
        testId: tc.id,
        testName: tc.name,
        status: allPassed ? "passed" : "failed",
        durationMs,
        responseStatusCode: status,
        responseBody: body,
        assertionResults,
      });
    } catch (err) {
      results.push({
        testId: tc.id,
        testName: tc.name,
        status: "failed",
        durationMs: 0,
        assertionResults: [],
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}
