import 'dart:convert';

class DatasetItem {
  final String input;
  final String expectedOutput;

  DatasetItem({required this.input, required this.expectedOutput});

  factory DatasetItem.fromJson(Map<String, dynamic> json) {
    var rawExpected = json['expected_output'];
    String expected = '';
    if (rawExpected is List) {
      expected = rawExpected.map((e) => e.toString()).join(', ');
    } else if (rawExpected is String) {
      if (rawExpected.trim().startsWith('[') && rawExpected.trim().endsWith(']')) {
        try {
          var decoded = jsonDecode(rawExpected);
          if (decoded is List) {
            expected = decoded.map((e) => e.toString()).join(', ');
          } else {
            expected = rawExpected;
          }
        } catch (_) {
          expected = rawExpected;
        }
      } else {
        expected = rawExpected;
      }
    } else if (rawExpected != null) {
      expected = rawExpected.toString();
    }

    return DatasetItem(
      input: json['input'] ?? '',
      expectedOutput: expected,
    );
  }
}
class Dataset {
  final String id;
  final String name;
  final String description;
  final int itemCount;
  final String createdAt;
  final List<DatasetItem>? items;

  Dataset({
    required this.id,
    required this.name,
    required this.description,
    required this.itemCount,
    required this.createdAt,
    this.items,
  });

  factory Dataset.fromJson(Map<String, dynamic> json) {
    return Dataset(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      itemCount: json['item_count'] ?? 0,
      createdAt: json['created_at'] ?? '',
      items: json['items'] != null
          ? (json['items'] as List).map((e) => DatasetItem.fromJson(e)).toList()
          : null,
    );
  }
}
