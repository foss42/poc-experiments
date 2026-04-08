import 'package:flutter/material.dart';
import '../models/items/message_item.dart';

class MessageCard extends StatelessWidget {
  final MessageItem item;

  const MessageCard({super.key, required this.item});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final isAssistant = item.role == 'assistant';

    final chipColor = isAssistant
        ? colorScheme.primaryContainer
        : colorScheme.surfaceContainerHighest;
    final chipTextColor = isAssistant
        ? colorScheme.onPrimaryContainer
        : colorScheme.onSurfaceVariant;

    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: chipColor,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                item.role,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: chipTextColor,
                  letterSpacing: 0.3,
                ),
              ),
            ),
            const SizedBox(height: 10),
            Text(
              item.fullText,
              style: TextStyle(
                fontSize: 14,
                height: 1.6,
                color: colorScheme.onSurface,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
