import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/benchmark_config.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/eval_config_provider.dart';

class BenchmarkCard extends ConsumerWidget {
  const BenchmarkCard({super.key, required this.benchmark});

  final BenchmarkConfig benchmark;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref
        .watch(evalConfigProvider.select((c) => c.benchmark.id == benchmark.id));

    return GestureDetector(
      onTap: () =>
          ref.read(evalConfigProvider.notifier).selectBenchmark(benchmark),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: selected
              ? AppTheme.primary.withValues(alpha: 0.1)
              : AppTheme.surface,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: selected ? AppTheme.primary : AppTheme.border,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    benchmark.label,
                    style: const TextStyle(
                      color: AppTheme.textPrimary,
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                _TechTag(harness: benchmark.harness),
                const SizedBox(width: 8),
                _MetricBadge(metric: benchmark.metric),
                if (selected) ...[
                  const SizedBox(width: 8),
                  const Icon(Icons.check_circle, color: AppTheme.primary, size: 16),
                ],
              ],
            ),
            if (selected) ...[
              const SizedBox(height: 8),
              Text(
                benchmark.description,
                style: const TextStyle(
                  color: AppTheme.textMuted,
                  fontSize: 12,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _TechTag extends StatelessWidget {
  const _TechTag({required this.harness});
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

class _MetricBadge extends StatelessWidget {
  const _MetricBadge({required this.metric});
  final String metric;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: AppTheme.primary.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        metric,
        style: const TextStyle(color: AppTheme.primaryLight, fontSize: 10),
      ),
    );
  }
}
