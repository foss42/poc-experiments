import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createTraceRecorder } from '../src/utils/evaluation/createTraceRecorder.js';

describe('createTraceRecorder', () => {
  test('assembles prompt, assistant, tool, resource, judge, and error spans', () => {
    const recorder = createTraceRecorder();

    recorder.startPrompt('Fetch the revenue data.');
    recorder.ensureAssistantSpan();
    recorder.appendAssistantText("I'll fetch the data first.");
    recorder.startToolCall({
      callId: 'call-1',
      toolName: 'get-sales-data',
      args: { metric: 'revenue' },
    });
    recorder.finishToolCall({
      callId: 'call-1',
      result: { structuredContent: { ok: true } },
      status: 'completed',
    });
    recorder.startResourceRead('ui://sales-chart');
    recorder.finishResourceRead('ui://sales-chart', { text: '<html />' }, 'completed');
    recorder.startJudge({ expectedOutput: 'A chart' });
    recorder.finishJudge({ score: 0.9, passed: true }, 'completed');
    recorder.addError('Synthetic error', { phase: 'judge' });
    recorder.finishAssistantSpan('completed');

    const spans = recorder.getSpans();

    assert.equal(spans.length, 6);
    assert.equal(spans[0].kind, 'prompt');
    assert.equal(spans[1].kind, 'assistant');
    assert.equal(spans[2].kind, 'tool_call');
    assert.equal(spans[3].kind, 'resource_read');
    assert.equal(spans[4].kind, 'judge');
    assert.equal(spans[5].kind, 'error');
    assert.equal(spans[2].status, 'completed');
    assert.equal(spans[4].payload.output.passed, true);
  });
});
