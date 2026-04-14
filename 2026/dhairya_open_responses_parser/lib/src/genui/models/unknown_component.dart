import 'genui_component.dart';

class UnknownComponent extends GenUIComponent {
  final Map<String, dynamic> raw;

  const UnknownComponent({
    required super.id,
    required super.type,
    required this.raw,
  });

  factory UnknownComponent.fromJson(Map<String, dynamic> json) {
    return UnknownComponent(
      id: (json['id'] as String?) ?? '',
      type: (json['type'] as String?) ?? 'unknown',
      raw: json,
    );
  }
}
