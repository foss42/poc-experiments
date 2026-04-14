import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

class EvalScreen extends StatelessWidget {
  const EvalScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Text(
        'Eval',
        style: TextStyle(color: AppTheme.textMuted, fontSize: 18),
      ),
    );
  }
}
