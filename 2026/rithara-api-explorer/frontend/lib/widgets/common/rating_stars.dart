import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';

class RatingStars extends StatelessWidget {
  final double rating;
  final double size;
  final Color? color;
  final bool interactive;
  final ValueChanged<double>? onChanged;

  const RatingStars({
    super.key,
    required this.rating,
    this.size = 14,
    this.color,
    this.interactive = false,
    this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (index) {
        final starValue = index + 1;
        IconData icon;
        if (rating >= starValue) {
          icon = Icons.star;
        } else if (rating >= starValue - 0.5) {
          icon = Icons.star_half;
        } else {
          icon = Icons.star_border;
        }

        final widget = Icon(
          icon,
          size: size,
          color: color ?? AppColors.yellow,
        );

        if (interactive && onChanged != null) {
          return GestureDetector(
            onTap: () => onChanged!(starValue.toDouble()),
            child: widget,
          );
        }
        return widget;
      }),
    );
  }
}
