import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../design.dart';
import '../models/open_responses.dart';

// Trace analytics panel for an OpenResponsesResult.
// Shows token usage, output item breakdown, tool call pass/fail ratio,
// and conversation chain info. Helps developers quickly understand the
// cost and structure of an agent response without reading raw JSON.
class OpenResponsesAnalytics extends StatelessWidget {
  const OpenResponsesAnalytics({super.key, required this.result});

  final OpenResponsesResult result;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final msgs = result.output.whereType<MessageOutputItem>().length;
    final reasoning = result.output.whereType<ReasoningOutputItem>().length;
    final calls = result.output.whereType<FunctionCallOutputItem>().toList();
    final failedCalls = calls.where((c) => c.status == 'failed').length;
    final webSearches =
        result.output.whereType<WebSearchCallOutputItem>().length;
    final fileSearches =
        result.output.whereType<FileSearchCallOutputItem>().length;
    final unknowns = result.output.whereType<UnknownOutputItem>().length;

    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        // ── Response metadata ──────────────────────────────────────────────
        const _SectionHeader('Response'),
        kVSpacer8,
        _MetaGrid(items: [
          _MetaItem(
            label: 'Status',
            value: result.status.isEmpty ? '—' : result.status,
            valueColor: _statusColor(result.status, theme),
          ),
          _MetaItem(
            label: 'Model',
            value: result.model.isEmpty ? '—' : result.model,
          ),
          _MetaItem(
            label: 'Response ID',
            value: result.id.isEmpty
                ? '—'
                : result.id.length > 16
                    ? '${result.id.substring(0, 16)}…'
                    : result.id,
            copyValue: result.id.isNotEmpty ? result.id : null,
          ),
          if (result.previousResponseId != null)
            _MetaItem(
              label: 'Chained from',
              value: result.previousResponseId!.length > 16
                  ? '${result.previousResponseId!.substring(0, 16)}…'
                  : result.previousResponseId!,
              copyValue: result.previousResponseId,
              valueColor: theme.colorScheme.tertiary,
              icon: Icons.link_rounded,
            ),
        ]),

        // ── Conversation chain notice ──────────────────────────────────────
        if (result.previousResponseId != null) ...[
          kVSpacer12,
          _ChainBanner(previousId: result.previousResponseId!),
        ],

        kVSpacer16,

        // ── Output item breakdown ──────────────────────────────────────────
        const _SectionHeader('Output Breakdown'),
        kVSpacer8,
        _ItemBreakdown(
          messages: msgs,
          reasoning: reasoning,
          toolCalls: calls.length,
          failedToolCalls: failedCalls,
          webSearches: webSearches,
          fileSearches: fileSearches,
          unknowns: unknowns,
        ),

        // ── Tool calls detail ──────────────────────────────────────────────
        if (calls.isNotEmpty) ...[
          kVSpacer16,
          const _SectionHeader('Tool Calls'),
          kVSpacer8,
          _ToolCallsTable(calls: calls),
        ],

        // ── Token usage ────────────────────────────────────────────────────
        if (result.usage != null) ...[
          kVSpacer16,
          const _SectionHeader('Token Usage'),
          kVSpacer8,
          _TokenUsagePanel(usage: result.usage!),
        ],
      ],
    );
  }

  Color _statusColor(String status, ThemeData theme) => switch (status) {
        'completed' => Colors.green,
        'in_progress' => theme.colorScheme.primary,
        'failed' => theme.colorScheme.error,
        _ => theme.colorScheme.outline,
      };
}

// ---------------------------------------------------------------------------
// Token usage
// ---------------------------------------------------------------------------

class _TokenUsagePanel extends StatelessWidget {
  const _TokenUsagePanel({required this.usage});
  final OpenResponsesUsage usage;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final total = usage.totalTokens;
    final inputFrac = total > 0 ? usage.inputTokens / total : 0.5;
    final outputFrac = total > 0 ? usage.outputTokens / total : 0.5;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        border: Border.all(color: theme.colorScheme.outlineVariant),
        borderRadius: kBorderRadius8,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: SizedBox(
              height: 10,
              child: Row(
                children: [
                  Flexible(
                    flex: (inputFrac * 1000).round(),
                    child: Container(
                        color: theme.colorScheme.primary.withValues(alpha: 0.7)),
                  ),
                  Flexible(
                    flex: (outputFrac * 1000).round(),
                    child: Container(
                        color:
                            theme.colorScheme.tertiary.withValues(alpha: 0.7)),
                  ),
                ],
              ),
            ),
          ),
          kVSpacer10,
          Row(
            children: [
              _TokenLegendItem(
                color: theme.colorScheme.primary.withValues(alpha: 0.7),
                label: 'Input',
                count: usage.inputTokens,
              ),
              kHSpacer16,
              _TokenLegendItem(
                color: theme.colorScheme.tertiary.withValues(alpha: 0.7),
                label: 'Output',
                count: usage.outputTokens,
              ),
              const Spacer(),
              Text(
                '${_fmt(usage.totalTokens)} total',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: theme.colorScheme.outline,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _fmt(int n) =>
      n >= 1000 ? '${(n / 1000).toStringAsFixed(1)}k' : '$n';
}

class _TokenLegendItem extends StatelessWidget {
  const _TokenLegendItem(
      {required this.color, required this.label, required this.count});
  final Color color;
  final String label;
  final int count;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
              color: color, borderRadius: BorderRadius.circular(2)),
        ),
        kHSpacer4,
        Text(
          '$label: $count',
          style: theme.textTheme.labelSmall?.copyWith(
            color: theme.colorScheme.onSurface,
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Item breakdown
// ---------------------------------------------------------------------------

class _ItemBreakdown extends StatelessWidget {
  const _ItemBreakdown({
    required this.messages,
    required this.reasoning,
    required this.toolCalls,
    required this.failedToolCalls,
    required this.webSearches,
    required this.fileSearches,
    required this.unknowns,
  });

  final int messages,
      reasoning,
      toolCalls,
      failedToolCalls,
      webSearches,
      fileSearches,
      unknowns;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        if (messages > 0)
          _BreakdownChip(
            icon: Icons.chat_bubble_outline_rounded,
            label: '$messages message${messages > 1 ? 's' : ''}',
            color: theme.colorScheme.primary,
          ),
        if (reasoning > 0)
          _BreakdownChip(
            icon: Icons.psychology_outlined,
            label: '$reasoning reasoning',
            color: theme.colorScheme.tertiary,
          ),
        if (toolCalls > 0)
          _BreakdownChip(
            icon: Icons.code_rounded,
            label: failedToolCalls > 0
                ? '$toolCalls tool calls ($failedToolCalls failed)'
                : '$toolCalls tool call${toolCalls > 1 ? 's' : ''}',
            color: failedToolCalls > 0
                ? theme.colorScheme.error
                : theme.colorScheme.secondary,
          ),
        if (webSearches > 0)
          _BreakdownChip(
            icon: Icons.search_rounded,
            label: '$webSearches web search${webSearches > 1 ? 'es' : ''}',
            color: theme.colorScheme.secondary,
          ),
        if (fileSearches > 0)
          _BreakdownChip(
            icon: Icons.folder_open_rounded,
            label: '$fileSearches file search${fileSearches > 1 ? 'es' : ''}',
            color: theme.colorScheme.secondary,
          ),
        if (unknowns > 0)
          _BreakdownChip(
            icon: Icons.help_outline_rounded,
            label: '$unknowns unknown',
            color: theme.colorScheme.outline,
          ),
        if (messages == 0 &&
            reasoning == 0 &&
            toolCalls == 0 &&
            webSearches == 0 &&
            fileSearches == 0)
          Text(
            'No output items',
            style: theme.textTheme.bodySmall
                ?.copyWith(color: theme.colorScheme.outline),
          ),
      ],
    );
  }
}

class _BreakdownChip extends StatelessWidget {
  const _BreakdownChip(
      {required this.icon, required this.label, required this.color});
  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        border: Border.all(color: color.withValues(alpha: 0.3)),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: color),
          kHSpacer4,
          Text(
            label,
            style: theme.textTheme.labelSmall?.copyWith(color: color),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Tool calls table
// ---------------------------------------------------------------------------

class _ToolCallsTable extends StatelessWidget {
  const _ToolCallsTable({required this.calls});
  final List<FunctionCallOutputItem> calls;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: theme.colorScheme.outlineVariant),
        borderRadius: kBorderRadius8,
      ),
      child: Column(
        children: List.generate(calls.length, (i) {
          final call = calls[i];
          final isLast = i == calls.length - 1;
          final failed = call.status == 'failed';
          final color =
              failed ? theme.colorScheme.error : theme.colorScheme.secondary;

          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
            decoration: BoxDecoration(
              border: isLast
                  ? null
                  : Border(
                      bottom: BorderSide(
                          color: theme.colorScheme.outlineVariant)),
            ),
            child: Row(
              children: [
                Icon(Icons.code_rounded, size: 14, color: color),
                kHSpacer8,
                Expanded(
                  child: Text(
                    call.name,
                    style: kCodeStyle.copyWith(
                      fontSize: 13,
                      color: color,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: (failed ? theme.colorScheme.error : Colors.green)
                        .withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(
                      color:
                          (failed ? theme.colorScheme.error : Colors.green)
                              .withValues(alpha: 0.35),
                    ),
                  ),
                  child: Text(
                    call.status,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: failed ? theme.colorScheme.error : Colors.green,
                    ),
                  ),
                ),
              ],
            ),
          );
        }),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Conversation chain banner
// ---------------------------------------------------------------------------

class _ChainBanner extends StatelessWidget {
  const _ChainBanner({required this.previousId});
  final String previousId;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: theme.colorScheme.tertiaryContainer.withValues(alpha: 0.3),
        border: Border.all(
            color: theme.colorScheme.tertiary.withValues(alpha: 0.3)),
        borderRadius: kBorderRadius8,
      ),
      child: Row(
        children: [
          Icon(Icons.link_rounded,
              size: 15, color: theme.colorScheme.tertiary),
          kHSpacer8,
          Expanded(
            child: Text(
              'This is a chained response. It continues a prior conversation turn.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.tertiary,
              ),
            ),
          ),
          kHSpacer8,
          InkWell(
            borderRadius: BorderRadius.circular(4),
            onTap: () {
              Clipboard.setData(ClipboardData(text: previousId));
              ScaffoldMessenger.of(context)
                ..hideCurrentSnackBar()
                ..showSnackBar(const SnackBar(
                  content: Text('Previous response ID copied'),
                  duration: Duration(seconds: 1),
                ));
            },
            child: Padding(
              padding: const EdgeInsets.all(4),
              child: Icon(Icons.copy_rounded,
                  size: 13, color: theme.colorScheme.tertiary),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

class _SectionHeader extends StatelessWidget {
  const _SectionHeader(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Text(
      text.toUpperCase(),
      style: theme.textTheme.labelSmall?.copyWith(
        color: theme.colorScheme.outline,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.8,
      ),
    );
  }
}

class _MetaGrid extends StatelessWidget {
  const _MetaGrid({required this.items});
  final List<_MetaItem> items;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: items.map((item) => _MetaItemWidget(item: item)).toList(),
    );
  }
}

class _MetaItem {
  const _MetaItem({
    required this.label,
    required this.value,
    this.valueColor,
    this.copyValue,
    this.icon,
  });
  final String label;
  final String value;
  final Color? valueColor;
  final String? copyValue;
  final IconData? icon;
}

class _MetaItemWidget extends StatelessWidget {
  const _MetaItemWidget({required this.item});
  final _MetaItem item;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        border: Border.all(color: theme.colorScheme.outlineVariant),
        borderRadius: kBorderRadius8,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (item.icon != null) ...[
            Icon(item.icon,
                size: 13,
                color: item.valueColor ?? theme.colorScheme.outline),
            kHSpacer4,
          ],
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                item.label,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: theme.colorScheme.outline,
                  fontSize: 10,
                ),
              ),
              Text(
                item.value,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: item.valueColor ?? theme.colorScheme.onSurface,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          if (item.copyValue != null) ...[
            kHSpacer4,
            InkWell(
              borderRadius: BorderRadius.circular(4),
              onTap: () {
                Clipboard.setData(ClipboardData(text: item.copyValue!));
                ScaffoldMessenger.of(context)
                  ..hideCurrentSnackBar()
                  ..showSnackBar(const SnackBar(
                    content: Text('Copied'),
                    duration: Duration(seconds: 1),
                  ));
              },
              child: Padding(
                padding: const EdgeInsets.all(3),
                child: Icon(Icons.copy_rounded,
                    size: 11, color: theme.colorScheme.outline),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
