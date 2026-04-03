import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  __test,
  getWidgetResourceUri,
} from '../src/components/test/mcp-apps/useMcpChatRuntime.js';

describe('useMcpChatRuntime helpers', () => {
  test('getWidgetResourceUri reads tool result UI metadata', () => {
    const uri = getWidgetResourceUri(
      { _meta: { ui: { resourceUri: 'widget://balance-card' } } },
      null,
      true
    );

    assert.equal(uri, 'widget://balance-card');
  });

  test('getWidgetResourceUri falls back to tool definition metadata', () => {
    const uri = getWidgetResourceUri(
      {},
      { _meta: { ui: { resourceUri: 'widget://from-tool-def' } } },
      true
    );

    assert.equal(uri, 'widget://from-tool-def');
  });

  test('getWidgetResourceUri returns null when widgets are disabled', () => {
    const uri = getWidgetResourceUri(
      { _meta: { ui: { resourceUri: 'widget://disabled' } } },
      null,
      false
    );

    assert.equal(uri, null);
  });

  test('appendAssistantTextDelta accumulates narration on the same assistant message', () => {
    const messages = [{
      id: 'assistant_1',
      role: 'assistant',
      parts: [{ id: 'part_1', type: 'text', text: "I'll fetch the operation first." }],
    }];

    const nextMessages = __test.appendAssistantTextDelta(
      messages,
      'assistant_1',
      ' Then I will fetch the balance.'
    );

    assert.equal(nextMessages.length, 1);
    assert.equal(nextMessages[0].parts.length, 1);
    assert.equal(
      nextMessages[0].parts[0].text,
      "I'll fetch the operation first. Then I will fetch the balance."
    );
  });

  test('appendAssistantTextDelta can be driven from provider text stream fields', () => {
    const messages = [{
      id: 'assistant_1',
      role: 'assistant',
      parts: [],
    }];

    const nextMessages = __test.appendAssistantTextDelta(messages, 'assistant_1', "I'll get the weather forecast for you.");

    assert.equal(nextMessages[0].parts[0].text, "I'll get the weather forecast for you.");
  });

  test('appendAssistantToolPart attaches a tool call to the active assistant message', () => {
    const messages = [{
      id: 'assistant_1',
      role: 'assistant',
      parts: [{ id: 'text_1', type: 'text', text: "I'll fetch the operation first." }],
    }];

    const nextMessages = __test.appendAssistantToolPart(messages, 'assistant_1', {
      name: 'get_operation',
      toolName: 'get_operation',
      args: { account_id: 'acct_123' },
      callId: 'call_1',
    });

    assert.equal(nextMessages.length, 1);
    assert.equal(nextMessages[0].parts.length, 2);
    assert.equal(nextMessages[0].parts[1].type, 'tool');
    assert.equal(nextMessages[0].parts[1].toolCall.toolName, 'get_operation');
  });

  test('updateAssistantToolPart updates an existing tool result without creating a new message', () => {
    const messages = [{
      id: 'assistant_1',
      role: 'assistant',
      parts: [
        { id: 'text_1', type: 'text', text: "I'll fetch the operation first." },
        {
          id: 'tool_1',
          type: 'tool',
          toolCall: {
            callId: 'call_1',
            toolName: 'get_operation',
            args: { account_id: 'acct_123' },
            status: 'running',
          },
        },
      ],
    }];

    const nextMessages = __test.updateAssistantToolPart(messages, 'assistant_1', 'call_1', {
      status: 'completed',
      summary: 'Found the operation.',
      result: { structuredContent: { operationId: 'op_123' } },
    });

    assert.equal(nextMessages.length, 1);
    assert.equal(nextMessages[0].parts[1].toolCall.status, 'completed');
    assert.equal(nextMessages[0].parts[1].toolCall.summary, 'Found the operation.');
  });

  test('appendAssistantWidgetPart inserts the widget after its tool part', () => {
    const messages = [{
      id: 'assistant_1',
      role: 'assistant',
      parts: [
        { id: 'text_1', type: 'text', text: "I'll open the app." },
        {
          id: 'tool_1',
          type: 'tool',
          toolCall: {
            callId: 'call_1',
            toolName: 'open_widget',
            args: {},
            status: 'completed',
          },
        },
      ],
    }];

    const nextMessages = __test.appendAssistantWidgetPart(messages, 'assistant_1', 'call_1', 'widget_1');

    assert.equal(nextMessages[0].parts[2].type, 'widget');
    assert.equal(nextMessages[0].parts[2].widgetId, 'widget_1');
  });

  test('assistantMessageHasWidgetPart recognizes widget-backed assistant turns', () => {
    const message = {
      id: 'assistant_1',
      role: 'assistant',
      parts: [
        { id: 'text_1', type: 'text', text: 'Opening the app now.' },
        { id: 'widget_1', type: 'widget', toolCallId: 'call_1', widgetId: 'widget_1' },
      ],
    };

    assert.equal(__test.assistantMessageHasWidgetPart(message), true);
  });

  test('getAssistantMessageText joins streamed text parts for fallback detection', () => {
    const message = {
      id: 'assistant_1',
      role: 'assistant',
      parts: [
        { id: 'text_1', type: 'text', text: "I'll fetch the forecast first. " },
        {
          id: 'tool_1',
          type: 'tool',
          toolCall: {
            callId: 'call_1',
            toolName: 'get_forecast',
            args: {},
            status: 'completed',
          },
        },
        { id: 'text_2', type: 'text', text: 'It looks sunny today.' },
      ],
    };

    assert.equal(
      __test.getAssistantMessageText(message),
      "I'll fetch the forecast first. It looks sunny today."
    );
  });

  test('rebuildAssistantPartsFromSteps places narration before and after tool parts using SDK step order', () => {
    const message = {
      id: 'assistant_1',
      role: 'assistant',
      parts: [
        {
          id: 'tool_1',
          type: 'tool',
          toolCall: {
            callId: 'call_1',
            toolName: 'get_forecast',
            args: {},
            status: 'completed',
          },
        },
      ],
    };

    const rebuilt = __test.rebuildAssistantPartsFromSteps(message, [
      {
        text: "I'll get the weather forecast for you.",
        toolCalls: [{ toolCallId: 'call_1', toolName: 'get_forecast', args: {} }],
      },
      {
        text: 'The weather is mild and clear.',
        toolCalls: [],
      },
    ]);

    assert.deepEqual(
      rebuilt.parts.map((part) => part.type),
      ['text', 'tool', 'text']
    );
    assert.equal(rebuilt.parts[0].text, "I'll get the weather forecast for you.");
    assert.equal(rebuilt.parts[2].text, 'The weather is mild and clear.');
  });

  test('summarizeToolResult uses structured payload summary for app results', () => {
    const summary = __test.summarizeToolResult({
      structuredContent: {
        selections: { metric: 'revenue' },
        report: { total: '1000' },
      },
      _meta: { ui: { resourceUri: 'ui://sample-mcp-app' } },
    });

    assert.match(summary, /Returned 2 fields/);
  });
});
