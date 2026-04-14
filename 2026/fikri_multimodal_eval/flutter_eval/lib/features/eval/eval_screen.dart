import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/benchmark_config.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/section_card.dart';
import 'providers/eval_config_provider.dart';
import 'providers/eval_provider.dart';
import 'widgets/benchmark_card.dart';
import 'widgets/model_input_list.dart';
import 'widgets/modality_selector.dart';
import 'widgets/provider_selector.dart';
import 'widgets/run_button.dart';
import 'widgets/single_result_view.dart';
import 'widgets/task_selector.dart';
import 'widgets/trajectory_view.dart';

class EvalScreen extends ConsumerWidget {
  const EvalScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final modality = ref.watch(evalConfigProvider.select((c) => c.modality));
    final benchmarks = benchmarksForModality(modality);
    final evalAsync = ref.watch(evalProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
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
          if (evalAsync.hasValue && evalAsync.value != null) ...[
            const SizedBox(height: 16),
            _ResultSection(data: evalAsync.value!),
          ],
        ],
      ),
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
