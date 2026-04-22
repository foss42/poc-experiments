import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';

import '../models/api_template.dart';
import 'api_overview.dart';
import 'endpoint_details.dart';

class ApiExplorerScreen extends StatefulWidget {
  const ApiExplorerScreen({super.key});

  @override
  State<ApiExplorerScreen> createState() => _ApiExplorerScreenState();
}

class _ApiExplorerScreenState extends State<ApiExplorerScreen> {
  List<ApiTemplate> _templates = [];
  bool _isLoading = true;
  String? _errorMessage;

  ApiTemplate? _selectedApi;
  ApiEndpoint? _selectedEndpoint;

  @override
  void initState() {
    super.initState();
    _fetchTemplates();
  }

  Future<void> _fetchTemplates() async {
    try {
      final file = File(
        '/home/himanshu-mishra/apidash-apiexplorer-poc/pipeline/output/templates.json',
      );

      if (!await file.exists()) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'templates.json not found check path';
        });
        return;
      }

      final jsonString = await file.readAsString();
      final decoded = json.decode(jsonString);
      if (decoded is! List) {
        throw const FormatException('Expected JSON array');
      }

      setState(() {
        _templates = decoded
            .map((e) => ApiTemplate.fromJson(e as Map<String, dynamic>))
            .toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = e.toString();
      });
    }
  }

  Map<String, List<ApiTemplate>> get _categoryMap {
    final map = <String, List<ApiTemplate>>{};
    for (final template in _templates) {
      List<String> categories =
          template.tags.isEmpty ? ['Uncategorized'] : List.from(template.tags);

      // Temporary frontend override based on API name to separate into proper categories
      final nameLower = template.name.toLowerCase();
      if (nameLower.contains('finance')) {
        categories.remove('General');
        if (!categories.contains('Finance')) categories.add('Finance');
      } else if (nameLower.contains('science')) {
        categories.remove('General');
        if (!categories.contains('Science')) categories.add('Science');
      } else if (nameLower.contains('github') ||
          nameLower.contains('kubernetes')) {
        categories.remove('General');
        if (!categories.contains('Developer Tools'))
          categories.add('Developer Tools');
      }

      if (categories.isEmpty) categories = ['General'];

      for (final cat in categories) {
        map.putIfAbsent(cat, () => []).add(template);
      }
    }
    return map;
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_errorMessage != null) {
      return Scaffold(body: Center(child: Text(_errorMessage!)));
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('API Explorer'),
        elevation: 1,
      ),
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildSidebar(),
          const VerticalDivider(width: 1, thickness: 1),
          Expanded(child: _buildMainArea()),
        ],
      ),
    );
  }

  Widget _buildSidebar() {
    return SizedBox(
      width: 250,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            alignment: Alignment.centerLeft,
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            child: const Text('Collections',
                style: TextStyle(fontWeight: FontWeight.bold)),
          ),
          Expanded(
            child: ListView(
              children: _categoryMap.entries.map((entry) {
                return ExpansionTile(
                  title: Text('${entry.key} (${entry.value.length})'),
                  children: entry.value.map((api) {
                    return ListTile(
                      title:
                          Text(api.name, style: const TextStyle(fontSize: 14)),
                      subtitle: Text(api.baseUrl,
                          style: const TextStyle(fontSize: 10)),
                      onTap: () {
                        setState(() {
                          _selectedApi = api;
                          _selectedEndpoint = null;
                        });
                      },
                      selected:
                          _selectedApi == api && _selectedEndpoint == null,
                    );
                  }).toList(),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMainArea() {
    if (_selectedApi == null) {
      return const Center(child: Text('Select an API from the sidebar'));
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Middle Pane: Endpoints of the selected API
        SizedBox(
          width: 250,
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                alignment: Alignment.centerLeft,
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                child: Text(_selectedApi!.name,
                    style: const TextStyle(fontWeight: FontWeight.bold)),
              ),
              ListTile(
                title: const Text('Overview / Configuration'),
                leading: const Icon(Icons.info_outline),
                selected: _selectedEndpoint == null,
                onTap: () {
                  setState(() {
                    _selectedEndpoint = null;
                  });
                },
              ),
              const Divider(height: 1),
              Expanded(
                child: ListView.builder(
                  itemCount: _selectedApi!.endpoints.length,
                  itemBuilder: (context, index) {
                    final ep = _selectedApi!.endpoints[index];
                    return ListTile(
                      title: Text(ep.path,
                          style: const TextStyle(
                              fontSize: 13, fontFamily: 'monospace')),
                      leading: Text(
                        ep.method.toUpperCase(),
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: _methodColor(ep.method),
                        ),
                      ),
                      selected: _selectedEndpoint == ep,
                      onTap: () {
                        setState(() {
                          _selectedEndpoint = ep;
                        });
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
        const VerticalDivider(width: 1, thickness: 1),
        // Right Pane: Details
        Expanded(
          child: _selectedEndpoint == null
              ? ApiOverviewScreen(template: _selectedApi!)
              : EndpointDetailsScreen(
                  template: _selectedApi!, endpoint: _selectedEndpoint!),
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
