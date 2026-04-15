import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../providers/custom_eval_provider.dart';

class CustomResultStreamView extends ConsumerWidget {
  const CustomResultStreamView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(customEvalProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Progress / completion header
        _StatusHeader(state: state),
        if (state.sampleResults.isNotEmpty ||
            state.sampleErrors.isNotEmpty) ...[
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

class _StatusHeader extends StatelessWidget {
  const _StatusHeader({required this.state});
  final CustomEvalState state;

  @override
  Widget build(BuildContext context) {
    if (state.isComplete) {
      final accuracyText = state.accuracy != null
          ? '  ·  Accuracy: ${(state.accuracy! * 100).toStringAsFixed(1)}%'
          : '';
      return Row(
        children: [
          const Icon(Icons.check_circle, color: AppTheme.success, size: 14),
          const SizedBox(width: 6),
          Text(
            'Evaluation complete$accuracyText',
            style: const TextStyle(
                color: AppTheme.success,
                fontSize: 12,
                fontWeight: FontWeight.w500),
          ),
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
            style: const TextStyle(
                color: AppTheme.textMuted, fontSize: 12),
          ),
        ],
      );
    }
    return const SizedBox.shrink();
  }
}

class _SampleResultCard extends StatelessWidget {
  const _SampleResultCard({required this.event});
  final Map<String, dynamic> event;

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
          Icon(statusIcon, size: 16, color: statusColor),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  event['filename'] as String? ?? '',
                  style: const TextStyle(
                      color: AppTheme.textMuted, fontSize: 11),
                ),
                const SizedBox(height: 3),
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
  const _SampleErrorCard({required this.event});
  final Map<String, dynamic> event;

  @override
  Widget build(BuildContext context) {
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
            child: Text(
              '${event['filename']}: ${event['detail']}',
              style: const TextStyle(
                  color: AppTheme.error, fontSize: 12),
            ),
          ),
        ],
      ),
    );
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
