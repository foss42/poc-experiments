import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import 'providers/results_provider.dart';
import 'widgets/result_card.dart';

class ResultsScreen extends ConsumerWidget {
  const ResultsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final resultsAsync = ref.watch(resultsProvider);
    final notifier = ref.read(resultsProvider.notifier);

    return Column(
      children: [
        _ResultsHeader(
          onRefresh: notifier.refresh,
          isLoading: resultsAsync.isLoading,
        ),
        Expanded(
          child: resultsAsync.when(
            loading: () => const Center(
              child: CircularProgressIndicator(color: AppTheme.primary),
            ),
            error: (e, _) => Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.error_outline,
                      color: AppTheme.error, size: 32),
                  const SizedBox(height: 8),
                  Text(
                    e.toString(),
                    style: const TextStyle(
                        color: AppTheme.error, fontSize: 12),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton(
                    onPressed: notifier.refresh,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),
            data: (state) {
              if (state.items.isEmpty) {
                return const Center(
                  child: Text(
                    'No evaluations yet.\nRun one from the Eval tab.',
                    textAlign: TextAlign.center,
                    style:
                        TextStyle(color: AppTheme.textMuted, fontSize: 13),
                  ),
                );
              }
              return RefreshIndicator(
                onRefresh: notifier.refresh,
                color: AppTheme.primary,
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: state.items.length + (state.hasMore ? 1 : 0),
                  itemBuilder: (_, i) {
                    if (i == state.items.length) {
                      return _LoadMoreButton(
                        isLoading: state.isLoadingMore,
                        onTap: notifier.loadMore,
                      );
                    }
                    return ResultCard(result: state.items[i]);
                  },
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _ResultsHeader extends StatelessWidget {
  const _ResultsHeader({
    required this.onRefresh,
    required this.isLoading,
  });

  final Future<void> Function() onRefresh;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: AppTheme.border)),
      ),
      child: Row(
        children: [
          const Text(
            'Evaluation History',
            style: TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
          const Spacer(),
          IconButton(
            onPressed: isLoading ? null : onRefresh,
            icon: isLoading
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: AppTheme.primary),
                  )
                : const Icon(Icons.refresh,
                    color: AppTheme.textMuted, size: 18),
            tooltip: 'Refresh',
            padding: EdgeInsets.zero,
            constraints:
                const BoxConstraints(minWidth: 32, minHeight: 32),
          ),
        ],
      ),
    );
  }
}

class _LoadMoreButton extends StatelessWidget {
  const _LoadMoreButton({required this.isLoading, required this.onTap});

  final bool isLoading;
  final Future<void> Function() onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Center(
        child: isLoading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: AppTheme.primary),
              )
            : OutlinedButton(
                onPressed: onTap,
                child: const Text('Load more'),
              ),
      ),
    );
  }
}
