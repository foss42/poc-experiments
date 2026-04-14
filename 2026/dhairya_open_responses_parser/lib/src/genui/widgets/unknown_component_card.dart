import 'dart:convert';
import 'package:flutter/material.dart';
import '../models/unknown_component.dart';

class UnknownComponentCard extends StatelessWidget {
  final UnknownComponent component;

  const UnknownComponentCard({super.key, required this.component});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final rawJson = const JsonEncoder.withIndent('  ').convert(component.raw);

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFFFFBEB),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFBBF24), width: 1.5),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.warning_amber_rounded,
                  color: Color(0xFFD97706), size: 16),
              const SizedBox(width: 6),
              Text(
                'Unsupported component: ${component.type}',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF92400E),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF3C7),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              rawJson,
              style: const TextStyle(
                fontFamily: 'monospace',
                fontSize: 12,
                color: Color(0xFF78350F),
                height: 1.5,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Raw descriptor preserved',
            style: TextStyle(
              fontSize: 11,
              color: colorScheme.onSurfaceVariant,
              fontStyle: FontStyle.italic,
            ),
          ),
        ],
      ),
    );
  }
}
