import 'package:flutter/material.dart';
import '../../core/mcp/mcp_server_concept.dart';
import '../theme.dart';
import 'common.dart';

class McpAppsTab extends StatelessWidget {
  const McpAppsTab({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _mcpServerSection(),
          const SizedBox(height: 20),
          _mcpAppsSection(),
          const SizedBox(height: 20),
          const AgentChatPreview(),
        ],
      ),
    );
  }

  Widget _mcpServerSection() => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const Text('API Dash as MCP Server', style: AppTextStyles.mono14Bold),
      const SizedBox(height: 4),
      const Text('External AI Agents (Cursor, GPT) can call these tools:', style: AppTextStyles.mono11),
      const SizedBox(height: 12),
      for (final tool in mcpTools) _toolRow(tool.name, tool.description, AppColors.methodGet),
    ],
  );

  Widget _mcpAppsSection() => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const Text('MCP Apps (Interactive UI in Agent Chat)', style: AppTextStyles.mono14Bold),
      const SizedBox(height: 4),
      const Text('Sandboxed iframes rendered inside AI host:', style: AppTextStyles.mono11),
      const SizedBox(height: 12),
      for (final res in mcpAppResources) _toolRow(res.uri, res.description, AppColors.variable),
    ],
  );

  Widget _toolRow(String label, String desc, Color color) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(3)),
          child: Text(label, style: TextStyle(color: color, fontSize: 11, fontFamily: 'monospace')),
        ),
        const SizedBox(width: 8),
        Expanded(child: Text(desc, style: AppTextStyles.mono11)),
      ],
    ),
  );
}

class AgentChatPreview extends StatelessWidget {
  const AgentChatPreview({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Agent Chat Preview', style: AppTextStyles.mono14Bold),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: panelDecoration(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              _userBubble('Test my user registration flow with invalid emails'),
              const SizedBox(height: 12),
              _agentResponse(),
            ],
          ),
        ),
      ],
    );
  }

  Widget _userBubble(String text) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
    decoration: BoxDecoration(color: AppColors.surfaceLight, borderRadius: BorderRadius.circular(6)),
    child: Text(text, style: AppTextStyles.mono12),
  );

  Widget _agentResponse() => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: AppColors.background,
      borderRadius: BorderRadius.circular(6),
      border: Border.all(color: AppColors.border),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('I have generated a workflow graph with 4 test cases. Here is the interactive view:', style: AppTextStyles.mono12),
        const SizedBox(height: 12),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: panelDecoration(),
          child: const Column(children: [
            Icon(Icons.account_tree, color: AppColors.textDim, size: 32),
            SizedBox(height: 8),
            Text('MCP App: DCG Workflow Viewer', style: AppTextStyles.mono12Dim),
            Text('Sandboxed iframe via ui://apidash/workflow-graph',
              style: TextStyle(color: AppColors.textDim, fontSize: 10, fontFamily: 'monospace')),
          ]),
        ),
        const SizedBox(height: 12),
        Row(children: [
          _actionChip(Icons.play_arrow, 'Execute Tests'),
          const SizedBox(width: 8),
          _actionChip(Icons.add_circle_outline, 'Add to Context'),
        ]),
      ],
    ),
  );

  Widget _actionChip(IconData icon, String label) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
    decoration: BoxDecoration(borderRadius: BorderRadius.circular(4), border: Border.all(color: AppColors.border)),
    child: Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(icon, color: AppColors.textDim, size: 14),
      const SizedBox(width: 4),
      Text(label, style: AppTextStyles.mono11),
    ]),
  );
}
