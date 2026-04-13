import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { judgeOutput } from '../src/utils/evaluation/judgeOutput.js';

describe('judgeOutput fallback mode', () => {
  test('returns a normalized heuristic result without an API key', async () => {
    const result = await judgeOutput({
      scenarioText: 'User needs a revenue summary.',
      userPrompt: 'Show revenue for Karnataka in 2024.',
      expectedOutput: 'A summary of Karnataka revenue in 2024.',
      assistantResponse: 'Karnataka revenue for 2024 is summarized here.',
      actualToolCalls: [],
      apiKey: '',
    });

    assert.equal(typeof result.score, 'number');
    assert.equal(typeof result.passed, 'boolean');
    assert.equal(typeof result.rationale, 'string');
    assert.ok(result.score >= 0 && result.score <= 1);
  });
});
