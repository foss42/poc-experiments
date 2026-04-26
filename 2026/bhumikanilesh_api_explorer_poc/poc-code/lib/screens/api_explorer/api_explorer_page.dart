import 'dart:convert';

import 'package:apidash/codegen/codegen.dart';
import 'package:apidash/consts.dart';
import 'package:apidash/models/api_explorer_models.dart';
import 'package:apidash/models/models.dart';
import 'package:apidash/providers/api_explorer_providers.dart';
import 'package:apidash/providers/providers.dart';
import 'package:apidash_core/apidash_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ApiExplorerPage extends ConsumerStatefulWidget {
  const ApiExplorerPage({super.key});

  @override
  ConsumerState<ApiExplorerPage> createState() => _ApiExplorerPageState();
}

class _ApiExplorerPageState extends ConsumerState<ApiExplorerPage> {
  late final TextEditingController _pipelineController;
  late final TextEditingController _userController;
  late final TextEditingController _reviewController;
  String _toolName = 'explore_apis';

  @override
  void initState() {
    super.initState();
    final state = ref.read(apiExplorerControllerProvider);
    _pipelineController = TextEditingController(text: state.pipelineRoot);
    _userController = TextEditingController(text: state.userId);
    _reviewController = TextEditingController(text: state.reviewComment);
  }

  @override
  void dispose() {
    _pipelineController.dispose();
    _userController.dispose();
    _reviewController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = ref.read(apiExplorerControllerProvider.notifier);
    final state = ref.watch(apiExplorerControllerProvider);
    final details = controller.selectedApiDetails;
    final endpoint = controller.selectedEndpoint;
    final toolResult = controller.callTool(_toolName);

    _syncController(_pipelineController, state.pipelineRoot);
    _syncController(_userController, state.userId);
    _syncController(_reviewController, state.reviewComment);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _ExplorerTopBar(
          pipelineController: _pipelineController,
          userController: _userController,
          statusMessage: state.statusMessage,
          isBusy: state.isBusy,
          onPipelineChanged: controller.updatePipelineRoot,
          onUserChanged: controller.updateUserId,
          onSyncPressed: controller.syncFromPipeline,
          onDemoPressed: controller.loadDemoData,
          onSearchChanged: controller.updateSearchQuery,
        ),
        const Divider(height: 1),
        Expanded(
          child: Row(
            children: [
              SizedBox(
                width: 280,
                child: _ApiCatalogPane(
                  catalog: controller.filteredCatalog,
                  selectedApiId: state.selectedApiId,
                  onTap: controller.selectApi,
                ),
              ),
              VerticalDivider(
                width: 1,
                thickness: 1,
                color: Theme.of(context).colorScheme.outlineVariant,
              ),
              SizedBox(
                width: 320,
                child: _EndpointPane(
                  details: details,
                  selectedEndpointId: state.selectedEndpointId,
                  onTap: controller.selectEndpoint,
                ),
              ),
              VerticalDivider(
                width: 1,
                thickness: 1,
                color: Theme.of(context).colorScheme.outlineVariant,
              ),
              Expanded(
                child: _EndpointDetailsPane(
                  details: details,
                  endpoint: endpoint,
                  reviewController: _reviewController,
                  reviewRating: state.reviewRating,
                  reviews: state.reviews,
                  usage: state.usage.take(6).toList(),
                  remediations: state.remediations.take(4).toList(),
                  toolName: _toolName,
                  toolResult: toolResult,
                  onToolChanged: (value) {
                    setState(() {
                      _toolName = value;
                    });
                  },
                  onReviewRatingChanged: controller.updateReviewRating,
                  onReviewCommentChanged: controller.updateReviewComment,
                  onSubmitReview: controller.submitReview,
                  onImportEndpoint: controller.importSelectedEndpoint,
                  onImportApi: controller.importSelectedApi,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  void _syncController(TextEditingController controller, String value) {
    if (controller.text == value) return;
    controller.value = controller.value.copyWith(
      text: value,
      selection: TextSelection.collapsed(offset: value.length),
    );
  }
}

class _ExplorerTopBar extends StatelessWidget {
  const _ExplorerTopBar({
    required this.pipelineController,
    required this.userController,
    required this.statusMessage,
    required this.isBusy,
    required this.onPipelineChanged,
    required this.onUserChanged,
    required this.onSyncPressed,
    required this.onDemoPressed,
    required this.onSearchChanged,
  });

  final TextEditingController pipelineController;
  final TextEditingController userController;
  final String? statusMessage;
  final bool isBusy;
  final ValueChanged<String> onPipelineChanged;
  final ValueChanged<String> onUserChanged;
  final Future<void> Function() onSyncPressed;
  final Future<void> Function() onDemoPressed;
  final ValueChanged<String> onSearchChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'API Explorer',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              ),
              if (statusMessage != null && statusMessage!.isNotEmpty)
                Flexible(
                  child: Text(
                    statusMessage!,
                    textAlign: TextAlign.end,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                flex: 3,
                child: TextField(
                  controller: pipelineController,
                  decoration: const InputDecoration(
                    labelText: 'Pipeline root',
                    hintText: r'C:\Users\HP\Desktop\GSOC FILES\gsoc',
                    border: OutlineInputBorder(),
                  ),
                  onChanged: onPipelineChanged,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  controller: userController,
                  decoration: const InputDecoration(
                    labelText: 'User id',
                    hintText: 'optional',
                    border: OutlineInputBorder(),
                  ),
                  onChanged: onUserChanged,
                ),
              ),
              const SizedBox(width: 12),
              FilledButton.icon(
                onPressed: isBusy ? null : onSyncPressed,
                icon: const Icon(Icons.sync),
                label: const Text('Sync Pipeline'),
              ),
              const SizedBox(width: 8),
              OutlinedButton.icon(
                onPressed: isBusy ? null : onDemoPressed,
                icon: const Icon(Icons.science_outlined),
                label: const Text('Load Demo'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            decoration: const InputDecoration(
              labelText: 'Search APIs, tags, categories',
              prefixIcon: Icon(Icons.search),
              border: OutlineInputBorder(),
            ),
            onChanged: onSearchChanged,
          ),
        ],
      ),
    );
  }
}

class _ApiCatalogPane extends StatelessWidget {
  const _ApiCatalogPane({
    required this.catalog,
    required this.selectedApiId,
    required this.onTap,
  });

  final List<ApiExplorerApiSummary> catalog;
  final String? selectedApiId;
  final ValueChanged<String> onTap;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Text('Catalog', style: Theme.of(context).textTheme.titleMedium),
        ),
        Expanded(
          child: catalog.isEmpty
              ? const Center(child: Text('Sync your pipeline or load demo data'))
              : ListView.builder(
                  itemCount: catalog.length,
                  itemBuilder: (context, index) {
                    final api = catalog[index];
                    return ListTile(
                      selected: api.id == selectedApiId,
                      title: Text(api.title),
                      subtitle: Text(
                        '${api.category} | ${api.endpointCount} endpoints | score ${api.qualityScore}',
                      ),
                      trailing: api.requiresAuth
                          ? const Icon(Icons.lock_outline, size: 18)
                          : const Icon(Icons.lock_open_outlined, size: 18),
                      onTap: () => onTap(api.id),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

class _EndpointPane extends StatelessWidget {
  const _EndpointPane({
    required this.details,
    required this.selectedEndpointId,
    required this.onTap,
  });

  final ApiExplorerApiDetails? details;
  final String? selectedEndpointId;
  final ValueChanged<String> onTap;

  @override
  Widget build(BuildContext context) {
    final endpoints = details?.endpoints ?? const <ApiExplorerEndpoint>[];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Text('Endpoints', style: Theme.of(context).textTheme.titleMedium),
        ),
        Expanded(
          child: endpoints.isEmpty
              ? const Center(child: Text('Select an API to browse methods'))
              : ListView.builder(
                  itemCount: endpoints.length,
                  itemBuilder: (context, index) {
                    final endpoint = endpoints[index];
                    return ListTile(
                      selected: endpoint.id == selectedEndpointId,
                      leading: _MethodBadge(method: endpoint.method),
                      title: Text(endpoint.path),
                      subtitle: Text(
                        endpoint.summary.isEmpty ? 'No summary yet' : endpoint.summary,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      onTap: () => onTap(endpoint.id),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

class _EndpointDetailsPane extends StatelessWidget {
  const _EndpointDetailsPane({
    required this.details,
    required this.endpoint,
    required this.reviewController,
    required this.reviewRating,
    required this.reviews,
    required this.usage,
    required this.remediations,
    required this.toolName,
    required this.toolResult,
    required this.onToolChanged,
    required this.onReviewRatingChanged,
    required this.onReviewCommentChanged,
    required this.onSubmitReview,
    required this.onImportEndpoint,
    required this.onImportApi,
  });

  final ApiExplorerApiDetails? details;
  final ApiExplorerEndpoint? endpoint;
  final TextEditingController reviewController;
  final int reviewRating;
  final List<ApiExplorerReviewRecord> reviews;
  final List<ApiExplorerUsageRecord> usage;
  final List<ApiExplorerRemediationRecord> remediations;
  final String toolName;
  final Map<String, dynamic> toolResult;
  final ValueChanged<String> onToolChanged;
  final ValueChanged<int> onReviewRatingChanged;
  final ValueChanged<String> onReviewCommentChanged;
  final Future<void> Function() onSubmitReview;
  final Future<void> Function() onImportEndpoint;
  final Future<void> Function() onImportApi;

  @override
  Widget build(BuildContext context) {
    if (details == null || endpoint == null) {
      return const Center(child: Text('Choose an API endpoint to inspect and import'));
    }

    final summary = details!.summary;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(summary.title, style: Theme.of(context).textTheme.headlineSmall),
                    const SizedBox(height: 6),
                    Text(summary.description),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              FilledButton.icon(
                onPressed: onImportEndpoint,
                icon: const Icon(Icons.input),
                label: const Text('Import Endpoint'),
              ),
              const SizedBox(width: 8),
              OutlinedButton.icon(
                onPressed: onImportApi,
                icon: const Icon(Icons.library_add_outlined),
                label: const Text('Import API'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _InfoChip(label: 'Base URL', value: summary.baseUrl),
              _InfoChip(label: 'Category', value: summary.category),
              _InfoChip(label: 'Quality', value: '${summary.qualityScore}/100'),
              _InfoChip(label: 'Version', value: details!.version),
              ...summary.readinessBadges.map((badge) => Chip(label: Text(badge))),
            ],
          ),
          const SizedBox(height: 20),
          Text('Endpoint details', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      _MethodBadge(method: endpoint!.method),
                      const SizedBox(width: 8),
                      Expanded(
                        child: SelectableText(
                          endpoint!.path,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (endpoint!.summary.isNotEmpty) Text(endpoint!.summary),
                  if (endpoint!.description.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(endpoint!.description),
                  ],
                  const SizedBox(height: 12),
                  _NamedRows(title: 'Headers', rows: endpoint!.headers),
                  _NamedRows(title: 'Query Params', rows: endpoint!.queryParameters),
                  _NamedRows(title: 'Path Params', rows: endpoint!.pathParameters),
                  _JsonBlock(title: 'Request Body', value: endpoint!.requestBodyExample),
                  _JsonBlock(title: 'Response Example', value: endpoint!.responseExample),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          _EndpointPlaygroundCard(
            details: details!,
            endpoint: endpoint!,
          ),
          const SizedBox(height: 20),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: _McpPreviewCard(
                  toolName: toolName,
                  toolResult: toolResult,
                  onToolChanged: onToolChanged,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _FeedbackCard(
                  reviewController: reviewController,
                  reviewRating: reviewRating,
                  reviews: reviews,
                  usage: usage,
                  remediations: remediations,
                  onReviewRatingChanged: onReviewRatingChanged,
                  onReviewCommentChanged: onReviewCommentChanged,
                  onSubmitReview: onSubmitReview,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _EndpointPlaygroundCard extends ConsumerStatefulWidget {
  const _EndpointPlaygroundCard({
    required this.details,
    required this.endpoint,
  });

  final ApiExplorerApiDetails details;
  final ApiExplorerEndpoint endpoint;

  @override
  ConsumerState<_EndpointPlaygroundCard> createState() =>
      _EndpointPlaygroundCardState();
}

class _EndpointPlaygroundCardState
    extends ConsumerState<_EndpointPlaygroundCard> {
  late final TextEditingController _bodyController;
  late final TextEditingController _headersController;
  late final TextEditingController _preRequestScriptController;
  late final TextEditingController _bearerTokenController;
  late final TextEditingController _basicUserController;
  late final TextEditingController _basicPasswordController;
  late final TextEditingController _apiKeyNameController;
  late final TextEditingController _apiKeyValueController;

  APIAuthType _authType = APIAuthType.none;
  String _statusMessage = '';
  CodegenLanguage _codegenLanguage = CodegenLanguage.pythonRequests;
  String _currentEndpointId = '';

  @override
  void initState() {
    super.initState();
    _bodyController = TextEditingController();
    _headersController = TextEditingController();
    _preRequestScriptController = TextEditingController();
    _bearerTokenController = TextEditingController();
    _basicUserController = TextEditingController();
    _basicPasswordController = TextEditingController();
    _apiKeyNameController = TextEditingController(text: 'x-api-key');
    _apiKeyValueController = TextEditingController();
    _syncFromEndpoint();
  }

  @override
  void didUpdateWidget(covariant _EndpointPlaygroundCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_currentEndpointId != widget.endpoint.id) {
      _syncFromEndpoint();
    }
  }

  @override
  void dispose() {
    _bodyController.dispose();
    _headersController.dispose();
    _preRequestScriptController.dispose();
    _bearerTokenController.dispose();
    _basicUserController.dispose();
    _basicPasswordController.dispose();
    _apiKeyNameController.dispose();
    _apiKeyValueController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final codeSnippet = _buildCodeSnippet();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Request Playground',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Edit JSON, auth, headers, and an optional pre-request script before opening or running this endpoint.',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                FilledButton.icon(
                  onPressed: _openInRequestsEditor,
                  icon: const Icon(Icons.open_in_new),
                  label: const Text('Open in Requests Editor'),
                ),
                const SizedBox(width: 8),
                OutlinedButton.icon(
                  onPressed: _runRequest,
                  icon: const Icon(Icons.play_arrow),
                  label: const Text('Run Request'),
                ),
              ],
            ),
            if (_statusMessage.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                _statusMessage,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
            const SizedBox(height: 16),
            LayoutBuilder(
              builder: (context, constraints) {
                if (constraints.maxWidth < 980) {
                  return Column(
                    children: [
                      _buildJsonEditor(context),
                      const SizedBox(height: 12),
                      _buildHeadersEditor(context),
                      const SizedBox(height: 12),
                      _buildAuthEditor(context),
                    ],
                  );
                }
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(child: _buildJsonEditor(context)),
                    const SizedBox(width: 12),
                    Expanded(child: _buildHeadersEditor(context)),
                    const SizedBox(width: 12),
                    Expanded(child: _buildAuthEditor(context)),
                  ],
                );
              },
            ),
            const SizedBox(height: 16),
            _buildScriptEditor(context),
            const SizedBox(height: 16),
            _buildCodePreview(context, codeSnippet),
          ],
        ),
      ),
    );
  }

  Widget _buildJsonEditor(BuildContext context) {
    return _EditorSection(
      title: 'JSON Body',
      subtitle: 'Edit the request payload for this endpoint.',
      child: TextField(
        controller: _bodyController,
        minLines: 10,
        maxLines: 14,
        decoration: const InputDecoration(
          border: OutlineInputBorder(),
          hintText: '{\n  "key": "value"\n}',
        ),
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
              fontFamily: 'monospace',
            ),
      ),
    );
  }

  Widget _buildHeadersEditor(BuildContext context) {
    return _EditorSection(
      title: 'Headers',
      subtitle: 'One header per line using `Header-Name: value`.',
      child: TextField(
        controller: _headersController,
        minLines: 10,
        maxLines: 14,
        decoration: const InputDecoration(
          border: OutlineInputBorder(),
          hintText: 'Content-Type: application/json\nX-Custom: value',
        ),
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
              fontFamily: 'monospace',
            ),
      ),
    );
  }

  Widget _buildAuthEditor(BuildContext context) {
    return _EditorSection(
      title: 'Auth',
      subtitle: 'Choose the auth type and fill the required fields.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          DropdownButtonFormField<APIAuthType>(
            initialValue: _authType,
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              labelText: 'Auth Type',
            ),
            items: const [
              DropdownMenuItem(value: APIAuthType.none, child: Text('None')),
              DropdownMenuItem(value: APIAuthType.bearer, child: Text('Bearer')),
              DropdownMenuItem(value: APIAuthType.basic, child: Text('Basic')),
              DropdownMenuItem(value: APIAuthType.apiKey, child: Text('API Key')),
            ],
            onChanged: (value) {
              if (value == null) return;
              setState(() {
                _authType = value;
              });
            },
          ),
          const SizedBox(height: 12),
          if (_authType == APIAuthType.bearer)
            TextField(
              controller: _bearerTokenController,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                labelText: 'Bearer Token',
              ),
            ),
          if (_authType == APIAuthType.basic) ...[
            TextField(
              controller: _basicUserController,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                labelText: 'Username',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _basicPasswordController,
              obscureText: true,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                labelText: 'Password',
              ),
            ),
          ],
          if (_authType == APIAuthType.apiKey) ...[
            TextField(
              controller: _apiKeyNameController,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                labelText: 'Header / Query Name',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _apiKeyValueController,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                labelText: 'API Key',
              ),
            ),
          ],
          if (_authType == APIAuthType.none)
            Text(
              'No authentication will be attached to the generated request.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
        ],
      ),
    );
  }

  Widget _buildScriptEditor(BuildContext context) {
    return _EditorSection(
      title: 'Pre-request Script',
      subtitle: 'Optional JavaScript that API Dash will run before sending the request.',
      child: TextField(
        controller: _preRequestScriptController,
        minLines: 6,
        maxLines: 10,
        decoration: const InputDecoration(
          border: OutlineInputBorder(),
          hintText:
              "// Example\n// pm.request.headers.add({ key: 'X-Debug', value: 'true' });",
        ),
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
              fontFamily: 'monospace',
            ),
      ),
    );
  }

  Widget _buildCodePreview(BuildContext context, String codeSnippet) {
    return _EditorSection(
      title: 'Generated Script',
      subtitle: 'Preview integration code for the current playground request.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          DropdownButtonFormField<CodegenLanguage>(
            initialValue: _codegenLanguage,
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              labelText: 'Language',
            ),
            items: const [
              DropdownMenuItem(
                value: CodegenLanguage.pythonRequests,
                child: Text('Python (requests)'),
              ),
              DropdownMenuItem(
                value: CodegenLanguage.jsFetch,
                child: Text('JavaScript (fetch)'),
              ),
              DropdownMenuItem(
                value: CodegenLanguage.curl,
                child: Text('cURL'),
              ),
            ],
            onChanged: (value) {
              if (value == null) return;
              setState(() {
                _codegenLanguage = value;
              });
            },
          ),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
            ),
            child: SelectableText(
              codeSnippet,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontFamily: 'monospace',
                  ),
            ),
          ),
        ],
      ),
    );
  }

  void _syncFromEndpoint() {
    _currentEndpointId = widget.endpoint.id;
    _bodyController.text = widget.endpoint.requestBodyExample ?? '';
    _headersController.text = _formatRows(widget.endpoint.headers);
    _preRequestScriptController.text = '';
    _bearerTokenController.text = '';
    _basicUserController.text = '';
    _basicPasswordController.text = '';
    _apiKeyNameController.text = 'x-api-key';
    _apiKeyValueController.text = '';
    _authType = _initialAuthType(widget.endpoint.authType);
    _statusMessage = '';
    setState(() {});
  }

  APIAuthType _initialAuthType(String authType) {
    switch (authType) {
      case 'bearer':
        return APIAuthType.bearer;
      case 'basic':
        return APIAuthType.basic;
      case 'apiKey':
      case 'api_key':
      case 'header':
        return APIAuthType.apiKey;
      default:
        return APIAuthType.none;
    }
  }

  String _formatRows(List<NameValueModel> rows) {
    return rows.map((row) => '${row.name}: ${row.value}').join('\n');
  }

  List<NameValueModel> _parseHeaderLines(String raw) {
    return raw
        .split('\n')
        .map((line) => line.trim())
        .where((line) => line.isNotEmpty)
        .map((line) {
          final index = line.indexOf(':');
          if (index == -1) {
            return NameValueModel(name: line, value: '');
          }
          return NameValueModel(
            name: line.substring(0, index).trim(),
            value: line.substring(index + 1).trim(),
          );
        })
        .where((row) => row.name.isNotEmpty)
        .toList();
  }

  AuthModel _buildAuthModel() {
    switch (_authType) {
      case APIAuthType.bearer:
        return AuthModel(
          type: APIAuthType.bearer,
          bearer: AuthBearerModel(token: _bearerTokenController.text.trim()),
        );
      case APIAuthType.basic:
        return AuthModel(
          type: APIAuthType.basic,
          basic: AuthBasicAuthModel(
            username: _basicUserController.text.trim(),
            password: _basicPasswordController.text.trim(),
          ),
        );
      case APIAuthType.apiKey:
        return AuthModel(
          type: APIAuthType.apiKey,
          apikey: AuthApiKeyModel(
            key: _apiKeyValueController.text.trim(),
            name: _apiKeyNameController.text.trim().isEmpty
                ? 'x-api-key'
                : _apiKeyNameController.text.trim(),
            location: 'header',
          ),
        );
      case APIAuthType.none:
      default:
        return const AuthModel(type: APIAuthType.none);
    }
  }

  RequestModel _buildRequestModelForCodegen() {
    final service = ref.read(apiExplorerServiceProvider);
    final baseRequest = service.buildRequestModel(widget.details, widget.endpoint);
    final headers = _parseHeaderLines(_headersController.text);
    final request = baseRequest.copyWith(
      headers: headers,
      isHeaderEnabledList: List<bool>.filled(headers.length, true),
      authModel: _buildAuthModel(),
      body: _bodyController.text.trim().isEmpty ? null : _bodyController.text,
    );
    return RequestModel(
      id: 'explorer-playground-preview',
      name: widget.endpoint.summary,
      httpRequestModel: request,
      preRequestScript: _preRequestScriptController.text.trim().isEmpty
          ? null
          : _preRequestScriptController.text,
    );
  }

  String _buildCodeSnippet() {
    final settings = ref.read(settingsProvider);
    final snippet = Codegen().getCode(
      _codegenLanguage,
      _buildRequestModelForCodegen(),
      settings.defaultUriScheme,
    );
    return (snippet == null || snippet.trim().isEmpty)
        ? 'No code preview available for the current request.'
        : snippet;
  }

  Future<void> _openInRequestsEditor() async {
    final requestId = _createRequestAndSelect();
    if (requestId == null) return;
    ref.read(navRailIndexStateProvider.notifier).state = 0;
    setState(() {
      _statusMessage = 'Request created and opened in the Requests editor.';
    });
  }

  Future<void> _runRequest() async {
    final requestId = _createRequestAndSelect();
    if (requestId == null) return;
    ref.read(navRailIndexStateProvider.notifier).state = 0;
    await ref.read(collectionStateNotifierProvider.notifier).sendRequest();
    setState(() {
      _statusMessage =
          'Request created, selected, and sent. Check the Requests tab for the response.';
    });
  }

  String? _createRequestAndSelect() {
    try {
      final requestModel = _buildRequestModelForCodegen();
      final notifier = ref.read(collectionStateNotifierProvider.notifier);
      notifier.addRequestModel(
        requestModel.httpRequestModel ?? const HttpRequestModel(),
        name: requestModel.name,
      );
      final requestId = ref.read(selectedIdStateProvider);
      if (requestId != null &&
          _preRequestScriptController.text.trim().isNotEmpty) {
        notifier.update(
          id: requestId,
          preRequestScript: _preRequestScriptController.text,
        );
      }
      return requestId;
    } catch (error) {
      setState(() {
        _statusMessage = 'Could not build the request: $error';
      });
      return null;
    }
  }
}

class _EditorSection extends StatelessWidget {
  const _EditorSection({
    required this.title,
    required this.subtitle,
    required this.child,
  });

  final String title;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Theme.of(context).colorScheme.outlineVariant,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 4),
          Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

class _McpPreviewCard extends StatelessWidget {
  const _McpPreviewCard({
    required this.toolName,
    required this.toolResult,
    required this.onToolChanged,
  });

  final String toolName;
  final Map<String, dynamic> toolResult;
  final ValueChanged<String> onToolChanged;

  @override
  Widget build(BuildContext context) {
    const tools = [
      'explore_apis',
      'get_api_details',
      'import_to_apidash',
      'suggest_sequence',
      'get_failures',
    ];
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('MCP tool preview', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: toolName,
              items: tools
                  .map(
                    (tool) => DropdownMenuItem<String>(
                      value: tool,
                      child: Text(tool),
                    ),
                  )
                  .toList(),
              onChanged: (value) {
                if (value != null) onToolChanged(value);
              },
              decoration: const InputDecoration(border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
              ),
              child: SelectableText(
                const JsonEncoder.withIndent('  ').convert(toolResult),
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  fontFamily: 'monospace',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FeedbackCard extends StatelessWidget {
  const _FeedbackCard({
    required this.reviewController,
    required this.reviewRating,
    required this.reviews,
    required this.usage,
    required this.remediations,
    required this.onReviewRatingChanged,
    required this.onReviewCommentChanged,
    required this.onSubmitReview,
  });

  final TextEditingController reviewController;
  final int reviewRating;
  final List<ApiExplorerReviewRecord> reviews;
  final List<ApiExplorerUsageRecord> usage;
  final List<ApiExplorerRemediationRecord> remediations;
  final ValueChanged<int> onReviewRatingChanged;
  final ValueChanged<String> onReviewCommentChanged;
  final Future<void> Function() onSubmitReview;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Feedback loop', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            DropdownButtonFormField<int>(
              initialValue: reviewRating,
              decoration: const InputDecoration(
                labelText: 'Review rating',
                border: OutlineInputBorder(),
              ),
              items: List.generate(
                5,
                (index) => DropdownMenuItem<int>(
                  value: index + 1,
                  child: Text('${index + 1} / 5'),
                ),
              ),
              onChanged: (value) {
                if (value != null) onReviewRatingChanged(value);
              },
            ),
            const SizedBox(height: 12),
            TextField(
              controller: reviewController,
              minLines: 3,
              maxLines: 5,
              decoration: const InputDecoration(
                labelText: 'Review comment',
                border: OutlineInputBorder(),
              ),
              onChanged: onReviewCommentChanged,
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: onSubmitReview,
              icon: const Icon(Icons.rate_review_outlined),
              label: const Text('Save Review'),
            ),
            const SizedBox(height: 16),
            Text('Recent usage', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 8),
            if (usage.isEmpty)
              const Text('Add a user id to track activity history.')
            else
              ...usage.map(
                (item) => Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Text(
                    '${item.action} | ${item.apiId}${item.endpointId == null ? '' : ' | ${item.endpointId}'}',
                  ),
                ),
              ),
            const SizedBox(height: 16),
            Text('Latest reviews', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 8),
            if (reviews.isEmpty)
              const Text('No reviews yet.')
            else
              ...reviews.take(3).map(
                (review) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text('${review.rating}/5 | ${review.comment}'),
                ),
              ),
            const SizedBox(height: 16),
            Text('Remediation queue', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 8),
            if (remediations.isEmpty)
              const Text('No remediation items queued.')
            else
              ...remediations.map(
                (item) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text('${item.apiId}: ${item.recommendation}'),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _NamedRows extends StatelessWidget {
  const _NamedRows({required this.title, required this.rows});

  final String title;
  final List<NameValueModel> rows;

  @override
  Widget build(BuildContext context) {
    if (rows.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 4),
          ...rows.map((row) => Text('${row.name}: ${row.value}')),
        ],
      ),
    );
  }
}

class _JsonBlock extends StatelessWidget {
  const _JsonBlock({required this.title, required this.value});

  final String title;
  final String? value;

  @override
  Widget build(BuildContext context) {
    if (value == null || value!.trim().isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 6),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
            ),
            child: SelectableText(
              value!,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                fontFamily: 'monospace',
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Chip(label: Text('$label: $value'));
  }
}

class _MethodBadge extends StatelessWidget {
  const _MethodBadge({required this.method});

  final HTTPVerb method;

  @override
  Widget build(BuildContext context) {
    final color = switch (method) {
      HTTPVerb.get => Colors.green,
      HTTPVerb.post => Colors.blue,
      HTTPVerb.put || HTTPVerb.patch => Colors.orange,
      HTTPVerb.delete => Colors.red,
      _ => Colors.grey,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        method.name.toUpperCase(),
        style: Theme.of(context).textTheme.labelSmall?.copyWith(color: color),
      ),
    );
  }
}
