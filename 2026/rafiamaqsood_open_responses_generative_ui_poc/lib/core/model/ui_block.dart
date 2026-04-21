enum UIBlockType {
  title,
  text,
  email,
  phone,
  link,
  address,
  map,
  image,
  table,
  card,
  field,
  code,
  markdown,
}
enum ImageType {
  logo,
  thumbnail,
  avatar,
  photo,
  normal
}

class UIBlock {
  final UIBlockType type;
  final String? label;
  final dynamic value;
  final ImageType imageType;
  final List<UIBlock>? children;

  final List<String>? columns;
  final List<List<dynamic>>? rows;

  UIBlock({
    required this.type,
    this.label,
    this.value,
    this.children,
    this.columns,
    this.rows,
    this.imageType = ImageType.normal,
  });

  Map<String, dynamic> toJson() {
    return {
      "type": type.name,
      if (label != null) "label": label,
      if (value != null) "value": value,
      if (children != null)
        "children": children!.map((e) => e.toJson()).toList(),
      if (columns != null) "columns": columns,
      if (rows != null) "rows": rows,
    };
  }
}