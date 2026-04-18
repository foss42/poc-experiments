import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_colors.dart';
import '../providers/submission_providers.dart';
import '../models/api_submission.dart';
import '../widgets/common/status_badge.dart';
import '../widgets/common/method_badge.dart';

class ReviewQueueScreen extends ConsumerWidget {
  const ReviewQueueScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pendingSubmissions = ref.watch(pendingSubmissionsProvider);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/');
            }
          },
        ),
        title: const Text('Review Queue'),
        actions: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Center(
              child: Text(
                '${pendingSubmissions.length} pending',
                style: const TextStyle(color: AppColors.textGray500, fontSize: 13),
              ),
            ),
          ),
        ],
      ),
      body: pendingSubmissions.isEmpty
          ? _buildEmptyState()
          : ListView.builder(
              padding: const EdgeInsets.all(24),
              itemCount: pendingSubmissions.length,
              itemBuilder: (context, index) {
                final sub = pendingSubmissions[index];
                return _ReviewQueueTile(submission: sub);
              },
            ),
    );
  }

  Widget _buildEmptyState() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.check_circle_outline, size: 48, color: AppColors.success),
          SizedBox(height: 16),
          Text(
            'Queue is empty',
            style: TextStyle(color: AppColors.textWhite, fontSize: 18, fontWeight: FontWeight.w600),
          ),
          SizedBox(height: 8),
          Text(
            'All submissions have been reviewed.',
            style: TextStyle(color: AppColors.textGray500, fontSize: 14),
          ),
        ],
      ),
    );
  }
}

class _ReviewQueueTile extends StatelessWidget {
  final ApiSubmission submission;
  const _ReviewQueueTile({required this.submission});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        submission.name,
                        style: const TextStyle(color: AppColors.textWhite, fontSize: 18, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Submitted by ${submission.submittedBy} on ${submission.submittedDate}',
                        style: const TextStyle(color: AppColors.textGray500, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                StatusBadge(status: submission.status),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.border),
          // Content
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  submission.description,
                  style: const TextStyle(color: AppColors.textGray400, fontSize: 14, height: 1.5),
                ),
                const SizedBox(height: 20),
                const Text('Endpoints', style: TextStyle(color: AppColors.textWhite, fontSize: 14, fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 12,
                  runSpacing: 8,
                  children: submission.endpoints.map((ep) => Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      MethodBadge(method: ep.method),
                      const SizedBox(width: 8),
                      Text(ep.path, style: const TextStyle(color: AppColors.textGray500, fontSize: 12, fontFamily: 'monospace')),
                    ],
                  )).toList(),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.border),
          // Actions
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () {}, // Request Changes logic
                  style: TextButton.styleFrom(foregroundColor: AppColors.warning),
                  child: const Text('Request Changes'),
                ),
                const SizedBox(width: 8),
                TextButton(
                  onPressed: () {}, // Reject logic
                  style: TextButton.styleFrom(foregroundColor: AppColors.danger),
                  child: const Text('Reject'),
                ),
                const Spacer(),
                ElevatedButton(
                  onPressed: () {}, // Approve logic
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.success, foregroundColor: Colors.white),
                  child: const Text('Approve Submission'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
