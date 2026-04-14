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
export 'src/streaming/streaming_state.dart';
export 'src/streaming/streaming_reducer.dart';
export 'src/streaming/streaming_session.dart';
export 'src/detector/response_format.dart';
export 'src/detector/detection_result.dart';
export 'src/detector/open_responses_detector.dart';
export 'src/detector/view_router.dart';

// GenUI renderer
export 'src/genui/models/genui_component.dart';
export 'src/genui/models/text_component.dart';
export 'src/genui/models/button_component.dart';
export 'src/genui/models/card_component.dart';
export 'src/genui/models/input_component.dart';
export 'src/genui/models/divider_component.dart';
export 'src/genui/models/table_component.dart';
export 'src/genui/models/unknown_component.dart';
export 'src/genui/models/genui_descriptor.dart';
export 'src/genui/registry/genui_component_registry.dart';
export 'src/genui/widgets/genui_text_widget.dart';
export 'src/genui/widgets/genui_button_widget.dart';
export 'src/genui/widgets/genui_card_widget.dart';
export 'src/genui/widgets/genui_input_widget.dart';
export 'src/genui/widgets/genui_divider_widget.dart';
export 'src/genui/widgets/genui_table_widget.dart';
export 'src/genui/widgets/unknown_component_card.dart';
export 'src/genui/widgets/genui_preview_panel.dart';
