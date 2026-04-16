import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../eval/widgets/single_result_view.dart';
import '../eval/widgets/trajectory_view.dart';

final _resultDetailProvider =
    FutureProvider.family<Map<String, dynamic>, String>((ref, evalId) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.get('/api/results/$evalId');
  return (response.data as Map).cast<String, dynamic>();
});

class ResultDetailScreen extends ConsumerWidget {
  const ResultDetailScreen({super.key, required this.evalId});

  final String evalId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(_resultDetailProvider(evalId));

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.surface,
        foregroundColor: AppTheme.textPrimary,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/results'),
        ),
        title: Text(
          evalId,
          style: const TextStyle(
              fontSize: 13, fontFamily: 'monospace', color: AppTheme.textMuted),
        ),
      ),
      body: detailAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppTheme.primary),
        ),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.info_outline,
                  color: AppTheme.textMuted, size: 32),
              const SizedBox(height: 8),
              const Text(
                'Result not found',
                style: TextStyle(color: AppTheme.textMuted, fontSize: 13),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () => context.go('/results'),
                child: const Text('Back to results'),
              ),
            ],
          ),
        ),
        data: (data) {
          // Custom eval results: single → results is List; compare → comparison is Map.
          // Standard harness results have `results` as a Map<task, metrics>.
          final rawResults = data['results'];
          if (rawResults is List) {
            return _CustomEvalDetail(data: data);
          }
          if (data['comparison'] is Map) {
            return _CompareEvalDetail(data: data);
          }

          final trajectory = data['trajectory'] as List<dynamic>?;
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SingleResultView(data: data),
                if (trajectory != null && trajectory.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  TrajectoryView(trajectory: trajectory),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

// ─── Custom eval detail view ──────────────────────────────────────────────

class _CustomEvalDetail extends StatelessWidget {
  const _CustomEvalDetail({required this.data});

  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context) {
    final samples = (data['results'] as List<dynamic>)
        .map((e) => (e as Map).cast<String, dynamic>())
        .toList()
      ..sort((a, b) =>
          ((a['index'] as int?) ?? 0).compareTo((b['index'] as int?) ?? 0));

    final accuracy = (data['accuracy'] as num?)?.toDouble();
    final correctCount = samples.where((s) => s['correct'] == true).length;
    final hasGroundTruth =
        samples.any((s) => s['correct'] != null);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Summary header ─────────────────────────────────────────────
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppTheme.surface,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppTheme.border),
            ),
            child: Row(
              children: [
                const Icon(Icons.check_circle,
                    color: AppTheme.success, size: 16),
                const SizedBox(width: 8),
                const Text(
                  'Evaluation complete',
                  style: TextStyle(
                      color: AppTheme.success,
                      fontSize: 13,
                      fontWeight: FontWeight.w500),
                ),
                if (accuracy != null) ...[
                  const SizedBox(width: 6),
                  const Text('·',
                      style: TextStyle(
                          color: AppTheme.textMuted, fontSize: 13)),
                  const SizedBox(width: 6),
                  Text(
                    'Accuracy: ${(accuracy * 100).toStringAsFixed(1)}%',
                    style: TextStyle(
                      color: accuracy > 0
                          ? AppTheme.accent
                          : AppTheme.warning,
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
                const Spacer(),
                Text(
                  hasGroundTruth
                      ? '$correctCount / ${samples.length} correct'
                      : '${samples.length} sample${samples.length == 1 ? '' : 's'}',
                  style: const TextStyle(
                      color: AppTheme.textMuted, fontSize: 12),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // ── Sample results ─────────────────────────────────────────────
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: samples.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (_, i) => _SampleCard(sample: samples[i]),
          ),
        ],
      ),
    );
  }
}

class _SampleCard extends StatelessWidget {
  const _SampleCard({required this.sample});

  final Map<String, dynamic> sample;

  @override
  Widget build(BuildContext context) {
    final correct = sample['correct'] as bool?;
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

    final thumbnail = sample['thumbnail'] as String?;

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.border),
      ),
      padding: const EdgeInsets.all(12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _ThumbnailImage(dataUri: thumbnail, size: 64),
          const SizedBox(width: 12),
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
                        sample['filename'] as String? ?? '',
                        style: const TextStyle(
                            color: AppTheme.textMuted, fontSize: 11),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 5),
                Text(
                  'Q: ${sample['question'] ?? ''}',
                  style: const TextStyle(
                      color: AppTheme.textPrimary, fontSize: 12),
                ),
                const SizedBox(height: 4),
                Text(
                  'A: ${sample['model_answer'] ?? ''}',
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

// ─── Compare eval detail view (historical) ────────────────────────────────────

class _CompareEvalDetail extends StatelessWidget {
  const _CompareEvalDetail({required this.data});
  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context) {
    final comparison = (data['comparison'] as Map<String, dynamic>).map(
      (k, v) => MapEntry(
        k,
        (v as List).map((e) => (e as Map).cast<String, dynamic>()).toList(),
      ),
    );
    final modelKeys = comparison.keys.toList();
    final sampleCount = comparison[modelKeys.first]?.length ?? 0;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Accuracy summary
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppTheme.surface,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppTheme.border),
            ),
            child: Wrap(
              spacing: 12,
              runSpacing: 8,
              children: modelKeys.map((model) {
                final results = comparison[model] ?? [];
                final correct = results.where((s) => s['correct'] == true).length;
                final hasGT = results.any((s) => s['correct'] != null);
                final pct = hasGT && results.isNotEmpty
                    ? '${(correct / results.length * 100).toStringAsFixed(1)}%'
                    : 'no GT';
                final color = hasGT && correct > 0 ? AppTheme.accent : AppTheme.warning;
                final short = model.length > 32 ? '…${model.substring(model.length - 30)}' : model;
                return Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(short,
                        style: const TextStyle(
                            color: AppTheme.textMuted, fontSize: 11)),
                    const SizedBox(width: 6),
                    Text(pct,
                        style: TextStyle(
                            color: color,
                            fontSize: 13,
                            fontWeight: FontWeight.w700)),
                  ],
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 14),
          // Per-sample comparison cards
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: sampleCount,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (_, i) {
              final samplesByModel = {
                for (final model in modelKeys)
                  if (i < (comparison[model]?.length ?? 0))
                    model: comparison[model]![i],
              };
              final first = samplesByModel.values.firstOrNull;
              final filename = first?['filename'] as String? ?? '';
              final question = first?['question'] as String? ?? '';
              final thumbnail = first?['thumbnail'] as String?;

              return Container(
                decoration: BoxDecoration(
                  color: AppTheme.surface,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(12, 10, 12, 8),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _ThumbnailImage(dataUri: thumbnail, size: 60),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(filename,
                                    style: const TextStyle(
                                        color: AppTheme.textMuted,
                                        fontSize: 10)),
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
                    ...modelKeys.map((model) {
                      final result = samplesByModel[model];
                      final isError = result?['type'] == 'sample_error';
                      final answer = isError
                          ? (result?['detail'] as String?) ?? 'Error'
                          : (result?['model_answer'] as String?) ?? '—';
                      final correct = result?['correct'] as bool?;
                      final Color sc;
                      final IconData si;
                      if (isError) {
                        sc = AppTheme.error; si = Icons.error_outline;
                      } else if (correct == true) {
                        sc = AppTheme.success; si = Icons.check_circle_outline;
                      } else if (correct == false) {
                        sc = AppTheme.error; si = Icons.cancel_outlined;
                      } else {
                        sc = AppTheme.textMuted; si = Icons.help_outline;
                      }
                      final shortModel = model.length > 32
                          ? '…${model.substring(model.length - 30)}'
                          : model;
                      return Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 7),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(si, size: 14, color: sc),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(shortModel,
                                      style: const TextStyle(
                                          color: AppTheme.textMuted,
                                          fontSize: 10)),
                                  const SizedBox(height: 2),
                                  Text(answer,
                                      style: TextStyle(
                                          color: sc, fontSize: 12)),
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
            },
          ),
        ],
      ),
    );
  }
}

// ─── Shared thumbnail widget ──────────────────────────────────────────────────

class _ThumbnailImage extends StatelessWidget {
  const _ThumbnailImage({required this.dataUri, this.size = 64});
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
            size: 22, color: AppTheme.textMuted),
      );
    }
    try {
      final b64 =
          dataUri!.contains(',') ? dataUri!.split(',').last : dataUri!;
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
                size: 22, color: AppTheme.textMuted),
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
