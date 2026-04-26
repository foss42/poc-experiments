import 'package:flutter/material.dart';
import '../theme.dart';
import 'common.dart';

class LogEntry {
  final String nodeId;
  final String message;
  final DateTime timestamp;

  LogEntry({required this.nodeId, required this.message})
      : timestamp = DateTime.now();

  String get formattedTime =>
      '${timestamp.hour.toString().padLeft(2, '0')}:'
      '${timestamp.minute.toString().padLeft(2, '0')}:'
      '${timestamp.second.toString().padLeft(2, '0')}.'
      '${timestamp.millisecond.toString().padLeft(3, '0')}';
}

class ExecutionLogTab extends StatelessWidget {
  final List<LogEntry> logs;

  const ExecutionLogTab({super.key, required this.logs});

  @override
  Widget build(BuildContext context) {
    if (logs.isEmpty) return emptyState('Execute a workflow to see logs');

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: logs.length,
      itemBuilder: (_, i) {
        final log = logs[i];
        return Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: RichText(
            text: TextSpan(
              style: AppTextStyles.mono12,
              children: [
                TextSpan(text: '${log.formattedTime}  ', style: AppTextStyles.mono12Dim),
                TextSpan(text: '[${log.nodeId}] ', style: AppTextStyles.mono12.copyWith(color: AppColors.variable)),
                TextSpan(text: log.message, style: AppTextStyles.mono12.copyWith(color: _logColor(log.message))),
              ],
            ),
          ),
        );
      },
    );
  }

  Color _logColor(String msg) {
    if (msg.startsWith('SUCCESS')) return AppColors.success;
    if (msg.startsWith('FAILED') || msg.startsWith('ERROR')) return AppColors.failure;
    if (msg.startsWith('SKIPPED')) return AppColors.textDim;
    if (msg.contains('Extracted')) return AppColors.variable;
    if (msg.contains('[SIMULATED]')) return AppColors.warning;
    return AppColors.text;
  }
}
