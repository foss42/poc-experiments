import '../models/response_payload.dart';

class TypeMapper {
  // This function "scans" the JSON to decide which UI to show
  static UIComponentType detectRequiredUI(dynamic json) {
    if (json is String) return UIComponentType.text;
    
    if (json is Map) {
      // If the JSON has "user" or "details", we show a Card
      if (json.containsKey('username') || json.containsKey('details')) {
        return UIComponentType.card;
      }
      // If it has a "status" code 400+, it's an error
      if (json['status_code'] != null && json['status_code'] >= 400) {
        return UIComponentType.error;
      }
    }
    
    if (json is List) return UIComponentType.dataTable;

    return UIComponentType.text;
  }
}