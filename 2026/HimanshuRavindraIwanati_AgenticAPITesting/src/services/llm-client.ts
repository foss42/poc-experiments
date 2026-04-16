import Anthropic from "@anthropic-ai/sdk";
import type { ApiEndpoint, ApiTestCase, TestType } from "../types.js";

const client = new Anthropic();

// ─── Prompt Architecture (Optimisation 9.1: Stable-Prefix Caching) ──────────
// The spec context is the stable prefix; the per-endpoint task is volatile.

function buildSpecPrefix(endpoints: ApiEndpoint[]): string {
  return `You are an expert API test engineer. Your job is to generate precise, 
executable API test cases based on the provided API specification.

API SPECIFICATION:
${JSON.stringify(endpoints, null, 2)}

RULES:
- Return ONLY valid JSON. No markdown, no explanation, no backticks.
- Each test case must reference only paths and methods that exist in the spec above.
- assertions must use only these operators: equals, exists, type_is, gte, lte, contains
- id must be unique, format: tc_XXX (e.g. tc_001)
- priority: "high" | "medium" | "low"
- type: "happy_path" | "boundary_value" | "error_injection" | "security_probe"`;
}

function buildTaskPrompt(
  endpoint: ApiEndpoint,
  testTypes: TestType[]
): string {
  return `Generate ${testTypes.join(", ")} test cases for:
Method: ${endpoint.method}
Path: ${endpoint.path}
Summary: ${endpoint.summary}
Parameters: ${JSON.stringify(endpoint.parameters)}
Responses: ${JSON.stringify(endpoint.responses)}

Return a JSON array of APITestCase objects with this exact shape:
{
  "id": "tc_001",
  "name": "string",
  "type": "happy_path",
  "priority": "high",
  "endpoint": "${endpoint.method} ${endpoint.path}",
  "method": "${endpoint.method}",
  "path": "${endpoint.path}",
  "pathParams": {},
  "queryParams": {},
  "requestBody": null,
  "assertions": [
    { "field": "response.status", "operator": "equals", "expected": 200 }
  ],
  "description": "string",
  "enabled": true
}`;
}

// ─── Main Generation Function ────────────────────────────────────────────────

export async function generateTestsForEndpoints(
  endpoints: ApiEndpoint[]
): Promise<ApiTestCase[]> {
  const specPrefix = buildSpecPrefix(endpoints);
  const allTests: ApiTestCase[] = [];
  let counter = 1;

  for (const endpoint of endpoints) {
    // Model routing (Optimisation 9.2): security probes → more capable reasoning
    const testTypes: TestType[] =
      endpoint.method === "GET"
        ? ["happy_path", "error_injection"]
        : ["happy_path", "boundary_value"];

    const taskPrompt = buildTaskPrompt(endpoint, testTypes);

    try {
      const response = await client.messages.create({
        model: "claude-haiku-4-5",        // fast model — sufficient for structured extraction
        max_tokens: 1500,
        system: specPrefix,               // stable prefix (cache-eligible)
        messages: [{ role: "user", content: taskPrompt }],
      });

      const raw = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("");

      // Strip any accidental markdown fences
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned) as ApiTestCase[];

      // Deterministic normalisation (Optimisation 9.3)
      const normalised = parsed.map((tc) => ({
        ...tc,
        id: `tc_${String(counter++).padStart(3, "0")}`,
        enabled: true,
      }));

      allTests.push(...normalised);
    } catch (err) {
      console.error(`LLM generation failed for ${endpoint.method} ${endpoint.path}:`, err);
      // Rule-based fallback (Section 4.7.2)
      allTests.push(buildFallbackTest(endpoint, counter++));
    }
  }

  return allTests;
}

// ─── Rule-Based Fallback ─────────────────────────────────────────────────────

function pickSuccessStatus(endpoint: ApiEndpoint): number {
  const responseCodes = Object.keys(endpoint.responses)
    .filter((code) => /^\d+$/.test(code))
    .map((code) => Number(code))
    .filter((code) => Number.isInteger(code));

  const successCodes = responseCodes
    .filter((code) => code >= 200 && code < 300)
    .sort((a, b) => a - b);

  if (successCodes.length > 0) {
    return successCodes[0];
  }

  // Sensible default when spec has only "default" response.
  return 200;
}

function parameterExample(endpoint: ApiEndpoint, name: string): string | number {
  const param = endpoint.parameters.find((p) => p.name === name);
  if (!param) return 1;

  if (param.schema.example !== undefined) {
    return param.schema.example as string | number;
  }

  if (param.schema.type === "string") {
    if (name.toLowerCase().includes("status")) return "available";
    return "sample";
  }

  return 1;
}

function buildSafeRequestBody(endpoint: ApiEndpoint): Record<string, unknown> | undefined {
  const example = endpoint.requestBody?.example;
  if (!example) return undefined;

  const body: Record<string, unknown> = { ...example };

  // Keep mutable resources unique to reduce conflicts on public Petstore backend.
  if (endpoint.path === "/user") {
    body.username = `testuser_${Date.now()}`;
  }

  if (endpoint.path === "/store/order") {
    body.id = 10;
    body.petId = 1;
    body.quantity = 1;
    body.status = "placed";
    body.complete = false;
  }

  if (endpoint.path === "/pet") {
    body.id = 1;
    body.status = body.status ?? "available";
  }

  return body;
}

function buildFallbackTest(endpoint: ApiEndpoint, counter: number): ApiTestCase {
  const successCode = pickSuccessStatus(endpoint);

  const pathParams = endpoint.parameters
    .filter((p) => p.in === "path")
    .reduce<Record<string, string | number>>((acc, p) => {
      acc[p.name] = parameterExample(endpoint, p.name);
      return acc;
    }, {});

  const queryParams = endpoint.parameters
    .filter((p) => p.in === "query")
    .reduce<Record<string, string | number>>((acc, p) => {
      acc[p.name] = parameterExample(endpoint, p.name);
      return acc;
    }, {});

  return {
    id: `tc_${String(counter).padStart(3, "0")}`,
    name: `[Fallback] ${endpoint.method} ${endpoint.path} — status check`,
    type: "happy_path",
    priority: "medium",
    endpoint: `${endpoint.method} ${endpoint.path}`,
    method: endpoint.method,
    path: endpoint.path,
    pathParams,
    queryParams,
    requestBody: buildSafeRequestBody(endpoint),
    assertions: [
      { field: "response.status", operator: "equals", expected: successCode },
    ],
    description: `Auto-generated fallback test for ${endpoint.method} ${endpoint.path}`,
    enabled: true,
  };
}

// ─── Healing Patch Reasoning ─────────────────────────────────────────────────

export async function generateHealingReasoning(
  field: string,
  originalType: string,
  newType: string,
  endpoint: string
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `In one sentence, explain why a REST API field '${field}' on endpoint '${endpoint}' 
might intentionally change its type from '${originalType}' to '${newType}'. 
Be specific and technical. No preamble.`,
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("")
    .trim();

  return text;
}
