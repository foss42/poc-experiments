import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import '../app/theme.dart';
import '../providers/providers.dart';
import '../models/evaluation.dart';
import '../widgets/shared_widgets.dart';

// Five-level score colours (darkest = bad, brightest = good)
const _levelColors = {
  1: Color(0xFFEF5350), // Non-Responsive — red
  2: Color(0xFFFF8A65), // Mismatch — orange
  3: Color(0xFFFFD54F), // Indirect Match — amber
  4: Color(0xFF66BB6A), // Partial Match — light green
  5: Color(0xFF26A69A), // Full Match — teal
};

Color _colorForLevel(int level) =>
    _levelColors[level] ?? AppTheme.textSecondary;

class ResultsScreen extends ConsumerStatefulWidget {
  const ResultsScreen({super.key});

  @override
  ConsumerState<ResultsScreen> createState() => _ResultsScreenState();
}

class _ResultsScreenState extends ConsumerState<ResultsScreen> {
  EvaluationRun? _selectedRun;
  List<EvaluationResult>? _results;
  // Filter: null = all, 1-5 = specific level
  int? _filterLevel;

  Future<void> _loadResults(EvaluationRun run) async {
    try {
      final api = ref.read(apiServiceProvider);
      final results = await api.getEvaluationResults(run.id);
      setState(() {
        _selectedRun = run;
        _results = results;
        _filterLevel = null;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load results: $e'),
            backgroundColor: AppTheme.error,
          ),
        );
      }
    }
  }

  List<EvaluationResult> get _filteredResults {
    if (_results == null) return [];
    if (_filterLevel == null) return _results!;
    return _results!.where((r) => r.scoreLevel.value == _filterLevel).toList();
  }

  @override
  Widget build(BuildContext context) {
    final evalsAsync = ref.watch(evaluationsProvider);

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.analytics, color: AppTheme.primary, size: 28),
              SizedBox(width: 12),
              Text(
                'Results Dashboard',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Run selector
          evalsAsync.when(
            loading: () => const LinearProgressIndicator(),
            error: (e, _) => Text('Error: $e'),
            data: (runs) {
              final completedRuns =
                  runs.where((r) => r.isCompleted).toList();
              return DropdownButtonFormField<String>(
                initialValue: _selectedRun?.id,
                decoration: const InputDecoration(
                  labelText: 'Select Evaluation Run',
                ),
                dropdownColor: AppTheme.surfaceVariant,
                items: completedRuns
                    .map(
                      (r) => DropdownMenuItem(
                        value: r.id,
                        child: Text(
                          'Run ${r.id.substring(0, 8)}  •  '
                          'Hard ${(r.hardScore * 100).toStringAsFixed(1)}%  '
                          'Soft ${(r.softScore * 100).toStringAsFixed(1)}%  '
                          'GZW ${(r.grayZoneWidth * 100).toStringAsFixed(1)}%',
                        ),
                      ),
                    )
                    .toList(),
                onChanged: (id) {
                  if (id != null) {
                    final run =
                        completedRuns.firstWhere((r) => r.id == id);
                    _loadResults(run);
                  }
                },
              );
            },
          ),
          const SizedBox(height: 24),

          if (_selectedRun != null && _results != null)
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ── Dual-metric cards ──────────────────────────────────
                    Row(
                      children: [
                        Expanded(
                          child: MetricCard(
                            label: 'Hard Score',
                            value:
                                '${(_selectedRun!.hardScore * 100).toStringAsFixed(1)}%',
                            icon: Icons.verified,
                            color: _levelColors[5]!,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: MetricCard(
                            label: 'Soft Score',
                            value:
                                '${(_selectedRun!.softScore * 100).toStringAsFixed(1)}%',
                            icon: Icons.check_circle_outline,
                            color: _levelColors[4]!,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: MetricCard(
                            label: 'Gray Zone Width',
                            value:
                                '${(_selectedRun!.grayZoneWidth * 100).toStringAsFixed(1)}%',
                            icon: Icons.blur_on,
                            color: _levelColors[3]!,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: MetricCard(
                            label: 'Avg Latency',
                            value:
                                '${_selectedRun!.avgLatencyMs.toStringAsFixed(0)} ms',
                            icon: Icons.speed,
                            color: AppTheme.warning,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: MetricCard(
                            label: 'Total Requests',
                            value: '${_selectedRun!.totalItems}',
                            icon: Icons.send,
                            color: AppTheme.secondary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // ── Charts row ─────────────────────────────────────────
                    SizedBox(
                      height: 280,
                      child: Row(
                        children: [
                          // Five-level distribution pie chart
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.all(20),
                              decoration: BoxDecoration(
                                color: AppTheme.card,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: AppTheme.border),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Quality Distribution',
                                    style: TextStyle(
                                        fontWeight: FontWeight.w600),
                                  ),
                                  const SizedBox(height: 8),
                                  Expanded(
                                    child: Row(
                                      children: [
                                        // Pie
                                        Expanded(
                                          child: PieChart(
                                            PieChartData(
                                              sectionsSpace: 3,
                                              centerSpaceRadius: 32,
                                              pieTouchData: PieTouchData(
                                                touchCallback:
                                                    (event, response) {
                                                  if (event
                                                          is FlTapUpEvent &&
                                                      response?.touchedSection !=
                                                          null) {
                                                    final idx = response!
                                                        .touchedSection!
                                                        .touchedSectionIndex;
                                                    final level = 5 - idx;
                                                    setState(() {
                                                      _filterLevel =
                                                          _filterLevel ==
                                                                  level
                                                              ? null
                                                              : level;
                                                    });
                                                  }
                                                },
                                              ),
                                              sections: List.generate(5,
                                                  (i) {
                                                final level = 5 - i;
                                                final count = _results!
                                                    .where((r) =>
                                                        r.scoreLevel
                                                            .value ==
                                                        level)
                                                    .length
                                                    .toDouble();
                                                return PieChartSectionData(
                                                  value: count == 0
                                                      ? 0.001
                                                      : count,
                                                  color: _colorForLevel(
                                                      level),
                                                  radius: _filterLevel ==
                                                          level
                                                      ? 58
                                                      : 48,
                                                  title: count > 0
                                                      ? '${count.toInt()}'
                                                      : '',
                                                  titleStyle:
                                                      const TextStyle(
                                                    fontSize: 11,
                                                    fontWeight:
                                                        FontWeight.w700,
                                                    color: Colors.white,
                                                  ),
                                                );
                                              }),
                                            ),
                                          ),
                                        ),
                                        // Legend
                                        Column(
                                          mainAxisAlignment:
                                              MainAxisAlignment.center,
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: List.generate(5, (i) {
                                            final level = 5 - i;
                                            final label = ScoreLevel
                                                .fromInt(level)
                                                .label;
                                            return Padding(
                                              padding:
                                                  const EdgeInsets.only(
                                                      bottom: 6),
                                              child: Row(
                                                children: [
                                                  Container(
                                                    width: 10,
                                                    height: 10,
                                                    decoration:
                                                        BoxDecoration(
                                                      color:
                                                          _colorForLevel(
                                                              level),
                                                      borderRadius:
                                                          BorderRadius
                                                              .circular(2),
                                                    ),
                                                  ),
                                                  const SizedBox(width: 6),
                                                  Text(
                                                    label,
                                                    style: TextStyle(
                                                      fontSize: 11,
                                                      color: _filterLevel ==
                                                              level
                                                          ? AppTheme.primary
                                                          : AppTheme
                                                              .textSecondary,
                                                      fontWeight:
                                                          _filterLevel ==
                                                                  level
                                                              ? FontWeight
                                                                  .w700
                                                              : FontWeight
                                                                  .normal,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            );
                                          }),
                                        ),
                                      ],
                                    ),
                                  ),
                                  if (_filterLevel != null)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 4),
                                      child: TextButton.icon(
                                        onPressed: () => setState(
                                            () => _filterLevel = null),
                                        icon: const Icon(Icons.clear,
                                            size: 14),
                                        label: const Text('Clear filter',
                                            style:
                                                TextStyle(fontSize: 12)),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),

                          // Latency bar chart (coloured by score level)
                          Expanded(
                            flex: 2,
                            child: Container(
                              padding: const EdgeInsets.all(20),
                              decoration: BoxDecoration(
                                color: AppTheme.card,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: AppTheme.border),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Per-Item Latency (ms) — colour = score level',
                                    style: TextStyle(
                                        fontWeight: FontWeight.w600),
                                  ),
                                  const SizedBox(height: 12),
                                  Expanded(
                                    child: BarChart(
                                      BarChartData(
                                        barTouchData: BarTouchData(
                                          enabled: true,
                                          touchTooltipData:
                                              BarTouchTooltipData(
                                            getTooltipItem: (
                                              group,
                                              groupIndex,
                                              rod,
                                              rodIndex,
                                            ) {
                                              return BarTooltipItem(
                                                '${rod.toY.toStringAsFixed(0)} ms',
                                                const TextStyle(
                                                  color: Colors.white,
                                                  fontSize: 12,
                                                ),
                                              );
                                            },
                                          ),
                                        ),
                                        gridData:
                                            const FlGridData(show: false),
                                        borderData:
                                            FlBorderData(show: false),
                                        titlesData: FlTitlesData(
                                          topTitles: const AxisTitles(
                                            sideTitles: SideTitles(
                                                showTitles: false),
                                          ),
                                          rightTitles: const AxisTitles(
                                            sideTitles: SideTitles(
                                                showTitles: false),
                                          ),
                                          bottomTitles: AxisTitles(
                                            sideTitles: SideTitles(
                                              showTitles: true,
                                              getTitlesWidget: (val, meta) {
                                                return Text(
                                                  '${val.toInt() + 1}',
                                                  style: const TextStyle(
                                                    fontSize: 10,
                                                    color: AppTheme
                                                        .textSecondary,
                                                  ),
                                                );
                                              },
                                            ),
                                          ),
                                        ),
                                        barGroups: _results!
                                            .take(30)
                                            .toList()
                                            .asMap()
                                            .entries
                                            .map(
                                              (e) => BarChartGroupData(
                                                x: e.key,
                                                barRods: [
                                                  BarChartRodData(
                                                    toY: e.value.latencyMs,
                                                    color: _colorForLevel(
                                                        e.value.scoreLevel
                                                            .value),
                                                    width: 8,
                                                    borderRadius:
                                                        BorderRadius
                                                            .circular(4),
                                                  ),
                                                ],
                                              ),
                                            )
                                            .toList(),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // ── Per-item results table ─────────────────────────────
                    Row(
                      children: [
                        const Text(
                          'Per-Item Results',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(width: 12),
                        if (_filterLevel != null)
                          Chip(
                            label: Text(
                              'Filtering: ${ScoreLevel.fromInt(_filterLevel!).label}',
                              style: const TextStyle(fontSize: 12),
                            ),
                            backgroundColor: _colorForLevel(_filterLevel!)
                                .withValues(alpha: 0.2),
                            deleteIcon:
                                const Icon(Icons.clear, size: 14),
                            onDeleted: () =>
                                setState(() => _filterLevel = null),
                          ),
                        const Spacer(),
                        Text(
                          '${_filteredResults.length} of ${_results!.length} items',
                          style: const TextStyle(
                            color: AppTheme.textSecondary,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Container(
                      decoration: BoxDecoration(
                        color: AppTheme.card,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: DataTable(
                          headingRowColor: WidgetStateProperty.all(
                            AppTheme.surfaceVariant,
                          ),
                          columns: const [
                            DataColumn(label: Text('#')),
                            DataColumn(label: Text('Input')),
                            DataColumn(label: Text('Expected')),
                            DataColumn(label: Text('Actual')),
                            DataColumn(label: Text('Level')),
                            DataColumn(label: Text('Hard ✓')),
                            DataColumn(label: Text('Soft ✓')),
                            DataColumn(label: Text('Latency')),
                          ],
                          rows: _filteredResults
                              .asMap()
                              .entries
                              .map(
                                (e) => DataRow(
                                  color: WidgetStateProperty.resolveWith(
                                    (states) => _colorForLevel(
                                            e.value.scoreLevel.value)
                                        .withValues(alpha: 0.07),
                                  ),
                                  cells: [
                                    DataCell(Text('${e.key + 1}')),
                                    DataCell(
                                      ConstrainedBox(
                                        constraints:
                                            const BoxConstraints(maxWidth: 200),
                                        child: Text(
                                          e.value.input,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ),
                                    DataCell(
                                      ConstrainedBox(
                                        constraints:
                                            const BoxConstraints(maxWidth: 200),
                                        child: Text(
                                          e.value.expectedOutput,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ),
                                    DataCell(
                                      ConstrainedBox(
                                        constraints:
                                            const BoxConstraints(maxWidth: 500),
                                        child: Text(
                                          e.value.actualOutput,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ),
                                    // Score level badge
                                    DataCell(
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: _colorForLevel(
                                                  e.value.scoreLevel.value)
                                              .withValues(alpha: 0.2),
                                          borderRadius:
                                              BorderRadius.circular(6),
                                          border: Border.all(
                                            color: _colorForLevel(
                                                e.value.scoreLevel.value),
                                            width: 0.8,
                                          ),
                                        ),
                                        child: Text(
                                          e.value.scoreLabel,
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600,
                                            color: _colorForLevel(
                                                e.value.scoreLevel.value),
                                          ),
                                        ),
                                      ),
                                    ),
                                    // Hard match
                                    DataCell(
                                      Icon(
                                        e.value.isHardMatch
                                            ? Icons.check_circle
                                            : Icons.radio_button_unchecked,
                                        color: e.value.isHardMatch
                                            ? _levelColors[5]!
                                            : AppTheme.textSecondary
                                                .withValues(alpha: 0.4),
                                        size: 20,
                                      ),
                                    ),
                                    // Soft match
                                    DataCell(
                                      Icon(
                                        e.value.isSoftMatch
                                            ? Icons.check_circle
                                            : Icons.radio_button_unchecked,
                                        color: e.value.isSoftMatch
                                            ? _levelColors[4]!
                                            : AppTheme.textSecondary
                                                .withValues(alpha: 0.4),
                                        size: 20,
                                      ),
                                    ),
                                    DataCell(
                                      Text(
                                          '${e.value.latencyMs.toStringAsFixed(0)} ms'),
                                    ),
                                  ],
                                ),
                              )
                              .toList(),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            )
          else
            const Expanded(
              child: Center(
                child: Text(
                  'Select a completed evaluation run to view results',
                  style: TextStyle(
                      color: AppTheme.textSecondary, fontSize: 16),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
