import 'package:flutter/material.dart';
import '../../core/models/workflow.dart';
import '../../core/models/execution_result.dart';
import '../theme.dart';
import 'node_card.dart';

class WorkflowGraph extends StatelessWidget {
  final Workflow workflow;
  final Map<String, NodeStatus> nodeStates;

  const WorkflowGraph({super.key, required this.workflow, required this.nodeStates});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            const Text('Workflow DCG', style: AppTextStyles.mono11),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(border: Border.all(color: AppColors.border), borderRadius: BorderRadius.circular(3)),
              child: Text('${workflow.nodes.length} nodes, ${workflow.edges.length} edges',
                style: const TextStyle(color: AppColors.textDim, fontSize: 10, fontFamily: 'monospace')),
            ),
          ]),
          const SizedBox(height: 16),
          Expanded(
            child: SingleChildScrollView(
              child: Center(
                child: Wrap(
                  runSpacing: 16,
                  children: [
                    for (int i = 0; i < workflow.nodes.length; i++)
                      NodeCard(
                        name: workflow.nodes[i].name,
                        method: workflow.nodes[i].method,
                        url: workflow.nodes[i].url,
                        status: nodeStates[workflow.nodes[i].id] ?? NodeStatus.pending,
                        isLast: i == workflow.nodes.length - 1,
                      ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
