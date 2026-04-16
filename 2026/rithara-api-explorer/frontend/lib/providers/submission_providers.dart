import 'package:flutter_riverpod/flutter_riverpod.dart';  // add this
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../models/api_submission.dart';
import '../data/mock_submissions.dart';

part 'submission_providers.g.dart';

@riverpod
List<ApiSubmission> allSubmissions(Ref ref) => mockSubmissions;

@riverpod
List<ApiSubmission> pendingSubmissions(Ref ref) => getPendingSubmissions();

@riverpod
List<ApiSubmission> userSubmissions(Ref ref, String email) =>
    getUserSubmissions(email);

// --- Contribute form state ---

class ContributeFormState {
  final String name;
  final String description;
  final String longDescription;
  final String category;
  final String tags;
  final String version;
  final String baseUrl;
  final String documentation;
  final String authType;
  final String githubRepo;
  final List<Map<String, String>> endpoints;

  const ContributeFormState({
    this.name = '',
    this.description = '',
    this.longDescription = '',
    this.category = 'developer',
    this.tags = '',
    this.version = '',
    this.baseUrl = '',
    this.documentation = '',
    this.authType = 'none',
    this.githubRepo = '',
    this.endpoints = const [],
  });

  ContributeFormState copyWith({
    String? name,
    String? description,
    String? longDescription,
    String? category,
    String? tags,
    String? version,
    String? baseUrl,
    String? documentation,
    String? authType,
    String? githubRepo,
    List<Map<String, String>>? endpoints,
  }) =>
      ContributeFormState(
        name:             name             ?? this.name,
        description:      description      ?? this.description,
        longDescription:  longDescription  ?? this.longDescription,
        category:         category         ?? this.category,
        tags:             tags             ?? this.tags,
        version:          version          ?? this.version,
        baseUrl:          baseUrl          ?? this.baseUrl,
        documentation:    documentation    ?? this.documentation,
        authType:         authType         ?? this.authType,
        githubRepo:       githubRepo       ?? this.githubRepo,
        endpoints:        endpoints        ?? this.endpoints,
      );
}

@riverpod
class ContributeFormNotifier extends _$ContributeFormNotifier {
  @override
  ContributeFormState build() => const ContributeFormState();

  void updateField(String field, String value) {
    state = switch (field) {
      'name'            => state.copyWith(name: value),
      'description'     => state.copyWith(description: value),
      'longDescription' => state.copyWith(longDescription: value),
      'category'        => state.copyWith(category: value),
      'tags'            => state.copyWith(tags: value),
      'version'         => state.copyWith(version: value),
      'baseUrl'         => state.copyWith(baseUrl: value),
      'documentation'   => state.copyWith(documentation: value),
      'authType'        => state.copyWith(authType: value),
      'githubRepo'      => state.copyWith(githubRepo: value),
      _                 => state,
    };
  }

  void addEndpoint() {
    final eps = List<Map<String, String>>.from(state.endpoints)
      ..add({'method': 'GET', 'path': '', 'description': ''});
    state = state.copyWith(endpoints: eps);
  }

  void updateEndpoint(int i, String field, String value) {
    final eps = List<Map<String, String>>.from(state.endpoints);
    eps[i] = {...eps[i], field: value};
    state = state.copyWith(endpoints: eps);
  }

  void removeEndpoint(int i) {
    final eps = List<Map<String, String>>.from(state.endpoints)..removeAt(i);
    state = state.copyWith(endpoints: eps);
  }

  String? validate() {
    if (state.name.isEmpty)          return 'Name is required';
    if (state.description.isEmpty)   return 'Description is required';
    if (state.baseUrl.isEmpty)       return 'Base URL is required';
    if (state.version.isEmpty)       return 'Version is required';
    if (state.documentation.isEmpty) return 'Documentation URL is required';
    return null;
  }

  void reset() => state = const ContributeFormState();
}