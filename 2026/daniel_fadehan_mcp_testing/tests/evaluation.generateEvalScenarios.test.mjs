import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { __test } from '../src/utils/evaluation/generateEvalScenarios.js';

describe('generateEvalScenarios fallback workflows', () => {
  test('includes helper metric selection as an allowed support step', () => {
    const scenarios = __test.buildFallbackScenarios({
      tools: [
        {
          name: 'select-sales-metric',
          description: 'Select the metric for a report',
          inputSchema: {
            type: 'object',
            properties: {
              metric: { type: 'string' },
            },
          },
        },
        {
          name: 'get-sales-data',
          description: 'Fetch state sales data',
          inputSchema: {
            type: 'object',
            properties: {
              metric: { type: 'string' },
              states: { type: 'array' },
              period: { type: 'string' },
              year: { type: 'string' },
            },
          },
        },
      ],
      count: 6,
    });

    const revenueScenario = scenarios.find((scenario) => scenario.title === 'Fetch revenue data for specific states');
    assert.ok(revenueScenario);
    assert.deepEqual(revenueScenario.allowedToolNames, ['select-sales-metric']);
    assert.equal(revenueScenario.expectedToolCalls[0].toolName, 'select-sales-metric');
    assert.equal(revenueScenario.expectedToolCalls[0].importance, 'optional');
    assert.equal(revenueScenario.generationMetadata.sourceKind, 'heuristic-fallback');
  });
});
