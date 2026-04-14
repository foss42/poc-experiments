import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';

/// Displays the raw harness results as a metrics grid.
/// AC-HARD: values are taken directly from the harness JSON — no recalculation.
class SingleResultView extends StatelessWidget {
  const SingleResultView({super.key, required this.data});

  final Map<String, dynamic> data;

  static String _formatValue(dynamic v) {
    if (v is num) {
      if (v < 1.0) return '${(v * 100).toStringAsFixed(1)}%';
      return v.toStringAsFixed(3);
    }
    return v.toString();
  }

  /// Strips ",none" suffix from metric key names.
  static String _cleanKey(String key) => key.replaceAll(',none', '');

  @override
  Widget build(BuildContext context) {
    final results =
        ((data['results'] as Map?)?.cast<String, dynamic>()) ?? {};
    final evalId = data['eval_id'] as String? ?? '';

    if (results.isEmpty) {
      return const Text(
        'No results returned.',
        style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (evalId.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              'eval_id: $evalId',
              style: const TextStyle(
                color: AppTheme.textMuted,
                fontSize: 11,
                fontFamily: 'monospace',
              ),
            ),
          ),
        ...results.entries.map((taskEntry) {
          final taskName = taskEntry.key;
          final metrics =
              ((taskEntry.value as Map?)?.cast<String, dynamic>()) ?? {};
          final filteredMetrics = metrics.entries
              .where((e) => !e.key.contains('stderr'))
              .toList();

          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.muted,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    taskName,
                    style: const TextStyle(
                        color: AppTheme.textPrimary,
                        fontSize: 12,
                        fontWeight: FontWeight.w500),
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: filteredMetrics.map((e) {
                    return _MetricCard(
                      metricKey: _cleanKey(e.key),
                      value: _formatValue(e.value),
                    );
                  }).toList(),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({required this.metricKey, required this.value});

  final String metricKey;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            metricKey,
            style: const TextStyle(color: AppTheme.textMuted, fontSize: 10),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: const TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 15,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
