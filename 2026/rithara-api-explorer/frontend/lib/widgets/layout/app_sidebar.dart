import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme/app_colors.dart';

class AppSidebar extends StatelessWidget {
  const AppSidebar({super.key});

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();

    return Container(
      width: 256,
      color: AppColors.sidebarBg,
      child: Material(
        type: MaterialType.transparency,
        child: Column(
          children: [
          // Logo
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: AppColors.blue,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.bolt, color: Colors.white, size: 20),
                ),
                const SizedBox(width: 10),
                const Text(
                  'API Explorer',
                  style: TextStyle(
                    color: AppColors.textWhite,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),

          const Divider(color: AppColors.border, height: 1),
          const SizedBox(height: 8),

          // Nav items
          _NavItem(icon: Icons.bolt,    label: 'Requests',  path: '/',                 location: location),
          _NavItem(icon: Icons.tune,    label: 'Variables', path: '/variables',        location: location),
          _NavItem(icon: Icons.schedule,label: 'History',   path: '/history',          location: location),
          _NavItem(icon: Icons.explore, label: 'Explorer',  path: '/contribute',       location: location),

          const Divider(color: AppColors.border, height: 1, indent: 16, endIndent: 16),
          const SizedBox(height: 8),

          // Extra nav
          _NavItem(icon: Icons.folder_open, label: 'All APIs',        path: '/',                location: location),
          _NavItem(icon: Icons.rate_review, label: 'Review Queue',    path: '/review-queue',    location: location),
          _NavItem(icon: Icons.person,      label: 'My Contributions',path: '/my-contributions',location: location),

          const Spacer(),
          const Divider(color: AppColors.border, height: 1),

          // User footer
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 16,
                  backgroundColor: AppColors.blue,
                  child: const Text('U', style: TextStyle(color: Colors.white, fontSize: 13)),
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('User', style: TextStyle(color: AppColors.textWhite, fontSize: 13, fontWeight: FontWeight.w600)),
                      Text('user@example.com', style: TextStyle(color: AppColors.textGray500, fontSize: 11)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String path;
  final String location;

  const _NavItem({
    required this.icon,
    required this.label,
    required this.path,
    required this.location,
  });

  bool get _active => location == path;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: () => context.go(path),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: _active ? AppColors.blueFaint : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              Icon(icon, size: 18,
                color: _active ? AppColors.blueLight : AppColors.textGray400),
              const SizedBox(width: 10),
              Text(label,
                style: TextStyle(
                  color: _active ? AppColors.blueLight : AppColors.textGray400,
                  fontSize: 14,
                  fontWeight: _active ? FontWeight.w600 : FontWeight.w400,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}