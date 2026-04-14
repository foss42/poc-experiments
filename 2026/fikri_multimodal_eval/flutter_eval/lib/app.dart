import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/theme/app_theme.dart';

class EvalApp extends ConsumerWidget {
  const EvalApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp(
      title: 'Multimodal AI Eval',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark(),
      home: const Scaffold(
        body: Center(
          child: Text(
            'Multimodal AI Eval',
            style: TextStyle(color: Colors.white),
          ),
        ),
      ),
    );
  }
}
