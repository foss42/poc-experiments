import 'genui_component.dart';

class TextComponent extends GenUIComponent {
  final String content;
  final String style;

  const TextComponent({
    required super.id,
    required this.content,
    this.style = 'body',
  }) : super(type: 'text');

  factory TextComponent.fromJson(Map<String, dynamic> json) {
    return TextComponent(
      id: (json['id'] as String?) ?? '',
      content: (json['content'] as String?) ?? '',
      style: (json['style'] as String?) ?? 'body',
    );
  }
}
