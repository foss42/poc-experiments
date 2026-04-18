import 'package:flutter/material.dart';
import '../../core/engine/context_store.dart';
import '../theme.dart';
import 'common.dart';

class ContextStoreTab extends StatelessWidget {
  final List<ContextVariable> variables;

  const ContextStoreTab({super.key, required this.variables});

  @override
  Widget build(BuildContext context) {
    if (variables.isEmpty) return emptyState('No variables extracted yet');

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            const Text('{}', style: TextStyle(color: AppColors.textDim, fontSize: 16, fontFamily: 'monospace')),
            const SizedBox(width: 8),
            const Text('Active Variables', style: AppTextStyles.mono14Bold),
          ]),
          const SizedBox(height: 16),
          Expanded(
            child: Container(
              decoration: panelDecoration(),
              child: ListView.separated(
                padding: const EdgeInsets.all(12),
                itemCount: variables.length,
                separatorBuilder: (_, i) => const Divider(color: AppColors.border, height: 24),
                itemBuilder: (_, i) => _variableRow(variables[i]),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _variableRow(ContextVariable v) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: badgeDecoration(AppColors.variable),
          child: Text(
            '{{${v.key}}}',
            style: const TextStyle(color: AppColors.variable, fontSize: 13, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
          ),
        ),
        const SizedBox(width: 12),
        const Text('→', style: TextStyle(color: AppColors.textDim, fontSize: 14)),
        const SizedBox(width: 12),
        Expanded(child: Text(v.value, style: const TextStyle(color: AppColors.text, fontSize: 13, fontFamily: 'monospace'))),
        Text('from ${v.sourceNodeId}', style: AppTextStyles.mono11),
      ],
    );
  }
}
