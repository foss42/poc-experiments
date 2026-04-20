import 'package:apidash/models/api_explorer_models.dart';
import 'package:apidash/providers/collection_providers.dart';
import 'package:apidash/services/api_explorer_service.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';

final apiExplorerServiceProvider = Provider<ApiExplorerService>(
  (ref) => ApiExplorerService(),
);

class ApiExplorerState {
  const ApiExplorerState({
    this.catalog = const [],
    this.selectedApiId,
    this.selectedEndpointId,
    this.failures = const [],
    this.usage = const [],
    this.reviews = const [],
    this.remediations = const [],
    this.pipelineRoot = '',
    this.userId = '',
    this.reviewComment = '',
    this.reviewRating = 4,
    this.searchQuery = '',
    this.isBusy = false,
    this.statusMessage,
  });

  final List<ApiExplorerApiSummary> catalog;
  final String? selectedApiId;
  final String? selectedEndpointId;
  final List<ApiExplorerFailureRecord> failures;
  final List<ApiExplorerUsageRecord> usage;
  final List<ApiExplorerReviewRecord> reviews;
  final List<ApiExplorerRemediationRecord> remediations;
  final String pipelineRoot;
  final String userId;
  final String reviewComment;
  final int reviewRating;
  final String searchQuery;
  final bool isBusy;
  final String? statusMessage;

  ApiExplorerState copyWith({
    List<ApiExplorerApiSummary>? catalog,
    String? selectedApiId,
    String? selectedEndpointId,
    List<ApiExplorerFailureRecord>? failures,
    List<ApiExplorerUsageRecord>? usage,
    List<ApiExplorerReviewRecord>? reviews,
    List<ApiExplorerRemediationRecord>? remediations,
    String? pipelineRoot,
    String? userId,
    String? reviewComment,
    int? reviewRating,
    String? searchQuery,
    bool? isBusy,
    String? statusMessage,
    bool clearStatusMessage = false,
  }) {
    return ApiExplorerState(
      catalog: catalog ?? this.catalog,
      selectedApiId: selectedApiId ?? this.selectedApiId,
      selectedEndpointId: selectedEndpointId ?? this.selectedEndpointId,
      failures: failures ?? this.failures,
      usage: usage ?? this.usage,
      reviews: reviews ?? this.reviews,
      remediations: remediations ?? this.remediations,
      pipelineRoot: pipelineRoot ?? this.pipelineRoot,
      userId: userId ?? this.userId,
      reviewComment: reviewComment ?? this.reviewComment,
      reviewRating: reviewRating ?? this.reviewRating,
      searchQuery: searchQuery ?? this.searchQuery,
      isBusy: isBusy ?? this.isBusy,
      statusMessage: clearStatusMessage
          ? null
          : statusMessage ?? this.statusMessage,
    );
  }
}

class ApiExplorerController extends StateNotifier<ApiExplorerState> {
  ApiExplorerController(this.ref, this.service) : super(const ApiExplorerState()) {
    load();
  }

  final Ref ref;
  final ApiExplorerService service;

  Future<void> load({bool clearStatusMessage = true}) async {
    final catalog = service.getCatalog();
    final selectedApiId = state.selectedApiId ??
        (catalog.isNotEmpty ? catalog.first.id : null);
    final details = selectedApiId == null
        ? null
        : service.getApiDetails(selectedApiId);
    state = state.copyWith(
      catalog: catalog,
      selectedApiId: selectedApiId,
      selectedEndpointId:
          state.selectedEndpointId ?? _firstEndpointId(details),
      failures: service.getFailures(),
      usage: service.getUsageHistory(userId: state.userId),
      reviews: selectedApiId == null ? const [] : service.getReviews(apiId: selectedApiId),
      remediations: service.getRemediations(),
      pipelineRoot: state.pipelineRoot.isNotEmpty
          ? state.pipelineRoot
          : (service.getPipelineRoot() ?? ''),
      clearStatusMessage: clearStatusMessage,
    );
  }

  ApiExplorerApiDetails? get selectedApiDetails {
    final apiId = state.selectedApiId;
    if (apiId == null) return null;
    return service.getApiDetails(apiId);
  }

  ApiExplorerEndpoint? get selectedEndpoint {
    final details = selectedApiDetails;
    final endpointId = state.selectedEndpointId;
    if (details == null || endpointId == null) return null;
    for (final endpoint in details.endpoints) {
      if (endpoint.id == endpointId) return endpoint;
    }
    return details.endpoints.isEmpty ? null : details.endpoints.first;
  }

  List<ApiExplorerApiSummary> get filteredCatalog {
    if (state.searchQuery.trim().isEmpty) return state.catalog;
    final term = state.searchQuery.toLowerCase();
    return state.catalog.where((api) {
      return api.title.toLowerCase().contains(term) ||
          api.description.toLowerCase().contains(term) ||
          api.category.toLowerCase().contains(term) ||
          api.tags.any((tag) => tag.toLowerCase().contains(term));
    }).toList();
  }

  void updateSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
  }

  void updatePipelineRoot(String root) {
    state = state.copyWith(pipelineRoot: root);
  }

  void updateUserId(String userId) {
    state = state.copyWith(userId: userId);
    load();
  }

  void updateReviewComment(String comment) {
    state = state.copyWith(reviewComment: comment);
  }

  void updateReviewRating(int rating) {
    state = state.copyWith(reviewRating: rating);
  }

  Future<void> syncFromPipeline() async {
    if (state.pipelineRoot.trim().isEmpty) {
      state = state.copyWith(statusMessage: 'Enter the pipeline root folder first.');
      return;
    }
    state = state.copyWith(
      isBusy: true,
      statusMessage: 'Syncing pipeline output...',
      catalog: const [],
      selectedApiId: null,
      selectedEndpointId: null,
      reviews: const [],
    );
    try {
      await service.syncFromPipelineRoot(state.pipelineRoot.trim());
      await load(clearStatusMessage: false);
      state = state.copyWith(
        isBusy: false,
        statusMessage: 'Pipeline data synced into API Explorer.',
      );
    } catch (error) {
      final failureMessage = 'Pipeline sync failed: $error';
      state = state.copyWith(
        isBusy: false,
        catalog: const [],
        selectedApiId: null,
        selectedEndpointId: null,
        failures: service.getFailures(),
        remediations: service.getRemediations(),
        statusMessage: failureMessage,
      );
    }
  }

  Future<void> loadDemoData() async {
    state = state.copyWith(isBusy: true, statusMessage: 'Loading demo APIs...');
    await service.seedDemoData();
    await load();
    state = state.copyWith(isBusy: false, statusMessage: 'Demo APIs ready.');
  }

  Future<void> selectApi(String apiId) async {
    final details = service.getApiDetails(apiId);
    state = state.copyWith(
      selectedApiId: apiId,
      selectedEndpointId: _firstEndpointId(details),
      reviews: service.getReviews(apiId: apiId),
      clearStatusMessage: true,
    );
    await service.recordUsage(apiId: apiId, userId: state.userId, action: 'open_api');
    state = state.copyWith(usage: service.getUsageHistory(userId: state.userId));
  }

  Future<void> selectEndpoint(String endpointId) async {
    final apiId = state.selectedApiId;
    if (apiId == null) return;
    state = state.copyWith(selectedEndpointId: endpointId, clearStatusMessage: true);
    await service.recordUsage(
      apiId: apiId,
      endpointId: endpointId,
      userId: state.userId,
      action: 'open_endpoint',
    );
    state = state.copyWith(usage: service.getUsageHistory(userId: state.userId));
  }

  Future<void> importSelectedEndpoint() async {
    final details = selectedApiDetails;
    final endpoint = selectedEndpoint;
    if (details == null || endpoint == null) return;
    ref
        .read(collectionStateNotifierProvider.notifier)
        .addRequestModel(service.buildRequestModel(details, endpoint), name: endpoint.summary);
    await service.recordUsage(
      apiId: details.summary.id,
      endpointId: endpoint.id,
      userId: state.userId,
      action: 'import_endpoint',
    );
    state = state.copyWith(
      usage: service.getUsageHistory(userId: state.userId),
      statusMessage: 'Imported ${endpoint.method.name.toUpperCase()} ${endpoint.path}.',
    );
  }

  Future<void> importSelectedApi() async {
    final details = selectedApiDetails;
    if (details == null) return;
    for (final endpoint in details.endpoints.reversed) {
      ref
          .read(collectionStateNotifierProvider.notifier)
          .addRequestModel(service.buildRequestModel(details, endpoint), name: endpoint.summary);
    }
    await service.recordUsage(
      apiId: details.summary.id,
      userId: state.userId,
      action: 'import_api',
    );
    state = state.copyWith(
      usage: service.getUsageHistory(userId: state.userId),
      statusMessage: 'Imported ${details.endpoints.length} requests into API Dash.',
    );
  }

  Future<void> submitReview() async {
    final apiId = state.selectedApiId;
    if (apiId == null) return;
    if (state.userId.trim().isEmpty) {
      state = state.copyWith(
        statusMessage: 'Add a user id first to store history and reviews.',
      );
      return;
    }
    await service.submitReview(
      apiId: apiId,
      userId: state.userId,
      rating: state.reviewRating,
      comment: state.reviewComment,
    );
    state = state.copyWith(
      reviews: service.getReviews(apiId: apiId),
      remediations: service.getRemediations(),
      reviewComment: '',
      statusMessage: 'Review saved and remediation queue updated if needed.',
    );
  }

  Map<String, dynamic> callTool(String name) {
    final apiId = state.selectedApiId ?? '';
    return service.callTool(
      name,
      {
        'apiId': apiId,
        'query': state.searchQuery,
      },
    );
  }

  String? _firstEndpointId(ApiExplorerApiDetails? details) {
    if (details == null || details.endpoints.isEmpty) return null;
    return details.endpoints.first.id;
  }
}

final apiExplorerControllerProvider =
    StateNotifierProvider<ApiExplorerController, ApiExplorerState>((ref) {
      return ApiExplorerController(
        ref,
        ref.read(apiExplorerServiceProvider),
      );
    });
