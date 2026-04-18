import 'package:flutter/material.dart';
import '../theme.dart';

BoxDecoration panelDecoration({Color? color}) => BoxDecoration(
  color: color ?? AppColors.surface,
  borderRadius: BorderRadius.circular(6),
  border: Border.all(color: AppColors.border),
);

BoxDecoration badgeDecoration(Color color) => BoxDecoration(
  color: color.withValues(alpha: 0.15),
  borderRadius: BorderRadius.circular(4),
  border: Border.all(color: color.withValues(alpha: 0.4)),
);

Widget statusBadge(String label, Color color) {
  return Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: badgeDecoration(color),
    child: Text(
      label,
      style: TextStyle(
        color: color,
        fontSize: 11,
        fontWeight: FontWeight.bold,
        fontFamily: 'monospace',
      ),
    ),
  );
}

Widget sectionHeader(IconData icon, String title) {
  return Row(
    children: [
      Icon(icon, color: AppColors.textDim, size: 16),
      const SizedBox(width: 6),
      Text(title, style: AppTextStyles.mono12Dim.copyWith(fontWeight: FontWeight.bold)),
    ],
  );
}

Widget emptyState(String message) {
  return Center(
    child: Text(message, style: AppTextStyles.mono12Dim),
  );
}
