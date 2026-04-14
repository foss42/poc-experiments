import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/models/health_status.dart';
import '../../core/theme/app_theme.dart';
import '../providers/health_provider.dart';
import 'status_bar.dart';

class AppShell extends ConsumerWidget {
  const AppShell({super.key, required this.child});

  final Widget child;

  static const _routes = ['/', '/results', '/settings'];

  int _selectedIndex(BuildContext context) {
    final path = GoRouterState.of(context).uri.path;
    final idx = _routes.indexOf(path);
    return idx < 0 ? 0 : idx;
  }

  void _navigate(BuildContext context, int index) {
    context.go(_routes[index]);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedIndex = _selectedIndex(context);
    final healthAsync = ref.watch(healthProvider);
    final bar = healthAsync.when(
      data: (h) => StatusBar(status: h),
      loading: () => const LinearProgressIndicator(
        minHeight: 2,
        backgroundColor: AppTheme.surface,
        color: AppTheme.primary,
      ),
      error: (_, __) => StatusBar(status: HealthStatus.allOffline()),
    );

    return PopScope(
      canPop: false,
      child: LayoutBuilder(
        builder: (ctx, constraints) {
          if (constraints.maxWidth >= 600) {
            return _WideShell(
              selectedIndex: selectedIndex,
              onNavigate: (i) => _navigate(context, i),
              statusBar: bar,
              child: child,
            );
          }
          return _NarrowShell(
            selectedIndex: selectedIndex,
            onNavigate: (i) => _navigate(context, i),
            statusBar: bar,
            child: child,
          );
        },
      ),
    );
  }
}

class _WideShell extends StatelessWidget {
  const _WideShell({
    required this.selectedIndex,
    required this.onNavigate,
    required this.statusBar,
    required this.child,
  });

  final int selectedIndex;
  final ValueChanged<int> onNavigate;
  final Widget statusBar;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: Row(
        children: [
          NavigationRail(
            selectedIndex: selectedIndex,
            onDestinationSelected: onNavigate,
            labelType: NavigationRailLabelType.all,
            destinations: const [
              NavigationRailDestination(
                icon: Icon(Icons.science_outlined),
                selectedIcon: Icon(Icons.science),
                label: Text('Eval'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.history_outlined),
                selectedIcon: Icon(Icons.history),
                label: Text('Results'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.settings_outlined),
                selectedIcon: Icon(Icons.settings),
                label: Text('Settings'),
              ),
            ],
          ),
          const VerticalDivider(thickness: 1, width: 1),
          Expanded(
            child: Column(
              children: [
                statusBar,
                Expanded(child: child),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _NarrowShell extends StatelessWidget {
  const _NarrowShell({
    required this.selectedIndex,
    required this.onNavigate,
    required this.statusBar,
    required this.child,
  });

  final int selectedIndex;
  final ValueChanged<int> onNavigate;
  final Widget statusBar;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: Column(
        children: [
          statusBar,
          Expanded(child: child),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: selectedIndex,
        onTap: onNavigate,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.science_outlined),
            activeIcon: Icon(Icons.science),
            label: 'Eval',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.history_outlined),
            activeIcon: Icon(Icons.history),
            label: 'Results',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.settings_outlined),
            activeIcon: Icon(Icons.settings),
            label: 'Settings',
          ),
        ],
      ),
    );
  }
}
