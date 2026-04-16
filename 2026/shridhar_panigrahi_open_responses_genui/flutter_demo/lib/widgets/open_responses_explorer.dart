import 'dart:convert';

import 'package:flutter/material.dart';

import '../design.dart';
import '../models/open_responses.dart';
import 'open_responses_dashboard.dart';
import 'sse_stream_debugger.dart';

// ---------------------------------------------------------------------------
// Sample payloads for quick exploration without a live server
// ---------------------------------------------------------------------------

const _kSampleJson = '''
{
  "id": "resp_sample_001",
  "object": "response",
  "model": "gpt-4o",
  "status": "completed",
  "previous_response_id": null,
  "output": [
    {
      "id": "rs_001",
      "type": "reasoning",
      "status": "completed",
      "summary": [{"text": "The user is asking about London weather. I should call the get_weather tool."}]
    },
    {
      "id": "fc_001",
      "type": "function_call",
      "call_id": "call_abc123",
      "name": "get_weather",
      "arguments": "{\\"location\\": \\"London\\"}",
      "status": "completed"
    },
    {
      "id": "fo_001",
      "type": "function_call_output",
      "call_id": "call_abc123",
      "output": "{\\"location\\": \\"London\\", \\"temperature\\": 18, \\"condition\\": \\"Partly Cloudy\\", \\"humidity\\": 72}",
      "status": "completed"
    },
    {
      "id": "msg_001",
      "type": "message",
      "role": "assistant",
      "status": "completed",
      "content": [
        {
          "type": "output_text",
          "text": "The current weather in **London** is **18°C** and partly cloudy with 72% humidity.\\n\\nA light jacket is recommended if you're heading out."
        }
      ]
    }
  ],
  "usage": {
    "input_tokens": 312,
    "output_tokens": 89,
    "total_tokens": 401
  }
}''';

const _kSampleSse =
    '''data: {"type":"response.created","response":{"id":"resp_sse_001","object":"response","model":"gpt-4o","status":"in_progress","output":[]}}

data: {"type":"response.output_item.added","output_index":0,"item":{"id":"rs_001","type":"reasoning","status":"in_progress","summary":[]}}

data: {"type":"response.reasoning_summary_text.delta","output_index":0,"delta":"The user wants to know the weather in London."}

data: {"type":"response.output_item.done","output_index":0,"item":{"id":"rs_001","type":"reasoning","status":"completed","summary":[{"text":"The user wants to know the weather in London."}]}}

data: {"type":"response.output_item.added","output_index":1,"item":{"id":"fc_001","type":"function_call","call_id":"call_abc","name":"get_weather","arguments":"","status":"in_progress"}}

data: {"type":"response.function_call_arguments.delta","output_index":1,"delta":"{\\"location\\""}

data: {"type":"response.function_call_arguments.delta","output_index":1,"delta":": \\"London\\"}"}

data: {"type":"response.output_item.done","output_index":1,"item":{"id":"fc_001","type":"function_call","call_id":"call_abc","name":"get_weather","arguments":"{\\"location\\":\\"London\\"}","status":"completed"}}

data: {"type":"response.output_item.added","output_index":2,"item":{"id":"msg_001","type":"message","role":"assistant","status":"in_progress","content":[]}}

data: {"type":"response.output_text.delta","output_index":2,"delta":"The weather in **London**"}

data: {"type":"response.output_text.delta","output_index":2,"delta":" is 18°C and partly cloudy."}

data: {"type":"response.output_item.done","output_index":2,"item":{"id":"msg_001","type":"message","role":"assistant","status":"completed","content":[{"type":"output_text","text":"The weather in **London** is 18°C and partly cloudy."}]}}

data: {"type":"response.completed","response":{"id":"resp_sse_001","object":"response","model":"gpt-4o","status":"completed","output":[{"id":"rs_001","type":"reasoning","status":"completed","summary":[{"text":"The user wants to know the weather in London."}]},{"id":"fc_001","type":"function_call","call_id":"call_abc","name":"get_weather","arguments":"{\\"location\\":\\"London\\"}","status":"completed"},{"id":"msg_001","type":"message","role":"assistant","status":"completed","content":[{"type":"output_text","text":"The weather in **London** is 18°C and partly cloudy."}]}],"usage":{"input_tokens":280,"output_tokens":45,"total_tokens":325}}}

data: [DONE]''';

const _kSampleChained = '''
{
  "id": "resp_turn2_001",
  "object": "response",
  "model": "gpt-4o",
  "status": "completed",
  "previous_response_id": "resp_turn1_001",
  "output": [
    {
      "id": "msg_002",
      "type": "message",
      "role": "assistant",
      "status": "completed",
      "content": [
        {
          "type": "output_text",
          "text": "Yes, that is correct! London's average summer temperature is around 18-22°C. Would you like recommendations for what to pack?"
        }
      ]
    }
  ],
  "usage": {
    "input_tokens": 420,
    "output_tokens": 38,
    "total_tokens": 458
  }
}''';

// ---------------------------------------------------------------------------
// Input type detection
// ---------------------------------------------------------------------------

enum _InputType { json, sse, unknown }

_InputType _detect(String text) {
  final trimmed = text.trim();
  if (trimmed.isEmpty) return _InputType.unknown;
  if (trimmed.contains('\ndata: ') || trimmed.startsWith('data: ')) {
    return _InputType.sse;
  }
  if (trimmed.startsWith('{')) return _InputType.json;
  return _InputType.unknown;
}

// ---------------------------------------------------------------------------
// OpenResponsesExplorer
//
// A self-contained paste-and-explore panel. Paste any Open Responses JSON
// or raw SSE transcript and instantly get the structured viewer, stream
// debugger, assertions, and analytics — without making an HTTP request.
// ---------------------------------------------------------------------------

class OpenResponsesExplorer extends StatefulWidget {
  const OpenResponsesExplorer({super.key});

  @override
  State<OpenResponsesExplorer> createState() => _OpenResponsesExplorerState();
}

class _OpenResponsesExplorerState extends State<OpenResponsesExplorer> {
  final _controller = TextEditingController();
  String? _error;
  _ParseResult? _result;
  bool _showInput = true;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _parse() {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    final type = _detect(text);
    setState(() => _error = null);

    switch (type) {
      case _InputType.json:
        try {
          final json = jsonDecode(text) as Map<String, dynamic>;
          if (!OpenResponsesResult.isOpenResponsesFormat(json)) {
            setState(() => _error =
                'Valid JSON but not an Open Responses format.\n'
                'Expected: {"object":"response","output":[...],"id":"..."}');
            return;
          }
          final result = OpenResponsesResult.fromJson(json);
          setState(() {
            _result = _ParseResult.json(result);
            _showInput = false;
          });
        } on FormatException catch (e) {
          setState(() => _error = 'Invalid JSON: ${e.message}');
        } catch (e) {
          setState(() => _error = 'Parse error: $e');
        }

      case _InputType.sse:
        final lines = text.split('\n');
        if (!OpenResponsesStreamParser.isOpenResponsesStream(lines)) {
          setState(() => _error =
              'Looks like SSE but no Open Responses events found.\n'
              'Expected lines like: data: {"type":"response.created",...}');
          return;
        }
        setState(() {
          _result = _ParseResult.sse(lines);
          _showInput = false;
        });

      case _InputType.unknown:
        setState(() => _error =
            'Could not detect format. Paste a JSON object or an SSE transcript (lines starting with "data: ").');
    }
  }

  void _loadSample(String payload) {
    _controller.text = payload;
    _parse();
  }

  void _reset() {
    setState(() {
      _result = null;
      _showInput = true;
      _error = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_showInput && _result != null) {
      return _ResultView(result: _result!, onReset: _reset);
    }
    return _InputView(
      controller: _controller,
      error: _error,
      onParse: _parse,
      onSample: _loadSample,
    );
  }
}

// ---------------------------------------------------------------------------
// Input view
// ---------------------------------------------------------------------------

class _InputView extends StatelessWidget {
  const _InputView({
    required this.controller,
    required this.error,
    required this.onParse,
    required this.onSample,
  });

  final TextEditingController controller;
  final String? error;
  final VoidCallback onParse;
  final ValueChanged<String> onSample;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.search_rounded,
                  size: 18, color: theme.colorScheme.primary),
              kHSpacer8,
              Text(
                'Paste & Explore',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          kVSpacer5,
          Text(
            'Paste an Open Responses JSON object or SSE transcript to explore it without making an HTTP request.',
            style: theme.textTheme.bodySmall
                ?.copyWith(color: theme.colorScheme.outline),
          ),
          kVSpacer10,

          // Textarea
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                border: Border.all(
                  color: error != null
                      ? theme.colorScheme.error
                      : theme.colorScheme.outlineVariant,
                ),
                borderRadius: kBorderRadius8,
              ),
              child: TextField(
                controller: controller,
                maxLines: null,
                expands: true,
                style: kCodeStyle.copyWith(fontSize: 12),
                decoration: InputDecoration(
                  hintText:
                      '{\n  "id": "resp_...",\n  "object": "response",\n  "output": [...]\n}\n\nor paste SSE lines:\n\ndata: {"type":"response.created",...}\ndata: {"type":"response.output_item.added",...}',
                  hintStyle: kCodeStyle.copyWith(
                    fontSize: 12,
                    color: theme.colorScheme.outlineVariant,
                  ),
                  contentPadding: kP8,
                  border: InputBorder.none,
                ),
                textAlignVertical: TextAlignVertical.top,
              ),
            ),
          ),

          if (error != null) ...[
            kVSpacer8,
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: theme.colorScheme.errorContainer.withValues(alpha: 0.3),
                borderRadius: kBorderRadius8,
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.error_outline_rounded,
                      size: 14, color: theme.colorScheme.error),
                  kHSpacer8,
                  Expanded(
                    child: Text(
                      error!,
                      style: theme.textTheme.bodySmall
                          ?.copyWith(color: theme.colorScheme.error),
                    ),
                  ),
                ],
              ),
            ),
          ],

          kVSpacer10,

          Row(
            children: [
              Text('Try a sample:',
                  style: theme.textTheme.labelSmall
                      ?.copyWith(color: theme.colorScheme.outline)),
              kHSpacer8,
              _SampleChip(
                label: 'JSON',
                icon: Icons.data_object_rounded,
                onTap: () => onSample(_kSampleJson),
              ),
              kHSpacer4,
              _SampleChip(
                label: 'SSE Stream',
                icon: Icons.stream_rounded,
                onTap: () => onSample(_kSampleSse),
              ),
              kHSpacer4,
              _SampleChip(
                label: 'Chained',
                icon: Icons.link_rounded,
                onTap: () => onSample(_kSampleChained),
              ),
              const Spacer(),
              FilledButton.icon(
                icon: const Icon(Icons.search_rounded, size: 15),
                label: const Text('Parse & Explore'),
                onPressed: onParse,
                style: FilledButton.styleFrom(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  textStyle: Theme.of(context).textTheme.labelMedium,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SampleChip extends StatelessWidget {
  const _SampleChip(
      {required this.label, required this.icon, required this.onTap});
  final String label;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          border: Border.all(color: theme.colorScheme.outlineVariant),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 12, color: theme.colorScheme.secondary),
            kHSpacer4,
            Text(label,
                style: theme.textTheme.labelSmall
                    ?.copyWith(color: theme.colorScheme.secondary)),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Result view
// ---------------------------------------------------------------------------

class _ParseResult {
  _ParseResult._({this.jsonResult, this.sseLines});

  factory _ParseResult.json(OpenResponsesResult r) =>
      _ParseResult._(jsonResult: r);

  factory _ParseResult.sse(List<String> lines) =>
      _ParseResult._(sseLines: lines);

  final OpenResponsesResult? jsonResult;
  final List<String>? sseLines;

  bool get isJson => jsonResult != null;
}

class _ResultView extends StatelessWidget {
  const _ResultView({required this.result, required this.onReset});
  final _ParseResult result;
  final VoidCallback onReset;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerLow,
            border: Border(
                bottom: BorderSide(color: theme.colorScheme.outlineVariant)),
          ),
          child: Row(
            children: [
              Icon(
                result.isJson
                    ? Icons.data_object_rounded
                    : Icons.stream_rounded,
                size: 14,
                color: theme.colorScheme.primary,
              ),
              kHSpacer8,
              Text(
                result.isJson ? 'Open Responses JSON' : 'SSE Stream',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: theme.colorScheme.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const Spacer(),
              TextButton.icon(
                icon: const Icon(Icons.arrow_back_rounded, size: 14),
                label: const Text('Back'),
                onPressed: onReset,
                style: TextButton.styleFrom(
                  foregroundColor: theme.colorScheme.outline,
                  textStyle: theme.textTheme.labelSmall,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: result.isJson
              ? OpenResponsesDashboard(result: result.jsonResult!)
              : SseStreamDebugger(sseLines: result.sseLines!),
        ),
      ],
    );
  }
}
