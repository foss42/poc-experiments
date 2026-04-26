import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_colors.dart';
import '../models/api_item.dart';
import 'common/app_badge.dart';
import 'common/rating_stars.dart';

class ApiCardList extends StatelessWidget {
  final ApiItem api;

  const ApiCardList({super.key, required this.api});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => context.go('/api/${api.id}'),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        height: 120,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.cardBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            // Logo
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                color: AppColors.blueFaint,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.blue.withValues(alpha: 0.1)),
              ),
              child: Hero(
                tag: 'api-icon-${api.id}',
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: (api.icon.startsWith('http'))
                    ? Image.network(api.icon, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const Icon(Icons.api, color: AppColors.blueLight))
                    : Icon(
                        _getIconData(api.icon),
                        color: AppColors.blueLight,
                        size: 40,
                      ),
                ),
              ),
            ),
            const SizedBox(width: 20),
            // Middle Section
            Expanded(
              flex: 3,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Row(
                    children: [
                      Text(
                        api.name,
                        style: const TextStyle(
                          color: AppColors.textWhite,
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(width: 12),
                      AppBadge(
                        label: api.version,
                        textColor: AppColors.blueLight,
                        backgroundColor: AppColors.blueFaint,
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    api.description,
                    style: const TextStyle(
                      color: AppColors.textGray400,
                      fontSize: 14,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: api.tags.take(3).map((tag) => AppBadge(label: tag)).toList(),
                  ),
                ],
              ),
            ),
            // Right Section
            const VerticalDivider(width: 40, color: AppColors.border),
            Expanded(
              flex: 1,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                   Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      RatingStars(rating: api.rating, size: 12),
                      const SizedBox(width: 4),
                      Text(
                        api.rating.toString(),
                        style: const TextStyle(
                          color: AppColors.textWhite,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Updated ${api.updated}',
                    style: const TextStyle(
                      color: AppColors.textGray500,
                      fontSize: 11,
                    ),
                  ),
                  const Spacer(),
                  ElevatedButton(
                    onPressed: () {
                       ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Importing ${api.name}...')),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      minimumSize: const Size(0, 36),
                    ),
                    child: const Text('Import'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _getIconData(String iconName) {
    switch (iconName.toLowerCase()) {
      case 'bolt': return Icons.bolt;
      case 'explore': return Icons.explore;
      case 'cloud': return Icons.cloud;
      case 'code': return Icons.code;
      case 'psychology': return Icons.psychology;
      case 'attach_money': return Icons.attach_money;
      default: return Icons.insert_drive_file;
    }
  }
}
