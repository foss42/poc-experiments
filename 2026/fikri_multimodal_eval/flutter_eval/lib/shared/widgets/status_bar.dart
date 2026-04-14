import 'package:flutter/material.dart';

import '../../core/models/health_status.dart';
import '../../core/theme/app_theme.dart';
import 'engine_dot.dart';

class StatusBar extends StatelessWidget {
  const StatusBar({super.key, required this.status});

  final HealthStatus status;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppTheme.surface,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            EngineDot(label: 'lm-eval-harness', ok: status.lmEval),
            const SizedBox(width: 12),
            EngineDot(label: 'lmms-eval', ok: status.lmmsEval),
            const SizedBox(width: 12),
            EngineDot(label: 'inspect-ai', ok: status.inspectAi),
            const SizedBox(width: 12),
            EngineDot(label: 'faster-whisper', ok: status.fasterWhisper),
            const SizedBox(width: 12),
            EngineDot(label: 'Ollama', ok: status.ollama),
          ],
        ),
      ),
    );
  }
}
