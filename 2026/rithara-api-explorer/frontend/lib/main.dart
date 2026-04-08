import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'theme/app_theme.dart';
import 'router/app_router.dart';

void main() {
  runApp(const ProviderScope(child: ApiExplorerApp()));
}

class ApiExplorerApp extends ConsumerWidget {
  const ApiExplorerApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'API Explorer',
      theme: AppTheme.dark,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}