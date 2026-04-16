import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/benchmark_config.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/eval_config_provider.dart';

class ProviderSelector extends ConsumerWidget {
  const ProviderSelector({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(evalConfigProvider);
    if (config.modality != Modality.image) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 12),
        SegmentedButton<EvalProvider>(
          segments: const [
            ButtonSegment(
              value: EvalProvider.huggingface,
              icon: Icon(Icons.cloud_outlined),
              label: Text('HuggingFace'),
            ),
            ButtonSegment(
              value: EvalProvider.ollama,
              icon: Icon(Icons.computer_outlined),
              label: Text('Ollama'),
            ),
            ButtonSegment(
              value: EvalProvider.openrouter,
              icon: Icon(Icons.route_outlined),
              label: Text('OpenRouter'),
            ),
          ],
          selected: {config.provider},
          onSelectionChanged: (selected) => ref
              .read(evalConfigProvider.notifier)
              .switchProvider(selected.first),
        ),
        if (config.provider == EvalProvider.ollama)
          const Padding(
            padding: EdgeInsets.only(top: 8),
            child: Text(
              'Ollama serves the model at localhost:11434/v1 — make sure it is running.',
              style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
            ),
          ),
        if (config.provider == EvalProvider.openrouter)
          const Padding(
            padding: EdgeInsets.only(top: 8),
            child: Text(
              'Set your OpenRouter API key in Settings, then enter a model ID (e.g. google/gemini-2.0-flash-001).',
              style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
            ),
          ),
      ],
    );
  }
}
