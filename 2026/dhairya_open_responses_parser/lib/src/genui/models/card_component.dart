import 'genui_component.dart';

class CardComponent extends GenUIComponent {
  final String? title;
  final List<GenUIComponent> children;

  const CardComponent({
    required super.id,
    this.title,
    required this.children,
  }) : super(type: 'card');

  factory CardComponent.fromJson(
    Map<String, dynamic> json,
    GenUIComponent Function(Map<String, dynamic>) parseComponent,
  ) {
    final rawChildren = json['children'];
    final children = <GenUIComponent>[];
    if (rawChildren is List) {
      for (final child in rawChildren) {
        if (child is Map<String, dynamic>) {
          try {
            children.add(parseComponent(child));
          } catch (_) {}
        }
      }
    }
    return CardComponent(
      id: (json['id'] as String?) ?? '',
      title: json['title'] as String?,
      children: children,
    );
  }
}
