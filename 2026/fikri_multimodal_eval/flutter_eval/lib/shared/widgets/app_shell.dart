import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';

class AppShell extends StatelessWidget {
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
  Widget build(BuildContext context) {
    final selectedIndex = _selectedIndex(context);
    return PopScope(
      canPop: false,
      child: LayoutBuilder(
        builder: (ctx, constraints) {
          if (constraints.maxWidth >= 600) {
            return _WideShell(
              selectedIndex: selectedIndex,
              onNavigate: (i) => _navigate(context, i),
              child: child,
            );
          }
          return _NarrowShell(
            selectedIndex: selectedIndex,
            onNavigate: (i) => _navigate(context, i),
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
    required this.child,
  });

  final int selectedIndex;
  final ValueChanged<int> onNavigate;
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
          Expanded(child: child),
        ],
      ),
    );
  }
}

class _NarrowShell extends StatelessWidget {
  const _NarrowShell({
    required this.selectedIndex,
    required this.onNavigate,
    required this.child,
  });

  final int selectedIndex;
  final ValueChanged<int> onNavigate;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: child,
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
