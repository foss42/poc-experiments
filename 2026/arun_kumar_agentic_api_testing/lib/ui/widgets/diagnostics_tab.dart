import 'package:flutter/material.dart';
import '../../core/models/diagnostic_report.dart';
import '../theme.dart';
import 'common.dart';

class DiagnosticsTab extends StatelessWidget {
  final DiagnosticReport? report;
  final VoidCallback? onApproveHeal;

  const DiagnosticsTab({super.key, this.report, this.onApproveHeal});

  @override
  Widget build(BuildContext context) {
    if (report == null) return emptyState('No failures to diagnose');

    final r = report!;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _diagnosticBanner(),
          const SizedBox(height: 12),
          Text('Failed at: ${r.nodeName}', style: AppTextStyles.mono14Bold),
          const SizedBox(height: 4),
          Text('Expected HTTP ${r.expectedStatus}, got ${r.actualStatus ?? "N/A"}', style: AppTextStyles.mono12Dim),
          const SizedBox(height: 16),
          sectionHeader(Icons.search, 'Root Cause Analysis'),
          const SizedBox(height: 8),
          _causesList(r.possibleCauses),
          if (r.selfHealingProposal != null) ...[
            const SizedBox(height: 16),
            sectionHeader(Icons.auto_fix_high, 'Self-Healing Proposal'),
            const SizedBox(height: 8),
            _healingBox(r.selfHealingProposal!),
          ],
          const SizedBox(height: 16),
          _approveBar(),
        ],
      ),
    );
  }

  Widget _diagnosticBanner() => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: AppColors.failure.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(6),
      border: Border.all(color: AppColors.failure.withValues(alpha: 0.3)),
    ),
    child: const Row(children: [
      Icon(Icons.warning_amber_rounded, color: AppColors.warning, size: 18),
      SizedBox(width: 8),
      Text('DIAGNOSTIC MODE', style: TextStyle(
        color: AppColors.warning, fontSize: 12, fontWeight: FontWeight.bold, fontFamily: 'monospace',
      )),
    ]),
  );

  Widget _causesList(List<String> causes) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(12),
    decoration: panelDecoration(),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final cause in causes)
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Text(cause, style: AppTextStyles.mono12),
          ),
      ],
    ),
  );

  Widget _healingBox(String proposal) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: AppColors.success.withValues(alpha: 0.05),
      borderRadius: BorderRadius.circular(6),
      border: Border.all(color: AppColors.success.withValues(alpha: 0.2)),
    ),
    child: Text(proposal, style: AppTextStyles.mono12),
  );

  Widget _approveBar() => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(12),
    decoration: panelDecoration(),
    child: Row(children: [
      const Expanded(child: Text('Human in the Loop: Approve graph mutation?', style: AppTextStyles.mono12Dim)),
      GestureDetector(
        onTap: onApproveHeal,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(4), border: Border.all(color: AppColors.text)),
          child: const Text('Approve & Heal', style: AppTextStyles.mono12Bold),
        ),
      ),
    ]),
  );
}
