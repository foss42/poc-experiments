import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app/theme.dart';
import 'screens/dashboard_shell.dart';

void main() {
  runApp(const ProviderScope(child: EvalFrameworkApp()));
}

class EvalFrameworkApp extends StatelessWidget {
  const EvalFrameworkApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AI Eval Framework',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: const DashboardShell(),
    );
  }
}
