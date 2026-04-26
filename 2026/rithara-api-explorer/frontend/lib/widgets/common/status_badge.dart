import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../models/api_submission.dart';

class StatusBadge extends StatelessWidget {
  final SubmissionStatus status;

  const StatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    String label;
    IconData icon;

    switch (status) {
      case SubmissionStatus.pending:
        bg = AppColors.blueFaint;
        fg = AppColors.blueLight;
        label = 'Pending';
        icon = Icons.schedule;
        break;
      case SubmissionStatus.approved:
        bg = AppColors.successFaint;
        fg = AppColors.success;
        label = 'Approved';
        icon = Icons.check_circle;
        break;
      case SubmissionStatus.rejected:
        bg = AppColors.dangerFaint;
        fg = AppColors.danger;
        label = 'Rejected';
        icon = Icons.cancel;
        break;
      case SubmissionStatus.needsChanges:
        bg = AppColors.warningFaint;
        fg = AppColors.warning;
        label = 'Needs Changes';
        icon = Icons.warning_amber;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: fg.withValues(alpha: 0.2)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: fg),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: fg,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
