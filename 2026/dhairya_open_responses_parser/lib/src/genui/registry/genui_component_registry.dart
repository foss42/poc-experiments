import 'package:flutter/material.dart';
import '../models/genui_component.dart';
import '../models/text_component.dart';
import '../models/button_component.dart';
import '../models/card_component.dart';
import '../models/input_component.dart';
import '../models/divider_component.dart';
import '../models/table_component.dart';
import '../models/unknown_component.dart';
import '../widgets/genui_text_widget.dart';
import '../widgets/genui_button_widget.dart';
import '../widgets/genui_card_widget.dart';
import '../widgets/genui_input_widget.dart';
import '../widgets/genui_divider_widget.dart';
import '../widgets/genui_table_widget.dart';
import '../widgets/unknown_component_card.dart';

/// Maps component type strings to Flutter widget builders.
/// Register new component types without modifying existing code.
class GenUIComponentRegistry {
  final Map<String, Widget Function(GenUIComponent)> _builders = {};

  GenUIComponentRegistry();

  void register(String type, Widget Function(GenUIComponent) builder) {
    _builders[type] = builder;
  }

  bool supports(String type) => _builders.containsKey(type);

  Widget build(GenUIComponent component) {
    if (supports(component.type)) {
      return _builders[component.type]!(component);
    }
    // Fallback: wrap as UnknownComponent if not already
    final unknown = component is UnknownComponent
        ? component
        : UnknownComponent(
            id: component.id,
            type: component.type,
            raw: {'type': component.type, 'id': component.id},
          );
    return UnknownComponentCard(component: unknown);
  }

  /// Creates a registry pre-registered with all MVP component types.
  factory GenUIComponentRegistry.defaultRegistry() {
    final registry = GenUIComponentRegistry();

    registry.register('text', (c) => GenUITextWidget(component: c as TextComponent));

    registry.register('button', (c) => GenUIButtonWidget(component: c as ButtonComponent));

    registry.register(
      'card',
      (c) => GenUICardWidget(
        component: c as CardComponent,
        buildChild: (child) => registry.build(child),
      ),
    );

    registry.register('input', (c) => GenUIInputWidget(component: c as InputComponent));

    registry.register('divider', (c) => GenUIDividerWidget(component: c as DividerComponent));

    registry.register('table', (c) => GenUITableWidget(component: c as TableComponent));

    return registry;
  }
}
