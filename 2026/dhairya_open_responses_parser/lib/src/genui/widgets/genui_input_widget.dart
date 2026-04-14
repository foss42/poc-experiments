import 'package:flutter/material.dart';
import '../models/input_component.dart';

class GenUIInputWidget extends StatelessWidget {
  final InputComponent component;

  const GenUIInputWidget({super.key, required this.component});

  @override
  Widget build(BuildContext context) {
    return TextField(
      readOnly: true,
      decoration: InputDecoration(
        labelText: component.label,
        hintText: component.placeholder,
        border: const OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(12)),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
    );
  }
}
