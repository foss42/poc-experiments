import 'package:flutter/material.dart';

import 'app_colors.dart';
import 'screens/input_screen.dart';

void main() {
  runApp(const OpenResponsesExplorerApp());
}

class OpenResponsesExplorerApp extends StatefulWidget {
  const OpenResponsesExplorerApp({super.key});

  @override
  State<OpenResponsesExplorerApp> createState() =>
      _OpenResponsesExplorerAppState();
}

class _OpenResponsesExplorerAppState extends State<OpenResponsesExplorerApp> {
  ThemeMode _themeMode = ThemeMode.light;
  late final ThemeData _lightTheme;
  late final ThemeData _darkTheme;

  @override
  void initState() {
    super.initState();
    _lightTheme = ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(seedColor: kFunctionAccent),
      scaffoldBackgroundColor: kLightBackground,
    );
    _darkTheme = ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: kFunctionAccent,
        brightness: Brightness.dark,
      ),
    );
  }

  void _toggleTheme() {
    setState(() {
      _themeMode = _themeMode == ThemeMode.dark
          ? ThemeMode.light
          : ThemeMode.dark;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Open Responses Explorer',
      themeMode: _themeMode,
      theme: _lightTheme,
      darkTheme: _darkTheme,
      themeAnimationDuration: const Duration(milliseconds: 320),
      themeAnimationCurve: Curves.easeInOutCubic,
      home: InputScreen(themeMode: _themeMode, onToggleTheme: _toggleTheme),
    );
  }
}
