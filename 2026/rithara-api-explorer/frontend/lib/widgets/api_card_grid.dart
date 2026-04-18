import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_colors.dart';
import '../models/api_item.dart';
import 'common/app_badge.dart';
import 'common/rating_stars.dart';

class ApiCardGrid extends StatelessWidget {
  final ApiItem api;

  const ApiCardGrid({super.key, required this.api});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => context.go('/api/${api.id}'),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.cardBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Section (Logo + Tags)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 48,
                        height: 48,
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
                                  size: 24,
                                ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              api.name,
                              style: const TextStyle(
                                color: AppColors.textWhite,
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              api.provider,
                              style: const TextStyle(
                                color: AppColors.textGray500,
                                fontSize: 12,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    api.description,
                    style: const TextStyle(
                      color: AppColors.textGray400,
                      fontSize: 13,
                      height: 1.4,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      AppBadge(
                        label: api.version,
                        textColor: AppColors.blueLight,
                        backgroundColor: AppColors.blueFaint,
                      ),
                      if (api.tags.isNotEmpty)
                        AppBadge(label: api.tags[0]),
                      if (api.tags.length > 1)
                        AppBadge(label: '+${api.tags.length - 1}'),
                    ],
                  ),
                ],
              ),
            ),
            const Spacer(),
            const Divider(height: 1, color: AppColors.border),
            // Bottom Section (Rating + Action)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  RatingStars(rating: api.rating),
                  const SizedBox(width: 6),
                  Text(
                    '(${api.totalReviews})',
                    style: const TextStyle(
                      color: AppColors.textGray500,
                      fontSize: 11,
                    ),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: () {
                      // Import logic placeholder
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Importing ${api.name}...')),
                      );
                    },
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      minimumSize: const Size(0, 32),
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
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
    // Simple mapping from strings to Icons
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
