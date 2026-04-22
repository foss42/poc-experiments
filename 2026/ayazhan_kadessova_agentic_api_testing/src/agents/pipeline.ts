import { callLLM } from "../config/llm.js";
import type { TestCase, TestPlan } from "../utils/test-plan-generator.js";

/**
 * Attempt to parse JSON from LLM output, with repair for common issues.
 */
function safeParseJSON(text: string): unknown {
  // First try direct parse
  try {
    return JSON.parse(text);
  } catch { /* continue to repair */ }

  // Try to extract JSON object or array from the text
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch { /* continue to repair */ }
  }

  // Repair: fix trailing commas before } or ]
  let repaired = text
    .replace(/,\s*([\]}])/g, "$1")
    // Fix unescaped newlines in strings
    .replace(/(?<=": "(?:[^"\\]|\\.)*)[\n\r]+(?=[^"]*")/g, "\\n");

  // Try to extract again after repair
  const repairedMatch = repaired.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (repairedMatch) {
    try {
      return JSON.parse(repairedMatch[1]);
    } catch { /* continue */ }
  }

  // Last resort: truncate at last valid closing bracket
  const lastBrace = repaired.lastIndexOf("}");
  const lastBracket = repaired.lastIndexOf("]");
  const cutoff = Math.max(lastBrace, lastBracket);
  if (cutoff > 0) {
    const truncated = repaired.slice(0, cutoff + 1);
    try {
      return JSON.parse(truncated);
    } catch { /* give up */ }
  }

  throw new Error(`Failed to parse JSON from LLM output (${text.length} chars)`);
}

export interface PipelineMetadata {
  generatorCount: number;
  criticApproved: number;
  reducerFinal: number;
  agentsUsed: string[];
}

export interface PipelineResult {
  plan: TestPlan;
  metadata: PipelineMetadata;
}

// ─── Generator Agent ─────────────────────────────────────────────────────────
// Produces a broad set of test cases covering multiple categories.

async function generateTests(
  baseUrl: string,
  method: string,
  path: string,
  description?: string,
): Promise<TestCase[]> {
  const fullUrl = baseUrl.replace(/\/$/, "") + path;

  const systemPrompt = `You are an API test strategist. Generate exactly 8 test cases as JSON.

Each test object has these fields:
{"name":"string","method":"string","url":"string","headers":{"Content-Type":"application/json"},"body":"optional json string","expectedStatus":200,"maxResponseTime":5000,"category":"string","description":"string"}

Categories: Functional, Error Handling, Security, Edge Cases, Performance.
Generate 2 Functional, 2 Error Handling, 1 Security, 2 Edge Cases, 1 Performance test.
Keep body values short and simple. No special characters in strings.

Respond with ONLY: {"tests":[...8 test objects...]}`;

  const userPrompt = `Generate tests for:
- Method: ${method}
- URL: ${fullUrl}
- Base URL: ${baseUrl}
- Path: ${path}
${description ? `- Description: ${description}` : ""}`;

  const response = await callLLM(systemPrompt, userPrompt);
  console.log("[Generator] Raw response preview:", response.slice(0, 500));
  const parsed = safeParseJSON(response) as Record<string, unknown>;
  const tests = (parsed.tests || parsed) as Record<string, unknown>[];

  if (!Array.isArray(tests) || tests.length === 0) {
    throw new Error("Generator produced no tests");
  }

  // Ensure each test has required fields with defaults
  return tests.map((t: Record<string, unknown>) => ({
    name: String(t.name || "Untitled Test"),
    method: String(t.method || method),
    url: String(t.url || fullUrl),
    headers: (t.headers as Record<string, string>) || { "Content-Type": "application/json" },
    body: t.body ? String(t.body) : undefined,
    expectedStatus: Number(t.expectedStatus || 200),
    maxResponseTime: Number(t.maxResponseTime || 5000),
    category: String(t.category || "Functional"),
    description: String(t.description || ""),
  }));
}

// ─── Critic Agent ────────────────────────────────────────────────────────────
// Reviews test plan for validity, flags redundant or impossible tests.

interface CriticResult {
  approved: TestCase[];
  removed: string[];
  feedback: string;
}

async function critiqueTests(
  tests: TestCase[],
  method: string,
  path: string,
): Promise<CriticResult> {
  const systemPrompt = `You are an API test plan reviewer. Review the provided test cases for quality and validity.

Your job:
1. Flag tests with impossible assertions (e.g., expecting 401 on a public endpoint)
2. Identify redundant tests that overlap significantly
3. Check that all important categories are covered
4. Verify expected status codes are reasonable

Return JSON: {
  "approved": [array of test indices that pass review, e.g. [0, 1, 3, 5]],
  "removed": [array of strings explaining why each removed test was cut],
  "feedback": "overall feedback string"
}`;

  const userPrompt = `Review this test plan for ${method} ${path}:

${JSON.stringify(tests, null, 2)}`;

  const response = await callLLM(systemPrompt, userPrompt);
  const parsed = safeParseJSON(response) as Record<string, unknown>;

  const approvedIndices: number[] = (parsed.approved || []) as number[];
  const approved = approvedIndices
    .filter((i) => i >= 0 && i < tests.length)
    .map((i) => tests[i]);

  // If critic approves nothing or errors, keep all tests
  if (approved.length === 0) {
    return { approved: tests, removed: [], feedback: "Critic approved all tests (fallback)" };
  }

  return {
    approved,
    removed: parsed.removed || [],
    feedback: parsed.feedback || "",
  };
}

// ─── Reducer Agent ───────────────────────────────────────────────────────────
// Minimizes the test plan while maintaining coverage.

async function reduceTests(
  tests: TestCase[],
  feedback: string,
): Promise<TestCase[]> {
  const systemPrompt = `You are a test plan optimizer following the "less is more" philosophy. Given a set of approved tests and reviewer feedback, produce a minimal but comprehensive test plan.

Your job:
1. Remove redundant tests that overlap in what they verify
2. Merge similar tests where possible
3. Ensure at least one test per category remains
4. Keep the total count between 5-10 tests for a single endpoint

Return JSON: {"tests": [array of optimized test objects with same fields as input]}`;

  const userPrompt = `Optimize this test plan:

Tests:
${JSON.stringify(tests, null, 2)}

Reviewer feedback: ${feedback}`;

  const response = await callLLM(systemPrompt, userPrompt);
  const parsed = safeParseJSON(response) as Record<string, unknown>;
  const reduced = (parsed.tests || parsed) as Record<string, unknown>[];

  if (!Array.isArray(reduced) || reduced.length === 0) {
    return tests; // Fallback: keep critic's output
  }

  return reduced.map((t: Record<string, unknown>) => ({
    name: String(t.name || "Untitled Test"),
    method: String(t.method || "GET"),
    url: String(t.url || ""),
    headers: (t.headers as Record<string, string>) || { "Content-Type": "application/json" },
    body: t.body ? String(t.body) : undefined,
    expectedStatus: Number(t.expectedStatus || 200),
    maxResponseTime: Number(t.maxResponseTime || 5000),
    category: String(t.category || "Functional"),
    description: String(t.description || ""),
  }));
}

// ─── Pipeline Orchestrator ───────────────────────────────────────────────────
// Runs Generator -> Critic -> Reducer sequentially with fallback at each stage.

export async function runAgentPipeline(
  baseUrl: string,
  method: string,
  path: string,
  description?: string,
): Promise<PipelineResult> {
  const agentsUsed: string[] = [];

  // Stage 1: Generator
  console.log("[Pipeline] Running Generator agent...");
  const generated = await generateTests(baseUrl, method, path, description);
  agentsUsed.push("Generator");
  console.log(`[Pipeline] Generator produced ${generated.length} tests`);

  // Stage 2: Critic (with fallback to Generator output)
  let criticResult: CriticResult;
  try {
    console.log("[Pipeline] Running Critic agent...");
    criticResult = await critiqueTests(generated, method, path);
    agentsUsed.push("Critic");
    console.log(
      `[Pipeline] Critic approved ${criticResult.approved.length}/${generated.length} tests`,
    );
  } catch (error) {
    console.warn("[Pipeline] Critic failed, using Generator output:", error);
    criticResult = { approved: generated, removed: [], feedback: "Critic skipped (error)" };
  }

  // Stage 3: Reducer (with fallback to Critic output)
  let finalTests: TestCase[];
  try {
    console.log("[Pipeline] Running Reducer agent...");
    finalTests = await reduceTests(criticResult.approved, criticResult.feedback);
    agentsUsed.push("Reducer");
    console.log(`[Pipeline] Reducer produced ${finalTests.length} tests`);
  } catch (error) {
    console.warn("[Pipeline] Reducer failed, using Critic output:", error);
    finalTests = criticResult.approved;
  }

  const plan: TestPlan = {
    planName: `Test Plan: ${method} ${path}`,
    description:
      description ||
      `AI-generated test plan for ${method} ${path} via ${agentsUsed.join(" → ")} pipeline`,
    baseUrl,
    tests: finalTests,
  };

  return {
    plan,
    metadata: {
      generatorCount: generated.length,
      criticApproved: criticResult.approved.length,
      reducerFinal: finalTests.length,
      agentsUsed,
    },
  };
}
