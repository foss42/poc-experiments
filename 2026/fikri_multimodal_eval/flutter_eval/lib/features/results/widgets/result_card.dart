import 'dart:convert';

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
    final accuracy = result['accuracy'] as double?;
    final firstThumbnail = result['first_thumbnail'] as String?;

    final isCompare = evalType == 'compare';
    final isCustom = harness == 'custom' || evalType == 'custom';

    final accentColor = isCustom
        ? AppTheme.accent
        : isCompare
            ? AppTheme.compare
            : AppTheme.primary;

    return GestureDetector(
      onTap: () => context.go('/results/$evalId'),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppTheme.border),
        ),
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Left accent bar
              Container(
                width: 3,
                decoration: BoxDecoration(
                  color: accentColor,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(10),
                    bottomLeft: Radius.circular(10),
                  ),
                ),
              ),
              // Content
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 10, 10, 10),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Thumbnail (custom evals only)
                      if (isCustom && firstThumbnail != null) ...[
                        _CardThumbnail(dataUri: firstThumbnail),
                        const SizedBox(width: 10),
                      ],
                      // Text content
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Top row: type badge + harness chip + accuracy badge + date
                            Row(
                              children: [
                                _EvalTypeBadge(isCompare: isCompare, isCustom: isCustom),
                                const SizedBox(width: 6),
                                if (!isCustom) _HarnessChip(harness: harness),
                                if (!isCustom) const SizedBox(width: 6),
                                if (accuracy != null)
                                  _AccuracyBadge(accuracy: accuracy),
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
                            // Task / description row
                            if (isCustom)
                              const Text(
                                'Custom Dataset',
                                style: TextStyle(
                                  color: AppTheme.textPrimary,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                ),
                              )
                            else if (tasks.isNotEmpty)
                              Wrap(
                                spacing: 4,
                                runSpacing: 4,
                                children: tasks
                                    .map((t) =>
                                        _SmallChip(label: t, color: AppTheme.muted))
                                    .toList(),
                              ),
                            if (models.isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Wrap(
                                spacing: 4,
                                runSpacing: 4,
                                children: models.map((m) {
                                  final short =
                                      m.length > 30 ? '${m.substring(0, 30)}…' : m;
                                  return Tooltip(
                                    message: m,
                                    child: _SmallChip(
                                      label: short,
                                      color: accentColor.withValues(alpha: 0.12),
                                      textColor: accentColor,
                                    ),
                                  );
                                }).toList(),
                              ),
                            ],
                            const SizedBox(height: 6),
                            // Eval ID (short) + chevron
                            Row(
                              children: [
                                Text(
                                  '#${evalId.length > 8 ? evalId.substring(0, 8) : evalId}',
                                  style: const TextStyle(
                                    color: AppTheme.textMuted,
                                    fontSize: 10,
                                    fontFamily: 'monospace',
                                  ),
                                ),
                                const Spacer(),
                                const Icon(Icons.chevron_right,
                                    size: 16, color: AppTheme.textMuted),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
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
  const _EvalTypeBadge({required this.isCompare, required this.isCustom});
  final bool isCompare;
  final bool isCustom;

  @override
  Widget build(BuildContext context) {
    final label = isCustom ? 'Custom' : isCompare ? 'Compare' : 'Single';
    final color = isCustom
        ? AppTheme.accent
        : isCompare
            ? AppTheme.compare
            : AppTheme.primary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
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

class _AccuracyBadge extends StatelessWidget {
  const _AccuracyBadge({required this.accuracy});
  final double accuracy;

  @override
  Widget build(BuildContext context) {
    final pct = (accuracy * 100).toStringAsFixed(1);
    final color = accuracy > 0 ? AppTheme.accent : AppTheme.warning;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        '$pct%',
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _CardThumbnail extends StatelessWidget {
  const _CardThumbnail({required this.dataUri});
  final String dataUri;

  @override
  Widget build(BuildContext context) {
    try {
      final b64 = dataUri.contains(',') ? dataUri.split(',').last : dataUri;
      final bytes = base64Decode(b64);
      return ClipRRect(
        borderRadius: BorderRadius.circular(6),
        child: Image.memory(
          bytes,
          width: 52,
          height: 52,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _placeholder(),
        ),
      );
    } catch (_) {
      return _placeholder();
    }
  }

  Widget _placeholder() => Container(
        width: 52,
        height: 52,
        decoration: BoxDecoration(
          color: AppTheme.muted,
          borderRadius: BorderRadius.circular(6),
        ),
        alignment: Alignment.center,
        child: const Icon(Icons.image_outlined,
            size: 20, color: AppTheme.textMuted),
      );
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
