import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'models/a2ui.dart';
import 'widgets/a2ui_renderer.dart';
import 'widgets/open_responses_explorer.dart';

void main() {
  runApp(const OpenResponsesDemoApp());
}

class OpenResponsesDemoApp extends StatelessWidget {
  const OpenResponsesDemoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Open Responses Dashboard',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF5C6BC0),
          brightness: Brightness.light,
        ),
        useMaterial3: true,
      ),
      darkTheme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF5C6BC0),
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      home: const _DemoShell(),
    );
  }
}

// ---------------------------------------------------------------------------
// Demo shell
//
// Three sections accessible via a NavigationRail:
//   1. Explore     — paste any JSON / SSE payload and explore offline
//   2. GenUI       — A2UI JSONL playground with 3 built-in samples + custom
//   3. About       — feature cards and parser coverage table
// ---------------------------------------------------------------------------

class _DemoShell extends StatefulWidget {
  const _DemoShell();

  @override
  State<_DemoShell> createState() => _DemoShellState();
}

class _DemoShellState extends State<_DemoShell> {
  int _index = 0;

  static const _destinations = [
    NavigationRailDestination(
      icon: Icon(Icons.search_rounded),
      label: Text('Explore'),
    ),
    NavigationRailDestination(
      icon: Icon(Icons.widgets_outlined),
      label: Text('GenUI'),
    ),
    NavigationRailDestination(
      icon: Icon(Icons.info_outline_rounded),
      label: Text('About'),
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: Row(
        children: [
          // Side rail
          NavigationRail(
            selectedIndex: _index,
            onDestinationSelected: (i) => setState(() => _index = i),
            labelType: NavigationRailLabelType.all,
            destinations: _destinations,
            leading: Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Column(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primary,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(Icons.api_rounded,
                        size: 20, color: theme.colorScheme.onPrimary),
                  ),
                ],
              ),
            ),
          ),
          VerticalDivider(width: 1, color: theme.colorScheme.outlineVariant),
          // Main content
          Expanded(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 220),
              transitionBuilder: (child, animation) => FadeTransition(
                opacity: CurvedAnimation(
                    parent: animation, curve: Curves.easeInOut),
                child: child,
              ),
              child: KeyedSubtree(
                key: ValueKey(_index),
                child: switch (_index) {
                  0 => const OpenResponsesExplorer(),
                  1 => const _GenUIPlayground(),
                  _ => const _AboutPage(),
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Built-in A2UI JSONL samples
// ---------------------------------------------------------------------------

const _kSampleDashboard = '{"createSurface":{"id":"s1","title":"Sales Dashboard"}}\n'
    '{"updateComponents":{"components":['
    '{"id":"root","component":"Column","children":["header","sp1","stats_row","div1","tbl_title","sales_table"]},'
    '{"id":"header","component":"Row","justify":"spaceBetween","children":["title_text","live_badge"]},'
    '{"id":"title_text","component":"Text","text":"Sales Dashboard","variant":"h2"},'
    '{"id":"live_badge","component":"Badge","label":"Live","color":"green"},'
    '{"id":"sp1","component":"Spacer"},'
    '{"id":"stats_row","component":"Wrap","spacing":12,"children":["stat1","stat2","stat3"]},'
    '{"id":"stat1","component":"Card","children":["s1v","s1l"]},'
    r'{"id":"s1v","component":"Text","text":{"path":"/revenue"},"variant":"h2"},'
    '{"id":"s1l","component":"Text","text":"Total Revenue","variant":"caption"},'
    '{"id":"stat2","component":"Card","children":["s2v","s2l"]},'
    r'{"id":"s2v","component":"Text","text":{"path":"/orders"},"variant":"h2"},'
    '{"id":"s2l","component":"Text","text":"Orders","variant":"caption"},'
    '{"id":"stat3","component":"Card","children":["s3v","s3l"]},'
    r'{"id":"s3v","component":"Text","text":{"path":"/conversion"},"variant":"h2"},'
    '{"id":"s3l","component":"Text","text":"Conversion Rate","variant":"caption"},'
    '{"id":"div1","component":"Divider"},'
    '{"id":"tbl_title","component":"Text","text":"Recent Orders","variant":"h3"},'
    '{"id":"sales_table","component":"Table","headers":["Order ID","Customer","Amount","Status"],'
    '"rows":[["#1042","Alice Chen","\$240","Shipped"],["#1041","Bob Kumar","\$180","Processing"],'
    '["#1040","Carol Smith","\$320","Delivered"],["#1039","Dan Park","\$95","Refunded"]]}'
    ']}}\n'
    '{"updateDataModel":{"path":"/revenue","value":"\$12,450"}}\n'
    '{"updateDataModel":{"path":"/orders","value":"342"}}\n'
    '{"updateDataModel":{"path":"/conversion","value":"3.2%"}}';

const _kSampleApiConfig = '{"createSurface":{"id":"s2","title":"API Configuration"}}\n'
    '{"updateComponents":{"components":['
    '{"id":"root","component":"Column","children":["form_title","sp1","model_field","sp2","temp_slider","stream_sw","sp3","fmt_drop","sp4","info_alert","sp5","submit_btn"]},'
    '{"id":"form_title","component":"Text","text":"API Configuration","variant":"h2"},'
    '{"id":"sp1","component":"Spacer"},'
    '{"id":"model_field","component":"TextField","label":"Model","hint":"e.g. gpt-4o"},'
    '{"id":"sp2","component":"Spacer"},'
    '{"id":"temp_slider","component":"Slider","id":"temperature","label":"Temperature","min":0,"max":2,"value":0.7},'
    '{"id":"stream_sw","component":"Switch","id":"streaming","label":"Enable Streaming","value":true},'
    '{"id":"sp3","component":"Spacer"},'
    '{"id":"fmt_drop","component":"Dropdown","id":"format","label":"Response Format","options":["text","json","json_schema"],"value":"text"},'
    '{"id":"sp4","component":"Spacer"},'
    '{"id":"info_alert","component":"Alert","severity":"info","message":"Changes apply to the next API request sent from APIDash."},'
    '{"id":"sp5","component":"Spacer"},'
    '{"id":"submit_btn","component":"Button","text":"Save Configuration","variant":"primary","action":"save_config"}'
    ']}}';

const _kSampleCodeReview = '{"createSurface":{"id":"s3","title":"Code Review"}}\n'
    '{"updateComponents":{"components":['
    '{"id":"root","component":"Column","children":["review_title","score_row","sp1","issues_title","issues_wrap","sp2","code_title","code_block","sp3","suggest_title","suggest_alert","sp4","action_row"]},'
    '{"id":"review_title","component":"Text","text":"Code Review Results","variant":"h2"},'
    '{"id":"score_row","component":"Row","justify":"start","children":["score_lbl","score_badge"]},'
    '{"id":"score_lbl","component":"Text","text":"Quality Score: ","variant":"body"},'
    '{"id":"score_badge","component":"Badge","label":"B+","color":"blue"},'
    '{"id":"sp1","component":"Spacer"},'
    '{"id":"issues_title","component":"Text","text":"Issues Found","variant":"h3"},'
    '{"id":"issues_wrap","component":"Wrap","spacing":8,"children":["iss1","iss2","iss3"]},'
    '{"id":"iss1","component":"Chip","label":"Missing error handling"},'
    '{"id":"iss2","component":"Chip","label":"Unused import"},'
    r'{"id":"iss3","component":"Chip","label":"Magic number (3.14159)"},'
    '{"id":"sp2","component":"Spacer"},'
    '{"id":"code_title","component":"Text","text":"Flagged Snippet","variant":"h3"},'
    r'{"id":"code_block","component":"CodeBlock","language":"dart","code":"double result = value / 3.14159;\nif (result != null) {\n  process(result);\n}"},'
    '{"id":"sp3","component":"Spacer"},'
    '{"id":"suggest_title","component":"Text","text":"Suggestion","variant":"h3"},'
    '{"id":"suggest_alert","component":"Alert","severity":"warning","message":"Extract 3.14159 into a named constant (pi). The null check on a non-nullable double is always false in null-safe Dart."},'
    '{"id":"sp4","component":"Spacer"},'
    '{"id":"action_row","component":"Row","justify":"start","children":["fix_btn","ignore_btn"]},'
    '{"id":"fix_btn","component":"Button","text":"Apply Fix","variant":"primary","action":"apply_fix"},'
    '{"id":"ignore_btn","component":"Button","text":"Ignore","variant":"text","action":"ignore"}'
    ']}}';

// ---------------------------------------------------------------------------
// GenUI Playground
// ---------------------------------------------------------------------------

class _GenUIPlayground extends StatefulWidget {
  const _GenUIPlayground();

  @override
  State<_GenUIPlayground> createState() => _GenUIPlaygroundState();
}

class _GenUIPlaygroundState extends State<_GenUIPlayground> {
  static const _samples = [
    ('Sales Dashboard', _kSampleDashboard),
    ('API Config Form', _kSampleApiConfig),
    ('Code Review', _kSampleCodeReview),
    ('Custom', ''),
  ];

  int _selectedSample = 0;
  bool _showSource = false;
  bool _inspectMode = false;
  final List<({String type, String id})> _diagnostics = [];
  late final TextEditingController _customCtrl;

  @override
  void initState() {
    super.initState();
    _customCtrl = TextEditingController();
  }

  @override
  void dispose() {
    _customCtrl.dispose();
    super.dispose();
  }

  String get _activeJsonl {
    if (_selectedSample < _samples.length - 1) {
      return _samples[_selectedSample].$2;
    }
    return _customCtrl.text;
  }

  void _handleDiagnostic(String type, String id) {
    if (_diagnostics.any((d) => d.type == type && d.id == id)) return;
    setState(() => _diagnostics.add((type: type, id: id)));
  }

  void _resetDiagnostics() => _diagnostics.clear();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final parsed = A2UIParser.parse(_activeJsonl);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Header bar ────────────────────────────────────────────────────
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerLow,
            border: Border(
                bottom:
                    BorderSide(color: theme.colorScheme.outlineVariant)),
          ),
          child: Row(
            children: [
              Icon(Icons.widgets_outlined,
                  size: 20, color: theme.colorScheme.primary),
              const SizedBox(width: 8),
              Text(
                'Generative UI Playground',
                style: theme.textTheme.titleMedium
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(width: 4),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  'A2UI',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: theme.colorScheme.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const Spacer(),
              // Inspect mode toggle
              if (_selectedSample < _samples.length - 1 && !_showSource)
                Tooltip(
                  message: _inspectMode
                      ? 'Exit inspect mode'
                      : 'Inspect mode — tap any widget to see its JSON',
                  child: TextButton.icon(
                    onPressed: () => setState(() {
                      _inspectMode = !_inspectMode;
                      _resetDiagnostics();
                    }),
                    icon: Icon(_inspectMode
                        ? Icons.search_off_rounded
                        : Icons.manage_search_rounded),
                    label: Text(_inspectMode ? 'Inspecting' : 'Inspect'),
                    style: TextButton.styleFrom(
                      visualDensity: VisualDensity.compact,
                      foregroundColor: _inspectMode
                          ? theme.colorScheme.primary
                          : null,
                    ),
                  ),
                ),
              const SizedBox(width: 4),
              // Show source toggle
              TextButton.icon(
                onPressed: () => setState(() {
                  _showSource = !_showSource;
                  if (_showSource) _inspectMode = false;
                }),
                icon: Icon(_showSource
                    ? Icons.visibility_off_outlined
                    : Icons.code_rounded),
                label: Text(_showSource ? 'Hide JSONL' : 'View JSONL'),
                style: TextButton.styleFrom(
                    visualDensity: VisualDensity.compact),
              ),
            ],
          ),
        ),

        // ── Sample selector ───────────────────────────────────────────────
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          color: theme.colorScheme.surface,
          child: Row(
            children: [
              Text('Sample:',
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: theme.colorScheme.outline)),
              const SizedBox(width: 10),
              Wrap(
                spacing: 6,
                children: List.generate(_samples.length, (i) {
                  final selected = _selectedSample == i;
                  return ChoiceChip(
                    label: Text(_samples[i].$1),
                    selected: selected,
                    onSelected: (_) => setState(() {
                      _selectedSample = i;
                      _inspectMode = false;
                      _resetDiagnostics();
                      if (i < _samples.length - 1) _showSource = false;
                    }),
                    visualDensity: VisualDensity.compact,
                  );
                }),
              ),
            ],
          ),
        ),

        // ── Inspect mode hint banner ──────────────────────────────────────
        if (_inspectMode)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 7),
            color: theme.colorScheme.primaryContainer.withValues(alpha: 0.5),
            child: Row(
              children: [
                Icon(Icons.touch_app_rounded,
                    size: 15, color: theme.colorScheme.primary),
                const SizedBox(width: 6),
                Text(
                  'Tap any widget to inspect its component definition',
                  style: theme.textTheme.labelSmall?.copyWith(
                      color: theme.colorScheme.primary),
                ),
              ],
            ),
          ),

        // ── Diagnostics banner ────────────────────────────────────────────
        if (_diagnostics.isNotEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 7),
            color: theme.colorScheme.errorContainer.withValues(alpha: 0.35),
            child: Row(
              children: [
                Icon(Icons.warning_amber_rounded,
                    size: 15, color: theme.colorScheme.error),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'Unknown components: ${_diagnostics.map((d) => d.type).toSet().join(", ")}',
                    style: theme.textTheme.labelSmall
                        ?.copyWith(color: theme.colorScheme.error),
                  ),
                ),
                InkWell(
                  onTap: () => setState(_resetDiagnostics),
                  child: Icon(Icons.close_rounded,
                      size: 14, color: theme.colorScheme.error),
                ),
              ],
            ),
          ),

        // ── Content ───────────────────────────────────────────────────────
        Expanded(
          child: _selectedSample == _samples.length - 1
              ? _CustomPane(
                  controller: _customCtrl,
                  parsed: parsed,
                  inspectMode: _inspectMode,
                  onDiagnostic: _handleDiagnostic,
                  onChanged: () => setState(() {}),
                )
              : _showSource
                  ? _SourcePane(
                      jsonl: _activeJsonl,
                      surfaceTitle: parsed?.surfaceTitle,
                    )
                  : _RenderPane(
                      parsed: parsed,
                      inspectMode: _inspectMode,
                      onDiagnostic: _handleDiagnostic,
                    ),
        ),
      ],
    );
  }
}

// ── Render pane ─────────────────────────────────────────────────────────────

class _RenderPane extends StatelessWidget {
  const _RenderPane({
    required this.parsed,
    this.inspectMode = false,
    this.onDiagnostic,
  });

  final ({
    Map<String, dynamic> components,
    Map<String, dynamic> dataModel,
    String? surfaceTitle,
  })? parsed;
  final bool inspectMode;
  final void Function(String type, String id)? onDiagnostic;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (parsed == null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.widgets_outlined,
                size: 48,
                color: theme.colorScheme.outline.withValues(alpha: 0.4)),
            const SizedBox(height: 12),
            Text(
              'No renderable A2UI payload',
              style: theme.textTheme.bodyMedium
                  ?.copyWith(color: theme.colorScheme.outline),
            ),
          ],
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (parsed!.surfaceTitle != null) ...[
            Row(
              children: [
                Icon(Icons.crop_square_rounded,
                    size: 16, color: theme.colorScheme.primary),
                const SizedBox(width: 6),
                Text(
                  parsed!.surfaceTitle!,
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: theme.colorScheme.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
          ],
          A2UIRenderer(
            components: parsed!.components,
            dataModel: parsed!.dataModel,
            inspectMode: inspectMode,
            onDiagnostic: onDiagnostic,
          ),
        ],
      ),
    );
  }
}

// ── Source pane ──────────────────────────────────────────────────────────────

class _SourcePane extends StatelessWidget {
  const _SourcePane({required this.jsonl, this.surfaceTitle});
  final String jsonl;
  final String? surfaceTitle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
          child: Row(
            children: [
              Text(
                'Raw A2UI JSONL${surfaceTitle != null ? " — $surfaceTitle" : ""}',
                style: theme.textTheme.labelMedium?.copyWith(
                    color: theme.colorScheme.outline),
              ),
              const Spacer(),
              TextButton.icon(
                onPressed: () => Clipboard.setData(
                    ClipboardData(text: jsonl)),
                icon: const Icon(Icons.copy_rounded, size: 16),
                label: const Text('Copy'),
                style: TextButton.styleFrom(
                    visualDensity: VisualDensity.compact),
              ),
            ],
          ),
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(8),
              ),
              child: SingleChildScrollView(
                child: SelectableText(
                  jsonl.trim(),
                  style: const TextStyle(
                      fontFamily: 'monospace', fontSize: 12, height: 1.6),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

// ── Custom paste pane ────────────────────────────────────────────────────────

class _CustomPane extends StatelessWidget {
  const _CustomPane({
    required this.controller,
    required this.parsed,
    required this.onChanged,
    this.inspectMode = false,
    this.onDiagnostic,
  });

  final TextEditingController controller;
  final ({
    Map<String, dynamic> components,
    Map<String, dynamic> dataModel,
    String? surfaceTitle,
  })? parsed;
  final VoidCallback onChanged;
  final bool inspectMode;
  final void Function(String type, String id)? onDiagnostic;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Left: paste area
        SizedBox(
          width: 400,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: Text(
                  'Paste A2UI JSONL',
                  style: theme.textTheme.labelMedium?.copyWith(
                      color: theme.colorScheme.outline),
                ),
              ),
              Expanded(
                child: Padding(
                  padding:
                      const EdgeInsets.fromLTRB(16, 0, 8, 16),
                  child: TextField(
                    controller: controller,
                    onChanged: (_) => onChanged(),
                    maxLines: null,
                    expands: true,
                    textAlignVertical: TextAlignVertical.top,
                    style: const TextStyle(
                        fontFamily: 'monospace', fontSize: 12),
                    decoration: InputDecoration(
                      hintText:
                          '{"createSurface":{"id":"s","title":"My UI"}}\n{"updateComponents":{"components":[...]}}',
                      hintStyle: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.outline
                              .withValues(alpha: 0.6)),
                      border: const OutlineInputBorder(),
                      contentPadding: const EdgeInsets.all(12),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),

        VerticalDivider(
            width: 1, color: theme.colorScheme.outlineVariant),

        // Right: live render
        Expanded(
          child: _RenderPane(
            parsed: parsed,
            inspectMode: inspectMode,
            onDiagnostic: onDiagnostic,
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// About page
// ---------------------------------------------------------------------------

class _AboutPage extends StatelessWidget {
  const _AboutPage();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.api_rounded,
                    size: 28, color: theme.colorScheme.primary),
              ),
              const SizedBox(width: 16),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'APIDash — Open Responses Dashboard',
                    style: theme.textTheme.titleLarge
                        ?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  Text(
                    'GSoC 2026 Idea 5: Open Responses & Generative UI',
                    style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.outline),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 32),
          _FeatureCard(
            icon: Icons.list_alt_rounded,
            color: theme.colorScheme.primary,
            title: 'Output Viewer',
            description:
                'Rich rendering of all Open Responses output item types: messages (with markdown), reasoning (collapsible), tool calls (expandable with args + result), web/file search, image generation, code interpreter, and computer use. Per-item JSON inspector via bottom sheet.',
          ),
          const SizedBox(height: 12),
          _FeatureCard(
            icon: Icons.rule_rounded,
            color: theme.colorScheme.secondary,
            title: 'AI Response Assertions',
            description:
                '13 assertion types covering structural checks (has message, reasoning, tool calls), content checks (message contains, refusals), behavioral checks (all tool calls completed, specific tool called), and cost checks (output/total tokens under limit). One-click "Export Test" generates a copy-pasteable Dart test snippet.',
          ),
          const SizedBox(height: 12),
          _FeatureCard(
            icon: Icons.analytics_outlined,
            color: theme.colorScheme.tertiary,
            title: 'Response Analytics',
            description:
                'Response metadata (status, model, ID), output item breakdown chips, tool calls pass/fail table, stacked token usage bar (input vs output), and conversation chain detection with previous_response_id linkage.',
          ),
          const SizedBox(height: 12),
          _FeatureCard(
            icon: Icons.stream_rounded,
            color: Colors.orange.shade600,
            title: 'SSE Stream Debugger',
            description:
                'Event-by-event replay of real Open Responses SSE streams captured by APIDash. Play/pause/step/scrub controls, speed selector (0.5x–4x), color-coded event timeline with jump-to-event, and a live render panel that shows the partial response at each step.',
          ),
          const SizedBox(height: 12),
          _FeatureCard(
            icon: Icons.search_rounded,
            color: Colors.green.shade600,
            title: 'Paste & Explore',
            description:
                'Debug any Open Responses payload offline. Paste a JSON object or raw SSE transcript, and the app auto-detects the format and routes it to the right viewer. Three built-in samples (agentic JSON, SSE stream, chained conversation) let you explore the feature without a live server.',
          ),
          const SizedBox(height: 12),
          _FeatureCard(
            icon: Icons.widgets_outlined,
            color: Colors.deepPurple,
            title: 'Generative UI (A2UI)',
            description:
                'Renders Agent-to-UI JSONL payloads into live Flutter widgets. Supports 28 component types including Text, Button, Card, Table, Tabs, TextField, Checkbox, Switch, Slider, Dropdown, Badge, Alert, CodeBlock, and more. Data-model bindings let the AI inject values at runtime. Includes a playground with built-in samples and a live custom-paste editor.',
          ),
          const SizedBox(height: 32),
          Text(
            'Parser Coverage',
            style: theme.textTheme.titleMedium
                ?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 12),
          _ParserCoverageTable(),
        ],
      ),
    );
  }
}

class _FeatureCard extends StatelessWidget {
  const _FeatureCard({
    required this.icon,
    required this.color,
    required this.title,
    required this.description,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        border: Border.all(color: theme.colorScheme.outlineVariant),
        borderRadius: const BorderRadius.all(Radius.circular(12)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 20, color: color),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: theme.textTheme.titleSmall
                        ?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text(description,
                    style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurface
                            .withValues(alpha: 0.75))),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ParserCoverageTable extends StatelessWidget {
  _ParserCoverageTable();

  final _rows = const [
    ('message', 'text, input_text, refusal, output_image, input_image'),
    ('function_call', 'name, call_id, arguments, status'),
    ('function_call_output', 'call_id, output (JSON or plain text)'),
    ('reasoning', 'summary[], content (expandable)'),
    ('web_search_call', 'status'),
    ('file_search_call', 'queries[], status'),
    ('image_generation_call', 'result (base64 PNG), status'),
    ('code_interpreter_call', 'code, outputs (logs/image/file), status'),
    ('computer_use_preview', 'action (type, coordinates), status'),
    ('OutputTextPart annotations', 'url_citation, file_citation, file_path'),
    ('SSE events', 'created, item.added/done, text.delta/done, reasoning.delta/done, fn_args.delta/done, completed, failed, incomplete'),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: theme.colorScheme.outlineVariant),
        borderRadius: const BorderRadius.all(Radius.circular(8)),
      ),
      child: Column(
        children: List.generate(_rows.length, (i) {
          final (type, details) = _rows[i];
          final isLast = i == _rows.length - 1;
          return Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              border: isLast
                  ? null
                  : Border(
                      bottom: BorderSide(
                          color: theme.colorScheme.outlineVariant)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 200,
                  child: Text(
                    type,
                    style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Text(
                    details,
                    style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurface
                            .withValues(alpha: 0.7)),
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
