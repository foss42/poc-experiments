import 'package:flutter/material.dart';
import '../models/text_component.dart';

class GenUITextWidget extends StatelessWidget {
  final TextComponent component;

  const GenUITextWidget({super.key, required this.component});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final style = switch (component.style) {
      'heading' => TextStyle(
          fontSize: 22,
          fontWeight: FontWeight.w700,
          color: colorScheme.onSurface,
          height: 1.3,
        ),
      'subheading' => TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.w600,
          color: colorScheme.onSurface,
          height: 1.4,
        ),
      'caption' => TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w400,
          color: colorScheme.onSurfaceVariant,
          height: 1.4,
        ),
      _ => TextStyle(
          // body — default
          fontSize: 14,
          fontWeight: FontWeight.w400,
          color: colorScheme.onSurface,
          height: 1.6,
        ),
    };
    return Text(component.content, style: style);
  }
}
