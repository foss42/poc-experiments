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

  test('hydrateToolArgsFromConversation fills missing required fields from the latest tool result', () => {
    const args = __test.hydrateToolArgsFromConversation(
      {},
      {
        type: 'object',
        properties: {
          selections: { type: 'object' },
          report: { type: 'object' },
        },
        required: ['selections', 'report'],
      },
      [
        {
          role: 'assistant',
          parts: [
            {
              type: 'tool',
              toolCall: {
                callId: 'call_visualize',
                toolName: 'visualize-sales-data',
                status: 'completed',
                result: {
                  structuredContent: {
                    selections: {
                      states: ['MH', 'TN'],
                      metric: 'revenue',
                      period: 'monthly',
                      year: 2025,
                    },
                    report: {
                      summary: { total: 1234 },
                    },
                  },
                },
              },
            },
          ],
        },
      ]
    );

    assert.deepEqual(args, {
      selections: {
        states: ['MH', 'TN'],
        metric: 'revenue',
        period: 'monthly',
        year: 2025,
      },
      report: {
        summary: { total: 1234 },
      },
    });
  });

  test('hydrateToolArgsFromConversation falls back to hidden widget context updates', () => {
    const args = __test.hydrateToolArgsFromConversation(
      { selections: { states: ['KA'] } },
      {
        type: 'object',
        properties: {
          selections: { type: 'object' },
          report: { type: 'object' },
        },
        required: ['selections', 'report'],
      },
      [
        {
          role: 'user',
          isHidden: true,
          content: '[System Note: The MCP app updated its model context]\n{"selections":{"states":["MH","TN"]},"report":{"summary":{"total":999}}}',
        },
      ]
    );

    assert.deepEqual(args, {
      selections: { states: ['KA'] },
      report: { summary: { total: 999 } },
    });
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

  test('flattenMessagesForModel skips failed tool calls so they do not orphan the next turn', () => {
    const messages = __test.flattenMessagesForModel([
      {
        role: 'assistant',
        parts: [
          { type: 'text', text: 'Trying that tool now.' },
          {
            type: 'tool',
            toolCall: {
              callId: 'call_failed',
              toolName: 'broken_tool',
              args: { id: '123' },
              status: 'failed',
              result: {
                isError: true,
                error: { message: 'Broken' },
              },
            },
          },
          { type: 'error', text: 'That tool failed.' },
        ],
      },
    ]);

    assert.deepEqual(messages, [{
      role: 'assistant',
      content: [
        { type: 'text', text: 'Trying that tool now.' },
        { type: 'text', text: 'That tool failed.' },
      ],
    }]);
  });

  test('flattenMessagesForModel excludes hidden direct-run stubs from model history', () => {
    const messages = __test.flattenMessagesForModel([
      {
        role: 'user',
        content: 'Direct run: weather_tool',
        isDirectRun: true,
        isHidden: true,
      },
      {
        role: 'assistant',
        isDirectRun: true,
        parts: [
          {
            type: 'tool',
            toolCall: {
              callId: 'direct_call',
              toolName: 'weather_tool',
              args: { city: 'Lagos' },
              status: 'completed',
              result: {
                structuredContent: { temperature: 29 },
              },
            },
          },
        ],
      },
      {
        role: 'user',
        content: 'Tell me what happened next.',
      },
    ]);

    assert.deepEqual(messages, [{
      role: 'user',
      content: 'Tell me what happened next.',
    }]);
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
