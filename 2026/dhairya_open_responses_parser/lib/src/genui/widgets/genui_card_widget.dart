import 'package:flutter/material.dart';
import '../models/card_component.dart';
import '../models/genui_component.dart';

class GenUICardWidget extends StatelessWidget {
  final CardComponent component;
  final Widget Function(GenUIComponent) buildChild;

  const GenUICardWidget({
    super.key,
    required this.component,
    required this.buildChild,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: colorScheme.outlineVariant, width: 0.5),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (component.title != null) ...[
              Text(
                component.title!,
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                  color: colorScheme.onSurface,
                ),
              ),
              const SizedBox(height: 12),
            ],
            ...component.children.map(
              (child) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: buildChild(child),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
