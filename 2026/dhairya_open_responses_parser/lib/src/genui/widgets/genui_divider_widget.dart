import 'package:flutter/material.dart';
import '../models/divider_component.dart';

class GenUIDividerWidget extends StatelessWidget {
  final DividerComponent component;

  const GenUIDividerWidget({super.key, required this.component});

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 8),
      child: Divider(height: 1),
    );
  }
}
