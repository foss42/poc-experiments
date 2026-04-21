import '../parser/open_responses_parser.dart';
import '../parser/json_to_ui_converter.dart';
import '../model/ui_block.dart';

class UIPipeline {
  bool isOpenResponses(Map<String, dynamic> json) {
  if (!json.containsKey("output")) return false;

  final out = json["output"];

  if (out is! List) return false;
  if (out.isEmpty) return false;

  return out.first is Map && out.first.containsKey("type");
}

  final _orParser = OpenResponsesParser();
  final _jsonParser = JsonToUIConverter();

List<UIBlock> parse(dynamic input) {

  if (input is Map<String, dynamic> && isOpenResponses(input)) {
    return _orParser.parse(input); // Open Responses
  }

  return _jsonParser.convert(input); // Generic JSON
}
  

}