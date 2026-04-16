export interface TestRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export interface TestResponse {
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  responseTime: number;
}

export interface AssertionResult {
  name: string;
  passed: boolean;
  detail?: string;
}

export interface TestResult extends TestResponse {
  assertions: AssertionResult[];
  passed: boolean;
}

export async function executeRequest(req: TestRequest): Promise<TestResponse> {
  const start = performance.now();

  const fetchOptions: RequestInit = {
    method: req.method,
    headers: req.headers,
  };

  if (req.body && !["GET", "HEAD"].includes(req.method.toUpperCase())) {
    fetchOptions.body = req.body;
  }

  const response = await fetch(req.url, fetchOptions);
  const responseTime = Math.round(performance.now() - start);

  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  let body: unknown;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }
  } else {
    body = await response.text();
  }

  return {
    statusCode: response.status,
    statusText: response.statusText,
    headers,
    body,
    responseTime,
  };
}

export function runAssertions(
  response: TestResponse,
  expectedStatus: number,
  maxResponseTime: number,
): AssertionResult[] {
  const assertions: AssertionResult[] = [];

  // Status code assertion
  assertions.push({
    name: `Status code is ${expectedStatus}`,
    passed: response.statusCode === expectedStatus,
    detail: response.statusCode !== expectedStatus
      ? `Got ${response.statusCode}`
      : undefined,
  });

  // Response time assertion
  assertions.push({
    name: `Response time < ${maxResponseTime}ms`,
    passed: response.responseTime < maxResponseTime,
    detail: response.responseTime >= maxResponseTime
      ? `Took ${response.responseTime}ms`
      : undefined,
  });

  // Response has body
  assertions.push({
    name: "Response has body",
    passed: response.body !== null && response.body !== undefined && response.body !== "",
  });

  // JSON validity (if content-type suggests JSON)
  if (typeof response.body === "object" && response.body !== null) {
    assertions.push({
      name: "Response is valid JSON",
      passed: true,
    });
  }

  // No server error
  assertions.push({
    name: "No server error (5xx)",
    passed: response.statusCode < 500,
    detail: response.statusCode >= 500
      ? `Server returned ${response.statusCode}`
      : undefined,
  });

  return assertions;
}
