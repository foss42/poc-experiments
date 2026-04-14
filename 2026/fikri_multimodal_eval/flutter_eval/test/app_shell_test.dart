import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:flutter_eval/core/theme/app_theme.dart';
import 'package:flutter_eval/shared/widgets/app_shell.dart';

GoRouter _testRouter() {
  return GoRouter(
    initialLocation: '/',
    routes: [
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(path: '/', builder: (context, state) => const _Screen('Eval')),
          GoRoute(path: '/results', builder: (context, state) => const _Screen('Results')),
          GoRoute(path: '/settings', builder: (context, state) => const _Screen('Settings')),
        ],
      ),
    ],
  );
}

Widget _wrap(GoRouter router) => ProviderScope(
      child: MaterialApp.router(
        theme: AppTheme.dark(),
        routerConfig: router,
      ),
    );

void main() {
  testWidgets('NavigationRail shown on wide screen (≥600px)', (tester) async {
    tester.view.physicalSize = const Size(800, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(_wrap(_testRouter()));
    await tester.pumpAndSettle();

    expect(find.byType(NavigationRail), findsOneWidget);
    expect(find.byType(BottomNavigationBar), findsNothing);
  });

  testWidgets('BottomNavigationBar shown on narrow screen (<600px)', (tester) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(_wrap(_testRouter()));
    await tester.pumpAndSettle();

    expect(find.byType(BottomNavigationBar), findsOneWidget);
    expect(find.byType(NavigationRail), findsNothing);
  });

  testWidgets('Tapping Results destination navigates to /results', (tester) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(_wrap(_testRouter()));
    await tester.pumpAndSettle();

    expect(find.text('Eval'), findsWidgets);

    await tester.tap(find.byIcon(Icons.history_outlined));
    await tester.pumpAndSettle();

    expect(find.text('Results'), findsWidgets);
  });

  testWidgets('Tapping Settings destination navigates to /settings', (tester) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(_wrap(_testRouter()));
    await tester.pumpAndSettle();

    await tester.tap(find.byIcon(Icons.settings_outlined));
    await tester.pumpAndSettle();

    expect(find.text('Settings'), findsWidgets);
  });
}

class _Screen extends StatelessWidget {
  const _Screen(this.label);
  final String label;

  @override
  Widget build(BuildContext context) {
    return Center(child: Text(label, style: const TextStyle(color: AppTheme.textMuted)));
  }
}
