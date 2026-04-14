import 'dart:convert';

abstract class ResponseItem {
  const ResponseItem();
}

class ReasoningItem extends ResponseItem {
  const ReasoningItem({required this.id, required this.summaryText});

  final String id;
  final String summaryText;
}

class FunctionCallItem extends ResponseItem {
  const FunctionCallItem({
    required this.id,
    required this.callId,
    required this.name,
    required this.arguments,
  });

  final String id;
  final String callId;
  final String name;
  final Map<String, dynamic> arguments;
}

class FunctionCallOutputItem extends ResponseItem {
  const FunctionCallOutputItem({
    required this.callId,
    required this.parsedOutput,
  });

  final String callId;
  final Map<String, dynamic> parsedOutput;
}

class MessageItem extends ResponseItem {
  const MessageItem({required this.role, required this.text});

  final String role;
  final String text;
}

class UnknownItem extends ResponseItem {
  const UnknownItem({required this.raw});

  final Map<String, dynamic> raw;
}

class CorrelatedCall {
  const CorrelatedCall({
    required this.call,
    required this.output,
    required this.isComplete,
  });

  final FunctionCallItem call;
  final FunctionCallOutputItem? output;
  final bool isComplete;
}

class ParsedResponse {
  const ParsedResponse({
    required this.id,
    required this.status,
    required this.model,
    required this.items,
    required this.correlatedCalls,
    required this.totalTokens,
  });

  final String id;
  final String status;
  final String model;
  final List<ResponseItem> items;
  final List<CorrelatedCall> correlatedCalls;
  final int? totalTokens;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'status': status,
      'model': model,
      'total_tokens': totalTokens,
      'items': items.map(itemToJson).toList(growable: false),
      'correlated_calls': correlatedCalls
          .map(
            (pair) => <String, dynamic>{
              'call': itemToJson(pair.call),
              'output': pair.output == null ? null : itemToJson(pair.output!),
              'is_complete': pair.isComplete,
            },
          )
          .toList(growable: false),
    };
  }
}

Map<String, dynamic> itemToJson(ResponseItem item) {
  if (item is ReasoningItem) {
    return <String, dynamic>{
      'type': 'reasoning',
      'id': item.id,
      'summary_text': item.summaryText,
    };
  }
  if (item is FunctionCallItem) {
    return <String, dynamic>{
      'type': 'function_call',
      'id': item.id,
      'call_id': item.callId,
      'name': item.name,
      'arguments': item.arguments,
    };
  }
  if (item is FunctionCallOutputItem) {
    return <String, dynamic>{
      'type': 'function_call_output',
      'call_id': item.callId,
      'parsed_output': item.parsedOutput,
    };
  }
  if (item is MessageItem) {
    return <String, dynamic>{
      'type': 'message',
      'role': item.role,
      'text': item.text,
    };
  }
  if (item is UnknownItem) {
    return <String, dynamic>{'type': 'unknown', 'raw': item.raw};
  }

  return <String, dynamic>{
    'type': 'unsupported',
    'raw': jsonDecode(jsonEncode(item.toString())),
  };
}
