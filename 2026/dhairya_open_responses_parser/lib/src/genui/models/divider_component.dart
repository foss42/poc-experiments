import 'genui_component.dart';

class DividerComponent extends GenUIComponent {
  const DividerComponent({required super.id}) : super(type: 'divider');

  factory DividerComponent.fromJson(Map<String, dynamic> json) {
    return DividerComponent(id: (json['id'] as String?) ?? '');
  }
}
