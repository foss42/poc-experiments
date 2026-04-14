import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';

class ResultCard extends StatelessWidget {
  const ResultCard({super.key, required this.result});

  final Map<String, dynamic> result;

  @override
  Widget build(BuildContext context) {
    final evalId = result['eval_id'] as String? ?? '';
    final evalType = result['eval_type'] as String? ?? 'single';
    final harness = result['harness'] as String? ?? '';
    final tasks = (result['tasks'] as List?)?.cast<String>() ?? [];
    final models = (result['models'] as List?)?.cast<String>() ?? [];
    final createdAt = result['created_at'] as String? ?? '';

    final isCompare = evalType == 'compare';

    return GestureDetector(
      onTap: () => context.go('/results/$evalId'),
      child: Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _EvalTypeBadge(isCompare: isCompare),
              const SizedBox(width: 8),
              _HarnessChip(harness: harness),
              const Spacer(),
              if (createdAt.isNotEmpty)
                Text(
                  _formatDate(createdAt),
                  style: const TextStyle(
                      color: AppTheme.textMuted, fontSize: 10),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            evalId,
            style: const TextStyle(
              color: AppTheme.textMuted,
              fontSize: 11,
              fontFamily: 'monospace',
            ),
          ),
          if (tasks.isNotEmpty) ...[
            const SizedBox(height: 6),
            Wrap(
              spacing: 4,
              runSpacing: 4,
              children: tasks
                  .map((t) => _SmallChip(label: t, color: AppTheme.muted))
                  .toList(),
            ),
          ],
          if (models.isNotEmpty) ...[
            const SizedBox(height: 6),
            Wrap(
              spacing: 4,
              runSpacing: 4,
              children: models.map((m) {
                final short = m.length > 28 ? '${m.substring(0, 28)}…' : m;
                return Tooltip(
                  message: m,
                  child: _SmallChip(
                    label: short,
                    color: AppTheme.primary.withValues(alpha: 0.15),
                    textColor: AppTheme.primaryLight,
                  ),
                );
              }).toList(),
            ),
          ],
        ],
      ),
      ),
    );
  }

  static String _formatDate(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')} '
          '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return iso;
    }
  }
}

class _EvalTypeBadge extends StatelessWidget {
  const _EvalTypeBadge({required this.isCompare});
  final bool isCompare;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: (isCompare ? AppTheme.compare : AppTheme.primary)
            .withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        isCompare ? 'Compare' : 'Single',
        style: TextStyle(
          color: isCompare ? AppTheme.compare : AppTheme.primary,
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _HarnessChip extends StatelessWidget {
  const _HarnessChip({required this.harness});
  final String harness;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: AppTheme.muted,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        harness,
        style: const TextStyle(color: AppTheme.textMuted, fontSize: 10),
      ),
    );
  }
}

class _SmallChip extends StatelessWidget {
  const _SmallChip({
    required this.label,
    required this.color,
    this.textColor = AppTheme.textMuted,
  });
  final String label;
  final Color color;
  final Color textColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: TextStyle(color: textColor, fontSize: 10),
      ),
    );
  }
}
