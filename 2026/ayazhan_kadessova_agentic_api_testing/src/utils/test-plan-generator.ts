export interface TestCase {
  name: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  expectedStatus: number;
  maxResponseTime: number;
  category: string;
  description: string;
}

export interface TestPlan {
  planName: string;
  description: string;
  baseUrl: string;
  tests: TestCase[];
}

/**
 * Generates a test plan for a given API endpoint.
 *
 * In the full GSoC implementation, this would use the multi-agent pipeline
 * (Generator -> Critic -> Reducer) to produce high-quality test plans.
 * For this PoC, we generate a deterministic set of common API test patterns.
 */
export function generateTestPlan(
  baseUrl: string,
  method: string,
  path: string,
  description?: string,
): TestPlan {
  const fullUrl = baseUrl.replace(/\/$/, "") + path;
  const tests: TestCase[] = [];

  // Functional tests
  tests.push({
    name: `${method} ${path} - Happy path`,
    method,
    url: fullUrl,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    expectedStatus: method === "POST" ? 201 : 200,
    maxResponseTime: 5000,
    category: "Functional",
    description: `Verify ${method} ${path} returns expected status with valid request`,
  });

  // Error handling tests
  tests.push({
    name: `${method} ${path} - Missing Accept header`,
    method,
    url: fullUrl,
    headers: { "Content-Type": "application/json" },
    expectedStatus: 200,
    maxResponseTime: 5000,
    category: "Error Handling",
    description: "Test behavior when Accept header is missing",
  });

  if (method !== "GET" && method !== "HEAD") {
    tests.push({
      name: `${method} ${path} - Empty body`,
      method,
      url: fullUrl,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: "{}",
      expectedStatus: 400,
      maxResponseTime: 5000,
      category: "Error Handling",
      description: "Verify proper error response when request body is empty",
    });

    tests.push({
      name: `${method} ${path} - Invalid JSON body`,
      method,
      url: fullUrl,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: "{invalid json}",
      expectedStatus: 400,
      maxResponseTime: 5000,
      category: "Error Handling",
      description: "Verify proper error response for malformed JSON",
    });
  }

  // Security tests
  tests.push({
    name: `${method} ${path} - No auth header`,
    method,
    url: fullUrl,
    headers: { "Content-Type": "application/json" },
    expectedStatus: 401,
    maxResponseTime: 5000,
    category: "Security",
    description: "Verify endpoint requires authentication",
  });

  tests.push({
    name: `${method} ${path} - Invalid auth token`,
    method,
    url: fullUrl,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer invalid-token-12345",
    },
    expectedStatus: 401,
    maxResponseTime: 5000,
    category: "Security",
    description: "Verify endpoint rejects invalid auth tokens",
  });

  // Edge case: wrong method
  const wrongMethod = method === "GET" ? "DELETE" : "GET";
  tests.push({
    name: `${wrongMethod} ${path} - Wrong HTTP method`,
    method: wrongMethod,
    url: fullUrl,
    headers: { "Content-Type": "application/json" },
    expectedStatus: 405,
    maxResponseTime: 5000,
    category: "Edge Cases",
    description: `Verify endpoint returns 405 for unsupported method ${wrongMethod}`,
  });

  // Performance test
  tests.push({
    name: `${method} ${path} - Performance check`,
    method,
    url: fullUrl,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    expectedStatus: method === "POST" ? 201 : 200,
    maxResponseTime: 2000,
    category: "Performance",
    description: "Verify response time is within acceptable bounds (< 2s)",
  });

  return {
    planName: `Test Plan: ${method} ${path}`,
    description: description || `Auto-generated test plan for ${method} ${path} covering functional, error handling, security, edge cases, and performance.`,
    baseUrl,
    tests,
  };
}
