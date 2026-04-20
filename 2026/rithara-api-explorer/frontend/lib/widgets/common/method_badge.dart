import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';

class MethodBadge extends StatelessWidget {
  final String method;

  const MethodBadge({super.key, required this.method});

  @override
  Widget build(BuildContext context) {
    final m = method.toUpperCase();
    Color color;

    if (m == 'GET') {
      color = AppColors.success;
    } else if (m == 'POST') {
      color = AppColors.blue;
    } else if (m == 'PUT') {
      color = AppColors.orange;
    } else if (m == 'DELETE') {
      color = AppColors.danger;
    } else if (m == 'PATCH') {
      color = AppColors.yellow;
    } else {
      color = AppColors.textGray500;
    }

    return Container(
      width: 52,
      padding: const EdgeInsets.symmetric(vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Center(
        child: Text(
          m,
          style: TextStyle(
            color: color,
            fontSize: 10,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.5,
          ),
        ),
      ),
    );
  }
}
