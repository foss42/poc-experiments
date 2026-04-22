import 'package:flutter/material.dart';
import 'theme.dart';
import 'screens/workflow_screen.dart';
import '../core/models/workflow.dart';

class AgenticTestingApp extends StatelessWidget {
  final List<Workflow> workflows;

  const AgenticTestingApp({super.key, required this.workflows});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'API Dash - Agentic Testing PoC',
      debugShowCheckedModeBanner: false,
      theme: appTheme(),
      home: WorkflowScreen(workflows: workflows),
    );
  }
}
