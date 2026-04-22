import 'package:flutter/material.dart';
import '../theme.dart';
import 'common.dart';

class TopBar extends StatelessWidget {
  final String? status;
  final bool simulateFailure;
  final VoidCallback onToggleSimulate;
  final VoidCallback onExecute;
  final bool isRunning;

  const TopBar({
    super.key,
    this.status,
    required this.simulateFailure,
    required this.onToggleSimulate,
    required this.onExecute,
    required this.isRunning,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 48,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(bottom: BorderSide(color: AppColors.border)),
      ),
      child: Row(
        children: [
          const Text('API Dash', style: AppTextStyles.mono14Bold),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(4)),
            child: const Text('Agentic Testing', style: AppTextStyles.mono11),
          ),
          const Spacer(),
          if (status != null)
            statusBadge(
              status == 'success' ? 'SUCCESS' : 'FAILED',
              status == 'success' ? AppColors.success : AppColors.failure,
            ),
          const SizedBox(width: 12),
          _simulateToggle(),
          const SizedBox(width: 12),
          _executeButton(),
        ],
      ),
    );
  }

  Widget _simulateToggle() {
    final active = simulateFailure;
    return GestureDetector(
      onTap: onToggleSimulate,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: active ? AppColors.warning.withValues(alpha: 0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: active ? AppColors.warning.withValues(alpha: 0.5) : AppColors.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.warning_amber_rounded, size: 14, color: active ? AppColors.warning : AppColors.textDim),
            const SizedBox(width: 4),
            Text('Simulate Failure', style: AppTextStyles.mono11.copyWith(color: active ? AppColors.warning : AppColors.textDim)),
          ],
        ),
      ),
    );
  }

  Widget _executeButton() {
    return GestureDetector(
      onTap: isRunning ? null : onExecute,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: isRunning ? AppColors.border : AppColors.text,
          borderRadius: BorderRadius.circular(4),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isRunning ? Icons.hourglass_empty : Icons.play_arrow,
              size: 14, color: isRunning ? AppColors.textDim : AppColors.background,
            ),
            const SizedBox(width: 4),
            Text(
              isRunning ? 'Running...' : 'Execute Workflow',
              style: AppTextStyles.mono12Bold.copyWith(color: isRunning ? AppColors.textDim : AppColors.background),
            ),
          ],
        ),
      ),
    );
  }
}
