import 'package:flutter/material.dart';
import '../models/table_component.dart';

class GenUITableWidget extends StatelessWidget {
  final TableComponent component;

  const GenUITableWidget({super.key, required this.component});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Table(
        defaultColumnWidth: const IntrinsicColumnWidth(),
        border: TableBorder.all(
          color: colorScheme.outlineVariant,
          borderRadius: BorderRadius.circular(8),
        ),
        children: [
          // Header row
          if (component.headers.isNotEmpty)
            TableRow(
              decoration: BoxDecoration(
                color: colorScheme.surfaceContainerHighest,
              ),
              children: component.headers.map((header) {
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  child: Text(
                    header,
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                      color: colorScheme.onSurface,
                    ),
                  ),
                );
              }).toList(),
            ),
          // Data rows
          ...component.rows.asMap().entries.map((entry) {
            final isOdd = entry.key.isOdd;
            return TableRow(
              decoration: BoxDecoration(
                color: isOdd
                    ? colorScheme.surfaceContainerLow
                    : colorScheme.surface,
              ),
              children: entry.value.map((cell) {
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                  child: Text(
                    cell,
                    style: TextStyle(
                      fontSize: 13,
                      color: colorScheme.onSurface,
                    ),
                  ),
                );
              }).toList(),
            );
          }),
        ],
      ),
    );
  }
}
