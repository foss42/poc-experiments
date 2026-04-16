import 'package:flutter/material.dart';

abstract final class AppTheme {
  // ── Surfaces ───────────────────────────────────────────────────────────
  static const Color background = Color(0xFF0A0A0F);
  static const Color surface = Color(0xFF12121A);
  static const Color border = Color(0xFF1E1E2E);
  static const Color muted = Color(0xFF2A2A3A);

  // ── Text ───────────────────────────────────────────────────────────────
  static const Color textPrimary = Color(0xFFE0E0F0);
  static const Color textMuted = Color(0xFF71717A);

  // ── Accent ─────────────────────────────────────────────────────────────
  static const Color primary = Color(0xFF6366F1);      // indigo-500
  static const Color primaryLight = Color(0xFF818CF8);  // indigo-400
  static const Color accent = Color(0xFF22D3EE);        // cyan-400 (metrics)

  // ── Semantic ───────────────────────────────────────────────────────────
  static const Color success = Color(0xFF34D399);
  static const Color error = Color(0xFFF87171);
  static const Color warning = Color(0xFFFBBF24);
  static const Color compare = Color(0xFFA78BFA);       // violet-400

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
          minimumSize: const Size(48, 44),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: textPrimary,
          side: const BorderSide(color: border),
          minimumSize: const Size(48, 44),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),
      segmentedButtonTheme: SegmentedButtonThemeData(
        style: SegmentedButton.styleFrom(
          backgroundColor: surface,
          selectedBackgroundColor: const Color(0xFF1A1A3A),
          foregroundColor: textMuted,
          selectedForegroundColor: primaryLight,
          minimumSize: const Size(48, 44),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: muted,
        labelStyle: const TextStyle(color: textPrimary, fontSize: 11),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: surface,
        selectedItemColor: primaryLight,
        unselectedItemColor: textMuted,
        type: BottomNavigationBarType.fixed,
      ),
      navigationRailTheme: NavigationRailThemeData(
        backgroundColor: surface,
        selectedIconTheme: const IconThemeData(color: primaryLight),
        unselectedIconTheme: const IconThemeData(color: Color(0xFF52525B)),
        selectedLabelTextStyle: const TextStyle(color: primaryLight, fontSize: 12),
        unselectedLabelTextStyle: const TextStyle(color: Color(0xFF52525B), fontSize: 12),
        indicatorColor: primary.withValues(alpha: 0.12),
        indicatorShape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
      ),
    );
  }
}
