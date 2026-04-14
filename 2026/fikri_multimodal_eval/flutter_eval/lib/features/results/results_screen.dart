import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

class ResultsScreen extends StatelessWidget {
  const ResultsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Text(
        'Results',
        style: TextStyle(color: AppTheme.textMuted, fontSize: 18),
      ),
    );
  }
}
