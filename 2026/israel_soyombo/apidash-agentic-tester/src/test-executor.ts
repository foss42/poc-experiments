// Runs each test case against a real URL and checks three things:
// did we get the right status, are the expected keys in the response,
// and did it respond in under 2 seconds.

import type { TestCase } from "./test-generator.js";

export type CheckResult = "PASS" | "FAIL";

export interface TestResult {
  testCase: TestCase;
  actualStatus: number;
  responseTimeMs: number;
  statusCheck: CheckResult;
  schemaCheck: CheckResult;
  performanceCheck: CheckResult;
  overall: CheckResult;
  failureReason: string;
  responseBody: string;
}

const TIMEOUT_MS = 2000;

export async function executeTests(
  tests: TestCase[],
  baseUrl: string
): Promise<TestResult[]> {
  const base = baseUrl.replace(/\/$/, "");
  return Promise.all(tests.map((tc) => runOne(tc, base)));
}

async function runOne(tc: TestCase, base: string): Promise<TestResult> {
  const url = buildUrl(base, tc.endpoint, tc.method, tc.input);
  const start = Date.now();
  let actualStatus = 0;
  let responseBody = "";

  try {
    const response = await fetchWithTimeout(url, tc.method, tc.input);
    actualStatus = response.status;
    responseBody = (await response.text()).slice(0, 500);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return makeResult(tc, actualStatus, Date.now() - start, responseBody, `Network error: ${message}`);
  }

  return makeResult(tc, actualStatus, Date.now() - start, responseBody);
}

// Fills in path params like {id} from the input object, and for GET requests
// anything left over goes on the query string
function buildUrl(
  base: string,
  endpoint: string,
  method: string,
  input: Record<string, unknown>
): string {
  let path = endpoint;
  for (const [key, value] of Object.entries(input)) {
    path = path.replace(`{${key}}`, encodeURIComponent(String(value)));
  }

  if (method === "GET") {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(input)) {
      if (!endpoint.includes(`{${key}}`)) qs.set(key, String(value));
    }
    const queryString = qs.toString();
    return `${base}${path}${queryString ? `?${queryString}` : ""}`;
  }

  return `${base}${path}`;
}

function fetchWithTimeout(
  url: string,
  method: string,
  input: Record<string, unknown>
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const hasBody = method !== "GET" && method !== "HEAD";

  return fetch(url, {
    method,
    signal: controller.signal,
    headers: hasBody ? { "Content-Type": "application/json" } : undefined,
    body: hasBody && Object.keys(input).length > 0 ? JSON.stringify(input) : undefined,
  }).finally(() => clearTimeout(timer));
}

function makeResult(
  tc: TestCase,
  actualStatus: number,
  responseTimeMs: number,
  responseBody: string,
  networkError?: string
): TestResult {
  if (networkError) {
    return {
      testCase: tc,
      actualStatus,
      responseTimeMs,
      statusCheck: "FAIL",
      schemaCheck: "FAIL",
      performanceCheck: responseTimeMs < TIMEOUT_MS ? "PASS" : "FAIL",
      overall: "FAIL",
      failureReason: networkError,
      responseBody,
    };
  }

  const statusCheck: CheckResult = actualStatus === tc.expected_status ? "PASS" : "FAIL";

  let schemaCheck: CheckResult = "PASS";
  if (tc.expected_keys.length > 0) {
    try {
      const parsed = JSON.parse(responseBody) as unknown;
      const body = Array.isArray(parsed) ? parsed[0] : parsed;
      if (body && typeof body === "object") {
        const missing = tc.expected_keys.filter(
          (k) => !Object.keys(body as Record<string, unknown>).includes(k)
        );
        schemaCheck = missing.length === 0 ? "PASS" : "FAIL";
      } else {
        schemaCheck = "FAIL";
      }
    } catch {
      schemaCheck = "FAIL";
    }
  }

  const performanceCheck: CheckResult = responseTimeMs < TIMEOUT_MS ? "PASS" : "FAIL";

  const failures: string[] = [];
  if (statusCheck === "FAIL") failures.push(`Expected ${tc.expected_status}, got ${actualStatus}`);
  if (schemaCheck === "FAIL") failures.push(`Missing keys: ${tc.expected_keys.join(", ")}`);
  if (performanceCheck === "FAIL") failures.push(`${responseTimeMs}ms exceeded ${TIMEOUT_MS}ms limit`);

  return {
    testCase: tc,
    actualStatus,
    responseTimeMs,
    statusCheck,
    schemaCheck,
    performanceCheck,
    overall: failures.length === 0 ? "PASS" : "FAIL",
    failureReason: failures.join(" | "),
    responseBody,
  };
}
