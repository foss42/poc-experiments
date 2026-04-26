// Sends the parsed endpoints to GPT-3.5-turbo and gets back structured
// test cases. The system prompt does the heavy lifting — it tells the model
// to think about coverage gaps before writing anything.

import type { Endpoint } from "./spec-parser.js";

export interface TestCase {
  endpoint: string;
  method: string;
  description: string;
  input: Record<string, unknown>;
  expected_status: number;
  expected_keys: string[];
}

const SYSTEM_PROMPT = `You are an expert API test engineer. Given a list of API endpoints you MUST output ONLY a valid JSON array of test case objects — no markdown, no explanation, no extra text.

Each test case object must have exactly these fields:
{
  "endpoint": "<path string>",
  "method":   "<HTTP method uppercase>",
  "description": "<what this test verifies>",
  "input": { /* request body or query params — empty object if none */ },
  "expected_status": <integer HTTP status code>,
  "expected_keys": ["<key1>", "<key2>"]
}

For every endpoint generate AT LEAST these scenarios where applicable:
1. Happy path — valid input, expected success status (200 / 201).
2. Missing required field — omit one required body field, expect 400.
3. Invalid type — pass wrong type for a required field, expect 400 or 422.

Respond with ONLY the JSON array. No prose.`;

export async function generateTests(endpoints: Endpoint[]): Promise<TestCase[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set — add it to .env and restart");
  }

  if (endpoints.length === 0) return [];

  // Slim down what we send to the model — no need to pass the full endpoint
  // objects, just the bits the model actually needs to write test cases
  const endpointSummary = endpoints.map((e) => ({
    path: e.path,
    method: e.method,
    parameters: e.parameters.map((p) => ({
      name: p.name,
      in: p.in,
      required: p.required,
      type: (p.schema as { type?: string } | undefined)?.type,
    })),
    requestBody: e.requestBody
      ? {
          required: e.requestBody.required,
          requiredFields: e.requestBody.requiredFields,
          properties: Object.entries(e.requestBody.properties).reduce<
            Record<string, unknown>
          >((acc, [k, v]) => {
            acc[k] = { type: (v as { type?: string } | undefined)?.type };
            return acc;
          }, {}),
        }
      : null,
    responseCodes: e.responseCodes,
  }));

  const userMessage =
    `Here are the API endpoints:\n\n${JSON.stringify(endpointSummary, null, 2)}` +
    `\n\nGenerate test cases covering happy path, missing required fields, and invalid input types.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      temperature: 0.2, // keep output consistent across runs
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI error ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const raw = data.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error("OpenAI returned an empty response");

  // The model occasionally wraps output in ```json fences despite instructions
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Model output wasn't valid JSON:\n${raw}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Expected a JSON array, got ${typeof parsed}`);
  }

  // Drop any entries that don't match the shape we need
  const testCases: TestCase[] = [];
  for (const item of parsed) {
    const tc = item as Partial<TestCase>;
    if (
      typeof tc.endpoint === "string" &&
      typeof tc.method === "string" &&
      typeof tc.description === "string" &&
      typeof tc.input === "object" &&
      tc.input !== null &&
      typeof tc.expected_status === "number" &&
      Array.isArray(tc.expected_keys)
    ) {
      testCases.push(tc as TestCase);
    }
  }

  if (testCases.length === 0) {
    throw new Error("Model returned valid JSON but none of the entries matched the TestCase shape");
  }

  return testCases;
}
