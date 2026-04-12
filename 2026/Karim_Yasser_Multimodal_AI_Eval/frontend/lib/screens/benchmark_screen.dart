import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../app/theme.dart';
import '../providers/providers.dart';
import '../widgets/shared_widgets.dart';
import '../models/benchmark.dart';

class BenchmarkScreen extends ConsumerStatefulWidget {
  const BenchmarkScreen({super.key});

  @override
  ConsumerState<BenchmarkScreen> createState() => _BenchmarkScreenState();
}

class _BenchmarkScreenState extends ConsumerState<BenchmarkScreen> {
  String? _selectedModelId;
  String _modelType = 'local-chat-completions';
  int _limit = 50;
  int _numFewshot = 0;
  final Set<String> _selectedTasks = {};
  bool _starting = false;
  StreamSubscription<BenchmarkRun>? _sseSubscription;
  BenchmarkRun? _activeRun;
  List<BenchmarkTaskResult>? _results;
  bool _hfTokenSet = false;
  bool _applyChatTemplate = true;
  bool _fewshotAsMultiturn = true;

  bool _isHuggingFaceRouterModel(List<dynamic> models) {
    if (_selectedModelId == null) return false;
    final match = models.where((m) => m.id == _selectedModelId);
    if (match.isEmpty) return false;
    final selected = match.first;
    final provider = selected.provider.toString().toLowerCase();
    final baseUrl = selected.baseUrl.toString().toLowerCase();
    return provider == 'huggingface' ||
        baseUrl.contains('router.huggingface.co');
  }

  @override
  void initState() {
    super.initState();
    _checkHfToken();
  }

  @override
  void dispose() {
    _sseSubscription?.cancel();
    super.dispose();
  }

  Future<void> _checkHfToken() async {
    try {
      final api = ref.read(apiServiceProvider);
      final token = await api.getSetting('hf_token');
      if (mounted) setState(() => _hfTokenSet = token.isNotEmpty);
    } catch (_) {}
  }

  Future<void> _showHfTokenDialog() async {
    final api = ref.read(apiServiceProvider);
    String current = '';
    try {
      current = await api.getSetting('hf_token');
    } catch (_) {}

    if (!mounted) return;
    final controller = TextEditingController(text: current);

    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.card,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.key, color: AppTheme.secondary, size: 22),
            SizedBox(width: 8),
            Text(
              'HuggingFace Token',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
            ),
          ],
        ),
        content: SizedBox(
          width: 400,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Required for downloading benchmark datasets from HuggingFace Hub. '
                'Get your token at hf.co/settings/tokens.',
                style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: controller,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'HF Token',
                  hintText: 'hf_...',
                  prefixIcon: Icon(Icons.vpn_key, size: 18),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, controller.text),
            child: const Text('Save'),
          ),
        ],
      ),
    );

    if (result != null) {
      try {
        await api.setSetting('hf_token', result);
        if (mounted) {
          setState(() => _hfTokenSet = result.isNotEmpty);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                result.isNotEmpty
                    ? 'HuggingFace token saved'
                    : 'HuggingFace token cleared',
              ),
              backgroundColor: AppTheme.success,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to save token: $e'),
              backgroundColor: AppTheme.error,
            ),
          );
        }
      }
    }
  }

  // Category metadata for display
  static const _categoryMeta = <String, (IconData, Color)>{
    'knowledge': (Icons.menu_book, Color(0xFF4FC3F7)),
    'reasoning': (Icons.psychology, Color(0xFF81C784)),
    'math': (Icons.calculate, Color(0xFFFFB74D)),
    'multimodal': (Icons.image, Color(0xFFCE93D8)),
  };

  IconData _categoryIcon(String cat) => _categoryMeta[cat]?.$1 ?? Icons.quiz;

  Color _categoryColor(String cat) =>
      _categoryMeta[cat]?.$2 ?? AppTheme.textSecondary;

  Future<void> _startBenchmark() async {
    if (_selectedModelId == null || _selectedTasks.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Select a model and at least one task'),
          backgroundColor: AppTheme.warning,
        ),
      );
      return;
    }

    setState(() => _starting = true);
    try {
      final api = ref.read(apiServiceProvider);
      final run = await api.startBenchmark(
        modelConfigId: _selectedModelId!,
        tasks: _selectedTasks.toList(),
        modelType: _modelType,
        limit: _limit,
        numFewshot: _numFewshot > 0 ? _numFewshot : null,
        applyChatTemplate: _applyChatTemplate,
        fewshotAsMultiturn: _fewshotAsMultiturn,
      );
      setState(() {
        _activeRun = run;
        _starting = false;
        _results = null;
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

    _sseSubscription = api
        .streamBenchmark(runId)
        .listen(
          (run) {
            if (!mounted) return;
            setState(() => _activeRun = run);
            if (run.isCompleted || run.isFailed) {
              _sseSubscription?.cancel();
              ref.read(benchmarkRunsProvider.notifier).refresh();
              if (run.isCompleted) _loadResults(runId);
            }
          },
          onError: (_) {},
          cancelOnError: false,
        );
  }

  Future<void> _loadResults(String runId) async {
    final api = ref.read(apiServiceProvider);
    final results = await api.getBenchmarkResults(runId);
    if (mounted) setState(() => _results = results);
  }

  @override
  Widget build(BuildContext context) {
    final tasksAsync = ref.watch(benchmarkTasksProvider);
    final modelsAsync = ref.watch(modelConfigsProvider);

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ─── Header ─────────────────────────────────
          Row(
            children: [
              const Icon(
                Icons.leaderboard,
                color: AppTheme.secondary,
                size: 28,
              ),
              const SizedBox(width: 12),
              const Text(
                'Benchmark Evaluation',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700),
              ),
              const SizedBox(width: 12),
              const _LmHarnessBadge(),
              const Spacer(),
              // HF Token settings button
              Tooltip(
                message: _hfTokenSet
                    ? 'HuggingFace token configured'
                    : 'Set HuggingFace token for dataset downloads',
                child: IconButton(
                  onPressed: _showHfTokenDialog,
                  icon: Icon(
                    _hfTokenSet ? Icons.key : Icons.key_off,
                    color: _hfTokenSet
                        ? AppTheme.success
                        : AppTheme.textSecondary,
                    size: 20,
                  ),
                  style: IconButton.styleFrom(
                    backgroundColor: _hfTokenSet
                        ? AppTheme.success.withValues(alpha: 0.12)
                        : AppTheme.surfaceVariant,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          const Text(
            'Run industry-standard benchmarks via LM Evaluation Harness',
            style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
          ),
          const SizedBox(height: 20),

          // ─── Config Bar ─────────────────────────────
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppTheme.card,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.border),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    // Model selector
                    Expanded(
                      flex: 3,
                      child: modelsAsync.when(
                        loading: () => const LinearProgressIndicator(),
                        error: (e, _) => Text('Error: $e'),
                        data: (models) {
                          _isHuggingFaceRouterModel(models);
                          return DropdownButtonFormField<String>(
                            initialValue: _selectedModelId,
                            decoration: const InputDecoration(
                              labelText: 'Model',
                              prefixIcon: Icon(Icons.smart_toy, size: 20),
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
                            onChanged: (v) {
                              if (v == _selectedModelId) return;

                              final selected = models.where((m) => m.id == v);
                              final selectedModel = selected.isNotEmpty
                                  ? selected.first
                                  : null;
                              final provider =
                                  selectedModel?.provider
                                      .toString()
                                      .toLowerCase() ??
                                  '';
                              final baseUrl =
                                  selectedModel?.baseUrl
                                      .toString()
                                      .toLowerCase() ??
                                  '';
                              final usesHfRouter =
                                  provider == 'huggingface' ||
                                  baseUrl.contains('router.huggingface.co');

                              setState(() {
                                _selectedModelId = v;
                                _selectedTasks.clear();
                                if (usesHfRouter &&
                                    _modelType == 'hf-multimodal') {
                                  _modelType = 'local-chat-completions';
                                }
                              });

                              if (usesHfRouter && mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      'Hugging Face deployed models use API mode. '
                                      'Backend set to Local API automatically.',
                                    ),
                                    backgroundColor: AppTheme.warning,
                                  ),
                                );
                              }
                            },
                          );
                        },
                      ),
                    ),
                    const SizedBox(width: 12),

                    // Model type
                    Expanded(
                      flex: 2,
                      child: modelsAsync.when(
                        loading: () => const LinearProgressIndicator(),
                        error: (e, _) => Text('Error: $e'),
                        data: (models) {
                          final isHfRouter = _isHuggingFaceRouterModel(models);

                          return DropdownButtonFormField<String>(
                            initialValue: _modelType,
                            decoration: const InputDecoration(
                              labelText: 'Backend',
                              prefixIcon: Icon(Icons.dns, size: 20),
                            ),
                            dropdownColor: AppTheme.surfaceVariant,
                            items: [
                              const DropdownMenuItem(
                                value: 'local-chat-completions',
                                child: Text('Local API'),
                              ),
                              const DropdownMenuItem(
                                value: 'openai-chat-completions',
                                child: Text('OpenAI Hosted API'),
                              ),
                              if (!isHfRouter)
                                const DropdownMenuItem(
                                  value: 'hf-multimodal',
                                  child: Text('HF Multimodal'),
                                ),
                            ],
                            onChanged: (v) {
                              if (v == null) return;
                              if (isHfRouter && v == 'hf-multimodal') {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      'HF Multimodal is for local model loading only. '
                                      'For deployed Hugging Face models, use Local API backend.',
                                    ),
                                    backgroundColor: AppTheme.warning,
                                  ),
                                );
                                return;
                              }

                              setState(() {
                                _modelType = v;
                                // Reset selected benchmarks when backend changes
                                _selectedTasks.clear();
                              });
                            },
                          );
                        },
                      ),
                    ),
                    const SizedBox(width: 12),

                    // Limit
                    Expanded(
                      flex: 1,
                      child: TextFormField(
                        initialValue: '$_limit',
                        decoration: const InputDecoration(
                          labelText: 'Limit',
                          prefixIcon: Icon(Icons.tag, size: 18),
                        ),
                        keyboardType: TextInputType.number,
                        onChanged: (v) {
                          final parsed = int.tryParse(v);
                          if (parsed != null && parsed > 0) {
                            _limit = parsed;
                          }
                        },
                      ),
                    ),
                    const SizedBox(width: 12),

                    // Few-shot
                    Expanded(
                      flex: 1,
                      child: TextFormField(
                        initialValue: '$_numFewshot',
                        decoration: const InputDecoration(
                          labelText: 'Few-shot',
                          prefixIcon: Icon(Icons.looks_one, size: 18),
                        ),
                        keyboardType: TextInputType.number,
                        onChanged: (v) {
                          final parsed = int.tryParse(v);
                          if (parsed != null && parsed >= 0) {
                            _numFewshot = parsed;
                          }
                        },
                      ),
                    ),
                    const SizedBox(width: 16),

                    // Chat Template options
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SizedBox(
                          height: 24,
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Checkbox(
                                value: _applyChatTemplate,
                                onChanged: (v) => setState(
                                  () => _applyChatTemplate = v ?? false,
                                ),
                                visualDensity: VisualDensity.compact,
                              ),
                              const Text(
                                'Apply Chat Template',
                                style: TextStyle(fontSize: 11),
                              ),
                            ],
                          ),
                        ),
                        SizedBox(
                          height: 24,
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Checkbox(
                                value: _fewshotAsMultiturn,
                                onChanged: (v) => setState(
                                  () => _fewshotAsMultiturn = v ?? false,
                                ),
                                visualDensity: VisualDensity.compact,
                              ),
                              const Text(
                                'Few-shot as Multi-turn',
                                style: TextStyle(fontSize: 11),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(width: 16),

                    // Start button
                    ElevatedButton.icon(
                      onPressed: _starting || (_activeRun?.isRunning ?? false)
                          ? null
                          : _startBenchmark,
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
                      label: Text(_starting ? 'Starting...' : 'Run Benchmark'),
                    ),
                  ],
                ),
                if (_selectedTasks.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: _selectedTasks.map((t) {
                      return Chip(
                        label: Text(t, style: const TextStyle(fontSize: 12)),
                        deleteIcon: const Icon(Icons.close, size: 14),
                        onDeleted: () =>
                            setState(() => _selectedTasks.remove(t)),
                        backgroundColor: AppTheme.secondary.withValues(
                          alpha: 0.15,
                        ),
                        side: BorderSide(
                          color: AppTheme.secondary.withValues(alpha: 0.3),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 20),

          // ─── Active Run Progress ────────────────────
          if (_activeRun != null) ...[
            _buildActiveRunCard(),
            const SizedBox(height: 20),
          ],

          // ─── Results Table ──────────────────────────
          if (_results != null && _results!.isNotEmpty) ...[
            _buildResultsTable(),
            const SizedBox(height: 20),
          ],

          // ─── Task Grid ──────────────────────────────
          const Text(
            'Available Benchmarks',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: tasksAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Error: $e')),
              data: (tasks) => _buildTaskGrid(tasks),
            ),
          ),
        ],
      ),
    );
  }

  // ─── Active run card ───────────────────────────────────────────────

  Widget _buildActiveRunCard() {
    final run = _activeRun!;
    final statusColor = run.isCompleted
        ? AppTheme.success
        : run.isFailed
        ? AppTheme.error
        : AppTheme.primary;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppTheme.card, statusColor.withValues(alpha: 0.08)],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text(
                'Benchmark Run',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
              const Spacer(),
              StatusBadge(status: run.status),
            ],
          ),
          const SizedBox(height: 12),
          if (run.isRunning) ...[
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: const LinearProgressIndicator(
                backgroundColor: AppTheme.surfaceVariant,
                color: AppTheme.secondary,
                minHeight: 6,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Running ${run.tasks.join(", ")} via ${run.modelType}...',
              style: const TextStyle(
                color: AppTheme.textSecondary,
                fontSize: 13,
              ),
            ),
          ],
          if (run.isFailed && run.errorMessage != null) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.error.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                run.errorMessage!,
                style: const TextStyle(color: AppTheme.error, fontSize: 12),
              ),
            ),
          ],
          if (run.isCompleted) ...[
            Text(
              'Tasks: ${run.tasks.join(", ")}',
              style: const TextStyle(
                color: AppTheme.textSecondary,
                fontSize: 13,
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ─── Results table ─────────────────────────────────────────────────

  Widget _buildResultsTable() {
    // Group results by task, pick primary metric
    final grouped = <String, List<BenchmarkTaskResult>>{};
    for (final r in _results!) {
      grouped.putIfAbsent(r.taskName, () => []).add(r);
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.analytics, color: AppTheme.primary, size: 20),
              SizedBox(width: 8),
              Text(
                'Results',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...grouped.entries.map((entry) {
            final taskName = entry.key;
            final metrics = entry.value;
            // Find primary metric (prefer acc, then acc_norm, then first)
            final primary = metrics.firstWhere(
              (m) => m.metricName == 'acc',
              orElse: () => metrics.firstWhere(
                (m) => m.metricName == 'acc_norm',
                orElse: () => metrics.first,
              ),
            );

            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  // Multimodal badge
                  if (primary.isMultimodal)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 2,
                      ),
                      margin: const EdgeInsets.only(right: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFCE93D8).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text('🖼️', style: TextStyle(fontSize: 12)),
                    ),
                  // Task name
                  SizedBox(
                    width: 200,
                    child: Text(
                      taskName,
                      style: const TextStyle(
                        fontWeight: FontWeight.w500,
                        fontSize: 13,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Metric name
                  SizedBox(
                    width: 90,
                    child: Text(
                      primary.metricName,
                      style: const TextStyle(
                        color: AppTheme.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Score bar
                  Expanded(
                    child: _ScoreBar(
                      value: primary.metricValue,
                      color: _scoreColor(primary.metricValue),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Value
                  SizedBox(
                    width: 80,
                    child: Text(
                      '${(primary.metricValue * 100).toStringAsFixed(1)}%',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: _scoreColor(primary.metricValue),
                        fontSize: 14,
                      ),
                      textAlign: TextAlign.right,
                    ),
                  ),
                  // Stderr
                  if (primary.stderr != null)
                    SizedBox(
                      width: 60,
                      child: Text(
                        '±${(primary.stderr! * 100).toStringAsFixed(1)}',
                        style: const TextStyle(
                          color: AppTheme.textSecondary,
                          fontSize: 11,
                        ),
                        textAlign: TextAlign.right,
                      ),
                    ),
                ],
              ),
            );
          }),
          if (_activeRun != null && _activeRun!.resultsJson != null) ...[
            const SizedBox(height: 16),
            const Divider(color: AppTheme.border),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                icon: const Icon(Icons.data_object, size: 18),
                label: const Text('View Raw JSON'),
                onPressed: () {
                  showDialog(
                    context: context,
                    builder: (context) => AlertDialog(
                      backgroundColor: AppTheme.surfaceVariant,
                      title: const Text('Raw LM Harness Results'),
                      content: SizedBox(
                        width: 800,
                        height: 600,
                        child: SingleChildScrollView(
                          child: SelectableText(
                            _activeRun!.resultsJson!,
                            style: const TextStyle(
                              fontFamily: 'monospace',
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Close'),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ],
      ),
    );
  }

  Color _scoreColor(double v) {
    if (v >= 0.8) return AppTheme.success;
    if (v >= 0.5) return AppTheme.warning;
    return AppTheme.error;
  }

  // ─── Task grid ─────────────────────────────────────────────────────

  bool get _isChatModelType =>
      _modelType == 'local-chat-completions' ||
      _modelType == 'openai-chat-completions';

  Widget _buildTaskGrid(List<AvailableTask> tasks) {
    // Group by category
    final byCategory = <String, List<AvailableTask>>{};
    for (final t in tasks) {
      byCategory.putIfAbsent(t.category, () => []).add(t);
    }

    return ListView(
      children: byCategory.entries.map((entry) {
        final cat = entry.key;
        final catTasks = entry.value;
        final icon = _categoryIcon(cat);
        final color = _categoryColor(cat);

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: color, size: 18),
                const SizedBox(width: 8),
                Text(
                  cat[0].toUpperCase() + cat.substring(1),
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: color,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: catTasks.map((task) {
                final selected = _selectedTasks.contains(task.name);
                final incompatible = _isChatModelType && task.isLoglikelihood;
                return Opacity(
                  opacity: incompatible ? 0.45 : 1.0,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: incompatible
                        ? () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  '${task.name} requires loglikelihood scoring — '
                                  'not supported by chat completion APIs. '
                                  'Use HF Multimodal backend (local torch/GPU), '
                                  'or choose generate_until tasks for API backends.',
                                ),
                                backgroundColor: AppTheme.warning,
                              ),
                            );
                          }
                        : () {
                            setState(() {
                              if (selected) {
                                _selectedTasks.remove(task.name);
                              } else {
                                _selectedTasks.add(task.name);
                              }
                            });
                          },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      width: 240,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: selected
                            ? color.withValues(alpha: 0.12)
                            : AppTheme.card,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: selected
                              ? color.withValues(alpha: 0.5)
                              : incompatible
                              ? AppTheme.border.withValues(alpha: 0.3)
                              : AppTheme.border,
                          width: selected ? 2 : 1,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  task.name,
                                  style: TextStyle(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 13,
                                    color: selected
                                        ? color
                                        : AppTheme.textPrimary,
                                  ),
                                ),
                              ),
                              if (task.isMultimodal)
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 6,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: const Color(
                                      0xFFCE93D8,
                                    ).withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: const Text(
                                    '🖼️ MM',
                                    style: TextStyle(fontSize: 10),
                                  ),
                                ),
                              // Compatibility badge
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 5,
                                  vertical: 2,
                                ),
                                margin: const EdgeInsets.only(left: 4),
                                decoration: BoxDecoration(
                                  color: task.isGenerateUntil
                                      ? AppTheme.success.withValues(alpha: 0.15)
                                      : incompatible
                                      ? AppTheme.error.withValues(alpha: 0.15)
                                      : AppTheme.textSecondary.withValues(
                                          alpha: 0.1,
                                        ),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  task.isGenerateUntil ? 'GEN' : 'LL',
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w700,
                                    color: task.isGenerateUntil
                                        ? AppTheme.success
                                        : incompatible
                                        ? AppTheme.error
                                        : AppTheme.textSecondary,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 4),
                              Icon(
                                incompatible
                                    ? Icons.block
                                    : selected
                                    ? Icons.check_circle
                                    : Icons.circle_outlined,
                                size: 18,
                                color: incompatible
                                    ? AppTheme.error.withValues(alpha: 0.5)
                                    : selected
                                    ? color
                                    : AppTheme.textSecondary,
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            task.description,
                            style: const TextStyle(
                              color: AppTheme.textSecondary,
                              fontSize: 11,
                              height: 1.3,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          if (incompatible) ...[
                            const SizedBox(height: 4),
                            const Text(
                              'Requires loglikelihood — use HF multimodal (local torch/GPU)',
                              style: TextStyle(
                                color: AppTheme.error,
                                fontSize: 9,
                                fontStyle: FontStyle.italic,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
          ],
        );
      }).toList(),
    );
  }
}

// ─── Helper widgets ──────────────────────────────────────────────────────

class _LmHarnessBadge extends StatelessWidget {
  const _LmHarnessBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppTheme.secondary.withValues(alpha: 0.2),
            AppTheme.primary.withValues(alpha: 0.2),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.secondary.withValues(alpha: 0.3)),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.science, size: 14, color: AppTheme.secondary),
          SizedBox(width: 4),
          Text(
            'LM Eval Harness',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: AppTheme.secondary,
            ),
          ),
        ],
      ),
    );
  }
}

class _ScoreBar extends StatelessWidget {
  final double value;
  final Color color;

  const _ScoreBar({required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(4),
      child: LinearProgressIndicator(
        value: value.clamp(0.0, 1.0),
        backgroundColor: AppTheme.surfaceVariant,
        color: color,
        minHeight: 8,
      ),
    );
  }
}
