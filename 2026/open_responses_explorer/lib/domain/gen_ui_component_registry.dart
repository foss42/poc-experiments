import 'package:flutter/material.dart';

import '../widgets/gen_ui/gen_ui_component_widgets.dart';
import 'gen_ui_models.dart';

typedef GenUIChildBuilder = Widget Function(GenUIComponent component);

typedef _GenUIBuilder = Widget Function(
  BuildContext context,
  GenUIComponent component,
  GenUIChildBuilder childBuilder,
);

class GenUIComponentRegistry {
  GenUIComponentRegistry()
      : _builders = <String, _GenUIBuilder>{
          'text': (BuildContext context, GenUIComponent component, GenUIChildBuilder _) {
            return GenUITextWidget(component: component as TextComponent);
          },
          'button': (BuildContext context, GenUIComponent component, GenUIChildBuilder _) {
            return GenUIButtonWidget(component: component as ButtonComponent);
          },
          'card': (BuildContext context, GenUIComponent component, GenUIChildBuilder childBuilder) {
            final card = component as CardComponent;
            return GenUICardWidget(
              component: card,
              children: card.children
                  .map((GenUIComponent child) => childBuilder(child))
                  .toList(growable: false),
            );
          },
          'input': (BuildContext context, GenUIComponent component, GenUIChildBuilder _) {
            return GenUIInputWidget(component: component as InputComponent);
          },
          'divider': (BuildContext context, GenUIComponent component, GenUIChildBuilder _) {
            return const GenUIDividerWidget();
          },
          'table': (BuildContext context, GenUIComponent component, GenUIChildBuilder _) {
            return GenUITableWidget(component: component as TableComponent);
          },
        };

  final Map<String, _GenUIBuilder> _builders;

  bool supports(String type) => _builders.containsKey(type);

  Widget build({
    required BuildContext context,
    required GenUIComponent component,
    required GenUIChildBuilder childBuilder,
  }) {
    final builder = _builders[component.type];
    if (builder == null) {
      final unknown = component is UnknownComponent
          ? component
          : UnknownComponent(id: component.id, raw: component.toJson());
      return UnknownComponentCard(raw: unknown.raw, type: component.type);
    }

    try {
      return builder(context, component, childBuilder);
    } catch (_) {
      return UnknownComponentCard(raw: component.toJson(), type: component.type);
    }
  }
}
