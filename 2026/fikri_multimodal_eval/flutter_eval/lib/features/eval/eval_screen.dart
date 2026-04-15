import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/benchmark_config.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/section_card.dart';
import 'providers/compare_provider.dart';
import 'providers/custom_dataset_provider.dart';
import 'providers/custom_eval_provider.dart';
import 'providers/eval_config_provider.dart';
import 'providers/eval_provider.dart';
import 'widgets/benchmark_card.dart';
import 'widgets/custom_dataset_section.dart';
import 'widgets/custom_result_stream_view.dart';
import 'widgets/eval_mode_selector.dart';
import 'widgets/model_input_list.dart';
import 'widgets/modality_selector.dart';
import 'widgets/provider_selector.dart';
import 'widgets/progress_view.dart';
import 'widgets/run_button.dart';
import 'widgets/single_result_view.dart';
import 'widgets/task_selector.dart';
import 'widgets/trajectory_view.dart';

class EvalScreen extends ConsumerWidget {
  const EvalScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(evalModeProvider);
    final modality = ref.watch(evalConfigProvider.select((c) => c.modality));
    final benchmarks = benchmarksForModality(modality);
    final evalAsync = ref.watch(evalProvider);
    final compare = ref.watch(compareProvider);
    final customEval = ref.watch(customEvalProvider);
    final isComparison =
        ref.watch(evalConfigProvider.select((c) => c.models.length >= 2));

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Step 0: evaluation mode toggle ──────────────────────────────
          SectionCard(
            step: '0',
            title: 'Evaluation mode',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const EvalModeSelector(),
                const SizedBox(height: 4),
                Text(
                  mode == EvalMode.standard
                      ? 'Run a standard benchmark (MMMU, ScienceQA, TextVQA…)'
                      : 'Upload your own images and questions',
                  style: const TextStyle(
                      color: AppTheme.textMuted, fontSize: 12),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          if (mode == EvalMode.standard) ...[
            // ── Standard flow (unchanged) ──────────────────────────────
            const SectionCard(
              step: '1',
              title: 'Select modality & provider',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ModalitySelector(),
                  ProviderSelector(),
                ],
              ),
            ),
            const SizedBox(height: 12),
            SectionCard(
              step: '2',
              title: 'Select benchmark & task',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ...benchmarks.map((b) => BenchmarkCard(benchmark: b)),
                  const SizedBox(height: 4),
                  const TaskSelector(),
                ],
              ),
            ),
            const SizedBox(height: 12),
            const SectionCard(
              step: '3',
              title: 'Configure model',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ModelInputList(),
                  SizedBox(height: 12),
                  SampleLimitField(),
                ],
              ),
            ),
            const SizedBox(height: 16),
            const RunButton(),
            const EvalErrorBanner(),
            if (isComparison &&
                (compare.isRunning || compare.results.isNotEmpty)) ...[
              const SizedBox(height: 16),
              const _CompareResultSection(),
            ] else if (!isComparison) ...[
              if (evalAsync.isLoading) ...[
                const SizedBox(height: 16),
                const _EvalProgressBanner(),
              ] else if (evalAsync.hasValue && evalAsync.value != null) ...[
                const SizedBox(height: 16),
                _ResultSection(data: evalAsync.value!),
              ],
            ],
          ] else ...[
            // ── Custom dataset flow ────────────────────────────────────
            const SectionCard(
              step: '1',
              title: 'Upload dataset',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CustomDatasetSection(),
                ],
              ),
            ),
            const SizedBox(height: 12),
            const SectionCard(
              step: '2',
              title: 'Select provider & model',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ProviderSelector(),
                  ModelInputList(),
                ],
              ),
            ),
            const SizedBox(height: 16),
            _CustomRunButton(),
            if (customEval.isRunning ||
                customEval.sampleResults.isNotEmpty ||
                customEval.sampleErrors.isNotEmpty ||
                customEval.isComplete ||
                customEval.error != null) ...[
              const SizedBox(height: 16),
              Container(
                decoration: BoxDecoration(
                  color: AppTheme.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.border),
                ),
                padding: const EdgeInsets.all(16),
                child: const CustomResultStreamView(),
              ),
            ],
          ],
        ],
      ),
    );
  }
}

// ─── Custom run button ────────────────────────────────────────────────────

class _CustomRunButton extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(customEvalProvider);
    final samples = ref.watch(customDatasetProvider);

    if (state.isComplete || (!state.isRunning && state.sampleResults.isNotEmpty)) {
      return OutlinedButton.icon(
        onPressed: () => ref.read(customEvalProvider.notifier).reset(),
        icon: const Icon(Icons.refresh, size: 16),
        label: const Text('New evaluation'),
      );
    }

    return ElevatedButton.icon(
      onPressed: state.isRunning || samples.isEmpty
          ? null
          : () => ref.read(customEvalProvider.notifier).run(),
      icon: state.isRunning
          ? const SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(
                  strokeWidth: 2, color: Colors.white),
            )
          : const Icon(Icons.play_arrow, size: 16),
      label: Text(state.isRunning ? 'Running…' : 'Run evaluation'),
    );
  }
}

// ─── Standard flow widgets (unchanged) ───────────────────────────────────

class _CompareResultSection extends StatelessWidget {
  const _CompareResultSection();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      padding: const EdgeInsets.all(16),
      child: const ProgressView(),
    );
  }
}

class _ResultSection extends StatelessWidget {
  const _ResultSection({required this.data});

  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context) {
    final trajectory = data['trajectory'] as List<dynamic>?;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          decoration: BoxDecoration(
            color: AppTheme.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.border),
          ),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.check_circle, color: AppTheme.success, size: 14),
                  SizedBox(width: 6),
                  Text(
                    'Evaluation complete',
                    style: TextStyle(
                      color: AppTheme.success,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              SingleResultView(data: data),
              if (trajectory != null && trajectory.isNotEmpty) ...[
                const SizedBox(height: 8),
                TrajectoryView(trajectory: trajectory),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _EvalProgressBanner extends StatefulWidget {
  const _EvalProgressBanner();

  @override
  State<_EvalProgressBanner> createState() => _EvalProgressBannerState();
}

class _EvalProgressBannerState extends State<_EvalProgressBanner> {
  late final Stopwatch _sw;
  late final Stream<int> _ticks;

  @override
  void initState() {
    super.initState();
    _sw = Stopwatch()..start();
    _ticks = Stream.periodic(
        const Duration(seconds: 1), (_) => _sw.elapsed.inSeconds);
  }

  @override
  void dispose() {
    _sw.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      padding: const EdgeInsets.all(16),
      child: StreamBuilder<int>(
        stream: _ticks,
        initialData: 0,
        builder: (context, snap) {
          final elapsed = snap.data ?? 0;
          final label = elapsed < 10
              ? 'Starting evaluation… downloading dataset if needed'
              : 'Running evaluation… ${elapsed}s elapsed';
          return Row(
            children: [
              const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: AppTheme.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(label,
                    style: const TextStyle(
                        color: AppTheme.textMuted, fontSize: 13)),
              ),
            ],
          );
        },
      ),
    );
  }
}
