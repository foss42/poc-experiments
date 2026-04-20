import 'dart:convert';

abstract class GenUIComponent {
  const GenUIComponent({required this.type, required this.id});

  final String type;
  final String id;

  Map<String, dynamic> toJson();

  static GenUIComponent fromJson(Map<String, dynamic> raw) {
    final type = _asString(raw['type']);
    final id = _asString(raw['id'], fallback: 'component_${DateTime.now().microsecondsSinceEpoch}');

    switch (type) {
      case 'text':
        return TextComponent(
          id: id,
          content: _asString(raw['content']),
          style: _asString(raw['style'], fallback: 'body'),
        );
      case 'button':
        return ButtonComponent(
          id: id,
          label: _asString(raw['label'], fallback: 'Button'),
          variant: _asString(raw['variant'], fallback: 'primary'),
        );
      case 'card':
        final rawChildren = _normalizeList(raw['children']);
        final children = rawChildren
            .map((dynamic childRaw) => _normalizeMap(childRaw))
            .map(GenUIComponent.fromJson)
            .toList(growable: false);
        return CardComponent(
          id: id,
          title: _asString(raw['title']),
          children: children,
        );
      case 'input':
        return InputComponent(
          id: id,
          label: _asString(raw['label']),
          placeholder: _asString(raw['placeholder']),
        );
      case 'divider':
        return DividerComponent(id: id);
      case 'table':
        final headers = _normalizeList(raw['headers'])
            .map((dynamic value) => _asString(value))
            .toList(growable: false);
        final rows = _normalizeList(raw['rows'])
            .map((dynamic rowRaw) => _normalizeList(rowRaw))
            .map(
              (List<dynamic> row) => row
                  .map((dynamic value) => _asString(value))
                  .toList(growable: false),
            )
            .toList(growable: false);

        return TableComponent(id: id, headers: headers, rows: rows);
      default:
        return UnknownComponent(id: id, raw: raw);
    }
  }
}

class TextComponent extends GenUIComponent {
  const TextComponent({
    required super.id,
    required this.content,
    required this.style,
  }) : super(type: 'text');

  final String content;
  final String style;

  @override
  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'type': type,
      'id': id,
      'content': content,
      'style': style,
    };
  }
}

class ButtonComponent extends GenUIComponent {
  const ButtonComponent({
    required super.id,
    required this.label,
    required this.variant,
  }) : super(type: 'button');

  final String label;
  final String variant;

  @override
  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'type': type,
      'id': id,
      'label': label,
      'variant': variant,
    };
  }
}

class CardComponent extends GenUIComponent {
  const CardComponent({
    required super.id,
    required this.title,
    required this.children,
  }) : super(type: 'card');

  final String title;
  final List<GenUIComponent> children;

  @override
  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'type': type,
      'id': id,
      'title': title,
      'children': children.map((GenUIComponent child) => child.toJson()).toList(growable: false),
    };
  }
}

class InputComponent extends GenUIComponent {
  const InputComponent({
    required super.id,
    required this.label,
    required this.placeholder,
  }) : super(type: 'input');

  final String label;
  final String placeholder;

  @override
  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'type': type,
      'id': id,
      'label': label,
      'placeholder': placeholder,
    };
  }
}

class DividerComponent extends GenUIComponent {
  const DividerComponent({required super.id}) : super(type: 'divider');

  @override
  Map<String, dynamic> toJson() {
    return <String, dynamic>{'type': type, 'id': id};
  }
}

class TableComponent extends GenUIComponent {
  const TableComponent({
    required super.id,
    required this.headers,
    required this.rows,
  }) : super(type: 'table');

  final List<String> headers;
  final List<List<String>> rows;

  @override
  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'type': type,
      'id': id,
      'headers': headers,
      'rows': rows,
    };
  }
}

class UnknownComponent extends GenUIComponent {
  const UnknownComponent({required super.id, required this.raw})
      : super(type: 'unknown');

  final Map<String, dynamic> raw;

  @override
  Map<String, dynamic> toJson() {
    return <String, dynamic>{...raw};
  }
}

class GenUIDescriptor {
  const GenUIDescriptor({
    required this.type,
    required this.version,
    required this.agent,
    required this.title,
    required this.description,
    required this.components,
    required this.raw,
  });

  final String type;
  final String version;
  final String agent;
  final String title;
  final String description;
  final List<GenUIComponent> components;
  final Map<String, dynamic> raw;

  factory GenUIDescriptor.fromJson(Map<String, dynamic> raw) {
    final normalized = _normalizeMap(raw);
    final rawComponents = _normalizeList(normalized['components']);
    final components = rawComponents
        .map((dynamic value) => _normalizeMap(value))
        .map(GenUIComponent.fromJson)
        .toList(growable: false);

    return GenUIDescriptor(
      type: _asString(normalized['type'], fallback: 'screen'),
      version: _asString(normalized['version'], fallback: '0.1.0'),
      agent: _asString(normalized['agent'], fallback: 'unknown-agent'),
      title: _asString(normalized['title']),
      description: _asString(normalized['description']),
      components: components,
      raw: normalized,
    );
  }

  factory GenUIDescriptor.fromJsonString(String source) {
    final decoded = jsonDecode(source);
    if (decoded is! Map) {
      throw const FormatException('GenUI descriptor root must be an object.');
    }

    final normalized = _normalizeMap(decoded);
    return GenUIDescriptor.fromJson(normalized);
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'type': type,
      'version': version,
      'agent': agent,
      'title': title,
      'description': description,
      'components': components
          .map((GenUIComponent component) => component.toJson())
          .toList(growable: false),
    };
  }
}

Map<String, dynamic> _normalizeMap(dynamic value) {
  if (value is Map<String, dynamic>) {
    return value.map(
      (String key, dynamic mapValue) => MapEntry(key, _normalizeValue(mapValue)),
    );
  }
  if (value is Map) {
    return value.map(
      (dynamic key, dynamic mapValue) =>
          MapEntry(key.toString(), _normalizeValue(mapValue)),
    );
  }
  return <String, dynamic>{};
}

List<dynamic> _normalizeList(dynamic value) {
  if (value is List<dynamic>) {
    return value.map(_normalizeValue).toList(growable: false);
  }
  if (value is List) {
    return value.map(_normalizeValue).toList(growable: false);
  }
  return <dynamic>[];
}

dynamic _normalizeValue(dynamic value) {
  if (value is Map) {
    return _normalizeMap(value);
  }
  if (value is List) {
    return _normalizeList(value);
  }
  return value;
}

String _asString(dynamic value, {String fallback = ''}) {
  if (value is String) {
    return value;
  }
  if (value == null) {
    return fallback;
  }
  return value.toString();
}
