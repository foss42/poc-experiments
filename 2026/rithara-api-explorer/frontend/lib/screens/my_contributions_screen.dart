import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_colors.dart';
import '../providers/submission_providers.dart';
import '../models/api_submission.dart';
import '../widgets/common/status_badge.dart';

class MyContributionsScreen extends ConsumerWidget {
  const MyContributionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final submissions = ref.watch(userSubmissionsProvider('user@example.com'));

    return DefaultTabController(
      length: 4,
      child: Scaffold(
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
          title: const Text('My Contributions'),
          actions: [
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: ElevatedButton.icon(
                onPressed: () => context.push('/contribute'),
                icon: const Icon(Icons.add, size: 16),
                label: const Text('New API'),
              ),
            ),
          ],
        ),
        body: Column(
          children: [
             const TabBar(
              isScrollable: true,
              tabAlignment: TabAlignment.start,
              tabs: [
                Tab(text: 'All'),
                Tab(text: 'Pending'),
                Tab(text: 'Approved'),
                Tab(text: 'Rejected'),
              ],
            ),
            Expanded(
              child: submissions.isEmpty
                  ? _buildEmptyState()
                  : TabBarView(
                      children: [
                        _SubmissionList(submissions: submissions),
                        _SubmissionList(submissions: submissions.where((s) => s.status == SubmissionStatus.pending).toList()),
                        _SubmissionList(submissions: submissions.where((s) => s.status == SubmissionStatus.approved).toList()),
                        _SubmissionList(submissions: submissions.where((s) => s.status == SubmissionStatus.rejected).toList()),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.history, size: 48, color: AppColors.textGray500),
          const SizedBox(height: 16),
          const Text(
            'No contributions found',
            style: TextStyle(color: AppColors.textGray400, fontSize: 16),
          ),
          const SizedBox(height: 8),
          const Text(
            'Your submitted APIs will appear here.',
            style: TextStyle(color: AppColors.textGray600, fontSize: 14),
          ),
        ],
      ),
    );
  }
}

class _SubmissionList extends StatelessWidget {
  final List<ApiSubmission> submissions;
  const _SubmissionList({required this.submissions});

  @override
  Widget build(BuildContext context) {
    if (submissions.isEmpty) {
      return const Center(child: Text('No submissions in this category'));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(24),
      itemCount: submissions.length,
      itemBuilder: (context, index) {
        final sub = submissions[index];
        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppColors.cardBg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          sub.name,
                          style: const TextStyle(color: AppColors.textWhite, fontSize: 16, fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Submitted on ${sub.submittedBy}',
                          style: const TextStyle(color: AppColors.textGray500, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  StatusBadge(status: sub.status),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                sub.description,
                style: const TextStyle(color: AppColors.textGray400, fontSize: 14),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  const Icon(Icons.link, size: 14, color: AppColors.textGray600),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      sub.baseUrl,
                      style: const TextStyle(color: AppColors.textGray600, fontSize: 12),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
