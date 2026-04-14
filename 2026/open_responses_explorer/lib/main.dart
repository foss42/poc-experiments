import 'package:flutter/material.dart';

import 'screens/input_screen.dart';
import 'screens/streaming_simulator_screen.dart';

void main() {
  runApp(const OpenResponsesExplorerApp());
}

class OpenResponsesExplorerApp extends StatefulWidget {
  const OpenResponsesExplorerApp({super.key});

  static const String streamingRoute = '/streaming-simulator';

  @override
  State<OpenResponsesExplorerApp> createState() =>
      _OpenResponsesExplorerAppState();
}

class _OpenResponsesExplorerAppState extends State<OpenResponsesExplorerApp> {
  ThemeMode _themeMode = ThemeMode.light;

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
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF2563EB)),
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
      ),
      darkTheme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF2563EB),
          brightness: Brightness.dark,
        ),
      ),
      routes: <String, WidgetBuilder>{
        OpenResponsesExplorerApp.streamingRoute: (BuildContext context) =>
            const StreamingSimulatorScreen(),
      },
      home: InputScreen(themeMode: _themeMode, onToggleTheme: _toggleTheme),
    );
  }
}
