import 'dart:convert';
import 'package:flutter/material.dart';
import '../models/items/function_call_output_item.dart';

class FunctionCallOutputCard extends StatelessWidget {
  final FunctionCallOutputItem item;

  const FunctionCallOutputCard({super.key, required this.item});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final prettyJson = _prettyJson(item.parsedOutput ?? {'raw': item.output});

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(12),
          bottomRight: Radius.circular(12),
        ),
        border: Border(
          top: BorderSide(color: colorScheme.outlineVariant, width: 1),
        ),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.output_rounded, size: 14, color: colorScheme.tertiary),
              const SizedBox(width: 6),
              Text(
                'Result',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: colorScheme.tertiary,
                  letterSpacing: 0.4,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: colorScheme.surface,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: colorScheme.outlineVariant),
            ),
            child: Text(
              prettyJson,
              style: TextStyle(
                fontFamily: 'monospace',
                fontSize: 12,
                height: 1.5,
                color: colorScheme.onSurface,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _prettyJson(Map<String, dynamic> map) {
    const encoder = JsonEncoder.withIndent('  ');
    return encoder.convert(map);
  }
}
