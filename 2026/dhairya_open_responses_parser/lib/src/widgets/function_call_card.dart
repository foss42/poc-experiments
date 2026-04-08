import 'dart:convert';
import 'package:flutter/material.dart';
import '../models/correlated_call.dart';
import 'function_call_output_card.dart';

class FunctionCallCard extends StatelessWidget {
  final CorrelatedCall correlatedCall;

  const FunctionCallCard({super.key, required this.correlatedCall});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final call = correlatedCall.call;
    final isComplete = correlatedCall.isComplete;
    final prettyArgs = _prettyJson(call.parsedArguments ?? {'raw': call.arguments});

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Card(
          elevation: 1,
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(12),
              topRight: const Radius.circular(12),
              bottomLeft: Radius.circular(isComplete ? 0 : 12),
              bottomRight: Radius.circular(isComplete ? 0 : 12),
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.terminal_rounded,
                      size: 16,
                      color: colorScheme.primary,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      call.name,
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                        color: colorScheme.primary,
                        fontFamily: 'monospace',
                      ),
                    ),
                    const Spacer(),
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isComplete
                            ? const Color(0xFF22C55E)
                            : const Color(0xFFF97316),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      isComplete ? 'complete' : 'pending',
                      style: TextStyle(
                        fontSize: 11,
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  call.callId,
                  style: TextStyle(
                    fontSize: 11,
                    color: colorScheme.onSurfaceVariant,
                    fontFamily: 'monospace',
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: colorScheme.outlineVariant),
                  ),
                  child: Text(
                    prettyArgs,
                    style: TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 12,
                      height: 1.5,
                      color: colorScheme.onSurface,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (isComplete && correlatedCall.output != null) ...[
          // Visual connector line
          Row(
            children: [
              const SizedBox(width: 28),
              Container(
                width: 2,
                height: 12,
                color: colorScheme.outlineVariant,
              ),
            ],
          ),
          FunctionCallOutputCard(item: correlatedCall.output!),
        ],
      ],
    );
  }

  String _prettyJson(Map<String, dynamic> map) {
    const encoder = JsonEncoder.withIndent('  ');
    return encoder.convert(map);
  }
}
