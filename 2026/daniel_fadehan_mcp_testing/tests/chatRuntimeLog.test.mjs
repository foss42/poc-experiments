import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createChatLogEntry, getLogSourceLabel } from '../src/utils/chatRuntimeLog.js';

describe('chatRuntimeLog', () => {
  test('createChatLogEntry shapes runtime logs consistently', () => {
    const entry = createChatLogEntry({
      dir: '->',
      type: 'tools/call',
      source: 'paystack',
      status: 'info',
      at: '2026-04-03T10:00:00.000Z',
    });

    assert.equal(entry.dir, '->');
    assert.equal(entry.type, 'tools/call');
    assert.equal(entry.source, 'paystack');
    assert.equal(entry.status, 'info');
    assert.equal(entry.at, '2026-04-03T10:00:00.000Z');
    assert.ok(entry.id);
  });

  test('getLogSourceLabel derives stable labels from urls', () => {
    assert.equal(getLogSourceLabel('http://localhost:8080/mcp'), 'localhost:8080');
    assert.equal(getLogSourceLabel('https://api.example.com/mcp'), 'api.example.com');
    assert.equal(getLogSourceLabel('not-a-url', 'fallback'), 'fallback');
  });
});
