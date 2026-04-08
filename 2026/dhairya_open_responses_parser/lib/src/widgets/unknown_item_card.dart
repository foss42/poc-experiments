import 'dart:convert';
import 'package:flutter/material.dart';
import '../models/items/unknown_item.dart';

class UnknownItemCard extends StatelessWidget {
  final UnknownItem item;

  const UnknownItemCard({super.key, required this.item});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final prettyRaw = _prettyJson(item.raw);

    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      color: const Color(0xFFFFFBEB),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFFCD34D), width: 1),
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(
                  Icons.warning_amber_rounded,
                  size: 16,
                  color: Color(0xFFD97706),
                ),
                SizedBox(width: 8),
                Text(
                  'Unsupported item type',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                    color: Color(0xFFD97706),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF3C7),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFFCD34D)),
              ),
              child: Text(
                prettyRaw,
                style: TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 12,
                  height: 1.5,
                  color: colorScheme.onSurface,
                ),
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Icon(
                  Icons.save_outlined,
                  size: 12,
                  color: const Color(0xFFD97706).withValues(alpha: 0.8),
                ),
                const SizedBox(width: 4),
                const Text(
                  'Raw data preserved',
                  style: TextStyle(
                    fontSize: 11,
                    color: Color(0xFFD97706),
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _prettyJson(dynamic raw) {
    try {
      const encoder = JsonEncoder.withIndent('  ');
      return encoder.convert(raw);
    } catch (_) {
      return raw.toString();
    }
  }
}
