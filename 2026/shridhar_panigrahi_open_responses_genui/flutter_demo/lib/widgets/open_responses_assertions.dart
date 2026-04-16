import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../design.dart';
import '../models/open_responses.dart';

// ---------------------------------------------------------------------------
// Assertion types
// ---------------------------------------------------------------------------

enum AssertionType {
  hasMessage('Contains a message output', false),
  hasReasoning('Contains reasoning', false),
  hasToolCalls('Has at least one tool call', false),
  allToolCallsCompleted('All tool calls completed', false),
  noFailedToolCalls('No failed tool calls', false),
  noRefusals('No refusal content', false),
  hasWebSearch('Includes web search', false),
  hasFileSearch('Includes file search', false),
  statusCompleted('Response status is "completed"', false),
  toolWasCalled('Specific tool was called', true),
  messageContains('Message contains text', true),
  outputTokensUnder('Output tokens under limit', true),
  totalTokensUnder('Total tokens under limit', true);

  const AssertionType(this.label, this.hasParam);
  final String label;
  final bool hasParam;

  String get paramHint => switch (this) {
        AssertionType.toolWasCalled => 'Tool name, e.g. get_weather',
        AssertionType.messageContains => 'Text to find in message',
        AssertionType.outputTokensUnder => 'Token limit, e.g. 500',
        AssertionType.totalTokensUnder => 'Token limit, e.g. 2000',
        _ => '',
      };
}

// ---------------------------------------------------------------------------
// Data models
// ---------------------------------------------------------------------------

class _Rule {
  _Rule({required this.type, this.param = ''})
      : id = UniqueKey().toString();
  final String id;
  final AssertionType type;
  final String param;

  String get displayLabel => type.hasParam
      ? '${type.label}: "${param.isEmpty ? '…' : param}"'
      : type.label;
}

class _Outcome {
  const _Outcome({required this.passed, required this.detail});
  final bool passed;
  final String detail;
}

// ---------------------------------------------------------------------------
// Assertion evaluator
// ---------------------------------------------------------------------------

_Outcome _evaluate(_Rule rule, OpenResponsesResult result) {
  final output = result.output;

  switch (rule.type) {
    case AssertionType.hasMessage:
      final n = output.whereType<MessageOutputItem>().length;
      return _Outcome(
        passed: n > 0,
        detail: n > 0 ? 'Found $n message item(s)' : 'No message items in output',
      );

    case AssertionType.hasReasoning:
      final n = output.whereType<ReasoningOutputItem>().length;
      return _Outcome(
        passed: n > 0,
        detail:
            n > 0 ? 'Found $n reasoning item(s)' : 'No reasoning items in output',
      );

    case AssertionType.hasToolCalls:
      final n = output.whereType<FunctionCallOutputItem>().length;
      return _Outcome(
        passed: n > 0,
        detail: n > 0 ? 'Found $n tool call(s)' : 'No tool calls in output',
      );

    case AssertionType.allToolCallsCompleted:
      final calls = output.whereType<FunctionCallOutputItem>().toList();
      if (calls.isEmpty) {
        return const _Outcome(
            passed: true, detail: 'No tool calls present (vacuously true)');
      }
      final failed = calls.where((c) => c.status != 'completed').toList();
      return _Outcome(
        passed: failed.isEmpty,
        detail: failed.isEmpty
            ? 'All ${calls.length} tool call(s) completed'
            : '${failed.length} tool call(s) not completed: ${failed.map((c) => c.name).join(', ')}',
      );

    case AssertionType.noFailedToolCalls:
      final failed = output
          .whereType<FunctionCallOutputItem>()
          .where((c) => c.status == 'failed')
          .toList();
      return _Outcome(
        passed: failed.isEmpty,
        detail: failed.isEmpty
            ? 'No failed tool calls'
            : 'Failed: ${failed.map((c) => c.name).join(', ')}',
      );

    case AssertionType.noRefusals:
      bool hasRefusal = false;
      for (final item in output.whereType<MessageOutputItem>()) {
        if (item.content.whereType<RefusalPart>().isNotEmpty) {
          hasRefusal = true;
          break;
        }
      }
      return _Outcome(
        passed: !hasRefusal,
        detail: hasRefusal
            ? 'Refusal content found in message'
            : 'No refusal content',
      );

    case AssertionType.hasWebSearch:
      final n = output.whereType<WebSearchCallOutputItem>().length;
      return _Outcome(
        passed: n > 0,
        detail:
            n > 0 ? 'Found $n web search call(s)' : 'No web search calls',
      );

    case AssertionType.hasFileSearch:
      final n = output.whereType<FileSearchCallOutputItem>().length;
      return _Outcome(
        passed: n > 0,
        detail:
            n > 0 ? 'Found $n file search call(s)' : 'No file search calls',
      );

    case AssertionType.statusCompleted:
      return _Outcome(
        passed: result.status == 'completed',
        detail: 'Response status is "${result.status}"',
      );

    case AssertionType.toolWasCalled:
      final name = rule.param.trim();
      if (name.isEmpty) {
        return const _Outcome(passed: false, detail: 'Tool name not specified');
      }
      final match = output
          .whereType<FunctionCallOutputItem>()
          .any((c) => c.name == name);
      return _Outcome(
        passed: match,
        detail: match
            ? 'Tool "$name" was called'
            : 'Tool "$name" was not called',
      );

    case AssertionType.messageContains:
      final needle = rule.param.trim();
      if (needle.isEmpty) {
        return const _Outcome(
            passed: false, detail: 'Search text not specified');
      }
      final text = output
          .whereType<MessageOutputItem>()
          .map((m) => m.text)
          .join(' ');
      final found = text.toLowerCase().contains(needle.toLowerCase());
      return _Outcome(
        passed: found,
        detail: found
            ? 'Found "$needle" in message output'
            : '"$needle" not found in message output',
      );

    case AssertionType.outputTokensUnder:
      final limit = int.tryParse(rule.param.trim()) ?? -1;
      if (limit < 0) {
        return const _Outcome(passed: false, detail: 'Invalid token limit');
      }
      final usage = result.usage;
      if (usage == null) {
        return const _Outcome(
            passed: false, detail: 'No usage data in response');
      }
      return _Outcome(
        passed: usage.outputTokens < limit,
        detail: 'Output tokens: ${usage.outputTokens} (limit: $limit)',
      );

    case AssertionType.totalTokensUnder:
      final limit = int.tryParse(rule.param.trim()) ?? -1;
      if (limit < 0) {
        return const _Outcome(passed: false, detail: 'Invalid token limit');
      }
      final usage = result.usage;
      if (usage == null) {
        return const _Outcome(
            passed: false, detail: 'No usage data in response');
      }
      return _Outcome(
        passed: usage.totalTokens < limit,
        detail: 'Total tokens: ${usage.totalTokens} (limit: $limit)',
      );
  }
}

// ---------------------------------------------------------------------------
// Dart test code generator
// ---------------------------------------------------------------------------

String _generateDartTest(List<_Rule> rules) {
  if (rules.isEmpty) return '';

  final lines = <String>[];
  lines.add('// Generated by APIDash — Open Responses assertions');
  lines.add(
      "// Paste into your test file and replace 'result' with your OpenResponsesResult.");
  lines.add("test('agent response assertions', () {");

  for (final rule in rules) {
    final comment = '  // ${rule.displayLabel}';
    final assertion = _ruleToAssertion(rule);
    if (assertion != null) {
      lines.add(comment);
      lines.add('  $assertion');
    }
  }

  lines.add('});');
  return lines.join('\n');
}

String? _ruleToAssertion(_Rule rule) {
  return switch (rule.type) {
    AssertionType.hasMessage =>
      'expect(result.output.whereType<MessageOutputItem>().isNotEmpty, isTrue);',

    AssertionType.hasReasoning =>
      'expect(result.output.whereType<ReasoningOutputItem>().isNotEmpty, isTrue);',

    AssertionType.hasToolCalls =>
      'expect(result.output.whereType<FunctionCallOutputItem>().isNotEmpty, isTrue);',

    AssertionType.allToolCallsCompleted =>
      "expect(result.output.whereType<FunctionCallOutputItem>().every((c) => c.status == 'completed'), isTrue);",

    AssertionType.noFailedToolCalls =>
      "expect(result.output.whereType<FunctionCallOutputItem>().any((c) => c.status == 'failed'), isFalse);",

    AssertionType.noRefusals =>
      'expect(result.output.whereType<MessageOutputItem>().every((m) => m.content.whereType<RefusalPart>().isEmpty), isTrue);',

    AssertionType.hasWebSearch =>
      'expect(result.output.whereType<WebSearchCallOutputItem>().isNotEmpty, isTrue);',

    AssertionType.hasFileSearch =>
      'expect(result.output.whereType<FileSearchCallOutputItem>().isNotEmpty, isTrue);',

    AssertionType.statusCompleted =>
      "expect(result.status, equals('completed'));",

    AssertionType.toolWasCalled when rule.param.isNotEmpty =>
      "expect(result.output.whereType<FunctionCallOutputItem>().any((c) => c.name == '${rule.param.trim()}'), isTrue);",

    AssertionType.messageContains when rule.param.isNotEmpty =>
      "expect(result.output.whereType<MessageOutputItem>().map((m) => m.text).join(' ').toLowerCase(), contains('${rule.param.trim().toLowerCase()}'));",

    AssertionType.outputTokensUnder
        when int.tryParse(rule.param.trim()) != null =>
      'expect(result.usage!.outputTokens, lessThan(${rule.param.trim()}));',

    AssertionType.totalTokensUnder
        when int.tryParse(rule.param.trim()) != null =>
      'expect(result.usage!.totalTokens, lessThan(${rule.param.trim()}));',

    _ => null,
  };
}

// ---------------------------------------------------------------------------
// Main widget
// ---------------------------------------------------------------------------

class OpenResponsesAssertions extends StatefulWidget {
  const OpenResponsesAssertions({super.key, required this.result});

  final OpenResponsesResult result;

  @override
  State<OpenResponsesAssertions> createState() =>
      _OpenResponsesAssertionsState();
}

class _OpenResponsesAssertionsState extends State<OpenResponsesAssertions> {
  final List<_Rule> _rules = [];
  bool _showForm = false;
  AssertionType _selectedType = AssertionType.hasMessage;
  final _paramController = TextEditingController();

  @override
  void dispose() {
    _paramController.dispose();
    super.dispose();
  }

  void _addRule() {
    final param = _paramController.text.trim();
    if (_selectedType.hasParam && param.isEmpty) return;
    setState(() {
      _rules.add(_Rule(type: _selectedType, param: param));
      _paramController.clear();
      _showForm = false;
      _selectedType = AssertionType.hasMessage;
    });
  }

  void _removeRule(String id) {
    setState(() => _rules.removeWhere((r) => r.id == id));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final outcomes = {
      for (final rule in _rules) rule.id: _evaluate(rule, widget.result),
    };

    final passCount = outcomes.values.where((o) => o.passed).length;
    final total = _rules.length;

    return Column(
      children: [
        if (_rules.isNotEmpty) _SummaryBanner(passed: passCount, total: total),

        Expanded(
          child: _rules.isEmpty && !_showForm
              ? _EmptyState(onAdd: () => setState(() => _showForm = true))
              : ListView(
                  padding: kP8,
                  children: [
                    ...List.generate(_rules.length, (i) {
                      final rule = _rules[i];
                      final outcome = outcomes[rule.id];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: _AssertionRow(
                          rule: rule,
                          outcome: outcome,
                          onRemove: () => _removeRule(rule.id),
                        ),
                      );
                    }),
                    if (_showForm)
                      _AddAssertionForm(
                        selectedType: _selectedType,
                        paramController: _paramController,
                        onTypeChanged: (t) =>
                            setState(() => _selectedType = t!),
                        onAdd: _addRule,
                        onCancel: () => setState(() {
                          _showForm = false;
                          _paramController.clear();
                        }),
                      ),
                  ],
                ),
        ),

        if (!_showForm)
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 6, 12, 10),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.add_rounded, size: 16),
                    label: const Text('Add Assertion'),
                    onPressed: () => setState(() => _showForm = true),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: theme.colorScheme.primary,
                      side:
                          BorderSide(color: theme.colorScheme.outlineVariant),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      textStyle: theme.textTheme.labelMedium,
                    ),
                  ),
                ),
                if (_rules.isNotEmpty) ...[
                  kHSpacer8,
                  _ExportTestButton(rules: _rules),
                ],
              ],
            ),
          ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Sub-widgets
// ---------------------------------------------------------------------------

class _SummaryBanner extends StatelessWidget {
  const _SummaryBanner({required this.passed, required this.total});
  final int passed;
  final int total;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final allPass = passed == total;
    final color = allPass ? Colors.green : theme.colorScheme.error;
    final bgColor = allPass
        ? Colors.green.withValues(alpha: 0.08)
        : theme.colorScheme.errorContainer.withValues(alpha: 0.25);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
      decoration: BoxDecoration(
        color: bgColor,
        border: Border(bottom: BorderSide(color: color.withValues(alpha: 0.25))),
      ),
      child: Row(
        children: [
          Icon(
            allPass ? Icons.check_circle_rounded : Icons.cancel_rounded,
            size: 16,
            color: color,
          ),
          kHSpacer8,
          Text(
            allPass
                ? 'All $total assertion${total == 1 ? '' : 's'} passed'
                : '$passed / $total passed',
            style: theme.textTheme.labelMedium?.copyWith(
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _AssertionRow extends StatelessWidget {
  const _AssertionRow({
    required this.rule,
    required this.outcome,
    required this.onRemove,
  });

  final _Rule rule;
  final _Outcome? outcome;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final passed = outcome?.passed ?? false;
    const passColor = Colors.green;
    final failColor = theme.colorScheme.error;
    final color = passed ? passColor : failColor;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: passed
            ? Colors.green.withValues(alpha: 0.05)
            : theme.colorScheme.errorContainer.withValues(alpha: 0.1),
        border: Border.all(color: color.withValues(alpha: 0.3)),
        borderRadius: kBorderRadius8,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 1),
            child: Icon(
              passed ? Icons.check_circle_rounded : Icons.cancel_rounded,
              size: 16,
              color: color,
            ),
          ),
          kHSpacer8,
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  rule.displayLabel,
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (outcome != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    outcome!.detail,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.outline,
                    ),
                  ),
                ],
              ],
            ),
          ),
          SizedBox(
            width: 28,
            height: 28,
            child: IconButton(
              padding: EdgeInsets.zero,
              iconSize: 15,
              icon: Icon(Icons.close_rounded, color: theme.colorScheme.outline),
              tooltip: 'Remove assertion',
              onPressed: onRemove,
            ),
          ),
        ],
      ),
    );
  }
}

class _AddAssertionForm extends StatelessWidget {
  const _AddAssertionForm({
    required this.selectedType,
    required this.paramController,
    required this.onTypeChanged,
    required this.onAdd,
    required this.onCancel,
  });

  final AssertionType selectedType;
  final TextEditingController paramController;
  final ValueChanged<AssertionType?> onTypeChanged;
  final VoidCallback onAdd;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      margin: const EdgeInsets.only(top: 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        border: Border.all(color: theme.colorScheme.outlineVariant),
        borderRadius: kBorderRadius8,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'New assertion',
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.outline,
              fontWeight: FontWeight.w600,
            ),
          ),
          kVSpacer8,
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
            decoration: BoxDecoration(
              border: Border.all(color: theme.colorScheme.outlineVariant),
              borderRadius: BorderRadius.circular(6),
            ),
            child: DropdownButton<AssertionType>(
              value: selectedType,
              isExpanded: true,
              isDense: true,
              underline: const SizedBox.shrink(),
              items: AssertionType.values
                  .map((t) => DropdownMenuItem(value: t, child: Text(t.label)))
                  .toList(),
              onChanged: onTypeChanged,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurface,
              ),
            ),
          ),
          if (selectedType.hasParam) ...[
            kVSpacer8,
            TextField(
              controller: paramController,
              decoration: InputDecoration(
                hintText: selectedType.paramHint,
                isDense: true,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(6),
                  borderSide:
                      BorderSide(color: theme.colorScheme.outlineVariant),
                ),
              ),
              style: theme.textTheme.bodySmall,
              onSubmitted: (_) => onAdd(),
            ),
          ],
          kVSpacer10,
          Row(
            children: [
              FilledButton(
                onPressed: onAdd,
                style: FilledButton.styleFrom(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  textStyle: theme.textTheme.labelMedium,
                ),
                child: const Text('Add'),
              ),
              kHSpacer8,
              TextButton(
                onPressed: onCancel,
                style: TextButton.styleFrom(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  textStyle: theme.textTheme.labelMedium,
                ),
                child: const Text('Cancel'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ExportTestButton extends StatelessWidget {
  const _ExportTestButton({required this.rules});
  final List<_Rule> rules;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Tooltip(
      message: 'Copy as Dart test',
      child: OutlinedButton.icon(
        icon: const Icon(Icons.code_rounded, size: 15),
        label: const Text('Export Test'),
        onPressed: () {
          final code = _generateDartTest(rules);
          Clipboard.setData(ClipboardData(text: code));
          ScaffoldMessenger.of(context)
            ..hideCurrentSnackBar()
            ..showSnackBar(
              SnackBar(
                content: const Text('Dart test snippet copied to clipboard'),
                duration: const Duration(seconds: 2),
                action: SnackBarAction(
                  label: 'Preview',
                  onPressed: () => _showPreview(context, code),
                ),
              ),
            );
        },
        style: OutlinedButton.styleFrom(
          foregroundColor: theme.colorScheme.secondary,
          side: BorderSide(color: theme.colorScheme.outlineVariant),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          textStyle: theme.textTheme.labelMedium,
        ),
      ),
    );
  }

  void _showPreview(BuildContext context, String code) {
    final theme = Theme.of(context);
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.code_rounded, size: 18, color: theme.colorScheme.primary),
            kHSpacer8,
            const Text('Generated Dart Test'),
          ],
        ),
        content: SizedBox(
          width: 520,
          child: SingleChildScrollView(
            child: Container(
              padding: kP8,
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest,
                borderRadius: kBorderRadius8,
              ),
              child: SelectableText(
                code,
                style: kCodeStyle.copyWith(fontSize: 12),
              ),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Clipboard.setData(ClipboardData(text: code));
              Navigator.of(ctx).pop();
            },
            child: const Text('Copy Again'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.onAdd});
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.rule_rounded,
              size: 40, color: theme.colorScheme.outlineVariant),
          kVSpacer10,
          Text(
            'No assertions yet',
            style: theme.textTheme.titleSmall?.copyWith(
              color: theme.colorScheme.outline,
            ),
          ),
          kVSpacer5,
          Text(
            'Add assertions to validate your AI response\nautomatically — tool calls, token limits, content checks.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.outlineVariant,
            ),
          ),
          kVSpacer10,
          FilledButton.tonal(
            onPressed: onAdd,
            child: const Text('Add first assertion'),
          ),
        ],
      ),
    );
  }
}
