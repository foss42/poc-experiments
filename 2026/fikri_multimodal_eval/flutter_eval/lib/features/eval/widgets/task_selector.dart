import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../providers/eval_config_provider.dart';

class TaskSelector extends ConsumerWidget {
  const TaskSelector({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(evalConfigProvider);
    final availableTasks = config.benchmark.tasks;
    final selectedTask = config.tasks.isNotEmpty ? config.tasks.first : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Task',
          style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
        ),
        const SizedBox(height: 4),
        DropdownButton<String>(
          value: selectedTask,
          isExpanded: true,
          dropdownColor: AppTheme.surface,
          underline: const Divider(height: 1, color: AppTheme.border),
          style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13),
          items: availableTasks
              .map((t) => DropdownMenuItem(value: t, child: Text(t)))
              .toList(),
          onChanged: (value) {
            if (value != null) {
              ref.read(evalConfigProvider.notifier).setTasks([value]);
            }
          },
        ),
      ],
    );
  }
}
