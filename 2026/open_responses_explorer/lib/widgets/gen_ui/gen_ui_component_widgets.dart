import 'package:flutter/material.dart';

import '../../domain/gen_ui_models.dart';

const Color _primaryBlue = Color(0xFF2563EB);

class GenUITextWidget extends StatelessWidget {
  const GenUITextWidget({super.key, required this.component});

  final TextComponent component;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    TextStyle? style;

    switch (component.style) {
      case 'heading':
        style = theme.textTheme.headlineSmall?.copyWith(
          fontWeight: FontWeight.w700,
          fontSize: 24,
        );
      case 'subheading':
        style = theme.textTheme.titleMedium?.copyWith(
          fontWeight: FontWeight.w700,
          fontSize: 18,
        );
      case 'caption':
        style = theme.textTheme.bodySmall?.copyWith(
          color: theme.colorScheme.onSurfaceVariant,
        );
      case 'body':
      default:
        style = theme.textTheme.bodyMedium;
    }

    return Text(component.content, style: style);
  }
}

class GenUIButtonWidget extends StatelessWidget {
  const GenUIButtonWidget({super.key, required this.component});

  final ButtonComponent component;

  @override
  Widget build(BuildContext context) {
    switch (component.variant) {
      case 'outlined':
        return OutlinedButton(onPressed: () {}, child: Text(component.label));
      case 'secondary':
        return FilledButton.tonal(onPressed: () {}, child: Text(component.label));
      case 'primary':
      default:
        return FilledButton(onPressed: () {}, child: Text(component.label));
    }
  }
}

class GenUICardWidget extends StatelessWidget {
  const GenUICardWidget({
    super.key,
    required this.component,
    required this.children,
  });

  final CardComponent component;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: EdgeInsets.zero,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: theme.colorScheme.outlineVariant),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            if (component.title.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Text(
                  component.title,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            for (var i = 0; i < children.length; i++) ...<Widget>[
              children[i],
              if (i != children.length - 1) const SizedBox(height: 10),
            ],
          ],
        ),
      ),
    );
  }
}

class GenUIInputWidget extends StatelessWidget {
  const GenUIInputWidget({super.key, required this.component});

  final InputComponent component;

  @override
  Widget build(BuildContext context) {
    return TextField(
      readOnly: true,
      decoration: InputDecoration(
        labelText: component.label,
        hintText: component.placeholder,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }
}

class GenUIDividerWidget extends StatelessWidget {
  const GenUIDividerWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return const Divider(height: 1);
  }
}

class GenUITableWidget extends StatelessWidget {
  const GenUITableWidget({super.key, required this.component});

  final TableComponent component;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: Table(
        border: TableBorder.symmetric(
          inside: BorderSide(color: theme.colorScheme.outlineVariant),
        ),
        children: <TableRow>[
          TableRow(
            decoration: BoxDecoration(
              color: _primaryBlue.withValues(alpha: 0.08),
            ),
            children: component.headers
                .map(
                  (String header) => Padding(
                    padding: const EdgeInsets.all(10),
                    child: Text(
                      header,
                      style: theme.textTheme.labelLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                )
                .toList(growable: false),
          ),
          for (final List<String> row in component.rows)
            TableRow(
              children: row
                  .map(
                    (String value) => Padding(
                      padding: const EdgeInsets.all(10),
                      child: Text(value, style: theme.textTheme.bodyMedium),
                    ),
                  )
                  .toList(growable: false),
            ),
        ],
      ),
    );
  }
}

class UnknownComponentCard extends StatelessWidget {
  const UnknownComponentCard({
    super.key,
    required this.raw,
    required this.type,
  });

  final Map<String, dynamic> raw;
  final String type;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFD97706).withValues(alpha: 0.5)),
        color: const Color(0xFFD97706).withValues(alpha: 0.1),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            'Unsupported component: $type',
            style: theme.textTheme.titleSmall?.copyWith(
              color: const Color(0xFFD97706),
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            raw.toString(),
            style: theme.textTheme.bodySmall?.copyWith(
              fontFamily: 'monospace',
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}
