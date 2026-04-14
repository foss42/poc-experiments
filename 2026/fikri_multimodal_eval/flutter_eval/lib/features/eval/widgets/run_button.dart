import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../providers/compare_provider.dart';
import '../providers/eval_config_provider.dart';
import '../providers/eval_provider.dart';

class RunButton extends ConsumerWidget {
  const RunButton({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(evalConfigProvider);
    final evalAsync = ref.watch(evalProvider);
    final compare = ref.watch(compareProvider);

    final isComparison = config.models.length >= 2;
    final isSingleLoading = evalAsync.isLoading;
    final isCompareRunning = compare.isRunning;
    final isLoading = isSingleLoading || isCompareRunning;
    final hasEmptyModel = config.models.any((m) => m.trim().isEmpty);

    final label = isComparison ? 'Compare Models' : 'Run Evaluation';

    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= 600;

        return Row(
          mainAxisAlignment:
              isWide ? MainAxisAlignment.end : MainAxisAlignment.start,
          children: [
            if (isCompareRunning) ...[
              OutlinedButton.icon(
                onPressed: () => ref.read(compareProvider.notifier).stop(),
                icon: const Icon(Icons.stop, size: 16, color: AppTheme.error),
                label: const Text('Stop',
                    style: TextStyle(color: AppTheme.error)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppTheme.error),
                ),
              ),
              const SizedBox(width: 8),
            ],
            if (isWide)
              ElevatedButton.icon(
                onPressed: isLoading || hasEmptyModel ? null : () => _run(ref, isComparison),
                icon: _icon(isLoading),
                label: Text(label),
              )
            else
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: isLoading || hasEmptyModel ? null : () => _run(ref, isComparison),
                  icon: _icon(isLoading),
                  label: Text(label),
                ),
              ),
          ],
        );
      },
    );
  }

  static Widget _icon(bool isLoading) => isLoading
      ? const SizedBox(
          width: 16,
          height: 16,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            color: Colors.white,
          ),
        )
      : const Icon(Icons.play_arrow, size: 18);

  static void _run(WidgetRef ref, bool isComparison) {
    if (isComparison) {
      ref.read(compareProvider.notifier).run();
    } else {
      ref.read(evalProvider.notifier).run();
    }
  }
}

/// Inline feedback shown below the run button when a single eval error occurs.
class EvalErrorBanner extends ConsumerWidget {
  const EvalErrorBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final evalAsync = ref.watch(evalProvider);
    return evalAsync.when(
      data: (_) => const SizedBox.shrink(),
      loading: () => const SizedBox.shrink(),
      error: (e, _) => Container(
        margin: const EdgeInsets.only(top: 8),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppTheme.error.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: AppTheme.error.withValues(alpha: 0.4)),
        ),
        child: Row(
          children: [
            const Icon(Icons.error_outline, color: AppTheme.error, size: 14),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                e.toString().replaceFirst('Exception: ', ''),
                style: const TextStyle(color: AppTheme.error, fontSize: 12),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
