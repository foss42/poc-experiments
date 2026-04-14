import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../providers/compare_provider.dart';
import 'single_result_view.dart';

class ProgressView extends ConsumerWidget {
  const ProgressView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final compare = ref.watch(compareProvider);
    if (!compare.isRunning && compare.results.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (compare.isRunning) ...[
          Row(
            children: [
              Expanded(
                child: LinearProgressIndicator(
                  value: compare.progress,
                  backgroundColor: AppTheme.border,
                  color: AppTheme.primary,
                  minHeight: 4,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '${compare.done} / ${compare.total}',
                style: const TextStyle(
                    color: AppTheme.textMuted, fontSize: 11),
              ),
            ],
          ),
          const SizedBox(height: 12),
        ],
        if (compare.results.isNotEmpty) ...[
          Wrap(
            spacing: 8,
            runSpacing: 6,
            children: compare.results.map((r) {
              final metric = _primaryMetric(r.result);
              return Chip(
                label: Text(
                  r.hasError
                      ? '${r.model}: error'
                      : '${r.model}: $metric',
                  style: TextStyle(
                    fontSize: 11,
                    color: r.hasError
                        ? AppTheme.warning
                        : AppTheme.textPrimary,
                  ),
                ),
                backgroundColor: r.hasError
                    ? AppTheme.warning.withValues(alpha: 0.12)
                    : AppTheme.muted,
              );
            }).toList(),
          ),
          const SizedBox(height: 12),
        ],
        if (compare.results.length >= 2) ...[
          _CompareBarChart(results: compare.results),
          const SizedBox(height: 12),
        ],
        if (compare.isComplete && compare.results.isNotEmpty) ...[
          const Divider(color: AppTheme.border),
          const SizedBox(height: 8),
          ...compare.results.where((r) => !r.hasError).map((r) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    r.model,
                    style: const TextStyle(
                      color: AppTheme.primaryLight,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 4),
                  SingleResultView(data: r.result ?? {}),
                ],
              ),
            );
          }),
        ],
      ],
    );
  }

  static String _primaryMetric(Map<String, dynamic>? result) {
    if (result == null) return 'n/a';
    final results = (result['results'] as Map?)?.cast<String, dynamic>() ?? {};
    if (results.isEmpty) return 'n/a';
    final firstTask = results.values.first;
    final metrics = (firstTask as Map?)?.cast<String, dynamic>() ?? {};
    final entry = metrics.entries
        .firstWhere((e) => !e.key.contains('stderr'), orElse: () => const MapEntry('', 0));
    final v = entry.value;
    if (v is num) {
      return v < 1.0
          ? '${(v * 100).toStringAsFixed(1)}%'
          : v.toStringAsFixed(3);
    }
    return v.toString();
  }
}

class _CompareBarChart extends StatelessWidget {
  const _CompareBarChart({required this.results});
  final List<ModelResult> results;

  @override
  Widget build(BuildContext context) {
    final successResults = results.where((r) => !r.hasError).toList();
    if (successResults.isEmpty) return const SizedBox.shrink();

    final bars = successResults.asMap().entries.map((entry) {
      final idx = entry.key;
      final r = entry.value;
      final metric = _numericMetric(r.result);
      return BarChartGroupData(
        x: idx,
        barRods: [
          BarChartRodData(
            toY: metric,
            color: AppTheme.primary,
            width: 20,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
          ),
        ],
      );
    }).toList();

    return SizedBox(
      height: 160,
      child: BarChart(
        BarChartData(
          barGroups: bars,
          gridData: const FlGridData(show: false),
          borderData: FlBorderData(show: false),
          titlesData: FlTitlesData(
            leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (value, meta) {
                  final idx = value.toInt();
                  if (idx < 0 || idx >= successResults.length) {
                    return const SizedBox.shrink();
                  }
                  final label = successResults[idx].model;
                  final short = label.length > 10
                      ? '${label.substring(0, 10)}…'
                      : label;
                  return Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      short,
                      style: const TextStyle(
                          color: AppTheme.textMuted, fontSize: 9),
                      overflow: TextOverflow.ellipsis,
                    ),
                  );
                },
                reservedSize: 28,
              ),
            ),
          ),
        ),
      ),
    );
  }

  static double _numericMetric(Map<String, dynamic>? result) {
    if (result == null) return 0.0;
    final results = (result['results'] as Map?)?.cast<String, dynamic>() ?? {};
    if (results.isEmpty) return 0.0;
    final firstTask = results.values.first;
    final metrics = (firstTask as Map?)?.cast<String, dynamic>() ?? {};
    final entry = metrics.entries
        .firstWhere((e) => !e.key.contains('stderr'), orElse: () => const MapEntry('', 0.0));
    final v = entry.value;
    if (v is num) return v.toDouble();
    return 0.0;
  }
}
