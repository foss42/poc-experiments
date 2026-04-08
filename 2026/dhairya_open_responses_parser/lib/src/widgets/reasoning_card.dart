import 'package:flutter/material.dart';
import '../models/items/reasoning_item.dart';

class ReasoningCard extends StatefulWidget {
  final ReasoningItem item;
  final bool initiallyExpanded;

  const ReasoningCard({
    super.key,
    required this.item,
    this.initiallyExpanded = true,
  });

  @override
  State<ReasoningCard> createState() => _ReasoningCardState();
}

class _ReasoningCardState extends State<ReasoningCard>
    with SingleTickerProviderStateMixin {
  late bool _expanded;
  late AnimationController _controller;
  late Animation<double> _expandAnimation;

  @override
  void initState() {
    super.initState();
    _expanded = widget.initiallyExpanded;
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 250),
      value: _expanded ? 1.0 : 0.0,
    );
    _expandAnimation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOut,
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _toggle() {
    setState(() {
      _expanded = !_expanded;
      if (_expanded) {
        _controller.forward();
      } else {
        _controller.reverse();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final summaryText = widget.item.summary.map((s) => s.text).join('\n\n');

    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: _toggle,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.psychology_outlined,
                    size: 18,
                    color: colorScheme.secondary,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Reasoning',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                      color: colorScheme.secondary,
                      letterSpacing: 0.3,
                    ),
                  ),
                  const Spacer(),
                  AnimatedRotation(
                    turns: _expanded ? 0.5 : 0,
                    duration: const Duration(milliseconds: 250),
                    child: Icon(
                      Icons.keyboard_arrow_down,
                      size: 18,
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
              SizeTransition(
                sizeFactor: _expandAnimation,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 12),
                    const Divider(height: 1),
                    const SizedBox(height: 12),
                    Text(
                      summaryText,
                      style: TextStyle(
                        fontSize: 13,
                        height: 1.5,
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
