import 'package:flutter/material.dart';

abstract final class AppTheme {
  // zinc-950
  static const Color background = Color(0xFF09090B);
  // zinc-900
  static const Color surface = Color(0xFF18181B);
  // zinc-800
  static const Color border = Color(0xFF27272A);
  // zinc-700
  static const Color muted = Color(0xFF3F3F46);
  // zinc-400
  static const Color textMuted = Color(0xFFA1A1AA);
  // zinc-100
  static const Color textPrimary = Color(0xFFF4F4F5);
  // blue-500
  static const Color primary = Color(0xFF3B82F6);
  // blue-400 (hover)
  static const Color primaryLight = Color(0xFF60A5FA);
  // emerald-400
  static const Color success = Color(0xFF34D399);
  // red-400
  static const Color error = Color(0xFFF87171);
  // amber-400
  static const Color warning = Color(0xFFFBBF24);
  // purple-400
  static const Color compare = Color(0xFFC084FC);

  static ThemeData dark() {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: background,
      colorScheme: const ColorScheme.dark(
        primary: primary,
        surface: surface,
        onSurface: textPrimary,
        error: error,
      ),
      cardColor: surface,
      dividerColor: border,
      textTheme: const TextTheme(
        bodyMedium: TextStyle(color: textPrimary),
        bodySmall: TextStyle(color: textMuted),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: primary),
        ),
        hintStyle: const TextStyle(color: textMuted),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          minimumSize: const Size(48, 48),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: textPrimary,
          side: const BorderSide(color: border),
          minimumSize: const Size(48, 48),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),
      segmentedButtonTheme: SegmentedButtonThemeData(
        style: SegmentedButton.styleFrom(
          backgroundColor: surface,
          selectedBackgroundColor: const Color(0xFF1E3A5F),
          foregroundColor: textMuted,
          selectedForegroundColor: primary,
          minimumSize: const Size(48, 48),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: muted,
        labelStyle: const TextStyle(color: textPrimary, fontSize: 11),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}
