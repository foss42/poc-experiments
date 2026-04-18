import 'package:flutter/material.dart';
import 'app_sidebar.dart';
import 'app_top_bar.dart';

class MainLayout extends StatelessWidget {
  final Widget child;
  const MainLayout({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final isDesktop = MediaQuery.of(context).size.width >= 1024;

    if (isDesktop) {
      return Scaffold(
        body: Row(
          children: [
            const AppSidebar(),
            Expanded(
              child: Column(
                children: [
                  const AppTopBar(),
                  Expanded(child: child),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      drawer: const Drawer(child: AppSidebar()),
      body: Column(
        children: [
          const AppTopBar(),
          Expanded(child: child),
        ],
      ),
    );
  }
}