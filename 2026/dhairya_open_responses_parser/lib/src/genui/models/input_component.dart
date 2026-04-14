import 'genui_component.dart';

class InputComponent extends GenUIComponent {
  final String label;
  final String? placeholder;

  const InputComponent({
    required super.id,
    required this.label,
    this.placeholder,
  }) : super(type: 'input');

  factory InputComponent.fromJson(Map<String, dynamic> json) {
    return InputComponent(
      id: (json['id'] as String?) ?? '',
      label: (json['label'] as String?) ?? '',
      placeholder: json['placeholder'] as String?,
    );
  }
}
