import 'genui_component.dart';

class TableComponent extends GenUIComponent {
  final List<String> headers;
  final List<List<String>> rows;

  const TableComponent({
    required super.id,
    required this.headers,
    required this.rows,
  }) : super(type: 'table');

  factory TableComponent.fromJson(Map<String, dynamic> json) {
    final rawHeaders = json['headers'];
    final headers = <String>[];
    if (rawHeaders is List) {
      for (final h in rawHeaders) {
        headers.add(h?.toString() ?? '');
      }
    }

    final rawRows = json['rows'];
    final rows = <List<String>>[];
    if (rawRows is List) {
      for (final row in rawRows) {
        if (row is List) {
          rows.add(row.map((cell) => cell?.toString() ?? '').toList());
        }
      }
    }

    return TableComponent(
      id: (json['id'] as String?) ?? '',
      headers: headers,
      rows: rows,
    );
  }
}
