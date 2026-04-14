import 'genui_component.dart';

class ButtonComponent extends GenUIComponent {
  final String label;
  final String variant;

  const ButtonComponent({
    required super.id,
    required this.label,
    this.variant = 'primary',
  }) : super(type: 'button');

  factory ButtonComponent.fromJson(Map<String, dynamic> json) {
    return ButtonComponent(
      id: (json['id'] as String?) ?? '',
      label: (json['label'] as String?) ?? '',
      variant: (json['variant'] as String?) ?? 'primary',
    );
  }
}
