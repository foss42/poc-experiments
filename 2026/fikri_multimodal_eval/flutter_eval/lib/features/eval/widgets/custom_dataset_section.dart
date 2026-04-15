import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/models/dataset_sample.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/custom_dataset_provider.dart';

class CustomDatasetSection extends ConsumerStatefulWidget {
  const CustomDatasetSection({super.key});

  @override
  ConsumerState<CustomDatasetSection> createState() =>
      _CustomDatasetSectionState();
}

class _CustomDatasetSectionState extends ConsumerState<CustomDatasetSection> {
  final ImagePicker _picker = ImagePicker();
  final List<TextEditingController> _questionControllers = [];
  final List<TextEditingController> _answerControllers = [];

  @override
  void dispose() {
    for (final c in [..._questionControllers, ..._answerControllers]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _pickImages() async {
    final picked = await _picker.pickMultiImage();
    if (picked.isEmpty) return;

    final newSamples =
        picked.map((f) => DatasetSample(image: f, question: '')).toList();
    ref.read(customDatasetProvider.notifier).addSamples(newSamples);

    for (var _ in newSamples) {
      _questionControllers.add(TextEditingController());
      _answerControllers.add(TextEditingController());
    }
  }

  void _removeAt(int index) {
    _questionControllers[index].dispose();
    _questionControllers.removeAt(index);
    _answerControllers[index].dispose();
    _answerControllers.removeAt(index);
    ref.read(customDatasetProvider.notifier).removeSample(index);
  }

  void _onQuestionChanged(int index, String value) {
    final sample = ref.read(customDatasetProvider)[index];
    ref
        .read(customDatasetProvider.notifier)
        .updateSample(index, sample.copyWith(question: value));
  }

  void _onAnswerChanged(int index, String value) {
    final sample = ref.read(customDatasetProvider)[index];
    ref
        .read(customDatasetProvider.notifier)
        .updateSample(index, sample.copyWith(answer: value.isEmpty ? null : value));
  }

  @override
  Widget build(BuildContext context) {
    final samples = ref.watch(customDatasetProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Image picker button
        OutlinedButton.icon(
          onPressed: _pickImages,
          icon: const Icon(Icons.add_photo_alternate_outlined, size: 18),
          label: const Text('Add images'),
        ),
        if (samples.isNotEmpty) ...[
          const SizedBox(height: 12),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: samples.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (context, i) => _SampleRow(
              index: i,
              sample: samples[i],
              questionController: _questionControllers[i],
              answerController: _answerControllers[i],
              onQuestionChanged: (v) => _onQuestionChanged(i, v),
              onAnswerChanged: (v) => _onAnswerChanged(i, v),
              onRemove: () => _removeAt(i),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '${samples.length} image${samples.length == 1 ? '' : 's'} added'
            ' (max $_maxImages)',
            style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
          ),
        ] else ...[
          const SizedBox(height: 8),
          const Text(
            'Pick images to start building your dataset.',
            style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
          ),
        ],
      ],
    );
  }
}

const _maxImages = 20;

class _SampleRow extends StatelessWidget {
  const _SampleRow({
    required this.index,
    required this.sample,
    required this.questionController,
    required this.answerController,
    required this.onQuestionChanged,
    required this.onAnswerChanged,
    required this.onRemove,
  });

  final int index;
  final DatasetSample sample;
  final TextEditingController questionController;
  final TextEditingController answerController;
  final ValueChanged<String> onQuestionChanged;
  final ValueChanged<String> onAnswerChanged;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.border),
      ),
      padding: const EdgeInsets.all(10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Filename badge
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppTheme.muted,
              borderRadius: BorderRadius.circular(4),
            ),
            alignment: Alignment.center,
            child: const Icon(Icons.image_outlined,
                size: 20, color: AppTheme.textMuted),
          ),
          const SizedBox(width: 10),
          // Fields
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  sample.image.name,
                  style: const TextStyle(
                      color: AppTheme.textMuted, fontSize: 11),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: questionController,
                  onChanged: onQuestionChanged,
                  style: const TextStyle(
                      color: AppTheme.textPrimary, fontSize: 13),
                  decoration: const InputDecoration(
                    hintText: 'Question (required)',
                    isDense: true,
                  ),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: answerController,
                  onChanged: onAnswerChanged,
                  style: const TextStyle(
                      color: AppTheme.textPrimary, fontSize: 13),
                  decoration: const InputDecoration(
                    hintText: 'Ground truth answer (optional)',
                    isDense: true,
                  ),
                ),
              ],
            ),
          ),
          // Remove button
          IconButton(
            onPressed: onRemove,
            icon: const Icon(Icons.close, size: 16, color: AppTheme.textMuted),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
          ),
        ],
      ),
    );
  }
}
