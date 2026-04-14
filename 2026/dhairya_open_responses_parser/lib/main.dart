import 'package:flutter/material.dart';
import 'package:open_responses_parser/open_responses_parser.dart';

void main() {
  runApp(const GenUIDemo());
}

// Full sample A2UI payload from the proposal — including the unknown fallback.
const _samplePayload = {
  'type': 'screen',
  'version': '0.1.0',
  'agent': 'weather-dashboard-agent',
  'title': 'Weather Comparison Dashboard',
  'description': 'Live weather data for selected cities',
  'components': [
    {
      'type': 'text',
      'id': 'heading_001',
      'content': 'Tokyo, Japan',
      'style': 'heading',
    },
    {
      'type': 'text',
      'id': 'temp_001',
      'content': 'Temperature: 22°C',
      'style': 'body',
    },
    {'type': 'divider', 'id': 'div_001'},
    {
      'type': 'text',
      'id': 'heading_002',
      'content': 'London, UK',
      'style': 'heading',
    },
    {
      'type': 'text',
      'id': 'temp_002',
      'content': 'Temperature: 14°C',
      'style': 'body',
    },
    {'type': 'divider', 'id': 'div_002'},
    {
      'type': 'table',
      'id': 'comparison_table',
      'headers': ['Metric', 'Tokyo', 'London'],
      'rows': [
        ['Temperature', '22°C', '14°C'],
        ['Humidity', '65%', '78%'],
        ['Condition', 'Partly cloudy', 'Overcast'],
      ],
    },
    {
      'type': 'button',
      'id': 'btn_001',
      'label': 'Refresh Data',
      'variant': 'primary',
    },
    {
      'type': 'card',
      'id': 'card_001',
      'title': 'Summary',
      'children': [
        {
          'type': 'text',
          'id': 'summary_text',
          'content': 'Tokyo is warmer and less humid than London today.',
          'style': 'body',
        },
      ],
    },
    {
      'type': 'input',
      'id': 'input_001',
      'label': 'Add a city',
      'placeholder': 'Enter city name',
    },
    {
      'type': 'unknown_future_component',
      'id': 'unknown_001',
      'data': 'some data',
    },
  ],
};

class GenUIDemo extends StatelessWidget {
  const GenUIDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'GenUI Renderer — API Dash POC',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF6366F1),
          brightness: Brightness.light,
        ),
        useMaterial3: true,
      ),
      darkTheme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF6366F1),
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      home: const _DemoPage(),
    );
  }
}

class _DemoPage extends StatelessWidget {
  const _DemoPage();

  @override
  Widget build(BuildContext context) {
    final descriptor = GenUIDescriptor.fromJson(
      Map<String, dynamic>.from(_samplePayload),
    );
    final registry = GenUIComponentRegistry.defaultRegistry();

    return Scaffold(
      appBar: AppBar(
        title: const Text('GenUI Renderer MVP'),
        centerTitle: false,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Chip(
              label: const Text('GSoC 2026 · API Dash'),
              avatar: const Icon(Icons.rocket_launch_rounded, size: 16),
              visualDensity: VisualDensity.compact,
            ),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Live preview — rendered from A2UI JSON descriptor',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: GenUIPreviewPanel(
                descriptor: descriptor,
                registry: registry,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
