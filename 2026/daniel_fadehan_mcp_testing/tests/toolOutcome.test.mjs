import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { classifyToolOutcome, getToolErrorMessage } from '../src/utils/toolOutcome.js';

describe('toolOutcome utilities', () => {
  test('classifies successful tool result', () => {
    const result = classifyToolOutcome({ content: [{ type: 'text', text: 'ok' }] });
    assert.equal(result.ok, true);
    assert.equal(result.type, 'success');
  });

  test('classifies MCP isError as tool_error', () => {
    const result = classifyToolOutcome({ isError: true, content: [{ type: 'text', text: 'bad args' }] });
    assert.equal(result.ok, false);
    assert.equal(result.type, 'tool_error');
    assert.equal(result.message, 'bad args');
  });

  test('classifies transport error envelope', () => {
    const result = classifyToolOutcome({ error: { message: 'network down' }, content: null });
    assert.equal(result.ok, false);
    assert.equal(result.type, 'transport_error');
    assert.equal(result.message, 'network down');
  });

  test('classifies empty payload as protocol_error', () => {
    const result = classifyToolOutcome({});
    assert.equal(result.ok, false);
    assert.equal(result.type, 'protocol_error');
  });

  test('extracts error message fallback', () => {
    const message = getToolErrorMessage({ isError: true });
    assert.equal(message, 'Tool execution failed');
  });
});
