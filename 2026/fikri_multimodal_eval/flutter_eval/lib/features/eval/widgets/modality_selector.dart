import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/benchmark_config.dart';
import '../providers/eval_config_provider.dart';

class ModalitySelector extends ConsumerWidget {
  const ModalitySelector({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final modality = ref.watch(evalConfigProvider.select((c) => c.modality));
    return SegmentedButton<Modality>(
      segments: const [
        ButtonSegment(
          value: Modality.image,
          icon: Icon(Icons.image_outlined),
          label: Text('Image'),
        ),
        ButtonSegment(
          value: Modality.audio,
          icon: Icon(Icons.mic_outlined),
          label: Text('Audio'),
        ),
        ButtonSegment(
          value: Modality.agent,
          icon: Icon(Icons.smart_toy_outlined),
          label: Text('Agent'),
        ),
      ],
      selected: {modality},
      onSelectionChanged: (selected) =>
          ref.read(evalConfigProvider.notifier).switchModality(selected.first),
    );
  }
}
