import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../providers/custom_eval_provider.dart';

class CustomResultStreamView extends ConsumerWidget {
  const CustomResultStreamView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(customEvalProvider);

    if (state.isCompareMode) {
      return _CompareView(state: state);
    }
    return _SingleModelView(state: state);
  }
}

// ─── Single model view (unchanged behaviour) ──────────────────────────────────

class _SingleModelView extends StatelessWidget {
  const _SingleModelView({required this.state});
  final CustomEvalState state;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _StatusHeader(state: state),
        if (state.sampleResults.isNotEmpty || state.sampleErrors.isNotEmpty) ...[
          const SizedBox(height: 12),
          Builder(builder: (context) {
            final allEvents = [
              ...state.sampleResults,
              ...state.sampleErrors,
            ]..sort((a, b) =>
                ((a['index'] as int?) ?? 0)
                    .compareTo((b['index'] as int?) ?? 0));
            return ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: allEvents.length,
              separatorBuilder: (_, __) => const SizedBox(height: 6),
              itemBuilder: (context, i) {
                final event = allEvents[i];
                if (event['type'] == 'sample_error') {
                  return _SampleErrorCard(event: event);
                }
                return _SampleResultCard(event: event);
              },
            );
          }),
        ],
        if (state.error != null) ...[
          const SizedBox(height: 8),
          _ErrorBanner(message: state.error!),
        ],
      ],
    );
  }
}

// ─── Compare mode view ────────────────────────────────────────────────────────

class _CompareView extends StatelessWidget {
  const _CompareView({required this.state});
  final CustomEvalState state;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _CompareStatusHeader(state: state),
        if (state.isComplete) ...[
          const SizedBox(height: 12),
          _AccuracySummaryRow(state: state),
          const SizedBox(height: 12),
          _ComparisonTable(state: state),
        ] else if (state.sampleResults.isNotEmpty ||
            state.sampleErrors.isNotEmpty) ...[
          const SizedBox(height: 12),
          _LiveCompareEvents(state: state),
        ],
        if (state.error != null) ...[
          const SizedBox(height: 8),
          _ErrorBanner(message: state.error!),
        ],
      ],
    );
  }
}

class _CompareStatusHeader extends StatelessWidget {
  const _CompareStatusHeader({required this.state});
  final CustomEvalState state;

  @override
  Widget build(BuildContext context) {
    if (state.isComplete) {
      return const Row(
        children: [
          Icon(Icons.check_circle, color: AppTheme.success, size: 14),
          SizedBox(width: 6),
          Text(
            'Comparison complete',
            style: TextStyle(
                color: AppTheme.success,
                fontSize: 12,
                fontWeight: FontWeight.w500),
          ),
        ],
      );
    }
    if (state.isRunning) {
      final currentModel = state.currentModel ?? 'uploading…';
      final modelProgress =
          '${state.currentModelIndex + 1}/${state.totalModels}';
      final samplesProgress = state.total > 0
          ? '${state.received}/${state.total}'
          : '';
      return Row(
        children: [
          const SizedBox(
            width: 14,
            height: 14,
            child: CircularProgressIndicator(
                strokeWidth: 2, color: AppTheme.compare),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Model $modelProgress — $currentModel  $samplesProgress',
              style:
                  const TextStyle(color: AppTheme.textMuted, fontSize: 12),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      );
    }
    return const SizedBox.shrink();
  }
}

class _AccuracySummaryRow extends StatelessWidget {
  const _AccuracySummaryRow({required this.state});
  final CustomEvalState state;

  @override
  Widget build(BuildContext context) {
    final entries = state.modelAccuracies.entries.toList();
    if (entries.isEmpty) return const SizedBox.shrink();
    return Wrap(
      spacing: 8,
      runSpacing: 6,
      children: entries.map((e) {
        final model = e.key;
        final accuracy = e.value;
        final pct = accuracy != null
            ? '${(accuracy * 100).toStringAsFixed(1)}%'
            : 'n/a';
        final color = accuracy == null
            ? AppTheme.textMuted
            : accuracy > 0
                ? AppTheme.accent
                : AppTheme.warning;
        final shortModel =
            model.length > 30 ? '…${model.substring(model.length - 28)}' : model;
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: AppTheme.surface,
            border: Border.all(color: color.withValues(alpha: 0.4)),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(shortModel,
                  style: const TextStyle(
                      color: AppTheme.textMuted, fontSize: 11)),
              const SizedBox(width: 6),
              Text(pct,
                  style: TextStyle(
                      color: color,
                      fontSize: 12,
                      fontWeight: FontWeight.w700)),
            ],
          ),
        );
      }).toList(),
    );
  }
}

class _ComparisonTable extends StatelessWidget {
  const _ComparisonTable({required this.state});
  final CustomEvalState state;

  @override
  Widget build(BuildContext context) {
    final modelKeys = state.modelResults.keys.toList();
    if (modelKeys.isEmpty) return const SizedBox.shrink();

    // Collect all sample indices from the first model (all models have same samples)
    final firstModelResults = state.modelResults[modelKeys.first] ?? [];
    final sampleCount = firstModelResults.length;

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: sampleCount,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, sampleIdx) {
        // Find results at this index from each model
        final samplesByModel = <String, Map<String, dynamic>>{};
        for (final model in modelKeys) {
          final results = state.modelResults[model] ?? [];
          // results are in sample order; find by position
          if (sampleIdx < results.length) {
            samplesByModel[model] = results[sampleIdx];
          }
        }

        final anyResult = samplesByModel.values.firstOrNull;
        final filename = anyResult?['filename'] as String? ?? '';
        final question = anyResult?['question'] as String? ?? '';

        return _ComparisonSampleCard(
          filename: filename,
          question: question,
          modelKeys: modelKeys,
          samplesByModel: samplesByModel,
        );
      },
    );
  }
}

class _ComparisonSampleCard extends StatelessWidget {
  const _ComparisonSampleCard({
    required this.filename,
    required this.question,
    required this.modelKeys,
    required this.samplesByModel,
  });

  final String filename;
  final String question;
  final List<String> modelKeys;
  final Map<String, Map<String, dynamic>> samplesByModel;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: thumbnail + filename + question
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _ThumbnailWidget(
                  dataUri: samplesByModel.values.firstOrNull?['thumbnail'] as String?,
                  size: 56,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(filename,
                          style: const TextStyle(
                              color: AppTheme.textMuted, fontSize: 10)),
                      const SizedBox(height: 3),
                      Text('Q: $question',
                          style: const TextStyle(
                              color: AppTheme.textPrimary,
                              fontSize: 12,
                              fontWeight: FontWeight.w500)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: AppTheme.border),
          // Per-model answers
          ...modelKeys.map((model) {
            final result = samplesByModel[model];
            final isError = result?['type'] == 'sample_error';
            final answer = isError
                ? (result?['detail'] as String?) ?? 'Error'
                : (result?['model_answer'] as String?) ?? '—';
            final correct = result?['correct'] as bool?;

            final Color statusColor;
            final IconData statusIcon;
            if (isError) {
              statusColor = AppTheme.error;
              statusIcon = Icons.error_outline;
            } else if (correct == true) {
              statusColor = AppTheme.success;
              statusIcon = Icons.check_circle_outline;
            } else if (correct == false) {
              statusColor = AppTheme.error;
              statusIcon = Icons.cancel_outlined;
            } else {
              statusColor = AppTheme.textMuted;
              statusIcon = Icons.help_outline;
            }

            final shortModel = model.length > 32
                ? '…${model.substring(model.length - 30)}'
                : model;

            return Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(statusIcon, size: 14, color: statusColor),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(shortModel,
                            style: const TextStyle(
                                color: AppTheme.textMuted, fontSize: 10)),
                        const SizedBox(height: 2),
                        Text(answer,
                            style: TextStyle(
                                color: statusColor, fontSize: 12)),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }),
          const SizedBox(height: 4),
        ],
      ),
    );
  }
}

/// Live streaming events during compare run — grouped by model
class _LiveCompareEvents extends StatelessWidget {
  const _LiveCompareEvents({required this.state});
  final CustomEvalState state;

  @override
  Widget build(BuildContext context) {
    final allEvents = [
      ...state.sampleResults,
      ...state.sampleErrors,
    ]..sort((a, b) {
        final mi = ((a['model_index'] as int?) ?? 0)
            .compareTo((b['model_index'] as int?) ?? 0);
        if (mi != 0) return mi;
        return ((a['index'] as int?) ?? 0)
            .compareTo((b['index'] as int?) ?? 0);
      });

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: allEvents.length,
      separatorBuilder: (_, __) => const SizedBox(height: 4),
      itemBuilder: (context, i) {
        final event = allEvents[i];
        if (event['type'] == 'sample_error') {
          return _SampleErrorCard(event: event, showModel: true);
        }
        return _SampleResultCard(event: event, showModel: true);
      },
    );
  }
}

// ─── Shared result cards ──────────────────────────────────────────────────────

class _StatusHeader extends StatelessWidget {
  const _StatusHeader({required this.state});
  final CustomEvalState state;

  @override
  Widget build(BuildContext context) {
    if (state.isComplete) {
      final accuracy = state.accuracy;
      final accuracyColor = accuracy == null
          ? AppTheme.accent
          : accuracy > 0
              ? AppTheme.accent
              : AppTheme.warning;
      return Row(
        children: [
          const Icon(Icons.check_circle, color: AppTheme.success, size: 14),
          const SizedBox(width: 6),
          const Text(
            'Evaluation complete',
            style: TextStyle(
                color: AppTheme.success,
                fontSize: 12,
                fontWeight: FontWeight.w500),
          ),
          if (accuracy != null) ...[
            const Text(
              '  ·  ',
              style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
            ),
            Text(
              'Accuracy: ${(accuracy * 100).toStringAsFixed(1)}%',
              style: TextStyle(
                  color: accuracyColor,
                  fontSize: 12,
                  fontWeight: FontWeight.w500),
            ),
          ],
        ],
      );
    }
    if (state.isRunning) {
      final progress = state.total > 0
          ? '${state.received}/${state.total}'
          : 'uploading…';
      return Row(
        children: [
          const SizedBox(
            width: 14,
            height: 14,
            child: CircularProgressIndicator(
                strokeWidth: 2, color: AppTheme.primary),
          ),
          const SizedBox(width: 8),
          Text(
            'Running… $progress',
            style:
                const TextStyle(color: AppTheme.textMuted, fontSize: 12),
          ),
        ],
      );
    }
    return const SizedBox.shrink();
  }
}

class _SampleResultCard extends StatelessWidget {
  const _SampleResultCard({required this.event, this.showModel = false});
  final Map<String, dynamic> event;
  final bool showModel;

  @override
  Widget build(BuildContext context) {
    final correct = event['correct'] as bool?;
    final Color statusColor;
    final IconData statusIcon;
    if (correct == true) {
      statusColor = AppTheme.success;
      statusIcon = Icons.check_circle_outline;
    } else if (correct == false) {
      statusColor = AppTheme.error;
      statusIcon = Icons.cancel_outlined;
    } else {
      statusColor = AppTheme.textMuted;
      statusIcon = Icons.help_outline;
    }

    final model = event['model'] as String?;
    final thumbnail = event['thumbnail'] as String?;

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
          _ThumbnailWidget(dataUri: thumbnail, size: 56),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(statusIcon, size: 14, color: statusColor),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        event['filename'] as String? ?? '',
                        style: const TextStyle(
                            color: AppTheme.textMuted, fontSize: 11),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (showModel && model != null)
                      Text(
                        model,
                        style: const TextStyle(
                            color: AppTheme.compare, fontSize: 10),
                        overflow: TextOverflow.ellipsis,
                      ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'Q: ${event['question']}',
                  style: const TextStyle(
                      color: AppTheme.textPrimary, fontSize: 12),
                ),
                const SizedBox(height: 3),
                Text(
                  'A: ${event['model_answer']}',
                  style: TextStyle(color: statusColor, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SampleErrorCard extends StatelessWidget {
  const _SampleErrorCard({required this.event, this.showModel = false});
  final Map<String, dynamic> event;
  final bool showModel;

  @override
  Widget build(BuildContext context) {
    final model = event['model'] as String?;
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.error.withValues(alpha: 0.4)),
      ),
      padding: const EdgeInsets.all(10),
      child: Row(
        children: [
          const Icon(Icons.error_outline, size: 16, color: AppTheme.error),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (showModel && model != null)
                  Text(model,
                      style: const TextStyle(
                          color: AppTheme.compare, fontSize: 10)),
                Text(
                  '${event['filename']}: ${event['detail']}',
                  style:
                      const TextStyle(color: AppTheme.error, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ThumbnailWidget extends StatelessWidget {
  const _ThumbnailWidget({required this.dataUri, this.size = 56});
  final String? dataUri;
  final double size;

  @override
  Widget build(BuildContext context) {
    if (dataUri == null) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: AppTheme.muted,
          borderRadius: BorderRadius.circular(6),
        ),
        alignment: Alignment.center,
        child: const Icon(Icons.image_outlined,
            size: 20, color: AppTheme.textMuted),
      );
    }
    try {
      final b64 = dataUri!.contains(',') ? dataUri!.split(',').last : dataUri!;
      final bytes = base64Decode(b64);
      return ClipRRect(
        borderRadius: BorderRadius.circular(6),
        child: Image.memory(
          bytes,
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Container(
            width: size,
            height: size,
            color: AppTheme.muted,
            alignment: Alignment.center,
            child: const Icon(Icons.broken_image_outlined,
                size: 20, color: AppTheme.textMuted),
          ),
        ),
      );
    } catch (_) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: AppTheme.muted,
          borderRadius: BorderRadius.circular(6),
        ),
      );
    }
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.error.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, size: 16, color: AppTheme.error),
          const SizedBox(width: 8),
          Expanded(
            child: Text(message,
                style: const TextStyle(
                    color: AppTheme.error, fontSize: 12)),
          ),
        ],
      ),
    );
  }
}
