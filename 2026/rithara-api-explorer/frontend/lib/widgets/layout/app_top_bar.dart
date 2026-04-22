import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme/app_colors.dart';

class AppTopBar extends StatefulWidget {
  const AppTopBar({super.key});

  @override
  State<AppTopBar> createState() => _AppTopBarState();
}

class _AppTopBarState extends State<AppTopBar> {
  final _ctrl = TextEditingController();

  void _search() {
    final q = _ctrl.text.trim();
    if (q.isNotEmpty) context.go('/search?q=${Uri.encodeComponent(q)}');
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 56,
      color: AppColors.sidebarBg,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          // Hamburger on mobile
          if (MediaQuery.of(context).size.width < 1024)
            IconButton(
              icon: const Icon(Icons.menu, color: AppColors.textGray400),
              onPressed: () => Scaffold.of(context).openDrawer(),
            ),

          // Search field
          Expanded(
            child: TextField(
              controller: _ctrl,
              style: const TextStyle(color: AppColors.textWhite, fontSize: 14),
              decoration: const InputDecoration(
                hintText: 'Search APIs...',
                prefixIcon: Icon(Icons.search, color: AppColors.textGray500, size: 18),
              ),
              onSubmitted: (_) => _search(),
            ),
          ),
        ],
      ),
    );
  }
}