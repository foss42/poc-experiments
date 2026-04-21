import 'package:flutter_test/flutter_test.dart';
import '../lib/core/parser/open_responses_parser.dart';
import '../lib/core/model/ui_block.dart';
void main() {
  final parser = OpenResponsesParser();

test('parses output_text correctly', () {
    final input = {
      "output": [
        {
          "type": "output_text",
          "text": "Hello world"
        }
      ]
    };

    final result = parser.parse(input);

    expect(result.length, 1);
    expect(result.first.value, "Hello world");
    expect(result.first.type.name, "text");
  });
  test('parses output_image correctly', () {
  final input = {
    "output": [
      {
        "type": "output_image",
        "image_url": "https://example.com/image.png"
      }
    ]
  };

  final result = parser.parse(input);

  expect(result.first.type.name, "image");
  expect(result.first.value, "https://example.com/image.png");
});
test('handles invalid format safely', () {
  final input = {
    "wrong_key": []
  };

  final result = parser.parse(input);

  expect(result.isNotEmpty, true);
  expect(result.first.value.toString().contains("Invalid"), true);
});
test('parses mixed output types', () {
  final input = {
    "output": [
      {"type": "output_text", "text": "Hello"},
      {"type": "output_text", "text": "World"}
    ]
  };

  final result = parser.parse(input);

  expect(result.length, 2);
});
test('unknown type falls back safely', () {
  final input = {
    "output": [
      {
        "type": "output_video",
        "url": "abc.mp4"
      }
    ]
  };

  final result = parser.parse(input);

  expect(result.first.type.name, "text");
});
test("parses table correctly", () {
  final input = {
    "output": [
      {
        "type": "output_table",
        "columns": ["name", "age"],
        "rows": [
          ["Ali", 22],
          ["Sara", 25]
        ]
      }
    ]
  };

  final blocks = parser.parse(input);

  expect(blocks.first.type, UIBlockType.table);
});
test("handles nested card", () {
  final input = {
    "output": [
      {
        "type": "output_card",
        "children": [
          {"type": "output_text", "text": "Nested"}
        ]
      }
    ]
  };

  final blocks = parser.parse(input);

  expect(blocks.isNotEmpty, true);
});
test("handles empty response safely", () {
  final input = {"output": []};

  final blocks = parser.parse(input);

  expect(blocks.isEmpty, true);
});

test("parses output_card correctly", () {
  final input = {
    "output": [
      {
        "type": "output_card",
        "title": "User Info",
        "children": [
          {"type": "output_text", "text": "Hello"}
        ]
      }
    ]
  };

  final blocks = parser.parse(input);

  expect(blocks.first.type.name, "card");
  expect(blocks.first.children!.length, 1);
});
test("parses markdown correctly", () {
  final input = {
    "output": [
      {
        "type": "output_markdown",
        "markdown": "**Hello** _World_"
      }
    ]
  };

  final blocks = parser.parse(input);

  expect(blocks.first.type.name, "markdown");
  expect(blocks.first.value, "**Hello** _World_");
});
}