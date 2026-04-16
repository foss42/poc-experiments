import 'package:flutter/material.dart';

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
// Three top-level demos accessible via a NavigationRail:
//   1. Paste & Explore   — paste any JSON / SSE and explore offline
//   2. JSON Dashboard    — pre-loaded agentic response (JSON)
//   3. SSE Debugger      — pre-loaded streaming response
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
            child: switch (_index) {
              0 => const OpenResponsesExplorer(),
              _ => const _AboutPage(),
            },
          ),
        ],
      ),
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
