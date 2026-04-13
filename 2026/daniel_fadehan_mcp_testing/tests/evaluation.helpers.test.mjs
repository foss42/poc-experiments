import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEvaluationScopeKey,
  buildToolSnapshotHash,
} from '../src/utils/evaluation/helpers.js';

describe('evaluation helpers', () => {
  test('normalizes external scope keys by URL', () => {
    const scopeKey = buildEvaluationScopeKey({
      testMode: 'external',
      serverUrl: 'http://localhost:3000/mcp/',
    });

    assert.equal(scopeKey, 'external::http://localhost:3000/mcp');
  });

  test('hashes the same tool snapshot deterministically', () => {
    const snapshotA = buildToolSnapshotHash({
      serverInfo: { name: 'Sample', version: '1.0.0', protocolVersion: '2024-11-05' },
      tools: [
        {
          name: 'get-sales-data',
          description: 'Fetch sales data',
          inputSchema: { type: 'object', properties: { metric: { type: 'string' } } },
          _meta: { ui: { resourceUri: 'ui://sales' } },
        },
      ],
      resources: [],
      prompts: [],
    });
    const snapshotB = buildToolSnapshotHash({
      serverInfo: { protocolVersion: '2024-11-05', version: '1.0.0', name: 'Sample' },
      tools: [
        {
          description: 'Fetch sales data',
          name: 'get-sales-data',
          inputSchema: { properties: { metric: { type: 'string' } }, type: 'object' },
          _meta: { ui: { resourceUri: 'ui://sales' } },
        },
      ],
      resources: [],
      prompts: [],
    });

    assert.equal(snapshotA, snapshotB);
  });
});
