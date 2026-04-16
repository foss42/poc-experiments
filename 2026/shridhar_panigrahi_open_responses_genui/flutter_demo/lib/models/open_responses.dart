import 'dart:convert';

sealed class OutputItem {
  const OutputItem();

  String get id;
  String get type;
  String get status;

  factory OutputItem.fromJson(Map<String, dynamic> json) {
    return switch (json['type'] as String? ?? '') {
      'message' => MessageOutputItem.fromJson(json),
      'function_call' => FunctionCallOutputItem.fromJson(json),
      'function_call_output' => FunctionCallResultItem.fromJson(json),
      'reasoning' => ReasoningOutputItem.fromJson(json),
      'web_search_call' => WebSearchCallOutputItem.fromJson(json),
      'file_search_call' => FileSearchCallOutputItem.fromJson(json),
      'image_generation_call' => ImageGenerationCallOutputItem.fromJson(json),
      'code_interpreter_call' => CodeInterpreterCallOutputItem.fromJson(json),
      'computer_use_preview' => ComputerUsePreviewOutputItem.fromJson(json),
      _ => UnknownOutputItem.fromJson(json),
    };
  }
}

class MessageOutputItem extends OutputItem {
  const MessageOutputItem({
    required this.id,
    required this.role,
    required this.status,
    required this.content,
  });

  @override
  final String id;
  @override
  final String type = 'message';
  @override
  final String status;
  final String role;
  final List<ContentPart> content;

  factory MessageOutputItem.fromJson(Map<String, dynamic> json) {
    final raw = json['content'];
    final parts = raw is List
        ? raw.map((c) => ContentPart.fromJson(c as Map<String, dynamic>)).toList()
        : <ContentPart>[];
    return MessageOutputItem(
      id: json['id'] as String? ?? '',
      role: json['role'] as String? ?? 'assistant',
      status: json['status'] as String? ?? 'completed',
      content: parts,
    );
  }

  String get text => content
      .whereType<OutputTextPart>()
      .map((p) => p.text)
      .join();
}

class FunctionCallOutputItem extends OutputItem {
  const FunctionCallOutputItem({
    required this.id,
    required this.callId,
    required this.name,
    required this.arguments,
    required this.status,
  });

  @override
  final String id;
  @override
  final String type = 'function_call';
  @override
  final String status;
  final String callId;
  final String name;
  final String arguments;

  factory FunctionCallOutputItem.fromJson(Map<String, dynamic> json) {
    return FunctionCallOutputItem(
      id: json['id'] as String? ?? '',
      callId: json['call_id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      arguments: json['arguments'] as String? ?? '{}',
      status: json['status'] as String? ?? 'completed',
    );
  }
}

class FunctionCallResultItem extends OutputItem {
  const FunctionCallResultItem({
    required this.id,
    required this.callId,
    required this.output,
    required this.status,
  });

  @override
  final String id;
  @override
  final String type = 'function_call_output';
  @override
  final String status;
  final String callId;
  final String output;

  factory FunctionCallResultItem.fromJson(Map<String, dynamic> json) {
    final raw = json['output'];
    return FunctionCallResultItem(
      id: json['id'] as String? ?? '',
      callId: json['call_id'] as String? ?? '',
      output: raw is String ? raw : raw.toString(),
      status: json['status'] as String? ?? 'completed',
    );
  }
}

class ReasoningOutputItem extends OutputItem {
  const ReasoningOutputItem({
    required this.id,
    required this.status,
    this.summary,
    this.content,
  });

  @override
  final String id;
  @override
  final String type = 'reasoning';
  @override
  final String status;
  final String? summary;
  final String? content;

  factory ReasoningOutputItem.fromJson(Map<String, dynamic> json) {
    final summaryRaw = json['summary'];
    String? summaryText;
    if (summaryRaw is List && summaryRaw.isNotEmpty) {
      summaryText = summaryRaw.first['text'] as String?;
    } else if (summaryRaw is String) {
      summaryText = summaryRaw;
    }
    final contentRaw = json['content'];
    String? contentText;
    if (contentRaw is List && contentRaw.isNotEmpty) {
      contentText = contentRaw.first['text'] as String?;
    } else if (contentRaw is String) {
      contentText = contentRaw;
    }
    return ReasoningOutputItem(
      id: json['id'] as String? ?? '',
      status: json['status'] as String? ?? 'completed',
      summary: summaryText,
      content: contentText,
    );
  }
}

class WebSearchCallOutputItem extends OutputItem {
  const WebSearchCallOutputItem({
    required this.id,
    required this.status,
  });

  @override
  final String id;
  @override
  final String type = 'web_search_call';
  @override
  final String status;

  factory WebSearchCallOutputItem.fromJson(Map<String, dynamic> json) {
    return WebSearchCallOutputItem(
      id: json['id'] as String? ?? '',
      status: json['status'] as String? ?? 'completed',
    );
  }
}

class FileSearchCallOutputItem extends OutputItem {
  const FileSearchCallOutputItem({
    required this.id,
    required this.status,
    this.queries = const [],
  });

  @override
  final String id;
  @override
  final String type = 'file_search_call';
  @override
  final String status;
  final List<String> queries;

  factory FileSearchCallOutputItem.fromJson(Map<String, dynamic> json) {
    final rawQueries = json['queries'];
    final queries = rawQueries is List
        ? rawQueries.whereType<String>().toList()
        : <String>[];
    return FileSearchCallOutputItem(
      id: json['id'] as String? ?? '',
      status: json['status'] as String? ?? 'completed',
      queries: queries,
    );
  }
}

// Image generation tool call — returned when the model uses the
// image_generation tool (DALL-E / gpt-image-1). The `result` field holds
// the base64-encoded PNG when status is completed.
class ImageGenerationCallOutputItem extends OutputItem {
  const ImageGenerationCallOutputItem({
    required this.id,
    required this.status,
    this.result,
  });

  @override
  final String id;
  @override
  final String type = 'image_generation_call';
  @override
  final String status;

  /// Base64-encoded PNG data, present when status == 'completed'.
  final String? result;

  factory ImageGenerationCallOutputItem.fromJson(Map<String, dynamic> json) {
    return ImageGenerationCallOutputItem(
      id: json['id'] as String? ?? '',
      status: json['status'] as String? ?? '',
      result: json['result'] as String?,
    );
  }
}

// Code interpreter tool call — returned when the model runs Python code.
// Captures the generated code, execution logs, and any output files.
class CodeInterpreterCallOutputItem extends OutputItem {
  const CodeInterpreterCallOutputItem({
    required this.id,
    required this.status,
    this.code,
    this.outputs = const [],
  });

  @override
  final String id;
  @override
  final String type = 'code_interpreter_call';
  @override
  final String status;

  /// The Python code the model generated and executed.
  final String? code;

  /// Execution outputs (logs, images, files).
  final List<CodeInterpreterOutput> outputs;

  factory CodeInterpreterCallOutputItem.fromJson(Map<String, dynamic> json) {
    final rawOutputs = json['outputs'];
    final outputs = rawOutputs is List
        ? rawOutputs
            .map((o) =>
                CodeInterpreterOutput.fromJson(o as Map<String, dynamic>))
            .toList()
        : <CodeInterpreterOutput>[];
    return CodeInterpreterCallOutputItem(
      id: json['id'] as String? ?? '',
      status: json['status'] as String? ?? '',
      code: json['code'] as String?,
      outputs: outputs,
    );
  }
}

enum CodeInterpreterOutputType { logs, image, file, unknown }

class CodeInterpreterOutput {
  const CodeInterpreterOutput({
    required this.outputType,
    this.logs,
    this.imageData,
    this.filePath,
  });

  final CodeInterpreterOutputType outputType;
  final String? logs;
  final String? imageData; // base64 PNG
  final String? filePath;

  factory CodeInterpreterOutput.fromJson(Map<String, dynamic> json) {
    final t = json['type'] as String? ?? '';
    return CodeInterpreterOutput(
      outputType: switch (t) {
        'logs' => CodeInterpreterOutputType.logs,
        'image' => CodeInterpreterOutputType.image,
        'file' => CodeInterpreterOutputType.file,
        _ => CodeInterpreterOutputType.unknown,
      },
      logs: json['logs'] as String?,
      imageData: json['image']?['data'] as String?,
      filePath: json['file']?['path'] as String?,
    );
  }
}

// Computer use preview — returned by computer-use-enabled models.
// Contains a screenshot of the desktop state at this step.
class ComputerUsePreviewOutputItem extends OutputItem {
  const ComputerUsePreviewOutputItem({
    required this.id,
    required this.status,
    this.action,
  });

  @override
  final String id;
  @override
  final String type = 'computer_use_preview';
  @override
  final String status;

  /// The action the model intends to perform (click, type, scroll, etc.).
  final Map<String, dynamic>? action;

  factory ComputerUsePreviewOutputItem.fromJson(Map<String, dynamic> json) {
    final action = json['action'];
    return ComputerUsePreviewOutputItem(
      id: json['id'] as String? ?? '',
      status: json['status'] as String? ?? '',
      action: action is Map<String, dynamic> ? action : null,
    );
  }
}

class UnknownOutputItem extends OutputItem {
  const UnknownOutputItem({
    required this.id,
    required this.type,
    required this.status,
    required this.raw,
  });

  @override
  final String id;
  @override
  final String type;
  @override
  final String status;
  final Map<String, dynamic> raw;

  factory UnknownOutputItem.fromJson(Map<String, dynamic> json) {
    return UnknownOutputItem(
      id: json['id'] as String? ?? '',
      type: json['type'] as String? ?? 'unknown',
      status: json['status'] as String? ?? '',
      raw: json,
    );
  }
}

sealed class ContentPart {
  const ContentPart();

  factory ContentPart.fromJson(Map<String, dynamic> json) {
    return switch (json['type'] as String? ?? '') {
      'output_text' => OutputTextPart.fromJson(json),
      'input_text' => InputTextPart.fromJson(json),
      'refusal' => RefusalPart.fromJson(json),
      'output_image' => OutputImagePart.fromJson(json),
      'input_image' => InputImagePart.fromJson(json),
      _ => OutputTextPart(text: json['text'] as String? ?? ''),
    };
  }
}

// The model's text reply in a message output item.
// May include annotations (citations, file references).
class OutputTextPart extends ContentPart {
  const OutputTextPart({required this.text, this.annotations = const []});
  final String text;

  /// Inline annotations — citations, URL references, file pointers.
  final List<Annotation> annotations;

  factory OutputTextPart.fromJson(Map<String, dynamic> json) {
    final rawAnnotations = json['annotations'];
    final annotations = rawAnnotations is List
        ? rawAnnotations
            .map((a) => Annotation.fromJson(a as Map<String, dynamic>))
            .toList()
        : <Annotation>[];
    return OutputTextPart(
      text: json['text'] as String? ?? '',
      annotations: annotations,
    );
  }
}

// Inline text provided as user input (appears in multi-modal requests).
class InputTextPart extends ContentPart {
  const InputTextPart({required this.text});
  final String text;

  factory InputTextPart.fromJson(Map<String, dynamic> json) {
    return InputTextPart(text: json['text'] as String? ?? '');
  }
}

class RefusalPart extends ContentPart {
  const RefusalPart({required this.refusal});
  final String refusal;

  factory RefusalPart.fromJson(Map<String, dynamic> json) {
    return RefusalPart(refusal: json['refusal'] as String? ?? '');
  }
}

// Image generated by the model (e.g. from DALL-E via image_generation tool).
// `data` is base64-encoded PNG; `url` is a hosted CDN URL (one will be set).
class OutputImagePart extends ContentPart {
  const OutputImagePart({this.data, this.url, this.detail});
  final String? data; // base64 PNG
  final String? url;
  final String? detail; // 'low' | 'high' | 'auto'

  factory OutputImagePart.fromJson(Map<String, dynamic> json) {
    final image = json['image_url'] as Map<String, dynamic>?;
    return OutputImagePart(
      data: json['data'] as String?,
      url: image?['url'] as String?,
      detail: image?['detail'] as String?,
    );
  }
}

// Image supplied as user input in a multi-modal request.
class InputImagePart extends ContentPart {
  const InputImagePart({this.url, this.detail});
  final String? url;
  final String? detail;

  factory InputImagePart.fromJson(Map<String, dynamic> json) {
    final image = json['image_url'] as Map<String, dynamic>?;
    return InputImagePart(
      url: image?['url'] as String?,
      detail: image?['detail'] as String?,
    );
  }
}

// ---------------------------------------------------------------------------
// Annotations (citations inside OutputTextPart)
// ---------------------------------------------------------------------------

enum AnnotationType { urlCitation, fileCitation, filePath, unknown }

class Annotation {
  const Annotation({
    required this.annotationType,
    this.text,
    this.url,
    this.title,
    this.fileId,
    this.filename,
    this.startIndex,
    this.endIndex,
  });

  final AnnotationType annotationType;
  final String? text;
  final String? url;
  final String? title;
  final String? fileId;
  final String? filename;
  final int? startIndex;
  final int? endIndex;

  factory Annotation.fromJson(Map<String, dynamic> json) {
    final t = json['type'] as String? ?? '';
    final urlCitation = json['url_citation'] as Map<String, dynamic>?;
    final fileCitation = json['file_citation'] as Map<String, dynamic>?;
    final filePathMap = json['file_path'] as Map<String, dynamic>?;
    return Annotation(
      annotationType: switch (t) {
        'url_citation' => AnnotationType.urlCitation,
        'file_citation' => AnnotationType.fileCitation,
        'file_path' => AnnotationType.filePath,
        _ => AnnotationType.unknown,
      },
      text: json['text'] as String?,
      url: urlCitation?['url'] as String?,
      title: urlCitation?['title'] as String?,
      fileId: (fileCitation ?? filePathMap)?['file_id'] as String?,
      filename: fileCitation?['filename'] as String?,
      startIndex: json['start_index'] as int?,
      endIndex: json['end_index'] as int?,
    );
  }
}

class OpenResponsesUsage {
  const OpenResponsesUsage({
    required this.inputTokens,
    required this.outputTokens,
    required this.totalTokens,
  });

  final int inputTokens;
  final int outputTokens;
  final int totalTokens;

  factory OpenResponsesUsage.fromJson(Map<String, dynamic> json) {
    return OpenResponsesUsage(
      inputTokens: json['input_tokens'] as int? ?? 0,
      outputTokens: json['output_tokens'] as int? ?? 0,
      totalTokens: json['total_tokens'] as int? ?? 0,
    );
  }
}

class OpenResponsesResult {
  const OpenResponsesResult({
    required this.id,
    required this.model,
    required this.status,
    required this.output,
    this.previousResponseId,
    this.usage,
  });

  final String id;
  final String model;
  final String status;
  final List<OutputItem> output;
  final String? previousResponseId;
  final OpenResponsesUsage? usage;

  static bool isOpenResponsesFormat(Map<String, dynamic> json) {
    return json['object'] == 'response' &&
        json['output'] is List &&
        json.containsKey('id');
  }

  factory OpenResponsesResult.fromJson(Map<String, dynamic> json) {
    final rawOutput = json['output'] as List? ?? [];
    return OpenResponsesResult(
      id: json['id'] as String? ?? '',
      model: json['model'] as String? ?? '',
      status: json['status'] as String? ?? '',
      output: rawOutput
          .map((e) => OutputItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      previousResponseId: json['previous_response_id'] as String?,
      usage: json['usage'] != null
          ? OpenResponsesUsage.fromJson(json['usage'] as Map<String, dynamic>)
          : null,
    );
  }
}

/// Parses Open Responses SSE stream events into a live list of [OutputItem]s.
///
/// Handles the full event surface of the Responses API streaming protocol:
///
/// Item lifecycle:
///   response.output_item.added        — new item started (snapshot at t=0)
///   response.output_item.done         — item fully received (authoritative)
///
/// Text deltas (incremental) + done (authoritative final value):
///   response.output_text.delta / .done
///   response.reasoning_summary_text.delta / .done
///   response.function_call_arguments.delta / .done
///
/// Terminal events:
///   response.completed                — full response object, highest priority
///   response.failed                   — response failed, parsed as completed
///   response.incomplete               — response cut off, parsed as completed
///
/// Stream-level error:
///   error                             — stream error; items built so far returned
///
/// Rule: authoritative sources win over delta accumulation.
/// Priority: response.completed > response.output_item.done > deltas.
class OpenResponsesStreamParser {
  /// Returns true if [sseOutput] contains Open Responses stream events.
  static bool isOpenResponsesStream(List<String> sseOutput) {
    for (final line in sseOutput) {
      final t = line.trim();
      if (!t.startsWith('data: ')) continue;
      final data = t.substring(6).trim();
      if (data.isEmpty || data == '[DONE]') continue;
      try {
        final json = jsonDecode(data);
        if (json is Map<String, dynamic>) {
          final type = json['type'] as String? ?? '';
          if (type.startsWith('response.output_item') ||
              type == 'response.completed' ||
              type == 'response.failed' ||
              type == 'response.incomplete' ||
              type == 'response.created') {
            return true;
          }
        }
      } catch (_) {}
    }
    return false;
  }

  /// Parses [sseOutput] into the current list of [OutputItem]s.
  ///
  /// If a `response.completed` event is present the final full result is used.
  /// Otherwise items are built incrementally from in-progress events.
  static List<OutputItem> parse(List<String> sseOutput) {
    // index → mutable item JSON
    final Map<int, Map<String, dynamic>> items = {};
    final Map<int, StringBuffer> textBuf = {};
    final Map<int, StringBuffer> reasoningBuf = {};
    final Map<int, StringBuffer> argsBuf = {};
    OpenResponsesResult? completed;

    for (final line in sseOutput) {
      final t = line.trim();
      if (!t.startsWith('data: ')) continue;
      final data = t.substring(6).trim();
      if (data.isEmpty || data == '[DONE]') continue;

      Map<String, dynamic> json;
      try {
        json = jsonDecode(data) as Map<String, dynamic>;
      } catch (_) {
        continue;
      }

      final type = json['type'] as String? ?? '';

      switch (type) {
        case 'response.output_item.added':
          final idx = json['output_index'] as int? ?? 0;
          final item =
              Map<String, dynamic>.from(json['item'] as Map? ?? {});
          items[idx] = item;
          final itemType = item['type'] as String? ?? '';
          if (itemType == 'message') textBuf[idx] = StringBuffer();
          if (itemType == 'reasoning') reasoningBuf[idx] = StringBuffer();
          if (itemType == 'function_call') argsBuf[idx] = StringBuffer();

        case 'response.output_text.delta':
          final idx = json['output_index'] as int? ?? 0;
          textBuf[idx]?.write(json['delta'] as String? ?? '');
          if (items.containsKey(idx)) {
            items[idx] = {
              ...items[idx]!,
              'content': [
                {'type': 'output_text', 'text': textBuf[idx]!.toString()}
              ],
            };
          }

        case 'response.reasoning_summary_text.delta':
          final idx = json['output_index'] as int? ?? 0;
          reasoningBuf[idx]?.write(json['delta'] as String? ?? '');
          if (items.containsKey(idx)) {
            items[idx] = {
              ...items[idx]!,
              'summary': [
                {'text': reasoningBuf[idx]!.toString()}
              ],
            };
          }

        case 'response.function_call_arguments.delta':
          final idx = json['output_index'] as int? ?? 0;
          argsBuf[idx]?.write(json['delta'] as String? ?? '');
          if (items.containsKey(idx)) {
            items[idx] = {
              ...items[idx]!,
              'arguments': argsBuf[idx]!.toString(),
            };
          }

        // ── Authoritative .done events override accumulated deltas ─────────

        case 'response.output_text.done':
          // Definitive final text for a message item — preferred over deltas.
          final idx = json['output_index'] as int? ?? 0;
          final text = json['text'] as String? ?? '';
          if (items.containsKey(idx)) {
            items[idx] = {
              ...items[idx]!,
              'content': [
                {'type': 'output_text', 'text': text}
              ],
            };
          }

        case 'response.reasoning_summary_text.done':
          // Definitive final reasoning summary text.
          final idx = json['output_index'] as int? ?? 0;
          final text = json['text'] as String? ?? '';
          if (items.containsKey(idx)) {
            items[idx] = {
              ...items[idx]!,
              'summary': [
                {'text': text}
              ],
            };
          }

        case 'response.function_call_arguments.done':
          // Definitive final arguments string for a function call.
          final idx = json['output_index'] as int? ?? 0;
          final args = json['arguments'] as String? ?? '';
          if (items.containsKey(idx)) {
            items[idx] = {
              ...items[idx]!,
              'arguments': args,
            };
          }

        case 'response.output_item.done':
          // Whole-item snapshot — most authoritative per-item source.
          final idx = json['output_index'] as int? ?? 0;
          final item = json['item'] as Map<String, dynamic>?;
          if (item != null) items[idx] = item;

        // ── Terminal response events ────────────────────────────────────────

        case 'response.completed':
          final response = json['response'] as Map<String, dynamic>?;
          if (response != null) {
            try {
              completed = OpenResponsesResult.fromJson(response);
            } catch (_) {}
          }

        case 'response.failed':
          // Response failed — still parse whatever the server returned.
          final response = json['response'] as Map<String, dynamic>?;
          if (response != null) {
            try {
              completed = OpenResponsesResult.fromJson(response);
            } catch (_) {}
          }

        case 'response.incomplete':
          // Response was cut off (e.g. max_output_tokens reached).
          final response = json['response'] as Map<String, dynamic>?;
          if (response != null) {
            try {
              completed = OpenResponsesResult.fromJson(response);
            } catch (_) {}
          }

        // 'error' events and all other event types are intentionally ignored:
        // items built so far are returned as-is.
      }
    }

    if (completed != null) return completed.output;

    final sorted = items.keys.toList()..sort();
    final result = <OutputItem>[];
    for (final k in sorted) {
      try {
        result.add(OutputItem.fromJson(items[k]!));
      } catch (_) {}
    }
    return result;
  }
}
