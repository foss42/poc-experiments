import 'package:flutter/material.dart';
import '../models/genui_descriptor.dart';
import '../registry/genui_component_registry.dart';

/// Main container widget that renders a full GenUI descriptor as a live
/// widget preview inside API Dash. No external runtime required.
class GenUIPreviewPanel extends StatelessWidget {
  final GenUIDescriptor descriptor;
  final GenUIComponentRegistry registry;

  const GenUIPreviewPanel({
    super.key,
    required this.descriptor,
    required this.registry,
  });

  /// Convenience constructor that uses the default registry.
  factory GenUIPreviewPanel.withDefaultRegistry({
    Key? key,
    required GenUIDescriptor descriptor,
  }) {
    return GenUIPreviewPanel(
      key: key,
      descriptor: descriptor,
      registry: GenUIComponentRegistry.defaultRegistry(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colorScheme.outlineVariant, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _GenUIHeaderBar(descriptor: descriptor),
          if (descriptor.title != null || descriptor.description != null)
            _GenUITitleSection(descriptor: descriptor),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  ...descriptor.components.map(
                    (component) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: registry.build(component),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _GenUIHeaderBar extends StatelessWidget {
  final GenUIDescriptor descriptor;

  const _GenUIHeaderBar({required this.descriptor});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
        border: Border(
          bottom: BorderSide(color: colorScheme.outlineVariant, width: 0.5),
        ),
      ),
      child: Row(
        children: [
          Icon(Icons.widgets_outlined, size: 14, color: colorScheme.primary),
          const SizedBox(width: 6),
          Text(
            'GenUI Preview',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: colorScheme.primary,
              letterSpacing: 0.5,
            ),
          ),
          const Spacer(),
          if (descriptor.agent != null) ...[
            Text(
              'agent: ${descriptor.agent}',
              style: TextStyle(
                fontFamily: 'monospace',
                fontSize: 11,
                color: colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(width: 8),
          ],
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
            decoration: BoxDecoration(
              color: colorScheme.primaryContainer,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              'v${descriptor.version}',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: colorScheme.onPrimaryContainer,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _GenUITitleSection extends StatelessWidget {
  final GenUIDescriptor descriptor;

  const _GenUITitleSection({required this.descriptor});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: colorScheme.outlineVariant, width: 0.5),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (descriptor.title != null)
            Text(
              descriptor.title!,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: colorScheme.onSurface,
              ),
            ),
          if (descriptor.title != null && descriptor.description != null)
            const SizedBox(height: 4),
          if (descriptor.description != null)
            Text(
              descriptor.description!,
              style: TextStyle(
                fontSize: 13,
                color: colorScheme.onSurfaceVariant,
                height: 1.5,
              ),
            ),
        ],
      ),
    );
  }
}
