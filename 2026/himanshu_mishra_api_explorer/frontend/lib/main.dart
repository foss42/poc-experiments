import 'package:flutter/material.dart';
import 'screens/api_explorer.dart';

void main() {
  runApp(const ApiDashExplorerApp());
}

class ApiDashExplorerApp extends StatelessWidget {
  const ApiDashExplorerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'API Dash Explorer',
      theme: ThemeData(
        brightness: Brightness.dark,
        colorSchemeSeed: Colors.blueAccent,
        useMaterial3: true,
      ),
      home: const ApiExplorerScreen(),
    );
  }
}
