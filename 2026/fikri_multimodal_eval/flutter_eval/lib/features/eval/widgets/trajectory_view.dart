import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';

class TrajectoryView extends StatelessWidget {
  const TrajectoryView({super.key, required this.trajectory});

  final List<dynamic> trajectory;

  static Color _roleColor(String role) => switch (role) {
        'user' => AppTheme.primary,
        'assistant' => AppTheme.success,
        'tool' => AppTheme.warning,
        _ => AppTheme.muted, // system and unknown
      };

  @override
  Widget build(BuildContext context) {
    return ExpansionTile(
      tilePadding: EdgeInsets.zero,
      title: Text(
        'Agent trajectory (${trajectory.length} messages)',
        style: const TextStyle(
          color: AppTheme.textMuted,
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
      ),
      children: trajectory.map((msg) {
        final message = msg as Map<String, dynamic>;
        final role = (message['role'] as String? ?? 'system').toLowerCase();
        final content = message['content'] as String? ?? '';

        return Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 3,
                height: null,
                margin: const EdgeInsets.only(right: 8, top: 2, bottom: 2),
                color: _roleColor(role),
                constraints: const BoxConstraints(minHeight: 36),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      role,
                      style: TextStyle(
                        color: _roleColor(role),
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      content,
                      style: const TextStyle(
                        color: AppTheme.textPrimary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}
