import 'package:flutter/material.dart';
import '../models/button_component.dart';

class GenUIButtonWidget extends StatelessWidget {
  final ButtonComponent component;

  const GenUIButtonWidget({super.key, required this.component});

  void _onTap(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Action: ${component.label}'),
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return switch (component.variant) {
      'secondary' => OutlinedButton(
          onPressed: () => _onTap(context),
          child: Text(component.label),
        ),
      'outlined' => TextButton(
          onPressed: () => _onTap(context),
          child: Text(component.label),
        ),
      _ => ElevatedButton(
          // primary — default
          onPressed: () => _onTap(context),
          child: Text(component.label),
        ),
    };
  }
}
