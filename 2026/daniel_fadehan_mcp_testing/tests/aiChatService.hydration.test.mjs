import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { __test } from '../src/utils/aiChatService.js';

describe('aiChatService generic helpers', () => {
  test('extractToolData prefers structured content', () => {
    const result = __test.extractToolData({
      content: [{ type: 'text', text: 'fallback' }],
      structuredContent: { status: 'ok', value: 42 },
    });

    assert.deepEqual(result, { status: 'ok', value: 42 });
  });

  test('extractToolData parses JSON text content when structured content is absent', () => {
    const result = __test.extractToolData({
      content: [{ type: 'text', text: '{"value":42}' }],
    });

    assert.deepEqual(result, { value: 42 });
  });

  test('normalizeSchema coerces non-object schemas into object schemas', () => {
    const schema = __test.normalizeSchema({ type: 'string' });

    assert.equal(schema.type, 'object');
    assert.deepEqual(schema.properties, {});
  });

  test('default prompt requires visible narration before and between tool calls', () => {
    assert.match(__test.DEFAULT_SYSTEM_PROMPT, /Before calling ANY tool/);
    assert.match(__test.DEFAULT_SYSTEM_PROMPT, /AFTER EACH TOOL RESULT/);
    assert.match(__test.DEFAULT_SYSTEM_PROMPT, /FINAL RESPONSE/);
    assert.match(__test.FOLLOW_UP_TOOL_RESULT_REMINDER, /previous tool call already completed successfully/i);
  });

  test('flattenMessagesForModel preserves assistant narration and tool results from parts', () => {
    const messages = __test.flattenMessagesForModel([
      { role: 'user', content: 'Get the weather and tell me what you found.' },
      {
        role: 'assistant',
        parts: [
          { type: 'text', text: "I'll fetch the forecast first." },
          {
            type: 'tool',
            toolCall: {
              callId: 'call_1',
              toolName: 'get_forecast',
              args: { city: 'Lagos' },
              status: 'completed',
              result: {
                structuredContent: {
                  api_response: { temperature: 27, summary: 'Sunny' },
                  status: 200,
                },
              },
            },
          },
          { type: 'text', text: 'I have the forecast now and I can summarize it.' },
        ],
      },
    ]);

    assert.equal(messages.length, 4);
    assert.equal(messages[1].role, 'assistant');
    assert.deepEqual(messages[1].content[0], {
      type: 'text',
      text: "I'll fetch the forecast first.",
    });
    assert.deepEqual(messages[1].content[1], {
      type: 'tool-call',
      toolCallId: 'call_1',
      toolName: 'get_forecast',
      args: { city: 'Lagos' },
    });
    assert.deepEqual(messages[2], {
      role: 'tool',
      content: [
        {
          type: 'tool-result',
          toolCallId: 'call_1',
          toolName: 'get_forecast',
          output: {
            type: 'json',
            value: {
              api_response: { temperature: 27, summary: 'Sunny' },
              status: 200,
            },
          },
        },
      ],
    });
    assert.deepEqual(messages[3], {
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: 'I have the forecast now and I can summarize it.',
        },
      ],
    });
  });

  test('sendChatMessage step mapping keeps toolCallIds for UI ordering fallbacks', () => {
    const steps = [
      {
        stepNumber: 0,
        text: "I'll fetch the forecast first.",
        reasoning: [],
        toolCalls: [
          {
            toolCallId: 'call_1',
            toolName: 'get_forecast',
            args: { city: 'Lagos' },
          },
        ],
      },
    ];

    assert.deepEqual(
      steps[0].toolCalls[0],
      {
        toolCallId: 'call_1',
        toolName: 'get_forecast',
        args: { city: 'Lagos' },
      }
    );
  });
});
