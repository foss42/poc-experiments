import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../domain/gen_ui_models.dart';
import '../domain/open_responses_detector.dart';
import '../domain/response_models.dart';
import 'gen_ui_preview_screen.dart';
import 'streaming_simulator_screen.dart';

const Color _reasoningAccent = Color(0xFF7C3AED);
const Color _functionAccent = Color(0xFF2563EB);
const Color _outputAccent = Color(0xFF16A34A);
const Color _messageAccent = Color(0xFF6B7280);
const Color _unknownAccent = Color(0xFFD97706);
const Color _lightModeBackground = Color(0xFFF8FAFC);
const Duration _expandDuration = Duration(milliseconds: 250);

enum _TimelineArrangement { sequence, grouped }

class ResponseExplorerScreen extends StatefulWidget {
  const ResponseExplorerScreen({super.key, required this.response});

  final ParsedResponse response;

  @override
  State<ResponseExplorerScreen> createState() => _ResponseExplorerScreenState();
}

class _ResponseExplorerScreenState extends State<ResponseExplorerScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  late final TextEditingController _searchController;
  bool _showSearchField = false;
  _TimelineArrangement _timelineArrangement = _TimelineArrangement.grouped;
  bool _prettyPrintRawJson = true;

  String get _query => _searchController.text.trim();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _searchController = TextEditingController();
    _searchController.addListener(_handleSearchChanged);
  }

  @override
  void dispose() {
    _searchController
      ..removeListener(_handleSearchChanged)
      ..dispose();
    _tabController.dispose();
    super.dispose();
  }

  void _handleSearchChanged() {
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _copyText(String text, {String message = 'Copied'}) async {
    await Clipboard.setData(ClipboardData(text: text));
    if (!mounted) {
      return;
    }
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          duration: const Duration(milliseconds: 1100),
          behavior: SnackBarBehavior.floating,
        ),
      );
  }

  CorrelatedCall? _findCorrelatedCall(String callId) {
    for (final pair in widget.response.correlatedCalls) {
      if (pair.call.callId == callId) {
        return pair;
      }
    }
    return null;
  }

  bool _matchesTimelineQuery(ResponseItem item) {
    if (_query.isEmpty) {
      return true;
    }
    final source = jsonEncode(itemToJson(item)).toLowerCase();
    return source.contains(_query.toLowerCase());
  }

  void _toggleSearchField() {
    setState(() {
      _showSearchField = !_showSearchField;
      if (!_showSearchField && _query.isNotEmpty) {
        _searchController.clear();
      }
    });
  }

  Route<void> _buildStreamingRoute() {
    return PageRouteBuilder<void>(
      pageBuilder: (context, animation, secondaryAnimation) =>
          StreamingSimulatorScreen(seedResponse: widget.response),
      transitionDuration: const Duration(milliseconds: 320),
      reverseTransitionDuration: const Duration(milliseconds: 260),
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        final curved = CurvedAnimation(
          parent: animation,
          curve: Curves.easeOutCubic,
        );

        return SlideTransition(
          position: Tween<Offset>(
            begin: const Offset(0, 1),
            end: Offset.zero,
          ).animate(curved),
          child: child,
        );
      },
    );
  }

  Route<void> _buildGenUIPreviewRoute(Map<String, dynamic> descriptorJson) {
    final descriptor = GenUIDescriptor.fromJson(descriptorJson);

    return PageRouteBuilder<void>(
      pageBuilder: (context, animation, secondaryAnimation) =>
          GenUIPreviewScreen(
            descriptor: descriptor,
            rawDescriptorJson: descriptorJson,
          ),
      transitionDuration: const Duration(milliseconds: 320),
      reverseTransitionDuration: const Duration(milliseconds: 260),
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        final curved = CurvedAnimation(
          parent: animation,
          curve: Curves.easeOutCubic,
        );

        return SlideTransition(
          position: Tween<Offset>(
            begin: const Offset(0, 1),
            end: Offset.zero,
          ).animate(curved),
          child: child,
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.brightness == Brightness.light
          ? _lightModeBackground
          : theme.colorScheme.surface,
      body: SafeArea(
        child: Column(
          children: <Widget>[
            _buildHeader(theme),
            const SizedBox(height: 4),
            AnimatedSize(
              duration: _expandDuration,
              curve: Curves.easeInOut,
              child: _showSearchField
                  ? _buildSearchField(theme)
                  : const SizedBox.shrink(),
            ),
            const Divider(height: 1),
            Material(
              color: theme.colorScheme.surface,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
                child: TabBar(
                  controller: _tabController,
                  isScrollable: true,
                  tabAlignment: TabAlignment.start,
                  labelPadding: const EdgeInsets.symmetric(horizontal: 24),
                  tabs: const <Tab>[
                    Tab(icon: Icon(Icons.timeline_outlined), text: 'Parsed'),
                    Tab(icon: Icon(Icons.link_rounded), text: 'Calls'),
                    Tab(icon: Icon(Icons.data_object_rounded), text: 'Raw'),
                    Tab(
                      icon: Icon(Icons.error_outline_rounded),
                      text: 'Diagnostics',
                    ),
                  ],
                ),
              ),
            ),
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: <Widget>[
                  _buildTimelineTab(theme),
                  _buildCorrelationTab(theme),
                  _buildRawTab(theme),
                  _buildDiagnosticsTab(theme),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(ThemeData theme) {
    final statusColor = _statusColor(widget.response.status);
    final canPop = Navigator.of(context).canPop();
    final tokensLabel = widget.response.totalTokens == null
        ? 'tokens n/a'
        : '${_formatTokens(widget.response.totalTokens!)} tokens';

    return Padding(
      padding: const EdgeInsets.fromLTRB(22, 18, 22, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: <Widget>[
          if (canPop)
            IconButton(
              onPressed: () => Navigator.of(context).maybePop(),
              tooltip: 'Back',
              icon: const Icon(Icons.arrow_back_rounded),
              constraints: const BoxConstraints.tightFor(width: 34, height: 34),
              visualDensity: VisualDensity.compact,
              padding: EdgeInsets.zero,
            ),
          if (canPop) const SizedBox(width: 10),
          Expanded(
            child: InkWell(
              onTap: () => _copyText(widget.response.id),
              borderRadius: BorderRadius.circular(8),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Text(
                  widget.response.id,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontFamily: 'monospace',
                    color: theme.colorScheme.onSurfaceVariant,
                    fontSize: 12,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Column(
            children: <Widget>[
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: statusColor,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  widget.response.status,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                widget.response.model,
                style: theme.textTheme.bodySmall?.copyWith(
                  fontSize: 12,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
          const SizedBox(width: 12),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Text(
                tokensLabel,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  fontSize: 12,
                ),
              ),
              const SizedBox(width: 8),
              FilledButton.tonalIcon(
                onPressed: () =>
                    Navigator.of(context).push(_buildStreamingRoute()),
                icon: const Icon(Icons.play_circle_fill_rounded, size: 17),
                label: const Text('Simulate'),
                style: FilledButton.styleFrom(
                  visualDensity: VisualDensity.compact,
                  minimumSize: const Size(0, 36),
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  shape: const StadiumBorder(),
                ),
              ),
              const SizedBox(width: 4),
              IconButton(
                onPressed: _toggleSearchField,
                tooltip: _showSearchField ? 'Close Search' : 'Search Timeline',
                icon: Icon(
                  _showSearchField ? Icons.close_rounded : Icons.search_rounded,
                ),
                constraints: const BoxConstraints.tightFor(
                  width: 36,
                  height: 36,
                ),
                visualDensity: VisualDensity.compact,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSearchField(ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(22, 10, 22, 14),
      child: TextField(
        controller: _searchController,
        decoration: InputDecoration(
          hintText: 'Search timeline items',
          prefixIcon: const Icon(Icons.search_rounded),
          suffixIcon: _query.isEmpty
              ? null
              : IconButton(
                  onPressed: _searchController.clear,
                  icon: const Icon(Icons.clear_rounded),
                  tooltip: 'Clear Search',
                ),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
          isDense: true,
        ),
      ),
    );
  }

  Widget _buildTimelineTab(ThemeData theme) {
    final genUiDescriptorJson =
        OpenResponsesDetector.extractGenUIDescriptorJson(widget.response);
    final hasGenUiDescriptor = genUiDescriptorJson != null;

    final visibleItems = widget.response.items
        .where(_matchesTimelineQuery)
        .toList(growable: false);

    if (visibleItems.isEmpty && !hasGenUiDescriptor) {
      return const _CenteredPlaceholder(
        icon: Icons.search_off_rounded,
        title: 'No timeline items match the active query',
      );
    }

    final reasoningItems = <ResponseItem>[];
    final functionCallItems = <ResponseItem>[];
    final outputItems = <ResponseItem>[];
    final messageItems = <ResponseItem>[];
    final unknownItems = <ResponseItem>[];

    for (final item in visibleItems) {
      if (item is ReasoningItem) {
        reasoningItems.add(item);
      } else if (item is FunctionCallItem) {
        functionCallItems.add(item);
      } else if (item is FunctionCallOutputItem) {
        outputItems.add(item);
      } else if (item is MessageItem) {
        messageItems.add(item);
      } else {
        unknownItems.add(item);
      }
    }

    final groupedSections =
        <({String title, Color color, List<ResponseItem> items})>[
          (title: 'Reasoning', color: _reasoningAccent, items: reasoningItems),
          (
            title: 'Tool Calls',
            color: _functionAccent,
            items: functionCallItems,
          ),
          (title: 'Tool Outputs', color: _outputAccent, items: outputItems),
          (title: 'Messages', color: _messageAccent, items: messageItems),
          (title: 'Unknown', color: _unknownAccent, items: unknownItems),
        ];

    return ListView(
      padding: const EdgeInsets.all(20),
      children: <Widget>[
        _buildTimelineModePanel(theme, visibleItems.length),
        const SizedBox(height: 14),
        if (hasGenUiDescriptor)
          Padding(
            padding: EdgeInsets.only(bottom: visibleItems.isEmpty ? 0 : 12),
            child: _GenUIBanner(
              onPressed: () {
                Navigator.of(
                  context,
                ).push(_buildGenUIPreviewRoute(genUiDescriptorJson));
              },
            ),
          ),
        if (_timelineArrangement == _TimelineArrangement.sequence)
          for (int index = 0; index < visibleItems.length; index++)
            Padding(
              padding: EdgeInsets.only(
                bottom: index == visibleItems.length - 1 ? 0 : 12,
              ),
              child: _StaggeredEntrance(
                delay: Duration(milliseconds: index * 50),
                child: _buildTimelineCard(theme, visibleItems[index]),
              ),
            ),
        if (_timelineArrangement == _TimelineArrangement.grouped)
          for (final section in groupedSections)
            if (section.items.isNotEmpty) ...<Widget>[
              _TimelineSectionHeader(
                title: section.title,
                count: section.items.length,
                color: section.color,
              ),
              const SizedBox(height: 8),
              for (int index = 0; index < section.items.length; index++)
                Padding(
                  padding: EdgeInsets.only(
                    bottom: index == section.items.length - 1 ? 14 : 10,
                  ),
                  child: _buildTimelineCard(theme, section.items[index]),
                ),
            ],
      ],
    );
  }

  Widget _buildTimelineModePanel(ThemeData theme, int visibleItemCount) {
    final totalItems = widget.response.items.length;
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        color: theme.colorScheme.surface,
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Text(
                'Parsed timeline view',
                style: theme.textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Spacer(),
              Text(
                '$visibleItemCount / $totalItems visible',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  fontSize: 12,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SegmentedButton<_TimelineArrangement>(
            segments: const <ButtonSegment<_TimelineArrangement>>[
              ButtonSegment<_TimelineArrangement>(
                value: _TimelineArrangement.grouped,
                icon: Icon(Icons.account_tree_outlined),
                label: Text('Grouped'),
              ),
              ButtonSegment<_TimelineArrangement>(
                value: _TimelineArrangement.sequence,
                icon: Icon(Icons.sort_rounded),
                label: Text('Sequence'),
              ),
            ],
            selected: <_TimelineArrangement>{_timelineArrangement},
            showSelectedIcon: false,
            onSelectionChanged: (Set<_TimelineArrangement> selected) {
              if (selected.isEmpty) {
                return;
              }
              setState(() {
                _timelineArrangement = selected.first;
              });
            },
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: <Widget>[
              _TimelineCountChip(
                color: _reasoningAccent,
                label:
                    '${widget.response.items.whereType<ReasoningItem>().length} reasoning',
              ),
              _TimelineCountChip(
                color: _functionAccent,
                label:
                    '${widget.response.items.whereType<FunctionCallItem>().length} calls',
              ),
              _TimelineCountChip(
                color: _outputAccent,
                label:
                    '${widget.response.items.whereType<FunctionCallOutputItem>().length} outputs',
              ),
              _TimelineCountChip(
                color: _messageAccent,
                label:
                    '${widget.response.items.whereType<MessageItem>().length} messages',
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineCard(ThemeData theme, ResponseItem item) {
    try {
      if (item is ReasoningItem) {
        return _ReasoningCard(
          item: item,
          query: _query,
          onCopy: () => _copyText(
            const JsonEncoder.withIndent('  ').convert(itemToJson(item)),
          ),
        );
      }
      if (item is FunctionCallItem) {
        final pair = _findCorrelatedCall(item.callId);
        return _FunctionCallCard(
          item: item,
          query: _query,
          isComplete: pair?.isComplete ?? false,
          onCopy: () => _copyText(
            const JsonEncoder.withIndent('  ').convert(itemToJson(item)),
          ),
        );
      }
      if (item is FunctionCallOutputItem) {
        return _FunctionCallOutputCard(
          item: item,
          query: _query,
          onCopy: () => _copyText(
            const JsonEncoder.withIndent('  ').convert(itemToJson(item)),
          ),
        );
      }
      if (item is MessageItem) {
        return _MessageCard(
          item: item,
          query: _query,
          onCopy: () => _copyText(
            const JsonEncoder.withIndent('  ').convert(itemToJson(item)),
          ),
        );
      }
      if (item is UnknownItem) {
        return _UnknownItemCard(
          raw: item.raw,
          query: _query,
          onCopy: () => _copyText(
            const JsonEncoder.withIndent('  ').convert(itemToJson(item)),
          ),
        );
      }
      return _UnknownItemCard(
        raw: itemToJson(item),
        query: _query,
        onCopy: () => _copyText(
          const JsonEncoder.withIndent('  ').convert(itemToJson(item)),
        ),
      );
    } catch (error) {
      return _UnknownItemCard(
        raw: <String, dynamic>{
          'render_error': error.toString(),
          'raw_item': itemToJson(item),
        },
        query: _query,
        onCopy: () => _copyText(
          const JsonEncoder.withIndent('  ').convert(itemToJson(item)),
        ),
      );
    }
  }

  Widget _buildCorrelationTab(ThemeData theme) {
    if (widget.response.correlatedCalls.isEmpty) {
      return const _CenteredPlaceholder(
        icon: Icons.link_off_rounded,
        title: 'No tool calls in this response',
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(20),
      itemCount: widget.response.correlatedCalls.length,
      separatorBuilder: (_, index) =>
          Divider(height: 24, color: theme.colorScheme.outlineVariant),
      itemBuilder: (BuildContext context, int index) {
        final pair = widget.response.correlatedCalls[index];
        return _CorrelationPairCard(pair: pair);
      },
    );
  }

  Widget _buildRawTab(ThemeData theme) {
    final prettySource = const JsonEncoder.withIndent(
      '  ',
    ).convert(widget.response.toJson());
    final compactSource = jsonEncode(widget.response.toJson());
    final source = _prettyPrintRawJson ? prettySource : compactSource;
    final lineCount = '\n'.allMatches(source).length + 1;
    final frameBackground = theme.brightness == Brightness.dark
        ? const Color(0xFF0D1117)
        : const Color(0xFF111827);

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
      child: Container(
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: theme.colorScheme.outlineVariant),
        ),
        child: Column(
          children: <Widget>[
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
              child: Row(
                children: <Widget>[
                  Text(
                    '$lineCount lines',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    _prettyPrintRawJson ? 'Pretty print' : 'Compact',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Switch.adaptive(
                    value: _prettyPrintRawJson,
                    onChanged: (bool value) {
                      setState(() {
                        _prettyPrintRawJson = value;
                      });
                    },
                  ),
                  const Spacer(),
                  FilledButton.tonalIcon(
                    onPressed: () => _copyText(source, message: 'JSON copied'),
                    icon: const Icon(Icons.copy_rounded, size: 16),
                    label: const Text('Copy JSON'),
                    style: FilledButton.styleFrom(
                      visualDensity: VisualDensity.compact,
                      minimumSize: const Size(0, 34),
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                    ),
                  ),
                ],
              ),
            ),
            Divider(height: 1, color: theme.colorScheme.outlineVariant),
            Expanded(
              child: LayoutBuilder(
                builder: (BuildContext context, BoxConstraints constraints) {
                  return Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: frameBackground,
                      borderRadius: const BorderRadius.vertical(
                        bottom: Radius.circular(12),
                      ),
                    ),
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: ConstrainedBox(
                        constraints: BoxConstraints(
                          minWidth: constraints.maxWidth,
                        ),
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.fromLTRB(14, 14, 20, 18),
                          child: SelectableText.rich(
                            TextSpan(
                              children: _prettyPrintRawJson
                                  ? _buildLineNumberedJsonSpans(source, theme)
                                  : _jsonSyntaxSpans(source, theme),
                            ),
                            style: theme.textTheme.bodyMedium?.copyWith(
                              fontFamily: 'monospace',
                              fontSize: 13,
                              height: 1.55,
                              color: const Color(0xFFE5E7EB),
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDiagnosticsTab(ThemeData theme) {
    final unknownCount = widget.response.items.whereType<UnknownItem>().length;
    final incompleteCalls = widget.response.correlatedCalls
        .where((CorrelatedCall pair) => !pair.isComplete)
        .length;
    final hasAssistantMessage = widget.response.items
        .whereType<MessageItem>()
        .any((MessageItem item) => item.role.toLowerCase() == 'assistant');
    final hasGenUiDescriptor =
        OpenResponsesDetector.extractGenUIDescriptorJson(widget.response) !=
        null;

    final diagnostics = <_DiagnosticFinding>[];

    if (incompleteCalls > 0) {
      diagnostics.add(
        _DiagnosticFinding(
          severity: _DiagnosticSeverity.error,
          title: 'Unresolved tool calls',
          details:
              '$incompleteCalls function call(s) do not have matching output payloads.',
          action:
              'Inspect call_id links in the Calls tab and verify stream completeness.',
        ),
      );
    }

    if (unknownCount > 0) {
      diagnostics.add(
        _DiagnosticFinding(
          severity: _DiagnosticSeverity.warning,
          title: 'Unsupported output item types',
          details:
              '$unknownCount item(s) were preserved as unknown. This may indicate schema drift.',
          action:
              'Review unknown cards in Parsed tab and expand parser mappings.',
        ),
      );
    }

    if (!hasAssistantMessage) {
      diagnostics.add(
        const _DiagnosticFinding(
          severity: _DiagnosticSeverity.warning,
          title: 'No assistant message item',
          details:
              'A final assistant message was not detected in this parsed response.',
          action:
              'Confirm whether the stream ended early or only intermediate states were captured.',
        ),
      );
    }

    if (_query.isNotEmpty &&
        widget.response.items.where(_matchesTimelineQuery).isEmpty) {
      diagnostics.add(
        _DiagnosticFinding(
          severity: _DiagnosticSeverity.info,
          title: 'Active search hides all timeline items',
          details: 'No parsed item matches query "$_query".',
          action:
              'Clear or broaden the search query to resume timeline inspection.',
        ),
      );
    }

    if (hasGenUiDescriptor) {
      diagnostics.add(
        const _DiagnosticFinding(
          severity: _DiagnosticSeverity.info,
          title: 'GenUI descriptor detected',
          details:
              'A generated UI descriptor was found in this response payload.',
          action:
              'Open Preview UI from Parsed tab to validate rendered interface output.',
        ),
      );
    }

    if (diagnostics.isEmpty) {
      return const _CenteredPlaceholder(
        icon: Icons.verified_rounded,
        title: 'No diagnostics findings',
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: diagnostics.length,
      itemBuilder: (BuildContext context, int index) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: index == diagnostics.length - 1 ? 0 : 12,
          ),
          child: _DiagnosticsFindingCard(finding: diagnostics[index]),
        );
      },
    );
  }
}

enum _DiagnosticSeverity { info, warning, error }

class _DiagnosticFinding {
  const _DiagnosticFinding({
    required this.severity,
    required this.title,
    required this.details,
    required this.action,
  });

  final _DiagnosticSeverity severity;
  final String title;
  final String details;
  final String action;
}

class _TimelineCountChip extends StatelessWidget {
  const _TimelineCountChip({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        color: _tintedSurface(theme, color),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      child: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          color: color,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _TimelineSectionHeader extends StatelessWidget {
  const _TimelineSectionHeader({
    required this.title,
    required this.count,
    required this.color,
  });

  final String title;
  final int count;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: _tintedSurface(theme, color),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      child: Row(
        children: <Widget>[
          Text(
            title,
            style: theme.textTheme.titleSmall?.copyWith(
              color: color,
              fontWeight: FontWeight.w700,
            ),
          ),
          const Spacer(),
          Text(
            '$count',
            style: theme.textTheme.labelLarge?.copyWith(
              color: color,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _DiagnosticsFindingCard extends StatelessWidget {
  const _DiagnosticsFindingCard({required this.finding});

  final _DiagnosticFinding finding;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    late final Color color;
    late final IconData icon;

    switch (finding.severity) {
      case _DiagnosticSeverity.info:
        color = _functionAccent;
        icon = Icons.info_outline_rounded;
      case _DiagnosticSeverity.warning:
        color = _unknownAccent;
        icon = Icons.warning_amber_rounded;
      case _DiagnosticSeverity.error:
        color = const Color(0xFFDC2626);
        icon = Icons.error_outline_rounded;
    }

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        color: _tintedSurface(theme, color),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Icon(icon, color: color, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  finding.title,
                  style: theme.textTheme.titleSmall?.copyWith(
                    color: color,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            finding.details,
            style: theme.textTheme.bodySmall?.copyWith(height: 1.45),
          ),
          const SizedBox(height: 8),
          Text(
            'Action: ${finding.action}',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
              fontStyle: FontStyle.italic,
              height: 1.45,
            ),
          ),
        ],
      ),
    );
  }
}

class _ReasoningCard extends StatefulWidget {
  const _ReasoningCard({
    required this.item,
    required this.query,
    required this.onCopy,
  });

  final ReasoningItem item;
  final String query;
  final VoidCallback onCopy;

  @override
  State<_ReasoningCard> createState() => _ReasoningCardState();
}

class _ReasoningCardState extends State<_ReasoningCard> {
  bool _expanded = true;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return _TimelineCardFrame(
      accentColor: _reasoningAccent,
      backgroundColor: _tintedSurface(theme, _reasoningAccent),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              const Icon(Icons.psychology_alt_rounded, color: _reasoningAccent),
              const SizedBox(width: 8),
              Text(
                'Reasoning',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontSize: 16,
                  color: _reasoningAccent,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Spacer(),
              _CardCopyButton(onPressed: widget.onCopy),
              _CompactIconButton(
                onPressed: () => setState(() => _expanded = !_expanded),
                icon: _expanded
                    ? Icons.expand_less_rounded
                    : Icons.expand_more_rounded,
              ),
            ],
          ),
          ClipRect(
            child: AnimatedSize(
              duration: _expandDuration,
              curve: Curves.easeInOut,
              child: _expanded
                  ? Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: _HighlightedText(
                        text: widget.item.summaryText,
                        query: widget.query,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontSize: 14,
                          height: 1.45,
                        ),
                      ),
                    )
                  : const SizedBox.shrink(),
            ),
          ),
        ],
      ),
    );
  }
}

class _FunctionCallCard extends StatefulWidget {
  const _FunctionCallCard({
    required this.item,
    required this.query,
    required this.isComplete,
    required this.onCopy,
  });

  final FunctionCallItem item;
  final String query;
  final bool isComplete;
  final VoidCallback onCopy;

  @override
  State<_FunctionCallCard> createState() => _FunctionCallCardState();
}

class _FunctionCallCardState extends State<_FunctionCallCard> {
  bool _expanded = true;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final argumentJson = const JsonEncoder.withIndent(
      '  ',
    ).convert(widget.item.arguments);

    return Column(
      children: <Widget>[
        _TimelineCardFrame(
          accentColor: _functionAccent,
          backgroundColor: _tintedSurface(theme, _functionAccent),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Row(
                          children: <Widget>[
                            const Icon(
                              Icons.functions_rounded,
                              color: _functionAccent,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _HighlightedText(
                                text: widget.item.name,
                                query: widget.query,
                                style: theme.textTheme.titleSmall?.copyWith(
                                  fontSize: 16,
                                  color: _functionAccent,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        _HighlightedText(
                          text: 'call_id: ${widget.item.callId}',
                          query: widget.query,
                          style: theme.textTheme.bodySmall?.copyWith(
                            fontSize: 12,
                            fontFamily: 'monospace',
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  _StatusDot(
                    color: widget.isComplete
                        ? _outputAccent
                        : const Color(0xFFEA580C),
                  ),
                  const SizedBox(width: 4),
                  _CardCopyButton(onPressed: widget.onCopy),
                ],
              ),
              const SizedBox(height: 12),
              InkWell(
                onTap: () => setState(() => _expanded = !_expanded),
                borderRadius: BorderRadius.circular(6),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    children: <Widget>[
                      Text(
                        'Arguments',
                        style: theme.textTheme.labelLarge?.copyWith(
                          color: _functionAccent,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Icon(
                        _expanded
                            ? Icons.expand_less_rounded
                            : Icons.expand_more_rounded,
                        color: _functionAccent,
                        size: 20,
                      ),
                    ],
                  ),
                ),
              ),
              ClipRect(
                child: AnimatedSize(
                  duration: _expandDuration,
                  curve: Curves.easeInOut,
                  child: _expanded
                      ? Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: _JsonBox(
                            text: argumentJson,
                            query: widget.query,
                            style: theme.textTheme.bodySmall?.copyWith(
                              fontSize: 13,
                              fontFamily: 'monospace',
                              height: 1.4,
                            ),
                          ),
                        )
                      : const SizedBox.shrink(),
                ),
              ),
            ],
          ),
        ),
        if (widget.isComplete)
          const Padding(
            padding: EdgeInsets.only(top: 8),
            child: _DashedConnectorLine(height: 24, color: _functionAccent),
          ),
      ],
    );
  }
}

class _FunctionCallOutputCard extends StatelessWidget {
  const _FunctionCallOutputCard({
    required this.item,
    required this.query,
    required this.onCopy,
  });

  final FunctionCallOutputItem item;
  final String query;
  final VoidCallback onCopy;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final outputJson = const JsonEncoder.withIndent(
      '  ',
    ).convert(item.parsedOutput);

    return Column(
      children: <Widget>[
        const _DashedConnectorLine(height: 24, color: _functionAccent),
        const SizedBox(height: 8),
        _TimelineCardFrame(
          accentColor: _outputAccent,
          backgroundColor: _tintedSurface(theme, _outputAccent),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                children: <Widget>[
                  const Icon(Icons.check_circle_rounded, color: _outputAccent),
                  const SizedBox(width: 8),
                  Text(
                    'Result',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontSize: 16,
                      color: _outputAccent,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const Spacer(),
                  _CardCopyButton(onPressed: onCopy),
                ],
              ),
              const SizedBox(height: 10),
              _JsonBox(
                text: outputJson,
                query: query,
                style: theme.textTheme.bodySmall?.copyWith(
                  fontSize: 13,
                  fontFamily: 'monospace',
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _MessageCard extends StatelessWidget {
  const _MessageCard({
    required this.item,
    required this.query,
    required this.onCopy,
  });

  final MessageItem item;
  final String query;
  final VoidCallback onCopy;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return _TimelineCardFrame(
      accentColor: _messageAccent,
      backgroundColor: theme.colorScheme.surface,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              _RoleBadge(role: item.role),
              const Spacer(),
              _CardCopyButton(onPressed: onCopy),
            ],
          ),
          const SizedBox(height: 10),
          _HighlightedText(
            text: item.text,
            query: query,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontSize: 14,
              height: 1.45,
            ),
          ),
        ],
      ),
    );
  }
}

class _UnknownItemCard extends StatelessWidget {
  const _UnknownItemCard({
    required this.raw,
    required this.query,
    required this.onCopy,
  });

  final Map<String, dynamic> raw;
  final String query;
  final VoidCallback onCopy;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final rawJson = const JsonEncoder.withIndent('  ').convert(raw);

    return _TimelineCardFrame(
      accentColor: _unknownAccent,
      backgroundColor: _tintedSurface(theme, _unknownAccent),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              const Icon(Icons.warning_amber_rounded, color: _unknownAccent),
              const SizedBox(width: 8),
              Text(
                'Unsupported Item Type',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontSize: 16,
                  color: _unknownAccent,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Spacer(),
              _CardCopyButton(onPressed: onCopy),
            ],
          ),
          const SizedBox(height: 10),
          _JsonBox(
            text: rawJson,
            query: query,
            style: theme.textTheme.bodySmall?.copyWith(
              fontSize: 13,
              fontFamily: 'monospace',
              height: 1.4,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Raw data preserved',
            style: theme.textTheme.bodySmall?.copyWith(
              fontSize: 12,
              color: theme.colorScheme.onSurfaceVariant,
              fontStyle: FontStyle.italic,
            ),
          ),
        ],
      ),
    );
  }
}

class _CorrelationPairCard extends StatelessWidget {
  const _CorrelationPairCard({required this.pair});

  final CorrelatedCall pair;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final complete = pair.isComplete;

    return Material(
      elevation: 1,
      color: theme.colorScheme.surface,
      borderRadius: BorderRadius.circular(8),
      shadowColor: Colors.black.withValues(alpha: 0.08),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: theme.colorScheme.outlineVariant),
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              pair.call.name,
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w700,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'call_id: ${pair.call.callId}',
              style: theme.textTheme.bodySmall?.copyWith(
                fontFamily: 'monospace',
                fontSize: 12,
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                color: complete
                    ? _tintedSurface(theme, _outputAccent)
                    : _tintedSurface(theme, const Color(0xFFEA580C)),
              ),
              child: Text(
                complete
                    ? 'Complete - output received'
                    : 'Incomplete - awaiting output',
                style: theme.textTheme.labelLarge?.copyWith(
                  color: complete ? _outputAccent : const Color(0xFFEA580C),
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Expanded(
                  child: _CorrelationColumn(
                    title: 'Arguments',
                    titleColor: _functionAccent,
                    child: _JsonBox(
                      text: const JsonEncoder.withIndent(
                        '  ',
                      ).convert(pair.call.arguments),
                      query: '',
                      style: theme.textTheme.bodySmall?.copyWith(
                        fontSize: 13,
                        fontFamily: 'monospace',
                        height: 1.4,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _CorrelationColumn(
                    title: 'Output',
                    titleColor: _outputAccent,
                    child: pair.output == null
                        ? Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              'Awaiting...',
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: theme.colorScheme.onSurfaceVariant,
                                fontStyle: FontStyle.italic,
                              ),
                            ),
                          )
                        : _JsonBox(
                            text: const JsonEncoder.withIndent(
                              '  ',
                            ).convert(pair.output!.parsedOutput),
                            query: '',
                            style: theme.textTheme.bodySmall?.copyWith(
                              fontSize: 13,
                              fontFamily: 'monospace',
                              height: 1.4,
                            ),
                          ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CorrelationColumn extends StatelessWidget {
  const _CorrelationColumn({
    required this.title,
    required this.titleColor,
    required this.child,
  });

  final String title;
  final Color titleColor;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          title,
          style: theme.textTheme.labelLarge?.copyWith(
            color: titleColor,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 8),
        child,
      ],
    );
  }
}

class _RoleBadge extends StatelessWidget {
  const _RoleBadge({required this.role});

  final String role;

  @override
  Widget build(BuildContext context) {
    final normalizedRole = role.toLowerCase();
    late final Color color;

    switch (normalizedRole) {
      case 'assistant':
        color = _functionAccent;
      case 'system':
        color = const Color(0xFFEA580C);
      case 'user':
      default:
        color = _messageAccent;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        color: color,
      ),
      child: Text(
        normalizedRole,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _TimelineCardFrame extends StatelessWidget {
  const _TimelineCardFrame({
    required this.accentColor,
    required this.backgroundColor,
    required this.child,
  });

  final Color accentColor;
  final Color backgroundColor;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Material(
      elevation: 1,
      color: backgroundColor,
      borderRadius: BorderRadius.circular(8),
      shadowColor: Colors.black.withValues(alpha: 0.08),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          border: Border(left: BorderSide(color: accentColor, width: 4)),
        ),
        padding: const EdgeInsets.all(16),
        child: child,
      ),
    );
  }
}

class _JsonBox extends StatelessWidget {
  const _JsonBox({
    required this.text,
    required this.query,
    required this.style,
  });

  final String text;
  final String query;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        color: theme.colorScheme.surfaceContainerHighest,
      ),
      padding: const EdgeInsets.all(10),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: _HighlightedText(
          text: text,
          query: query,
          style: style,
          softWrap: false,
        ),
      ),
    );
  }
}

class _StaggeredEntrance extends StatefulWidget {
  const _StaggeredEntrance({required this.delay, required this.child});

  final Duration delay;
  final Widget child;

  @override
  State<_StaggeredEntrance> createState() => _StaggeredEntranceState();
}

class _StaggeredEntranceState extends State<_StaggeredEntrance> {
  bool _visible = false;

  @override
  void initState() {
    super.initState();
    Future<void>.delayed(widget.delay, () {
      if (mounted) {
        setState(() {
          _visible = true;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedOpacity(
      opacity: _visible ? 1 : 0,
      duration: const Duration(milliseconds: 280),
      curve: Curves.easeOut,
      child: AnimatedSlide(
        offset: _visible ? Offset.zero : const Offset(0, 0.06),
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOut,
        child: widget.child,
      ),
    );
  }
}

class _DashedConnectorLine extends StatelessWidget {
  const _DashedConnectorLine({required this.height, required this.color});

  final double height;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height,
      child: Center(
        child: LayoutBuilder(
          builder: (_, constraints) {
            final dashCount = (constraints.maxHeight / 6).floor().clamp(1, 999);
            return Column(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: List<Widget>.generate(
                dashCount,
                (_) => Container(width: 2, height: 3, color: color),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _CenteredPlaceholder extends StatelessWidget {
  const _CenteredPlaceholder({required this.icon, required this.title});

  final IconData icon;
  final String title;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(icon, size: 52, color: theme.colorScheme.onSurfaceVariant),
            const SizedBox(height: 12),
            Text(
              title,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _GenUIBanner extends StatelessWidget {
  const _GenUIBanner({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: <Color>[
            Color(0xFF1D4ED8),
            Color(0xFF2563EB),
            Color(0xFF3B82F6),
          ],
        ),
      ),
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      child: Row(
        children: <Widget>[
          const Icon(Icons.dashboard_customize_rounded, color: Colors.white),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'This response contains a generated UI descriptor',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          TextButton(
            onPressed: onPressed,
            style: TextButton.styleFrom(
              foregroundColor: const Color(0xFF1D4ED8),
              backgroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            child: const Text('Preview UI'),
          ),
        ],
      ),
    );
  }
}

class _StatusDot extends StatelessWidget {
  const _StatusDot({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 12,
      height: 12,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
    );
  }
}

class _CardCopyButton extends StatelessWidget {
  const _CardCopyButton({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return _CompactIconButton(onPressed: onPressed, icon: Icons.copy_rounded);
  }
}

class _CompactIconButton extends StatelessWidget {
  const _CompactIconButton({required this.onPressed, required this.icon});

  final VoidCallback onPressed;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: onPressed,
      icon: Icon(icon, size: 18),
      constraints: const BoxConstraints.tightFor(width: 32, height: 32),
      visualDensity: VisualDensity.compact,
      padding: EdgeInsets.zero,
      splashRadius: 16,
    );
  }
}

class _HighlightedText extends StatelessWidget {
  const _HighlightedText({
    required this.text,
    required this.query,
    required this.style,
    this.softWrap = true,
  });

  final String text;
  final String query;
  final TextStyle? style;
  final bool softWrap;

  @override
  Widget build(BuildContext context) {
    final spans = _buildHighlightedSpans(
      text: text,
      query: query,
      style: style,
      brightness: Theme.of(context).brightness,
    );

    return RichText(
      text: TextSpan(style: style, children: spans),
      softWrap: softWrap,
      overflow: TextOverflow.clip,
    );
  }
}

List<TextSpan> _buildHighlightedSpans({
  required String text,
  required String query,
  required TextStyle? style,
  required Brightness brightness,
}) {
  if (query.isEmpty) {
    return <TextSpan>[TextSpan(text: text, style: style)];
  }

  final lowerText = text.toLowerCase();
  final lowerQuery = query.toLowerCase();
  var current = 0;
  final spans = <TextSpan>[];
  final highlight = brightness == Brightness.dark
      ? const Color(0xFFFDE047).withValues(alpha: 0.4)
      : const Color(0xFFFDE047).withValues(alpha: 0.7);

  while (true) {
    final index = lowerText.indexOf(lowerQuery, current);
    if (index < 0) {
      if (current < text.length) {
        spans.add(TextSpan(text: text.substring(current), style: style));
      }
      break;
    }

    if (index > current) {
      spans.add(TextSpan(text: text.substring(current, index), style: style));
    }

    spans.add(
      TextSpan(
        text: text.substring(index, index + query.length),
        style: (style ?? const TextStyle()).copyWith(
          backgroundColor: highlight,
        ),
      ),
    );

    current = index + query.length;
  }

  return spans;
}

List<TextSpan> _jsonSyntaxSpans(String source, ThemeData theme) {
  final spans = <TextSpan>[];
  final keyColor = theme.brightness == Brightness.dark
      ? const Color(0xFFA5B4FC)
      : const Color(0xFF93C5FD);
  final bracketColor = theme.brightness == Brightness.dark
      ? const Color(0xFFCBD5E1)
      : const Color(0xFFD1D5DB);
  const stringValueColor = Color(0xFF16A34A);
  const numberColor = Color(0xFFD97706);
  const boolColor = Color(0xFF2563EB);
  const nullColor = Color(0xFFDC2626);

  int index = 0;
  while (index < source.length) {
    final current = source[index];

    if (current == '"') {
      final start = index;
      index++;
      var escaped = false;

      while (index < source.length) {
        final char = source[index];
        if (escaped) {
          escaped = false;
          index++;
          continue;
        }
        if (char == r'\') {
          escaped = true;
          index++;
          continue;
        }
        if (char == '"') {
          index++;
          break;
        }
        index++;
      }

      final token = source.substring(start, index);
      var lookAhead = index;
      while (lookAhead < source.length && _isWhitespace(source[lookAhead])) {
        lookAhead++;
      }
      final isKey = lookAhead < source.length && source[lookAhead] == ':';

      spans.add(
        TextSpan(
          text: token,
          style: TextStyle(color: isKey ? keyColor : stringValueColor),
        ),
      );
      continue;
    }

    if (source.startsWith('true', index)) {
      spans.add(
        const TextSpan(
          text: 'true',
          style: TextStyle(color: boolColor),
        ),
      );
      index += 4;
      continue;
    }

    if (source.startsWith('false', index)) {
      spans.add(
        const TextSpan(
          text: 'false',
          style: TextStyle(color: boolColor),
        ),
      );
      index += 5;
      continue;
    }

    if (source.startsWith('null', index)) {
      spans.add(
        const TextSpan(
          text: 'null',
          style: TextStyle(color: nullColor),
        ),
      );
      index += 4;
      continue;
    }

    if (current == '-' || _isDigit(current)) {
      final start = index;
      index++;
      while (index < source.length) {
        final char = source[index];
        final isNumericChar =
            _isDigit(char) ||
            char == '.' ||
            char == 'e' ||
            char == 'E' ||
            char == '+' ||
            char == '-';
        if (!isNumericChar) {
          break;
        }
        index++;
      }

      spans.add(
        TextSpan(
          text: source.substring(start, index),
          style: const TextStyle(color: numberColor),
        ),
      );
      continue;
    }

    if ('{}[]'.contains(current)) {
      spans.add(
        TextSpan(
          text: current,
          style: TextStyle(color: bracketColor),
        ),
      );
      index++;
      continue;
    }

    if (':,'.contains(current)) {
      spans.add(
        TextSpan(
          text: current,
          style: TextStyle(color: bracketColor),
        ),
      );
      index++;
      continue;
    }

    spans.add(TextSpan(text: current));
    index++;
  }

  return spans;
}

List<InlineSpan> _buildLineNumberedJsonSpans(String source, ThemeData theme) {
  final spans = <InlineSpan>[];
  final lines = source.split('\n');
  final lineNumberColor = const Color(0xFF6AA84F);

  for (var i = 0; i < lines.length; i++) {
    final number = (i + 1).toString().padLeft(3, ' ');
    spans.add(
      TextSpan(
        text: '$number  ',
        style: const TextStyle(
          color: Color(0xFF6AA84F),
          fontFamily: 'monospace',
          fontWeight: FontWeight.w600,
        ),
      ),
    );
    spans.addAll(_jsonSyntaxSpans(lines[i], theme));
    if (i != lines.length - 1) {
      spans.add(
        TextSpan(
          text: '\n',
          style: TextStyle(color: lineNumberColor),
        ),
      );
    }
  }

  return spans;
}

bool _isWhitespace(String value) {
  return value == ' ' || value == '\n' || value == '\r' || value == '\t';
}

bool _isDigit(String value) {
  final code = value.codeUnitAt(0);
  return code >= 48 && code <= 57;
}

String _formatTokens(int value) {
  if (value == 0) {
    return '0';
  }
  if (value < 0) {
    return '-${_formatTokens(-value)}';
  }

  final digits = value.toString();
  final chunks = <String>[];

  for (var i = digits.length; i > 0; i -= 3) {
    final start = (i - 3).clamp(0, i);
    chunks.insert(0, digits.substring(start, i));
  }

  return chunks.join(',');
}

Color _statusColor(String status) {
  switch (status.toLowerCase()) {
    case 'completed':
      return const Color(0xFF16A34A);
    case 'in_progress':
      return const Color(0xFFEA580C);
    case 'failed':
      return const Color(0xFFDC2626);
    default:
      return const Color(0xFF6B7280);
  }
}

Color _tintedSurface(ThemeData theme, Color accent) {
  final opacity = theme.brightness == Brightness.dark ? 0.22 : 0.09;
  return Color.alphaBlend(
    accent.withValues(alpha: opacity),
    theme.colorScheme.surface,
  );
}
