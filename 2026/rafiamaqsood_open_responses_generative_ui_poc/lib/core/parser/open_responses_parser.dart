import '../model/ui_block.dart';
import 'dart:convert';

class OpenResponsesParser {
  List<UIBlock> parse(Map<String, dynamic> json) {
    final output = json['output'];

    if (output is! List) {
      return [
        UIBlock(type: UIBlockType.text, value: "Invalid Open Response format"),
      ];
    }

    return output.map<UIBlock>((item) {
      final type = item['type'];

      switch (type) {
        case "output_text":
          return UIBlock(type: UIBlockType.text, value: item['text'] ?? "");

        case "output_image":
          return UIBlock(
            type: UIBlockType.image,
            value: item['image_url'] ?? "",
          );
        case "output_markdown":
          return UIBlock(
            type: UIBlockType.markdown,
            value: item['markdown'] ?? item['text'] ?? "",
          );

        case "output_table":
          final columns = (item["columns"] as List?)
              ?.map((e) => e.toString())
              .toList();

          final rows = (item["rows"] as List?)
              ?.map((row) => (row as List).map((e) => e).toList())
              .toList();

          return UIBlock(type: UIBlockType.table, columns: columns, rows: rows);

        case "output_card":
          final children = item["children"] as List?;

          return UIBlock(
            type: UIBlockType.card,
            label: item["title"] ?? "Card",
            children: children != null
                ? children.map<UIBlock>((child) {
                    return parse({
                      "output": [child],
                    }).first;
                  }).toList()
                : [],
          );
        default:
          return UIBlock(
            type: UIBlockType.card,
            label: "Unknown: ${item['type']}",
            children: [
              UIBlock(
                type: UIBlockType.text,
                value: const JsonEncoder.withIndent('  ').convert(item),
              ),
            ],
          );
      }
    }).toList();
  }
}
