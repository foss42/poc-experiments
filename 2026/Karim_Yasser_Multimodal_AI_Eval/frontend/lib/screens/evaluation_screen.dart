import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../app/theme.dart';
import '../providers/providers.dart';
import '../widgets/shared_widgets.dart';
import '../models/evaluation.dart';

class EvaluationScreen extends ConsumerStatefulWidget {
  const EvaluationScreen({super.key});

  @override
  ConsumerState<EvaluationScreen> createState() => _EvaluationScreenState();
}

class _EvaluationScreenState extends ConsumerState<EvaluationScreen> {
  String? _selectedDatasetId;
  String? _selectedModelId;
  bool _starting = false;
  StreamSubscription<EvaluationRun>? _sseSubscription;
  EvaluationRun? _activeRun;

  @override
  void dispose() {
    _sseSubscription?.cancel();
    super.dispose();
  }

  Future<void> _startEvaluation() async {
    if (_selectedDatasetId == null || _selectedModelId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Select both a dataset and a model'),
          backgroundColor: AppTheme.warning,
        ),
      );
      return;
    }

    setState(() => _starting = true);
    try {
      final api = ref.read(apiServiceProvider);
      final run = await api.startEvaluation(
        datasetId: _selectedDatasetId!,
        modelConfigId: _selectedModelId!,
      );
      setState(() {
        _activeRun = run;
        _starting = false;
      });
      _startSseStream(run.id);
    } catch (e) {
      setState(() => _starting = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to start: $e'),
            backgroundColor: AppTheme.error,
          ),
        );
      }
    }
  }

  void _startSseStream(String runId) {
    _sseSubscription?.cancel();
    final api = ref.read(apiServiceProvider);
    
    _sseSubscription = api.streamEvaluation(runId).listen(
      (run) {
        if (!mounted) return;
        setState(() => _activeRun = run);
        if (run.isCompleted || run.isFailed) {
          _sseSubscription?.cancel();
          ref.read(evaluationsProvider.notifier).refresh();
        }
      },
      onError: (_) {
         // Proceed gracefully
      },
      cancelOnError: false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final datasetsAsync = ref.watch(datasetsProvider);
    final modelsAsync = ref.watch(modelConfigsProvider);

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.play_circle, color: AppTheme.primary, size: 28),
              SizedBox(width: 12),
              Text(
                'Run Evaluation',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Config row
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppTheme.card,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.border),
            ),
            child: Row(
              children: [
                // Dataset selector
                Expanded(
                  child: datasetsAsync.when(
                    loading: () => const LinearProgressIndicator(),
                    error: (e, _) => Text('Error: $e'),
                    data: (datasets) => DropdownButtonFormField<String>(
                      initialValue: _selectedDatasetId,
                      decoration: const InputDecoration(
                        labelText: 'Select Dataset',
                      ),
                      dropdownColor: AppTheme.surfaceVariant,
                      items: datasets
                          .map(
                            (d) => DropdownMenuItem(
                              value: d.id,
                              child: Text('${d.name} (${d.itemCount} items)'),
                            ),
                          )
                          .toList(),
                      onChanged: (v) => setState(() => _selectedDatasetId = v),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                // Model selector
                Expanded(
                  child: modelsAsync.when(
                    loading: () => const LinearProgressIndicator(),
                    error: (e, _) => Text('Error: $e'),
                    data: (models) => DropdownButtonFormField<String>(
                      initialValue: _selectedModelId,
                      decoration: const InputDecoration(
                        labelText: 'Select Model',
                      ),
                      dropdownColor: AppTheme.surfaceVariant,
                      items: models
                          .map(
                            (m) => DropdownMenuItem(
                              value: m.id,
                              child: Text('${m.name} (${m.modelName})'),
                            ),
                          )
                          .toList(),
                      onChanged: (v) => setState(() => _selectedModelId = v),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                ElevatedButton.icon(
                  onPressed: _starting ? null : _startEvaluation,
                  icon: _starting
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.rocket_launch),
                  label: Text(_starting ? 'Starting...' : 'Start Evaluation'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Active run progress
          if (_activeRun != null) ...[
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppTheme.card,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.border),
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    AppTheme.card,
                    (_activeRun!.isCompleted
                            ? AppTheme.success
                            : _activeRun!.isFailed
                            ? AppTheme.error
                            : AppTheme.primary)
                        .withValues(alpha: 0.08),
                  ],
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Text(
                        'Current Run',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const Spacer(),
                      StatusBadge(status: _activeRun!.status),
                    ],
                  ),
                  const SizedBox(height: 16),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: LinearProgressIndicator(
                      value: _activeRun!.progress,
                      backgroundColor: AppTheme.surfaceVariant,
                      color: _activeRun!.isCompleted
                          ? AppTheme.success
                          : AppTheme.primary,
                      minHeight: 10,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${_activeRun!.completedItems} / ${_activeRun!.totalItems} items processed',
                    style: const TextStyle(color: AppTheme.textSecondary),
                  ),
                  if (_activeRun!.isCompleted) ...[
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: MetricCard(
                            label: 'Hard Score',
                            value:
                                '${(_activeRun!.hardScore * 100).toStringAsFixed(1)}%',
                            icon: Icons.check_circle,
                            color: AppTheme.success,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: MetricCard(
                            label: 'Avg Latency',
                            value:
                                '${_activeRun!.avgLatencyMs.toStringAsFixed(0)} ms',
                            icon: Icons.speed,
                            color: AppTheme.warning,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: MetricCard(
                            label: 'Total Items',
                            value: '${_activeRun!.totalItems}',
                            icon: Icons.format_list_numbered,
                            color: AppTheme.secondary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],

          // Evaluation history
          const Text(
            'Evaluation History',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: ref
                .watch(evaluationsProvider)
                .when(
                  loading: () =>
                      const Center(child: CircularProgressIndicator()),
                  error: (e, _) => Center(child: Text('Error: $e')),
                  data: (runs) => runs.isEmpty
                      ? const Center(
                          child: Text(
                            'No evaluations yet',
                            style: TextStyle(color: AppTheme.textSecondary),
                          ),
                        )
                      : ListView.builder(
                          itemCount: runs.length,
                          itemBuilder: (context, index) {
                            final run = runs[index];
                            return Card(
                              child: ListTile(
                                leading: Icon(
                                  run.isCompleted
                                      ? Icons.check_circle
                                      : run.isFailed
                                      ? Icons.error
                                      : Icons.hourglass_top,
                                  color: run.isCompleted
                                      ? AppTheme.success
                                      : run.isFailed
                                      ? AppTheme.error
                                      : AppTheme.warning,
                                ),
                                title: Text(
                                  'Run ${run.id.substring(0, 8)}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                subtitle: Text(
                                  'Hard Score: ${(run.hardScore * 100).toStringAsFixed(1)}% • '
                                  'Latency: ${run.avgLatencyMs.toStringAsFixed(0)}ms • '
                                  '${run.totalItems} items',
                                  style: const TextStyle(
                                    color: AppTheme.textSecondary,
                                  ),
                                ),
                                trailing: StatusBadge(status: run.status),
                                onTap: () {
                                  ref
                                      .read(selectedNavIndexProvider.notifier)
                                      .select(3);
                                },
                              ),
                            );
                          },
                        ),
                ),
          ),
        ],
      ),
    );
  }
}
