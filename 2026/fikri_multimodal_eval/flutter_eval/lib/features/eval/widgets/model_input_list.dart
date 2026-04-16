import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/benchmark_config.dart';
import '../../../core/models/eval_config.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/providers/models_provider.dart';
import '../providers/eval_config_provider.dart';

/// Returns the /api/models key that corresponds to the current config.
String _modelKey(EvalConfig config) => switch (config.modality) {
      Modality.image => switch (config.provider) {
          EvalProvider.ollama => 'ollama_vlm',
          EvalProvider.openrouter => 'openrouter',
          EvalProvider.huggingface => 'image_vlm',
        },
      Modality.audio => config.benchmark.harness == 'faster-whisper'
          ? 'faster_whisper_sizes'
          : 'audio_asr',
      Modality.agent => 'agent',
    };

String _placeholder(EvalConfig config) => switch (config.modality) {
      Modality.image => switch (config.provider) {
          EvalProvider.ollama => 'e.g. llava-phi3',
          EvalProvider.openrouter => 'e.g. openai/gpt-4o-mini',
          EvalProvider.huggingface => 'e.g. pretrained=org/model',
        },
      Modality.audio => config.benchmark.harness == 'faster-whisper'
          ? 'e.g. base'
          : 'e.g. pretrained=openai/whisper-base',
      Modality.agent => 'e.g. qwen2.5:1.5b',
    };

class ModelInputList extends ConsumerStatefulWidget {
  const ModelInputList({super.key});

  @override
  ConsumerState<ModelInputList> createState() => _ModelInputListState();
}

class _ModelInputListState extends ConsumerState<ModelInputList> {
  late List<TextEditingController> _controllers;

  @override
  void initState() {
    super.initState();
    final models = ref.read(evalConfigProvider).models;
    _controllers =
        models.map((m) => TextEditingController(text: m)).toList();
  }

  @override
  void dispose() {
    for (final c in _controllers) {
      c.dispose();
    }
    super.dispose();
  }

  void _syncToProvider() {
    ref
        .read(evalConfigProvider.notifier)
        .setModels(_controllers.map((c) => c.text).toList());
  }

  void _addModel() {
    setState(() {
      _controllers.add(TextEditingController());
    });
    _syncToProvider();
  }

  void _removeModel(int index) {
    setState(() {
      _controllers[index].dispose();
      _controllers.removeAt(index);
    });
    _syncToProvider();
  }

  @override
  Widget build(BuildContext context) {
    final config = ref.watch(evalConfigProvider);
    final suggestions =
        ref.watch(modelsProvider).valueOrNull?[_modelKey(config)] ?? [];
    final isComparison = _controllers.length >= 2;
    final canAdd = _controllers.length < 4 &&
        config.modality != Modality.agent;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (isComparison) ...[
          const Row(
            children: [
              Icon(Icons.compare_arrows,
                  size: 14, color: AppTheme.compare),
              SizedBox(width: 4),
              Text(
                'Comparison mode',
                style: TextStyle(
                    color: AppTheme.compare,
                    fontSize: 11,
                    fontWeight: FontWeight.w500),
              ),
            ],
          ),
          const SizedBox(height: 8),
        ],
        ..._controllers.asMap().entries.map((entry) {
          final idx = entry.key;
          final controller = entry.value;
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                Expanded(
                  child: RawAutocomplete<String>(
                    textEditingController: controller,
                    focusNode: FocusNode(),
                    optionsBuilder: (textEditingValue) {
                      if (textEditingValue.text.isEmpty) {
                        return suggestions.take(5);
                      }
                      return suggestions.where((s) => s
                          .toLowerCase()
                          .contains(textEditingValue.text.toLowerCase()));
                    },
                    displayStringForOption: (s) => s,
                    fieldViewBuilder:
                        (ctx, ctrl, focusNode, onFieldSubmitted) =>
                            TextField(
                      controller: ctrl,
                      focusNode: focusNode,
                      onChanged: (_) => _syncToProvider(),
                      decoration: InputDecoration(
                        hintText: _placeholder(config),
                        hintStyle: const TextStyle(
                            color: AppTheme.textMuted, fontSize: 12),
                      ),
                      style: const TextStyle(
                          color: AppTheme.textPrimary, fontSize: 13),
                    ),
                    optionsViewBuilder: (ctx, onSelected, options) =>
                        Align(
                      alignment: Alignment.topLeft,
                      child: Material(
                        color: AppTheme.surface,
                        elevation: 4,
                        child: ConstrainedBox(
                          constraints:
                              const BoxConstraints(maxHeight: 160),
                          child: ListView.builder(
                            shrinkWrap: true,
                            padding: EdgeInsets.zero,
                            itemCount: options.length,
                            itemBuilder: (ctx, i) {
                              final opt = options.elementAt(i);
                              return InkWell(
                                onTap: () {
                                  onSelected(opt);
                                  _syncToProvider();
                                },
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 12, vertical: 8),
                                  child: Text(opt,
                                      style: const TextStyle(
                                          color: AppTheme.textPrimary,
                                          fontSize: 12)),
                                ),
                              );
                            },
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                if (_controllers.length > 1) ...[
                  const SizedBox(width: 4),
                  IconButton(
                    onPressed: () => _removeModel(idx),
                    icon: const Icon(Icons.close,
                        size: 16, color: AppTheme.textMuted),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(
                        minWidth: 32, minHeight: 32),
                  ),
                ],
              ],
            ),
          );
        }),
        if (canAdd)
          TextButton.icon(
            onPressed: _addModel,
            icon: const Icon(Icons.add, size: 14),
            label: const Text('Add model to compare',
                style: TextStyle(fontSize: 12)),
            style: TextButton.styleFrom(
              foregroundColor: AppTheme.textMuted,
              padding: const EdgeInsets.symmetric(horizontal: 4),
            ),
          ),
      ],
    );
  }
}

class SampleLimitField extends ConsumerWidget {
  const SampleLimitField({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final limit = ref.watch(evalConfigProvider.select((c) => c.sampleLimit));
    return TextField(
      controller: TextEditingController(text: limit.toString()),
      keyboardType: TextInputType.number,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      decoration: const InputDecoration(
        labelText: 'Sample limit',
        labelStyle: TextStyle(color: AppTheme.textMuted),
        hintText: '10',
      ),
      style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13),
      onChanged: (v) {
        final n = int.tryParse(v);
        if (n != null && n > 0) {
          ref.read(evalConfigProvider.notifier).setSampleLimit(n);
        }
      },
    );
  }
}
