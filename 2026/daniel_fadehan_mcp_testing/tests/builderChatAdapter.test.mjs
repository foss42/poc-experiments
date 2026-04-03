import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createBuilderChatAdapter, normalizeBuilderExecutionResult } from '../src/utils/builderChatAdapter.js';

const successTool = {
  name: 'echo_tool',
  originalTool: {
    nodes: [
      { id: 'input', type: 'input', data: { parameters: [{ name: 'name', type: 'string', required: true }] } },
      { id: 'output', type: 'output', data: { returnPath: 'data' } },
    ],
    edges: [
      { id: 'input-output', source: 'input', target: 'output' },
    ],
  },
};

describe('builderChatAdapter', () => {
  test('normalizeBuilderExecutionResult produces MCP-like success payloads', () => {
    const result = normalizeBuilderExecutionResult({
      success: true,
      data: { greeting: 'hello' },
      steps: [],
    }, 12);

    assert.equal(result.isError, false);
    assert.deepEqual(result.structuredContent, { greeting: 'hello' });
    assert.equal(result.responseTime, 12);
  });

  test('adapter executes builder workflows and returns structured content', async () => {
    const adapter = createBuilderChatAdapter([successTool]);
    const result = await adapter.callTool('echo_tool', { name: 'Forge' });

    assert.equal(result.isError, false);
    assert.deepEqual(result.structuredContent, { name: 'Forge' });
  });

  test('adapter returns error envelope when tool is missing', async () => {
    const adapter = createBuilderChatAdapter([]);
    const result = await adapter.callTool('missing_tool', {});

    assert.equal(result.isError, true);
    assert.match(result.error.message, /missing_tool/);
  });

  test('builder adapter does not support widget resource reads', async () => {
    const adapter = createBuilderChatAdapter([successTool]);
    const result = await adapter.readResource('widget://builder-preview');

    assert.equal(result.isError, true);
    assert.equal(result.contents.length, 0);
  });
});
