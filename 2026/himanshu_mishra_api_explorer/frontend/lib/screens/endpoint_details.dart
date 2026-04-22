import 'dart:convert';
import 'package:flutter/material.dart';

import '../models/api_template.dart';

class EndpointDetailsScreen extends StatelessWidget {
  final ApiTemplate template;
  final ApiEndpoint endpoint;

  const EndpointDetailsScreen(
      {super.key, required this.template, required this.endpoint});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildUrlBar(context),
          const SizedBox(height: 16),
          _buildSummary(context),
          const Divider(height: 32),
          Expanded(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(child: _buildRequestPane(context)),
                const VerticalDivider(width: 32, thickness: 1),
                Expanded(child: _buildResponsePane(context)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUrlBar(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: Theme.of(context).colorScheme.outline),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: const BoxDecoration(
              border: Border(right: BorderSide(color: Colors.grey)),
            ),
            child: Text(
              endpoint.method.toUpperCase(),
              style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: _methodColor(endpoint.method)),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: SelectableText(
              (() {
                final base = template.baseUrl.endsWith('/')
                    ? template.baseUrl.substring(0, template.baseUrl.length - 1)
                    : template.baseUrl;
                final path = endpoint.path.startsWith('/')
                    ? endpoint.path
                    : '/${endpoint.path}';
                return '$base$path';
              })(),
              style: const TextStyle(fontFamily: 'monospace', fontSize: 13),
            ),
          ),
          ElevatedButton(
            onPressed: () {},
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(2)),
            ),
            child: const Text('Send'),
          ),
        ],
      ),
    );
  }

  Widget _buildSummary(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (endpoint.summary.isNotEmpty)
          Text(endpoint.summary,
              style:
                  const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        const SizedBox(height: 12),
        Row(
          children: [
            if (endpoint.authRequired.isNotEmpty) ...[
              const Icon(Icons.lock, size: 14, color: Colors.orange),
              const SizedBox(width: 4),
              const Text('Auth Required',
                  style: TextStyle(color: Colors.orange, fontSize: 12)),
            ] else ...[
              const Icon(Icons.lock_open, size: 14, color: Colors.green),
              const SizedBox(width: 4),
              const Text('Public Endpoint',
                  style: TextStyle(color: Colors.green, fontSize: 12)),
            ],
            const SizedBox(width: 16),
            const Text('Security:',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
            const SizedBox(width: 4),
            Text(
                endpoint.authRequired.isNotEmpty
                    ? endpoint.authRequired.join(', ')
                    : 'None',
                style: const TextStyle(fontSize: 12, fontFamily: 'monospace')),
          ],
        ),
      ],
    );
  }

  Widget _buildRequestPane(BuildContext context) {
    return DefaultTabController(
      length: 4,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const TabBar(
            labelColor: Colors.blueAccent,
            unselectedLabelColor: Colors.grey,
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: [
              Tab(text: "Params"),
              Tab(text: "Headers"),
              Tab(text: "Body"),
              Tab(text: "Auth"),
            ],
          ),
          const SizedBox(height: 8),
          Expanded(
            child: TabBarView(
              children: [
                _buildParamsTable(context),
                _buildHeadersTable(context),
                _buildBodyViewer(context, endpoint.requestBodySample),
                const Center(
                    child: Text("Inherits from parent (Global Auth Method)")),
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _buildParamsTable(BuildContext context) {
    final params = endpoint.parameters;
    final allParamsList = [
      ...params.pathVariables.map((e) =>
          {'name': e.name, 'type': e.type, 'req': e.required, 'in': 'path'}),
      ...params.queryParameters.map((e) =>
          {'name': e.name, 'type': e.type, 'req': e.required, 'in': 'query'})
    ];

    if (allParamsList.isEmpty)
      return const Center(child: Text('No parameters'));

    return ListView(
      children: allParamsList.map((p) {
        return _buildTableRow(
          context,
          p['name'] as String,
          p['type'] as String,
          p['req'] as bool,
          p['in'] as String,
        );
      }).toList(),
    );
  }

  Widget _buildHeadersTable(BuildContext context) {
    final headers = endpoint.parameters.headers;
    if (headers.isEmpty) return const Center(child: Text('No headers'));
    return ListView(
      children: headers.map((p) {
        return _buildTableRow(context, p.name, p.type, p.required, 'header');
      }).toList(),
    );
  }

  Widget _buildTableRow(BuildContext context, String name, String type,
      bool isRequired, String location) {
    return Container(
      decoration: BoxDecoration(
          border: Border(
              bottom: BorderSide(color: Theme.of(context).dividerColor))),
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Checkbox(value: true, onChanged: (v) {}),
          Expanded(
            flex: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name,
                    style: const TextStyle(
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.bold,
                        fontSize: 13)),
                Text(location.toUpperCase(),
                    style: const TextStyle(fontSize: 10, color: Colors.grey)),
              ],
            ),
          ),
          Expanded(
            flex: 3,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (isRequired)
                  const Text('REQUIRED',
                      style: TextStyle(color: Colors.red, fontSize: 10)),
                Text(type,
                    style: const TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 11,
                        color: Colors.black54)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBodyViewer(BuildContext context, dynamic sample) {
    if (sample == null ||
        (sample is Map && sample.isEmpty) ||
        (sample is String && sample.isEmpty)) {
      return const Center(child: Text('No Request Body'));
    }

    final jsonText = sample is String
        ? sample
        : const JsonEncoder.withIndent('  ').convert(sample);
    return Container(
      padding: const EdgeInsets.all(8),
      color: Theme.of(context)
          .colorScheme
          .surfaceContainerHighest
          .withValues(alpha: 0.3),
      child: SelectableText(jsonText,
          style: const TextStyle(fontFamily: 'monospace', fontSize: 13)),
    );
  }

  Widget _buildResponsePane(BuildContext context) {
    if (endpoint.responseBodySample == null ||
        (endpoint.responseBodySample is Map &&
            (endpoint.responseBodySample as Map).isEmpty) ||
        (endpoint.responseBodySample is String &&
            (endpoint.responseBodySample as String).isEmpty)) {
      return const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("Response",
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          SizedBox(height: 16),
          Expanded(child: Center(child: Text('No response sample available'))),
        ],
      );
    }

    final jsonText = endpoint.responseBodySample is String
        ? endpoint.responseBodySample
        : const JsonEncoder.withIndent('  ')
            .convert(endpoint.responseBodySample);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("Response Sample",
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 8),
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(8),
            width: double.infinity,
            color: Theme.of(context)
                .colorScheme
                .surfaceContainerHighest
                .withValues(alpha: 0.5),
            child: SingleChildScrollView(
              child: SelectableText(jsonText as String,
                  style:
                      const TextStyle(fontFamily: 'monospace', fontSize: 13)),
            ),
          ),
        ),
      ],
    );
  }

  Color _methodColor(String method) {
    switch (method.toUpperCase()) {
      case 'GET':
        return Colors.green;
      case 'POST':
        return Colors.orange;
      case 'PUT':
        return Colors.blue;
      case 'DELETE':
        return Colors.red;
      case 'PATCH':
        return Colors.purple;
      default:
        return Colors.grey;
    }
  }
}
