import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../providers/eval_config_provider.dart';
import '../providers/eval_provider.dart';

class RunButton extends ConsumerWidget {
  const RunButton({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(evalConfigProvider);
    final evalAsync = ref.watch(evalProvider);

    final isLoading = evalAsync.isLoading;
    final hasEmptyModel = config.models.any((m) => m.trim().isEmpty);
    final isComparison = config.models.length >= 2;

    final label = isComparison ? 'Compare Models' : 'Run Evaluation';

    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= 600;
        final button = Row(
          mainAxisSize: isWide ? MainAxisSize.min : MainAxisSize.max,
          children: [
            Expanded(
              flex: isWide ? 0 : 1,
              child: ElevatedButton.icon(
                onPressed:
                    isLoading || hasEmptyModel ? null : () => ref.read(evalProvider.notifier).run(),
                icon: isLoading
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.play_arrow, size: 18),
                label: Text(label),
              ),
            ),
          ],
        );

        return Align(
          alignment: isWide ? Alignment.centerRight : Alignment.center,
          child: button,
        );
      },
    );
  }
}

/// Inline feedback shown below the run button when an error occurs.
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
