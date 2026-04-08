/// Open Responses Parser — typed Dart parser for OpenAI Responses API payloads.
/// GSoC 2026 POC for API Dash (foss42/apidash).
///
/// Usage:
///   final parser = OpenResponseParser();
///   final result = parser.parse(jsonDecodedMap);
///   print(result.correlatedCalls);
library;

export 'src/models/open_response.dart';
export 'src/models/correlated_call.dart';
export 'src/models/items/reasoning_item.dart';
export 'src/models/items/function_call_item.dart';
export 'src/models/items/function_call_output_item.dart';
export 'src/models/items/message_item.dart';
export 'src/models/items/unknown_item.dart';
export 'src/parser/open_response_parser.dart';
