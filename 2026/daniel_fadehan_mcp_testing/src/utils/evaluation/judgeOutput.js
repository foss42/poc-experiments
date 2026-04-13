import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { clamp } from './helpers.js';

const judgeSchema = z.object({
  score: z.number().min(0).max(1),
  passed: z.boolean(),
  rationale: z.string().min(4),
});

function heuristicJudge({ expectedOutput = '', assistantResponse = '' }) {
  const normalizedExpected = expectedOutput.toLowerCase();
  const normalizedResponse = assistantResponse.toLowerCase();

  if (!normalizedResponse.trim()) {
    return {
      score: 0,
      passed: false,
      rationale: 'The assistant did not produce a final response.',
    };
  }

  const expectedWords = normalizedExpected
    .split(/\s+/)
    .filter((word) => word.length > 4);

  if (expectedWords.length === 0) {
    return {
      score: 0.75,
      passed: true,
      rationale: 'No structured expected output was provided, so the response was accepted heuristically.',
    };
  }

  const matchedWords = expectedWords.filter((word) => normalizedResponse.includes(word));
  const score = clamp(matchedWords.length / expectedWords.length);

  return {
    score,
    passed: score >= 0.5,
    rationale: score >= 0.5
      ? 'The response covers enough of the expected output language.'
      : 'The response only weakly matches the expected output description.',
  };
}

export async function judgeOutput({
  scenarioText = '',
  userPrompt = '',
  expectedOutput = '',
  assistantResponse = '',
  actualToolCalls = [],
  apiKey,
}) {
  if (!apiKey) {
    return heuristicJudge({ expectedOutput, assistantResponse });
  }

  const google = createGoogleGenerativeAI({ apiKey });

  try {
    const result = await generateObject({
      model: google('gemini-2.5-flash'),
      temperature: 0.2,
      schema: judgeSchema,
      system: `You judge whether an MCP agent's final user-facing response matches the intended scenario outcome.

Score from 0 to 1.
- Reward responses that satisfy the scenario.
- Consider the actual tool path summary as supporting context.
- A concise but correct answer can still pass.
- If the output is clearly wrong, missing, or ignores the request, fail it.`,
      prompt: `Scenario:
${scenarioText}

User prompt:
${userPrompt}

Expected output:
${expectedOutput}

Final assistant response:
${assistantResponse}

Actual tool call summary:
${JSON.stringify(actualToolCalls.map((call) => ({
        toolName: call.toolName,
        status: call.status,
        args: call.args,
      })), null, 2)}`,
    });

    return {
      score: clamp(result.object.score),
      passed: result.object.passed,
      rationale: result.object.rationale,
    };
  } catch (error) {
    console.warn('Falling back to heuristic output judge:', error);
    return heuristicJudge({ expectedOutput, assistantResponse });
  }
}
