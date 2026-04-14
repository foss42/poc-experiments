import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/benchmark_config.dart';
import '../../shared/widgets/section_card.dart';
import 'providers/eval_config_provider.dart';
import 'widgets/benchmark_card.dart';
import 'widgets/model_input_list.dart';
import 'widgets/modality_selector.dart';
import 'widgets/provider_selector.dart';
import 'widgets/task_selector.dart';

class EvalScreen extends ConsumerWidget {
  const EvalScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final modality = ref.watch(evalConfigProvider.select((c) => c.modality));
    final benchmarks = benchmarksForModality(modality);

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
          const _Step3Placeholder(),
        ],
      ),
    );
  }
}

class _Step3Placeholder extends StatelessWidget {
  const _Step3Placeholder();

  @override
  Widget build(BuildContext context) {
    return const SectionCard(
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
    );
  }
}
