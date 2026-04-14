import 'genui_component.dart';
import 'text_component.dart';
import 'button_component.dart';
import 'card_component.dart';
import 'input_component.dart';
import 'divider_component.dart';
import 'table_component.dart';
import 'unknown_component.dart';

/// Top-level descriptor representing a full GenUI / A2UI screen payload.
class GenUIDescriptor {
  final String type;
  final String version;
  final String? agent;
  final String? title;
  final String? description;
  final List<GenUIComponent> components;

  const GenUIDescriptor({
    required this.type,
    required this.version,
    this.agent,
    this.title,
    this.description,
    required this.components,
  });

  factory GenUIDescriptor.fromJson(Map<String, dynamic> json) {
    final rawComponents = json['components'];
    final components = <GenUIComponent>[];

    if (rawComponents is List) {
      for (final raw in rawComponents) {
        if (raw is Map<String, dynamic>) {
          try {
            components.add(_parseComponent(raw));
          } catch (_) {
            // Never crash — fall back to UnknownComponent
            components.add(UnknownComponent.fromJson(raw));
          }
        }
      }
    }

    return GenUIDescriptor(
      type: (json['type'] as String?) ?? 'screen',
      version: (json['version'] as String?) ?? '0.1.0',
      agent: json['agent'] as String?,
      title: json['title'] as String?,
      description: json['description'] as String?,
      components: components,
    );
  }

  static GenUIComponent _parseComponent(Map<String, dynamic> json) {
    final type = (json['type'] as String?) ?? '';
    return switch (type) {
      'text' => TextComponent.fromJson(json),
      'button' => ButtonComponent.fromJson(json),
      'card' => CardComponent.fromJson(json, _parseComponent),
      'input' => InputComponent.fromJson(json),
      'divider' => DividerComponent.fromJson(json),
      'table' => TableComponent.fromJson(json),
      _ => UnknownComponent.fromJson(json),
    };
  }
}
