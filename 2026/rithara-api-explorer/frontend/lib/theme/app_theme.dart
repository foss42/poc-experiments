import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppTheme {
  AppTheme._();

  static ThemeData get dark => ThemeData(
    brightness: Brightness.dark,
    scaffoldBackgroundColor: AppColors.pageBg,
    cardColor: AppColors.cardBg,
    dividerColor: AppColors.border,

    colorScheme: const ColorScheme.dark(
      primary:   AppColors.blue,
      secondary: AppColors.blueLight,
      surface:   AppColors.cardBg,
      error:     AppColors.danger,
    ),

    textTheme: GoogleFonts.interTextTheme(
      const TextTheme(
        displayLarge:  TextStyle(color: AppColors.textWhite),
        displayMedium: TextStyle(color: AppColors.textWhite),
        displaySmall:  TextStyle(color: AppColors.textWhite),
        headlineLarge: TextStyle(color: AppColors.textWhite),
        headlineMedium:TextStyle(color: AppColors.textWhite),
        headlineSmall: TextStyle(color: AppColors.textWhite),
        titleLarge:    TextStyle(color: AppColors.textWhite),
        titleMedium:   TextStyle(color: AppColors.textWhite),
        titleSmall:    TextStyle(color: AppColors.textWhite),
        bodyLarge:     TextStyle(color: AppColors.textGray300),
        bodyMedium:    TextStyle(color: AppColors.textGray400),
        bodySmall:     TextStyle(color: AppColors.textGray500),
        labelLarge:    TextStyle(color: AppColors.textWhite),
        labelMedium:   TextStyle(color: AppColors.textGray400),
        labelSmall:    TextStyle(color: AppColors.textGray500),
      ),
    ),

    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.cardBg,
      hintStyle: const TextStyle(color: AppColors.textGray500),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: AppColors.blue, width: 1.5),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
    ),

    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.blue,
        foregroundColor: AppColors.textWhite,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        textStyle: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w500),
      ),
    ),

    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: AppColors.blueLight,
        textStyle: GoogleFonts.inter(fontSize: 14),
      ),
    ),

    tabBarTheme: const TabBarThemeData(
      labelColor: AppColors.blueLight,
      unselectedLabelColor: AppColors.textGray400,
      indicatorColor: AppColors.blue,
      dividerColor: AppColors.border,
    ),

    dividerTheme: const DividerThemeData(
      color: AppColors.border,
      thickness: 1,
    ),

    popupMenuTheme: const PopupMenuThemeData(
      color: AppColors.cardBg,
      surfaceTintColor: Colors.transparent,
    ),

    chipTheme: ChipThemeData(
      backgroundColor: AppColors.cardBg,
      labelStyle: const TextStyle(color: AppColors.textGray400, fontSize: 12),
      side: const BorderSide(color: AppColors.border),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    ),
  );
}