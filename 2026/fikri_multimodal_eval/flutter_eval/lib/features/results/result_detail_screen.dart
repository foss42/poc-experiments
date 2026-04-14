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
