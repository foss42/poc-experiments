import 'package:flutter/material.dart';
import '../core/models/workflow_node.dart';

class AppColors {
  static const background = Color(0xFF000000);
  static const surface = Color(0xFF1A1A1A);
  static const surfaceLight = Color(0xFF222222);
  static const border = Color(0xFF333333);
  static const text = Color(0xFFFFFFFF);
  static const textDim = Color(0xFF888888);
  static const success = Color(0xFF4CAF50);
  static const failure = Color(0xFFF44336);
  static const warning = Color(0xFFFFC107);
  static const variable = Color(0xFFFFD600);
  static const methodGet = Color(0xFF42A5F5);
  static const methodPost = Color(0xFF66BB6A);
  static const methodPut = Color(0xFFFFA726);
  static const methodDelete = Color(0xFFEF5350);
}

class AppTextStyles {
  static const mono11 = TextStyle(color: AppColors.textDim, fontSize: 11, fontFamily: 'monospace');
  static const mono11Bold = TextStyle(color: AppColors.text, fontSize: 11, fontFamily: 'monospace', fontWeight: FontWeight.bold);
  static const mono12 = TextStyle(color: AppColors.text, fontSize: 12, fontFamily: 'monospace');
  static const mono12Dim = TextStyle(color: AppColors.textDim, fontSize: 12, fontFamily: 'monospace');
  static const mono12Bold = TextStyle(color: AppColors.text, fontSize: 12, fontFamily: 'monospace', fontWeight: FontWeight.bold);
  static const mono14Bold = TextStyle(color: AppColors.text, fontSize: 14, fontFamily: 'monospace', fontWeight: FontWeight.bold);
}

Color methodColor(HTTPMethod method) {
  switch (method) {
    case HTTPMethod.get:
      return AppColors.methodGet;
    case HTTPMethod.post:
      return AppColors.methodPost;
    case HTTPMethod.put:
      return AppColors.methodPut;
    case HTTPMethod.patch:
      return AppColors.methodPut;
    case HTTPMethod.delete:
      return AppColors.methodDelete;
  }
}

ThemeData appTheme() {
  return ThemeData.dark().copyWith(
    scaffoldBackgroundColor: AppColors.background,
    cardColor: AppColors.surface,
    dividerColor: AppColors.border,
  );
}
