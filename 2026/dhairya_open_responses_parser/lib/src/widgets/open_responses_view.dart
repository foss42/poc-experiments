import 'package:flutter/material.dart';
import '../models/open_response.dart';
import '../models/correlated_call.dart';
import '../models/items/function_call_item.dart';
import 'reasoning_card.dart';
import 'function_call_card.dart';
import 'message_card.dart';
import 'unknown_item_card.dart';

class OpenResponsesView extends StatelessWidget {
  final ParsedOpenResponse response;

  const OpenResponsesView({super.key, required this.response});

  @override
  Widget build(BuildContext context) {
    // Track call_ids rendered as part of a CorrelatedCall so we skip standalone
    final renderedOutputCallIds = <String>{};
    final widgets = <Widget>[];

    for (final item in response.items) {
      switch (item) {
        case ReasoningOutput(:final item):
          widgets.add(ReasoningCard(item: item));

        case FunctionCallOutput(:final item):
          final correlated = response.correlatedCalls[item.callId];
          if (correlated != null) {
            if (correlated.isComplete && correlated.output != null) {
              renderedOutputCallIds.add(correlated.output!.callId);
            }
            widgets.add(FunctionCallCard(correlatedCall: correlated));
          } else {
            widgets.add(FunctionCallCard(
              correlatedCall: CorrelatedCall(call: item),
            ));
          }

        case FunctionCallOutputResult(:final item):
          if (!renderedOutputCallIds.contains(item.callId)) {
            widgets.add(FunctionCallCard(
              correlatedCall: CorrelatedCall(
                call: _placeholderCall(item.callId),
                output: item,
              ),
            ));
          }

        case MessageOutput(:final item):
          widgets.add(MessageCard(item: item));

        case UnknownOutput(:final item):
          widgets.add(UnknownItemCard(item: item));
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _ResponseHeader(id: response.id, status: response.status),
        const SizedBox(height: 12),
        ...widgets.map(
          (w) => Padding(padding: const EdgeInsets.only(bottom: 10), child: w),
        ),
      ],
    );
  }

  FunctionCallItem _placeholderCall(String callId) {
    return FunctionCallItem.fromMap({
      'type': 'function_call',
      'id': '',
      'call_id': callId,
      'name': '(unknown)',
      'arguments': '{}',
      'status': 'unknown',
    });
  }
}

class _ResponseHeader extends StatelessWidget {
  final String id;
  final String status;

  const _ResponseHeader({required this.id, required this.status});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colorScheme.outlineVariant),
      ),
      child: Row(
        children: [
          Icon(Icons.api_rounded, size: 16, color: colorScheme.primary),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              id,
              style: TextStyle(
                fontFamily: 'monospace',
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: colorScheme.onSurface,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: 12),
          _StatusBadge(status: status),
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    final (Color bg, Color fg) = switch (status) {
      'completed' => (const Color(0xFFDCFCE7), const Color(0xFF15803D)),
      'in_progress' => (const Color(0xFFDBEAFE), const Color(0xFF1D4ED8)),
      'failed' => (const Color(0xFFFEE2E2), const Color(0xFFB91C1C)),
      _ => (const Color(0xFFF3F4F6), const Color(0xFF6B7280)),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: fg,
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}
