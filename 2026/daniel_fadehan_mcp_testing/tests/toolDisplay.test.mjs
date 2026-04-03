import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { formatModelContextDisplay, formatToolDisplay } from '../src/utils/toolDisplay.js';

describe('toolDisplay', () => {
  test('prefers structured content for visible output', () => {
    const display = formatToolDisplay({
      args: { city: 'Lagos' },
      result: {
        content: [{ type: 'text', text: '{"fallback":true}' }],
        structuredContent: { forecast: 'rain' },
        _meta: { _serverId: 'test' },
      },
    });

    assert.deepEqual(display.toolInputDisplay.value, { city: 'Lagos' });
    assert.deepEqual(display.toolResultDisplay.value, { forecast: 'rain' });
    assert.equal(display.toolResultDisplay.label, 'Structured result');
  });

  test('parses JSON text when structured content is absent', () => {
    const display = formatToolDisplay({
      result: {
        content: [{ type: 'text', text: '{"balance":4200,"currency":"NGN"}' }],
      },
    });

    assert.deepEqual(display.toolResultDisplay.value, { balance: 4200, currency: 'NGN' });
    assert.equal(display.toolResultDisplay.kind, 'json');
  });

  test('recognizes MCP app-backed tool results', () => {
    const display = formatToolDisplay({
      result: {
        structuredContent: { metric: 'revenue' },
        _meta: { ui: { resourceUri: 'ui://sample-mcp-app' }, _serverId: 'builder' },
      },
    });

    assert.equal(display.isMcpAppResult, true);
    assert.equal(display.uiResourceUri, 'ui://sample-mcp-app');
    assert.equal(display.rawResult._meta._serverId, 'builder');
  });

  test('keeps model context separate from tool result formatting', () => {
    const context = formatModelContextDisplay({
      structuredContent: { selectedAccount: 'acct_123' },
    });

    assert.deepEqual(context.value, { selectedAccount: 'acct_123' });
    assert.equal(context.label, 'Structured model context');
  });
});
