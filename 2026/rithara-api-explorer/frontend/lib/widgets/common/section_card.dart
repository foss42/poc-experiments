import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';

class SectionCard extends StatelessWidget {
  final Widget child;
  final String? title;
  final EdgeInsets? padding;
  final CrossAxisAlignment crossAxisAlignment;

  const SectionCard({
    super.key,
    required this.child,
    this.title,
    this.padding,
    this.crossAxisAlignment = CrossAxisAlignment.start,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: padding ?? const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: crossAxisAlignment,
        children: [
          if (title != null) ...[
            Text(
              title!,
              style: const TextStyle(
                color: AppColors.textWhite,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 20),
          ],
          child,
        ],
      ),
    );
  }
}
