import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/custom_dataset_provider.dart';

class EvalModeSelector extends ConsumerWidget {
  const EvalModeSelector({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(evalModeProvider);
    return SegmentedButton<EvalMode>(
      segments: const [
        ButtonSegment(
          value: EvalMode.standard,
          label: Text('Standard benchmark'),
          icon: Icon(Icons.leaderboard_outlined, size: 16),
        ),
        ButtonSegment(
          value: EvalMode.custom,
          label: Text('Custom dataset'),
          icon: Icon(Icons.folder_open_outlined, size: 16),
        ),
      ],
      selected: {mode},
      onSelectionChanged: (selected) {
        ref.read(evalModeProvider.notifier).state = selected.first;
      },
    );
  }
}
