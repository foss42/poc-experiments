import 'package:flutter_test/flutter_test.dart';
import 'package:open_responses_demo/models/open_responses.dart';

void main() {
  // ---------------------------------------------------------------------------
  // OutputItem.fromJson — type routing
  // ---------------------------------------------------------------------------

  group('OutputItem.fromJson', () {
    test('message → MessageOutputItem', () {
      final item = OutputItem.fromJson({
        'id': 'msg_1',
        'type': 'message',
        'role': 'assistant',
        'status': 'completed',
        'content': [
          {'type': 'output_text', 'text': 'Hello, world!'}
        ],
      });
      expect(item, isA<MessageOutputItem>());
      final msg = item as MessageOutputItem;
      expect(msg.role, 'assistant');
      expect(msg.text, 'Hello, world!');
    });

    test('function_call → FunctionCallOutputItem', () {
      final item = OutputItem.fromJson({
        'id': 'fc_1',
        'type': 'function_call',
        'call_id': 'call_abc',
        'name': 'get_weather',
        'arguments': '{"location":"London"}',
        'status': 'completed',
      });
      expect(item, isA<FunctionCallOutputItem>());
      final fc = item as FunctionCallOutputItem;
      expect(fc.name, 'get_weather');
      expect(fc.callId, 'call_abc');
    });

    test('function_call_output → FunctionCallResultItem', () {
      final item = OutputItem.fromJson({
        'id': 'fo_1',
        'type': 'function_call_output',
        'call_id': 'call_abc',
        'output': '{"temperature": 18}',
        'status': 'completed',
      });
      expect(item, isA<FunctionCallResultItem>());
      expect((item as FunctionCallResultItem).callId, 'call_abc');
    });

    test('reasoning → ReasoningOutputItem', () {
      final item = OutputItem.fromJson({
        'id': 'rs_1',
        'type': 'reasoning',
        'status': 'completed',
        'summary': [
          {'text': 'Thinking step by step...'}
        ],
      });
      expect(item, isA<ReasoningOutputItem>());
      expect((item as ReasoningOutputItem).summary, 'Thinking step by step...');
    });

    test('web_search_call → WebSearchCallOutputItem', () {
      final item = OutputItem.fromJson({
        'id': 'ws_1',
        'type': 'web_search_call',
        'status': 'completed',
      });
      expect(item, isA<WebSearchCallOutputItem>());
    });

    test('file_search_call → FileSearchCallOutputItem with queries', () {
      final item = OutputItem.fromJson({
        'id': 'fs_1',
        'type': 'file_search_call',
        'status': 'completed',
        'queries': ['quarterly revenue', 'EBITDA'],
      });
      expect(item, isA<FileSearchCallOutputItem>());
      expect((item as FileSearchCallOutputItem).queries,
          ['quarterly revenue', 'EBITDA']);
    });

    test('image_generation_call → ImageGenerationCallOutputItem', () {
      final item = OutputItem.fromJson({
        'id': 'ig_1',
        'type': 'image_generation_call',
        'status': 'completed',
        'result': 'base64encodedpngdata',
      });
      expect(item, isA<ImageGenerationCallOutputItem>());
      final ig = item as ImageGenerationCallOutputItem;
      expect(ig.result, 'base64encodedpngdata');
      expect(ig.status, 'completed');
    });

    test('code_interpreter_call → CodeInterpreterCallOutputItem', () {
      final item = OutputItem.fromJson({
        'id': 'ci_1',
        'type': 'code_interpreter_call',
        'status': 'completed',
        'code': 'print("hello")',
        'outputs': [
          {'type': 'logs', 'logs': 'hello'}
        ],
      });
      expect(item, isA<CodeInterpreterCallOutputItem>());
      final ci = item as CodeInterpreterCallOutputItem;
      expect(ci.code, 'print("hello")');
      expect(ci.outputs.length, 1);
      expect(ci.outputs.first.outputType, CodeInterpreterOutputType.logs);
      expect(ci.outputs.first.logs, 'hello');
    });

    test('computer_use_preview → ComputerUsePreviewOutputItem', () {
      final item = OutputItem.fromJson({
        'id': 'cu_1',
        'type': 'computer_use_preview',
        'status': 'completed',
        'action': {'type': 'click', 'x': 100, 'y': 200},
      });
      expect(item, isA<ComputerUsePreviewOutputItem>());
      final cu = item as ComputerUsePreviewOutputItem;
      expect(cu.action!['type'], 'click');
    });

    test('unknown type → UnknownOutputItem preserves raw', () {
      final item = OutputItem.fromJson({
        'id': 'unk_1',
        'type': 'some_future_type',
        'status': 'completed',
        'extra': 'data',
      });
      expect(item, isA<UnknownOutputItem>());
      expect((item as UnknownOutputItem).type, 'some_future_type');
    });
  });

  // ---------------------------------------------------------------------------
  // ContentPart.fromJson — type routing
  // ---------------------------------------------------------------------------

  group('ContentPart.fromJson', () {
    test('output_text → OutputTextPart', () {
      final part =
          ContentPart.fromJson({'type': 'output_text', 'text': 'Hi there'});
      expect(part, isA<OutputTextPart>());
      expect((part as OutputTextPart).text, 'Hi there');
    });

    test('input_text → InputTextPart', () {
      final part = ContentPart.fromJson(
          {'type': 'input_text', 'text': 'User message'});
      expect(part, isA<InputTextPart>());
      expect((part as InputTextPart).text, 'User message');
    });

    test('refusal → RefusalPart', () {
      final part = ContentPart.fromJson(
          {'type': 'refusal', 'refusal': 'I cannot help with that.'});
      expect(part, isA<RefusalPart>());
      expect((part as RefusalPart).refusal, 'I cannot help with that.');
    });

    test('output_image → OutputImagePart', () {
      final part = ContentPart.fromJson({
        'type': 'output_image',
        'image_url': {'url': 'https://example.com/img.png', 'detail': 'high'}
      });
      expect(part, isA<OutputImagePart>());
      expect((part as OutputImagePart).url, 'https://example.com/img.png');
      expect(part.detail, 'high');
    });

    test('input_image → InputImagePart', () {
      final part = ContentPart.fromJson({
        'type': 'input_image',
        'image_url': {'url': 'https://example.com/in.png'}
      });
      expect(part, isA<InputImagePart>());
    });
  });

  // ---------------------------------------------------------------------------
  // Annotations
  // ---------------------------------------------------------------------------

  group('Annotation.fromJson', () {
    test('url_citation', () {
      final a = Annotation.fromJson({
        'type': 'url_citation',
        'text': 'source',
        'url_citation': {'url': 'https://example.com', 'title': 'Example'},
        'start_index': 0,
        'end_index': 6,
      });
      expect(a.annotationType, AnnotationType.urlCitation);
      expect(a.url, 'https://example.com');
      expect(a.title, 'Example');
    });

    test('file_citation', () {
      final a = Annotation.fromJson({
        'type': 'file_citation',
        'file_citation': {'file_id': 'file_xyz', 'filename': 'report.pdf'},
      });
      expect(a.annotationType, AnnotationType.fileCitation);
      expect(a.fileId, 'file_xyz');
      expect(a.filename, 'report.pdf');
    });

    test('file_path', () {
      final a = Annotation.fromJson({
        'type': 'file_path',
        'file_path': {'file_id': 'file_abc'},
      });
      expect(a.annotationType, AnnotationType.filePath);
      expect(a.fileId, 'file_abc');
    });

    test('unknown type → AnnotationType.unknown', () {
      final a = Annotation.fromJson({'type': 'future_annotation'});
      expect(a.annotationType, AnnotationType.unknown);
    });
  });

  // ---------------------------------------------------------------------------
  // OpenResponsesResult.fromJson
  // ---------------------------------------------------------------------------

  group('OpenResponsesResult.fromJson', () {
    test('parses full agentic response', () {
      final result = OpenResponsesResult.fromJson({
        'id': 'resp_001',
        'object': 'response',
        'model': 'gpt-4o',
        'status': 'completed',
        'output': [
          {
            'id': 'rs_1',
            'type': 'reasoning',
            'status': 'completed',
            'summary': [
              {'text': 'I should call get_weather.'}
            ],
          },
          {
            'id': 'fc_1',
            'type': 'function_call',
            'call_id': 'call_abc',
            'name': 'get_weather',
            'arguments': '{"location":"London"}',
            'status': 'completed',
          },
          {
            'id': 'fo_1',
            'type': 'function_call_output',
            'call_id': 'call_abc',
            'output': '{"temperature":18}',
            'status': 'completed',
          },
          {
            'id': 'msg_1',
            'type': 'message',
            'role': 'assistant',
            'status': 'completed',
            'content': [
              {'type': 'output_text', 'text': 'It is 18°C in London.'}
            ],
          },
        ],
        'usage': {
          'input_tokens': 200,
          'output_tokens': 50,
          'total_tokens': 250,
        },
      });

      expect(result.id, 'resp_001');
      expect(result.status, 'completed');
      expect(result.output.length, 4);
      expect(result.output[0], isA<ReasoningOutputItem>());
      expect(result.output[1], isA<FunctionCallOutputItem>());
      expect(result.output[2], isA<FunctionCallResultItem>());
      expect(result.output[3], isA<MessageOutputItem>());
      expect(result.usage!.totalTokens, 250);
    });

    test('parses previous_response_id', () {
      final result = OpenResponsesResult.fromJson({
        'id': 'resp_002',
        'object': 'response',
        'model': 'gpt-4o',
        'status': 'completed',
        'previous_response_id': 'resp_001',
        'output': [],
      });
      expect(result.previousResponseId, 'resp_001');
    });

    test('isOpenResponsesFormat — valid', () {
      expect(
        OpenResponsesResult.isOpenResponsesFormat({
          'id': 'resp_x',
          'object': 'response',
          'output': [],
        }),
        isTrue,
      );
    });

    test('isOpenResponsesFormat — invalid (wrong object)', () {
      expect(
        OpenResponsesResult.isOpenResponsesFormat({
          'id': 'chat_x',
          'object': 'chat.completion',
          'choices': [],
        }),
        isFalse,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // OpenResponsesStreamParser
  // ---------------------------------------------------------------------------

  group('OpenResponsesStreamParser.parse', () {
    test('basic delta accumulation builds message', () {
      final sseLines = [
        'data: {"type":"response.output_item.added","output_index":0,"item":{"id":"msg_1","type":"message","role":"assistant","status":"in_progress","content":[]}}',
        'data: {"type":"response.output_text.delta","output_index":0,"delta":"Hello"}',
        'data: {"type":"response.output_text.delta","output_index":0,"delta":", world!"}',
      ];
      final items = OpenResponsesStreamParser.parse(sseLines);
      expect(items.length, 1);
      expect(items[0], isA<MessageOutputItem>());
      expect((items[0] as MessageOutputItem).text, 'Hello, world!');
    });

    test('response.completed takes highest priority', () {
      final sseLines = [
        'data: {"type":"response.output_item.added","output_index":0,"item":{"id":"msg_1","type":"message","role":"assistant","status":"in_progress","content":[]}}',
        'data: {"type":"response.output_text.delta","output_index":0,"delta":"partial"}',
        'data: {"type":"response.completed","response":{"id":"resp_1","object":"response","model":"gpt-4o","status":"completed","output":[{"id":"msg_1","type":"message","role":"assistant","status":"completed","content":[{"type":"output_text","text":"Final authoritative text."}]}],"usage":{"input_tokens":10,"output_tokens":5,"total_tokens":15}}}',
      ];
      final items = OpenResponsesStreamParser.parse(sseLines);
      expect(items.length, 1);
      expect((items[0] as MessageOutputItem).text, 'Final authoritative text.');
    });

    test('output_text.done overrides accumulated deltas', () {
      final sseLines = [
        'data: {"type":"response.output_item.added","output_index":0,"item":{"id":"msg_1","type":"message","role":"assistant","status":"in_progress","content":[]}}',
        'data: {"type":"response.output_text.delta","output_index":0,"delta":"incomplete"}',
        'data: {"type":"response.output_text.done","output_index":0,"text":"Complete final text"}',
      ];
      final items = OpenResponsesStreamParser.parse(sseLines);
      expect((items[0] as MessageOutputItem).text, 'Complete final text');
    });

    test('function_call_arguments.done overrides deltas', () {
      final sseLines = [
        'data: {"type":"response.output_item.added","output_index":0,"item":{"id":"fc_1","type":"function_call","call_id":"call_x","name":"search","arguments":"","status":"in_progress"}}',
        'data: {"type":"response.function_call_arguments.delta","output_index":0,"delta":"{\\"q\\":"}',
        'data: {"type":"response.function_call_arguments.done","output_index":0,"arguments":"{\\"q\\":\\"flutter\\"}"}',
      ];
      final items = OpenResponsesStreamParser.parse(sseLines);
      expect(items[0], isA<FunctionCallOutputItem>());
      expect((items[0] as FunctionCallOutputItem).arguments, '{"q":"flutter"}');
    });

    test('reasoning delta accumulation', () {
      final sseLines = [
        'data: {"type":"response.output_item.added","output_index":0,"item":{"id":"rs_1","type":"reasoning","status":"in_progress","summary":[]}}',
        'data: {"type":"response.reasoning_summary_text.delta","output_index":0,"delta":"Step 1: "}',
        'data: {"type":"response.reasoning_summary_text.delta","output_index":0,"delta":"analyze the request."}',
      ];
      final items = OpenResponsesStreamParser.parse(sseLines);
      expect(items[0], isA<ReasoningOutputItem>());
      expect((items[0] as ReasoningOutputItem).summary,
          'Step 1: analyze the request.');
    });

    test('response.failed is parsed as a completed result', () {
      final sseLines = [
        'data: {"type":"response.failed","response":{"id":"resp_fail","object":"response","model":"gpt-4o","status":"failed","output":[]}}',
      ];
      final items = OpenResponsesStreamParser.parse(sseLines);
      expect(items, isEmpty);
    });

    test('response.incomplete is parsed', () {
      final sseLines = [
        'data: {"type":"response.incomplete","response":{"id":"resp_cut","object":"response","model":"gpt-4o","status":"incomplete","output":[{"id":"msg_1","type":"message","role":"assistant","status":"completed","content":[{"type":"output_text","text":"Partial answer..."}]}]}}',
      ];
      final items = OpenResponsesStreamParser.parse(sseLines);
      expect(items.length, 1);
      expect((items[0] as MessageOutputItem).text, 'Partial answer...');
    });

    test('output_item.done provides authoritative per-item snapshot', () {
      final sseLines = [
        'data: {"type":"response.output_item.added","output_index":0,"item":{"id":"fc_1","type":"function_call","call_id":"c1","name":"tool","arguments":"","status":"in_progress"}}',
        'data: {"type":"response.output_item.done","output_index":0,"item":{"id":"fc_1","type":"function_call","call_id":"c1","name":"tool","arguments":"{\\"x\\":1}","status":"completed"}}',
      ];
      final items = OpenResponsesStreamParser.parse(sseLines);
      expect((items[0] as FunctionCallOutputItem).arguments, '{"x":1}');
      expect(items[0].status, 'completed');
    });

    test('multi-item stream builds all items in order', () {
      final sseLines = [
        'data: {"type":"response.output_item.added","output_index":0,"item":{"id":"rs_1","type":"reasoning","status":"in_progress","summary":[]}}',
        'data: {"type":"response.output_item.added","output_index":1,"item":{"id":"fc_1","type":"function_call","call_id":"c1","name":"search","arguments":"","status":"in_progress"}}',
        'data: {"type":"response.output_item.added","output_index":2,"item":{"id":"msg_1","type":"message","role":"assistant","status":"in_progress","content":[]}}',
        'data: {"type":"response.output_text.delta","output_index":2,"delta":"Done!"}',
      ];
      final items = OpenResponsesStreamParser.parse(sseLines);
      expect(items.length, 3);
      expect(items[0], isA<ReasoningOutputItem>());
      expect(items[1], isA<FunctionCallOutputItem>());
      expect(items[2], isA<MessageOutputItem>());
      expect((items[2] as MessageOutputItem).text, 'Done!');
    });

    test('[DONE] marker is safely ignored', () {
      final sseLines = [
        'data: {"type":"response.output_item.added","output_index":0,"item":{"id":"msg_1","type":"message","role":"assistant","status":"in_progress","content":[]}}',
        'data: {"type":"response.output_text.delta","output_index":0,"delta":"Hi"}',
        'data: [DONE]',
      ];
      final items = OpenResponsesStreamParser.parse(sseLines);
      expect(items.length, 1);
      expect((items[0] as MessageOutputItem).text, 'Hi');
    });

    test('empty input returns empty list', () {
      expect(OpenResponsesStreamParser.parse([]), isEmpty);
    });

    test('malformed JSON lines are skipped gracefully', () {
      final sseLines = [
        'data: not valid json {{{{',
        'data: {"type":"response.output_item.added","output_index":0,"item":{"id":"msg_1","type":"message","role":"assistant","status":"in_progress","content":[]}}',
        'data: {"type":"response.output_text.delta","output_index":0,"delta":"OK"}',
      ];
      final items = OpenResponsesStreamParser.parse(sseLines);
      expect(items.length, 1);
      expect((items[0] as MessageOutputItem).text, 'OK');
    });
  });

  // ---------------------------------------------------------------------------
  // isOpenResponsesStream
  // ---------------------------------------------------------------------------

  group('OpenResponsesStreamParser.isOpenResponsesStream', () {
    test('returns true for response.created', () {
      expect(
        OpenResponsesStreamParser.isOpenResponsesStream([
          'data: {"type":"response.created","response":{}}',
        ]),
        isTrue,
      );
    });

    test('returns true for response.completed', () {
      expect(
        OpenResponsesStreamParser.isOpenResponsesStream([
          'data: {"type":"response.completed","response":{}}',
        ]),
        isTrue,
      );
    });

    test('returns true for response.failed', () {
      expect(
        OpenResponsesStreamParser.isOpenResponsesStream([
          'data: {"type":"response.failed","response":{}}',
        ]),
        isTrue,
      );
    });

    test('returns true for response.incomplete', () {
      expect(
        OpenResponsesStreamParser.isOpenResponsesStream([
          'data: {"type":"response.incomplete","response":{}}',
        ]),
        isTrue,
      );
    });

    test('returns false for non-OR SSE', () {
      expect(
        OpenResponsesStreamParser.isOpenResponsesStream([
          'data: {"id":"chatcmpl-abc","object":"chat.completion.chunk","choices":[]}',
        ]),
        isFalse,
      );
    });

    test('returns false for empty list', () {
      expect(OpenResponsesStreamParser.isOpenResponsesStream([]), isFalse);
    });
  });

  // ---------------------------------------------------------------------------
  // CodeInterpreterOutput
  // ---------------------------------------------------------------------------

  group('CodeInterpreterOutput.fromJson', () {
    test('logs type', () {
      final o = CodeInterpreterOutput.fromJson(
          {'type': 'logs', 'logs': 'output text'});
      expect(o.outputType, CodeInterpreterOutputType.logs);
      expect(o.logs, 'output text');
    });

    test('image type', () {
      final o = CodeInterpreterOutput.fromJson({
        'type': 'image',
        'image': {'data': 'base64png'}
      });
      expect(o.outputType, CodeInterpreterOutputType.image);
      expect(o.imageData, 'base64png');
    });

    test('file type', () {
      final o = CodeInterpreterOutput.fromJson({
        'type': 'file',
        'file': {'path': '/tmp/out.csv'}
      });
      expect(o.outputType, CodeInterpreterOutputType.file);
      expect(o.filePath, '/tmp/out.csv');
    });

    test('unknown type → CodeInterpreterOutputType.unknown', () {
      final o = CodeInterpreterOutput.fromJson({'type': 'future_output'});
      expect(o.outputType, CodeInterpreterOutputType.unknown);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases & nullability
  // ---------------------------------------------------------------------------

  group('Null-safety / edge cases', () {
    test('MessageOutputItem with empty content gives empty text', () {
      final item = OutputItem.fromJson({
        'id': 'msg_empty',
        'type': 'message',
        'role': 'assistant',
        'status': 'completed',
        'content': [],
      }) as MessageOutputItem;
      expect(item.text, '');
    });

    test('FunctionCallOutputItem missing fields get defaults', () {
      final item = OutputItem.fromJson({'type': 'function_call'})
          as FunctionCallOutputItem;
      expect(item.id, '');
      expect(item.name, '');
      expect(item.arguments, '{}');
    });

    test('ReasoningOutputItem with list summary extracts first text', () {
      final item = OutputItem.fromJson({
        'id': 'rs_x',
        'type': 'reasoning',
        'status': 'completed',
        'summary': [
          {'text': 'First'},
          {'text': 'Second'},
        ],
      }) as ReasoningOutputItem;
      expect(item.summary, 'First');
    });

    test('OpenResponsesUsage defaults to zero on missing fields', () {
      final usage = OpenResponsesUsage.fromJson({});
      expect(usage.inputTokens, 0);
      expect(usage.outputTokens, 0);
      expect(usage.totalTokens, 0);
    });

    test('FileSearchCallOutputItem with no queries gives empty list', () {
      final item = OutputItem.fromJson({
        'id': 'fs_1',
        'type': 'file_search_call',
        'status': 'completed',
      }) as FileSearchCallOutputItem;
      expect(item.queries, isEmpty);
    });

    test('ImageGenerationCallOutputItem without result is null', () {
      final item = OutputItem.fromJson({
        'id': 'ig_1',
        'type': 'image_generation_call',
        'status': 'in_progress',
      }) as ImageGenerationCallOutputItem;
      expect(item.result, isNull);
    });

    test('ComputerUsePreviewOutputItem without action is null', () {
      final item = OutputItem.fromJson({
        'id': 'cu_1',
        'type': 'computer_use_preview',
        'status': 'completed',
      }) as ComputerUsePreviewOutputItem;
      expect(item.action, isNull);
    });
  });
}
