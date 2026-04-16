import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import 'providers/results_provider.dart';
import 'widgets/result_card.dart';

class ResultsScreen extends ConsumerStatefulWidget {
  const ResultsScreen({super.key});

  @override
  ConsumerState<ResultsScreen> createState() => _ResultsScreenState();
}

class _ResultsScreenState extends ConsumerState<ResultsScreen> {
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    final pos = _scrollController.position;
    if (pos.pixels >= pos.maxScrollExtent - 200) {
      ref.read(resultsProvider.notifier).loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final resultsAsync = ref.watch(resultsProvider);
    final notifier = ref.read(resultsProvider.notifier);

    return Column(
      children: [
        _ResultsHeader(
          onRefresh: notifier.refresh,
          isLoading: resultsAsync.isLoading,
        ),
        Expanded(
          child: resultsAsync.when(
            loading: () => const Center(
              child: CircularProgressIndicator(color: AppTheme.primary),
            ),
            error: (e, _) => Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.error_outline,
                      color: AppTheme.error, size: 32),
                  const SizedBox(height: 8),
                  Text(
                    e.toString(),
                    style: const TextStyle(
                        color: AppTheme.error, fontSize: 12),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton(
                    onPressed: notifier.refresh,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),
            data: (state) {
              if (state.items.isEmpty) {
                return const Center(
                  child: Text(
                    'No evaluations yet.\nRun one from the Eval tab.',
                    textAlign: TextAlign.center,
                    style:
                        TextStyle(color: AppTheme.textMuted, fontSize: 13),
                  ),
                );
              }
              return RefreshIndicator(
                onRefresh: notifier.refresh,
                color: AppTheme.primary,
                child: ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.all(16),
                  itemCount: state.items.length +
                      (_chartItems(state.items).isNotEmpty ? 1 : 0) +
                      (state.hasMore || state.isLoadingMore ? 1 : 0),
                  itemBuilder: (_, i) {
                    int offset = 0;

                    // Chart section as first item
                    final chartItems = _chartItems(state.items);
                    if (chartItems.isNotEmpty) {
                      if (i == 0) {
                        return _AccuracyChart(items: chartItems);
                      }
                      offset = 1;
                    }

                    final listIndex = i - offset;
                    if (listIndex < state.items.length) {
                      return ResultCard(result: state.items[listIndex]);
                    }

                    // Footer: loading indicator or spacer
                    return state.isLoadingMore
                        ? const Padding(
                            padding: EdgeInsets.symmetric(vertical: 16),
                            child: Center(
                              child: SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: AppTheme.primary),
                              ),
                            ),
                          )
                        : const SizedBox(height: 16);
                  },
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  /// Returns the subset of items that have accuracy data (custom evals).
  static List<Map<String, dynamic>> _chartItems(
      List<Map<String, dynamic>> items) {
    return items
        .where((r) => r['accuracy'] != null)
        .toList()
        .reversed
        .take(10)
        .toList();
  }
}

// ─── Accuracy chart ───────────────────────────────────────────────────────

class _AccuracyChart extends StatelessWidget {
  const _AccuracyChart({required this.items});

  final List<Map<String, dynamic>> items;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Custom Eval Accuracy',
            style: TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 12,
                fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 2),
          Text(
            'Last ${items.length} evaluation${items.length == 1 ? '' : 's'}',
            style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 120,
            child: BarChart(
              BarChartData(
                barGroups: items.asMap().entries.map((entry) {
                  final accuracy =
                      (entry.value['accuracy'] as num?)?.toDouble() ?? 0.0;
                  return BarChartGroupData(
                    x: entry.key,
                    barRods: [
                      BarChartRodData(
                        toY: accuracy * 100,
                        color: AppTheme.accent,
                        width: 16,
                        borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(3)),
                      ),
                    ],
                  );
                }).toList(),
                maxY: 100,
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  horizontalInterval: 25,
                  getDrawingHorizontalLine: (_) => const FlLine(
                    color: AppTheme.border,
                    strokeWidth: 1,
                  ),
                ),
                borderData: FlBorderData(show: false),
                titlesData: FlTitlesData(
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 36,
                      interval: 25,
                      getTitlesWidget: (v, _) => Text(
                        '${v.toInt()}%',
                        style: const TextStyle(
                            color: AppTheme.textMuted, fontSize: 9),
                      ),
                    ),
                  ),
                  rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false)),
                  topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false)),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 24,
                      getTitlesWidget: (v, _) {
                        final idx = v.toInt();
                        if (idx < 0 || idx >= items.length) {
                          return const SizedBox.shrink();
                        }
                        final evalId =
                            items[idx]['eval_id'] as String? ?? '';
                        return Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            evalId.length > 6
                                ? evalId.substring(0, 6)
                                : evalId,
                            style: const TextStyle(
                                color: AppTheme.textMuted, fontSize: 8),
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Header ───────────────────────────────────────────────────────────────

class _ResultsHeader extends StatelessWidget {
  const _ResultsHeader({
    required this.onRefresh,
    required this.isLoading,
  });

  final Future<void> Function() onRefresh;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: AppTheme.border)),
      ),
      child: Row(
        children: [
          const Text(
            'Evaluation History',
            style: TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
          const Spacer(),
          IconButton(
            onPressed: isLoading ? null : onRefresh,
            icon: isLoading
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: AppTheme.primary),
                  )
                : const Icon(Icons.refresh,
                    color: AppTheme.textMuted, size: 18),
            tooltip: 'Refresh',
            padding: EdgeInsets.zero,
            constraints:
                const BoxConstraints(minWidth: 32, minHeight: 32),
          ),
        ],
      ),
    );
  }
}
